import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SETUP_BILLING_HOLD_DAYS, setupPlanTrialDays,
  ensureManualSetupBillingOnHold, startManualSetupBilling,
} from '../setup-billing.mjs';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const traffic=readFileSync(new URL('../public/traffic.html',import.meta.url),'utf8');
const sub={id:'sub_manualsetup',status:'trialing',metadata:{setup_billing_deferred:'1'},pause_collection:null};

test('paid setup holds recurring plan until handover; other checkouts retain 3-day trial',()=>{
  assert.equal(SETUP_BILLING_HOLD_DAYS,365);
  assert.equal(setupPlanTrialDays(true),365);
  assert.equal(setupPlanTrialDays(false),3);
  assert.equal((server.match(/trial_period_days:\s*setupPlanTrialDays\(setupService\)/g)||[]).length,1);
  assert.match(server,/trial_period_days:\s*setupPlanTrialDays\(setupService\)/);
  assert.match(server,/setup_billing_deferred:'1'/);
  assert.match(server,/line_items:setupService\s*\?\s*\[checkoutLineItem,setupServiceCheckoutLineItem\(\)\]/);
});

test('hold is strictly for deferred setup and uses Stripe indefinite void collection',async()=>{
  let updates=0;
  const stripe={subscriptions:{
    retrieve:async()=>sub,
    update:async(id,p,opts)=>{
      updates++;
      assert.equal(id,'sub_manualsetup');
      assert.deepEqual(p,{pause_collection:{behavior:'void'}});
      assert.equal(opts.idempotencyKey,'respondo-hold-sub_manualsetup');
      return {...sub,pause_collection:{behavior:'void'}};
    },
  }};
  assert.deepEqual(await ensureManualSetupBillingOnHold(stripe,sub.id),{deferred:true,held:true});
  assert.equal(updates,1);
  stripe.subscriptions.retrieve=async()=>({...sub,pause_collection:{behavior:'void'}});
  assert.deepEqual(await ensureManualSetupBillingOnHold(stripe,sub.id),{deferred:true,alreadyHeld:true});
  stripe.subscriptions.retrieve=async()=>({...sub,metadata:{}});
  assert.deepEqual(await ensureManualSetupBillingOnHold(stripe,sub.id),{deferred:false});
  assert.equal(updates,1);
});

test('owner confirmation releases pause and ends trial exactly once in one Stripe update',async()=>{
  let calls=0;
  const stripe={subscriptions:{
    update:async(id,p,opts)=>{
      calls++;
      assert.equal(id,sub.id);
      assert.equal(p.trial_end,'now');
      assert.equal(p.pause_collection,'');
      assert.equal(p.proration_behavior,'none');
      assert.equal(p.metadata.setup_billing_started,'1');
      assert.equal(p.metadata.setup_billing_handover_session,'cs_handover_example');
      assert.equal(opts.idempotencyKey,'respondo-handover-billing-cs_handover_example');
      return {id,status:'active',pause_collection:null};
    },
  }};
  assert.deepEqual(await startManualSetupBilling(stripe,sub,'cs_handover_example'),{deferred:true,startedNow:true,status:'active'});
  assert.deepEqual(await startManualSetupBilling(stripe,{...sub,metadata:{...sub.metadata,setup_billing_started:'1'}},'cs_handover_example'),{deferred:true,startedNow:false,alreadyStarted:true});
  assert.deepEqual(await startManualSetupBilling(stripe,{...sub,metadata:{}},'cs_handover_example'),{deferred:false,startedNow:false});
  assert.equal(calls,1);
});

test('Stripe failures never mark setup as ready or bill legacy subscriptions',async()=>{
  await assert.rejects(startManualSetupBilling({subscriptions:{update:async()=>{throw new Error('network')}}},sub,'cs_handover_example'));
  await assert.rejects(startManualSetupBilling({subscriptions:{}},{...sub,status:'active'},'cs_handover_example'),/already left trialing/);
  await assert.rejects(startManualSetupBilling({subscriptions:{update:async()=>({...sub,status:'trialing',pause_collection:{behavior:'void'}})}},sub,'cs_handover_example'),/did not release/);
  assert.match(server,/const billing=await startManualSetupBilling\(stripe,subscription,sessionId\);/);
  const code=server.slice(server.indexOf("app.post('/api/app/internal/setup-service-requests/:id/handover'"),server.indexOf("// Disable the former auto-delivery endpoint"));
  assert.ok(code.indexOf('const billing=await startManualSetupBilling')<code.indexOf("UPDATE setup_service_requests"));
  assert.match(code,/pg_try_advisory_lock/);
  assert.match(code,/status='ready',billing_started_at/);
});

test('client checkout, email, confirmation and owner traffic page disclose deferred recurring charge',()=>{
  assert.match(app,/Valitun paketin kuukausi- tai vuosilaskutus alkaa vasta/);
  assert.match(app,/paketin laskutus alkaa vasta/);
  assert.match(app,/Monthly or annual plan billing begins only/);
  assert.match(traffic,/Stripe-laskutuksen heti/);
  assert.match(server,/ensureManualSetupBillingOnHold\(stripe,subscriptionId\)/);
  assert.match(server,/ALTER TABLE setup_service_requests ADD COLUMN IF NOT EXISTS billing_started_at/);
  assert.match(server,/app\.post\('\/api\/app\/internal\/setup-service-requests\/:id\/handover', auth, ownerTrafficOnly/);
});
