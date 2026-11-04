import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  validateContact,calculateNativeQuote,ensureNativeOperationsSchema,nativeOverview,
  createNativeContact,updateNativeContact,createNativeTicket,updateNativeTicket,
  createNativeQuote,updateNativeQuote,setNativeRule,saveNativeDocument,removeNativeDocument,
  runNativeAutomation
} from '../native-ai-operations.mjs';

const files=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const TENANT='e6139f85-2222-4e56-b12f-d106c88cc172';
const LEAD='c93d5a13-1020-4ce3-8470-f5d719d60f42';

test('strict contact details and native quote amount are deterministic, no paid model required',()=>{
  assert.deepEqual(validateContact({name:' Liisa ',email:'LIISA@TEST.FI',note:'Moi'}),{
    name:'Liisa',email:'liisa@test.fi',phone:'',note:'Moi',stage:'new'
  });
  assert.throws(()=>validateContact({name:'Liisa',email:'a@invalid'}),TypeError);
  const quote=calculateNativeQuote({
    quote_service_name:'Muuttopalvelu',quote_base_price:50,quote_unit_price:12.5,
    quote_min_price:80,quote_vat_percent:0
  },4);
  assert.deepEqual(quote,{service:'Muuttopalvelu',quantity:4,totalCents:10000,currency:'EUR'});
  assert.throws(()=>calculateNativeQuote({quote_base_price:0},1));
  assert.throws(()=>calculateNativeQuote({quote_base_price:10},-1));
});

test('all native database tables have tenant foreign keys, RLS and Data API grants revoked',async()=>{
  const calls=[];const db={query:async sql=>{calls.push(sql);return {rows:[]};}};
  await ensureNativeOperationsSchema(db);
  const tables=['respondo_native_contacts','respondo_native_tickets','respondo_native_quotes',
    'respondo_native_rules','respondo_native_runs','respondo_native_documents'];
  for(const table of tables){
    assert.ok(calls.some(x=>x.includes('CREATE TABLE IF NOT EXISTS public.'+table)));
    assert.ok(calls.includes('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY'));
    assert.ok(calls.includes('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM PUBLIC, anon, authenticated, service_role'));
  }
  assert.equal(calls.filter(sql=>sql.includes('REFERENCES public.tenants(id) ON DELETE CASCADE')).length,6);
});

test('native overview reads only authenticated tenant rows and creates fixed safe rules',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[]};}};
  const result=await nativeOverview(db,TENANT);
  for(const key of ['contacts','tickets','quotes','rules','documents','recentRuns'])
    assert.deepEqual(result[key],[]);
  assert.ok(calls.every(x=>x[1].includes(TENANT)));
  assert.equal(calls.filter(x=>x[0].includes('INSERT INTO respondo_native_rules')).length,2);
});

test('creating and updating records always includes tenant ID and only allowed state transitions',async()=>{
  const calls=[];
  const db={query:async(sql,params)=>{
    calls.push({sql,params});return {rows:[{id:LEAD}]};
  }};
  await createNativeContact(db,TENANT,{name:'Liisa',email:'a@example.com'});
  await createNativeTicket(db,TENANT,{title:'Need callback',priority:'urgent'});
  await updateNativeTicket(db,TENANT,LEAD,{status:'in_progress'});
  await updateNativeContact(db,TENANT,LEAD,{stage:'contacted'});
  assert.ok(calls.every(x=>x.params[0]===TENANT));
  assert.throws(()=>updateNativeContact(db,TENANT,'not uuid',{stage:'won'}),TypeError);
  await assert.rejects(updateNativeTicket(db,TENANT,LEAD,{status:'arbitrary'}),TypeError);
});

test('manual quote uses database prices, never accepts browser-specified final amount',async()=>{
  const calls=[];
  const db={query:async(sql,params)=>{
    calls.push({sql,params});
    if(sql.includes('FROM tenants'))return {rows:[{quote_service_name:'Window cleaning',
      quote_base_price:55,quote_unit_price:3,quote_min_price:0,quote_vat_percent:0}]};
    return {rows:[{id:LEAD}]};
  }};
  await createNativeQuote(db,TENANT,10,'Needs approval');
  const insert=calls.find(x=>x.sql.includes('INSERT INTO respondo_native_quotes'));
  assert.equal(insert.params[3],8500);
  assert.equal(insert.params[0],TENANT);
  await updateNativeQuote(db,TENANT,LEAD,'approved');
  assert.ok(calls.some(x=>x.sql.includes('UPDATE respondo_native_quotes')));
});

test('only fixed safe rules can be enabled or disabled',async()=>{
  const db={query:async()=>({rows:[{id:LEAD,enabled:false}]})};
  assert.ok((await setNativeRule(db,TENANT,'lead_captured','save_contact',false)).id);
  await assert.rejects(setNativeRule(db,TENANT,'billing_change','send_money',true),TypeError);
  await assert.rejects(setNativeRule(db,TENANT,'action_requested','send_email',true),TypeError);
});

test('repeated event is idempotent, and workflow runs before internal side effect',async()=>{
  let first=true;
  const calls=[];
  const db={
    query:async(sql)=>sql.includes('SELECT id,action_key FROM respondo_native_rules')
      ?{rows:[{id:LEAD,action_key:'save_contact'}]}:{rows:[]},
    connect:async()=>({
      query:async(sql,params)=>{
        calls.push({sql,params});
        if(sql.includes('INSERT INTO respondo_native_runs')){
          if(first){first=false;return {rowCount:1,rows:[{id:LEAD}]};}
          return {rowCount:0,rows:[]};
        }
        return {rowCount:1,rows:[]};
      },release:()=>{}
    })
  };
  const event={id:LEAD,name:'Olli',email:'olli@example.com',note:'New inquiry'};
  assert.deepEqual(await runNativeAutomation(db,TENANT,'lead_captured',event),{executed:1});
  assert.deepEqual(await runNativeAutomation(db,TENANT,'lead_captured',event),{executed:0});
  assert.equal(calls.filter(c=>c.sql.includes('INSERT INTO respondo_native_contacts')).length,1);
  assert.equal(calls.filter(c=>c.sql==='COMMIT').length,2);
  assert.ok(calls.filter(c=>c.sql.includes('INSERT INTO respondo_native_runs'))
    .every(c=>c.params[0]===TENANT));
  await assert.rejects(runNativeAutomation(db,TENANT,'unknown',event),TypeError);
});

test('customer action creates only internal ticket, not external call or unsafe arbitrary action',async()=>{
  let ticketSaved=false;
  const db={
    query:async sql=>sql.includes('SELECT id,action_key FROM respondo_native_rules')
      ?{rows:[{id:LEAD,action_key:'open_ticket'}]}:{rows:[]},
    connect:async()=>({
      query:async sql=>{
        if(sql.includes('respondo_native_tickets'))ticketSaved=true;
        return {rowCount:1,rows:[{id:LEAD}]};
      },release:()=>{}
    })
  };
  assert.deepEqual(await runNativeAutomation(db,TENANT,'action_requested',{
    id:LEAD,title:'Quote request',details:'Needs removal truck'
  }),{executed:1});
  assert.ok(ticketSaved);
});

test('documents need explicit owner approval, enter existing bot knowledge and can be revoked',async()=>{
  const calls=[];
  const db={connect:async()=>({
    query:async(sql,args)=>{calls.push({sql,args});return {rowCount:1,rows:[{id:LEAD,knowledge_id:LEAD}]};},
    release:()=>{}
  })};
  await assert.rejects(saveNativeDocument(db,TENANT,{
    title:'Service prices',body:'The price is 200 euros each.',publish:false
  }),TypeError);
  await saveNativeDocument(db,TENANT,{title:'Service prices',body:'The price is 200 euros each.',publish:true});
  assert.ok(calls.some(x=>x.sql.includes("'native_document',TRUE,NOW()")));
  assert.ok(calls.some(x=>x.sql.includes('INSERT INTO respondo_native_documents')));
  assert.equal(await removeNativeDocument(db,TENANT,LEAD),true);
  assert.ok(calls.some(x=>x.sql.includes("source_type='native_document'")));
});

test('public events trigger only first-party rules after consent and authenticated action validation',()=>{
  const server=files('server.mjs');
  const lead=server.indexOf("app.post('/api/public/:slug/lead'");
  const action=server.indexOf("app.post('/api/public/:slug/action-request'");
  assert.ok(lead>0&&action>0);
  const leadBody=server.slice(lead,lead+5000);
  assert.ok(leadBody.indexOf("body.consent !== true")>=0);
  assert.ok(leadBody.indexOf("runNativeAutomation(pool,tenant.id,'lead_captured'")>leadBody.indexOf("body.consent !== true"));
  assert.ok(server.includes("runNativeAutomation(pool,tenant.id,'action_requested'"));
  assert.ok(server.includes('await validateWidgetActionRequest(req, tenant, body)'));
});

test('owner-only same-site native APIs never trust supplied tenant IDs',()=>{
  const server=files('server.mjs');
  const entry=files('server-entry.mjs');
  const app=files('public/app.js');
  const ws=files('public/workspace-continuation-v24.js');
  const index=files('public/index.html');
  for(const endpoint of ['/api/app/native/contacts','/api/app/native/tickets',
    '/api/app/native/quotes','/api/app/native/documents','/api/app/native/rules'])
    assert.ok(server.includes(endpoint));
  assert.match(server,/app\.get\('\/api\/app\/native',auth,ownerOnly,subscribed/);
  assert.match(server,/app\.post\('\/api\/app\/native\/contacts',auth,ownerOnly,subscribed/);
  assert.match(server,/nativeTenant\(req,res\)/);
  assert.match(server,/activeTenantPlan\(req\.user\.sub\)/);
  assert.match(server,/nativeWriteLimiter/);
  assert.match(entry,/await ensureNativeOperationsSchema\(pool\)/);
  assert.match(app,/id="native-operations"/);
  assert.match(ws,/\['native-operations',translate\(/);
  assert.match(index,/native-ai-operations\.js\?v=/);
  assert.match(index,/native-ai-operations\.css\?v=/);
});

test('built-in tool UI is usable in three languages, displays no external credentials',()=>{
  const ui=files('public/native-ai-operations.js');
  const css=files('public/native-ai-operations.css');
  for(const value of ['fi:{','sv:{','en:{','Customer CRM','Knowledge documents','Tukipyynnöt',
    'Support tickets','Automations'])assert.ok(ui.includes(value),value);
  assert.match(ui,/credentials:'same-origin'/);
  assert.match(ui,/textContent/);
  assert.match(ui,/aria-live/);
  assert.match(css,/-webkit-text-fill-color:#172638!important/);
  assert.match(css,/background:#f7f8fa!important/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
