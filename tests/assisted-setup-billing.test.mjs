import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assistedSetupCheckoutTrial, assistedSetupTrialEndUnix, holdAssistedSetupBilling,
  releaseAssistedSetupBilling, ASSISTED_SETUP_BILLING_MODE,
} from '../assisted-setup-billing.mjs';

const subscription=(extra={})=>({
  id:'sub_test_1',status:'trialing',
  metadata:{setup_billing_mode:ASSISTED_SETUP_BILLING_MODE},
  trial_end:Math.floor(Date.now()/1000)+300*86400,
  pause_collection:null,...extra,
});

test('only paid assisted setup checkouts hold recurring charges; other buyers retain 3-day trial',()=>{
  assert.deepEqual(assistedSetupCheckoutTrial(false),{trial_period_days:3});
  assert.deepEqual(assistedSetupCheckoutTrial(true),{trial_period_days:365});
});

test('hold is opt-in and does not alter older or released subscriptions',async()=>{
  let updates=0;
  const stripe={subscriptions:{
    retrieve:async()=>subscription({metadata:{setup_service:'1'}}),
    update:async()=>{updates++;throw Error('must not call');},
  }};
  assert.deepEqual(await holdAssistedSetupBilling(stripe,'sub_test_1'),{held:false,legacy:true});
  stripe.subscriptions.retrieve=async()=>subscription({metadata:{setup_billing_mode:ASSISTED_SETUP_BILLING_MODE,setup_billing_released:'1'}});
  assert.deepEqual(await holdAssistedSetupBilling(stripe,'sub_test_1'),{held:false,released:true});
  assert.equal(updates,0);
});

test('new checkout subscription is held with void payment collection, never billed by hold',async()=>{
  let calls=0;
  let value=subscription();
  const stripe={subscriptions:{
    retrieve:async id=>{assert.equal(id,'sub_test_1');return value;},
    update:async(id,params,options)=>{
      calls++;
      assert.deepEqual(params,{pause_collection:{behavior:'void'},metadata:{setup_billing_held:'1'}});
      assert.equal(options.idempotencyKey,'respondo-assisted-setup-hold-'+id);
      value=subscription({pause_collection:{behavior:'void'}});
      return value;
    },
  }};
  assert.deepEqual(await holdAssistedSetupBilling(stripe,'sub_test_1'),{held:true});
  assert.deepEqual(await holdAssistedSetupBilling(stripe,'sub_test_1'),{held:true,alreadyHeld:true});
  assert.equal(calls,1);
});

test('hold fails closed for an already billed or near-expiring subscription',async()=>{
  const stripe={subscriptions:{
    retrieve:async()=>subscription({status:'active',trial_end:null}),
    update:async()=>{throw Error('unexpected');},
  }};
  await assert.rejects(holdAssistedSetupBilling(stripe,'sub_test_1'),/not safely trialing/);
});

test('handover releases only a held trial and starts a 3-day trial from durable approval timestamp',async()=>{
  const approvedAt='2026-10-28T20:00:00.000Z';
  const end=assistedSetupTrialEndUnix(approvedAt);
  let value=subscription({pause_collection:{behavior:'void'}});
  let writes=0;
  const stripe={subscriptions:{
    retrieve:async()=>value,
    update:async(id,params,options)=>{
      writes++;
      assert.equal(id,'sub_test_1');
      assert.equal(params.trial_end,end);
      assert.equal(params.pause_collection,'');
      assert.equal(params.proration_behavior,'none');
      assert.equal(params.metadata.setup_billing_released,'1');
      assert.equal(options.idempotencyKey,'respondo-assisted-setup-release-cs_abcdefghijkl');
      value=subscription({
        trial_end:end,pause_collection:null,
        metadata:{setup_billing_mode:ASSISTED_SETUP_BILLING_MODE,setup_billing_released:'1'},
      });
      return value;
    },
  }};
  // We are validating a fixed historical timestamp to assert amount/structure.
  // The production function also rejects expired handover trial endpoints.
  const getNow=Date.now;
  Date.now=()=>Date.parse(approvedAt);
  try{
    const result=await releaseAssistedSetupBilling(stripe,'sub_test_1','cs_abcdefghijkl',approvedAt);
    assert.deepEqual(result,{released:true,trialEnd:end});
    const retry=await releaseAssistedSetupBilling(stripe,'sub_test_1','cs_abcdefghijkl',approvedAt);
    assert.deepEqual(retry,{released:true,alreadyReleased:true,trialEnd:end});
    assert.equal(writes,1);
  }finally{Date.now=getNow;}
});

test('unheld subscription cannot be prematurely released, legacy setup is unchanged',async()=>{
  const stripe={subscriptions:{retrieve:async()=>subscription(),update:async()=>{throw Error('must not call');}}};
  await assert.rejects(
    releaseAssistedSetupBilling(stripe,'sub_test_1','cs_abcdefghijkl',new Date()),
    /held and trialing/,
  );
  stripe.subscriptions.retrieve=async()=>subscription({metadata:{setup_service:'1'}});
  assert.deepEqual(
    await releaseAssistedSetupBilling(stripe,'sub_test_1','cs_abcdefghijkl',new Date()),
    {legacy:true},
  );
});
