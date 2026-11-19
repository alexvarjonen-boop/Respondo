import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  ensureQuoteRuleVersionsSchema,
  listTenantQuoteRuleVersions,
  saveTenantQuoteRules
} from '../quote-rule-versions.mjs';

const legacy = {
  quote_rule_version:0,
  quote_service_name:'Window cleaning',
  quote_unit_label:'windows',
  quote_base_price:'25.00',
  quote_unit_price:'15.00',
  quote_min_price:'0.00',
  quote_vat_percent:'0.00',
  quote_discount_over_quantity:'20.000',
  quote_discount_percent:'10.00'
};
const form = {
  tenantId:'t1',
  ownerId:'u1',
  serviceName:'Window cleaning',
  unitLabel:'windows',
  pricing:{base:25,unit:20,minimum:0,vatPercent:0,discountOverQuantity:null,discountPercent:0},
  saveDiscount:false,
  expectedVersion:0
};
const read = filename => readFileSync(new URL('../'+filename,import.meta.url),'utf8');

function testDb(row, failVersionWrite = false) {
  const calls = [];
  const db = {connect:async()=>({
    query:async(sql,args) => {
      calls.push({sql,args});
      if (sql.includes('FOR UPDATE')) return {rows:row ? [row] : []};
      if (failVersionWrite && sql.includes('VALUES($1,$2,$3::jsonb,NOW())')) throw Error('insert failed');
      return {rows:[]};
    },
    release() { calls.push({sql:'release'}); }
  })};
  return {db,calls};
}

test('first real edit records legacy and updated snapshots and preserves an omitted discount',async()=>{
  const {db,calls} = testDb(legacy);
  assert.deepEqual(await saveTenantQuoteRules(db,form),{changed:true,ruleVersion:2});
  assert.equal(calls[0].sql,'BEGIN');
  assert.match(calls[1].sql,/WHERE id=\$1 AND owner_user_id=\$2 FOR UPDATE/);
  assert.deepEqual(calls[1].args,['t1','u1']);
  assert.match(calls[2].sql,/VALUES\(\$1,1,\$2::jsonb,NULL\)/);
  assert.deepEqual(JSON.parse(calls[2].args[1]),{
    serviceName:'Window cleaning',unitLabel:'windows',basePrice:25,unitPrice:15,distancePrice:0,minPrice:0,
    vatPercent:0,discountOverQuantity:20,discountPercent:10
  });
  assert.deepEqual(calls[3].args,['t1','u1','Window cleaning',25,20,0,0,'windows',20,10,2,0]);
  assert.equal(JSON.parse(calls[4].args[2]).unitPrice,20);
  assert.equal(calls[5].sql,'COMMIT');
  assert.equal(calls[6].sql,'release');
});

test('equivalent retries skip writes while changed stale forms return a conflict',async()=>{
  const row = {...legacy,quote_rule_version:2,quote_unit_price:'20.00'};
  const retry = testDb(row);
  assert.deepEqual(await saveTenantQuoteRules(retry.db,form),{changed:false,ruleVersion:2});
  assert.equal(retry.calls[2].sql,'COMMIT');
  assert.equal(retry.calls.length,4);

  const stale = testDb(row);
  assert.deepEqual(await saveTenantQuoteRules(stale.db,{...form,pricing:{...form.pricing,unit:30}}),{
    conflict:true,ruleVersion:2
  });
  assert.equal(stale.calls[2].sql,'ROLLBACK');
  assert.equal(stale.calls.length,4);
});

test('missing owners and failed history records leave no committed change',async()=>{
  const missing = testDb(null);
  assert.equal(await saveTenantQuoteRules(missing.db,form),null);
  assert.equal(missing.calls[2].sql,'ROLLBACK');

  const failing = testDb(legacy,true);
  await assert.rejects(saveTenantQuoteRules(failing.db,form),/insert failed/);
  assert.ok(failing.calls.some(({sql}) => sql.includes('UPDATE public.tenants')));
  assert.ok(!failing.calls.some(({sql}) => sql==='COMMIT'));
  assert.equal(failing.calls.at(-2).sql,'ROLLBACK');
  assert.equal(failing.calls.at(-1).sql,'release');
});

test('owner list is bounded and uses a tenant-scoped exclusive version cursor',async()=>{
  const db = {query:async(sql,args) => {
    assert.match(sql,/WHERE versions.tenant_id=\$1 AND tenant.owner_user_id=\$2/);
    assert.match(sql,/versions.version < \$3\)/);
    assert.deepEqual(args,['t1','u1',19,16]);
    return {rows:Array.from({length:16},(_,i)=>({
      version:18-i,snapshot:{basePrice:i},recorded_at:null
    }))};
  }};
  const response = await listTenantQuoteRuleVersions(db,{tenantId:'t1',ownerId:'u1',before:'19'});
  assert.equal(response.versions.length,15);
  assert.equal(response.nextBefore,4);
  assert.deepEqual(response.versions[0],{version:18,pricing:{basePrice:0,distancePrice:0},recordedAt:null});
  await assert.rejects(listTenantQuoteRuleVersions(db,{tenantId:'t1',ownerId:'u1',before:['19']}),RangeError);
});

test('history schema and owner UI keep the snapshots private and restore explicitly',async()=>{
  const sql = [];
  await ensureQuoteRuleVersionsSchema({query: async text => { sql.push(text); }});
  assert.match(sql[1],/PRIMARY KEY \(tenant_id,version\)/);
  assert.match(sql[1],/REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
  assert.match(sql[2],/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql[3],/FROM PUBLIC$/);
  assert.match(sql[4],/ARRAY\['anon','authenticated','service_role'\]/);
  assert.match(sql[4],/IF EXISTS \(SELECT 1 FROM pg_roles WHERE rolname=api_role\) THEN/);
  const shell = read('public/app.js');
  assert.match(shell,/<details id="quoteRuleVersions">[\s\S]+?<p role="status">/);
  const ui = read('public/quote-rule-history.mjs');
  assert.match(ui,/form.elements\[key\].value = value/);
  assert.doesNotMatch(ui,/requestSubmit\(|\.submit\(/);
  const server = read('server.mjs');
  assert.match(server,/app\.get\('\/api\/app\/quote-engine\/versions', auth, ownerOnly, subscribed/);
  assert.match(server,/tenantId:access.tenant.id,ownerId:req.user.sub,before:req.query.before/);
});
