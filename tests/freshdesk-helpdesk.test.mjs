import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encryptCrmToken} from '../crm-connectors.mjs';
import {
  helpdeskDomain,validateFreshdeskRequester,freshdeskRequest,
  verifyFreshdesk,ensureFreshdeskSchema,connectFreshdesk,freshdeskStatus,
  retestFreshdesk,disconnectFreshdesk,exportFreshdeskTicket
} from '../freshdesk-helpdesk.mjs';

const tenant='c75bb41f-0277-4448-ae3b-dcebb568c53c';
const ticket='0a11a9d4-6700-4b81-a757-92e1d7961bf6';
const KEY='freshdesk_key_test_1234567890';
process.env.DATA_ENCRYPTION_KEY='freshdesk-cipher-testing-key-with-sufficient-length';

test('subdomain is restricted to real Freshdesk hostnames and requester is valid',()=>{
  assert.equal(helpdeskDomain('Example.freshdesk.com'),'example');
  assert.equal(helpdeskDomain('store-support'),'store-support');
  for(const bad of ['foo.example.com','https://evil.com','example.freshdesk.com.evil.com',
    'localhost:4000','bad/a','-evil','', 'a'.repeat(80)])
    assert.throws(()=>helpdeskDomain(bad),TypeError);
  assert.equal(validateFreshdeskRequester(' Test@Example.COM '),'test@example.com');
  assert.throws(()=>validateFreshdeskRequester('no-email'),TypeError);
});
test('Freshdesk requests use exact vendor HTTPS endpoint, no redirects and no browser token',()=>{
  const r=freshdeskRequest('acme',KEY,'POST','tickets',{subject:'New'});
  assert.equal(r.url,'https://acme.freshdesk.com/api/v2/tickets');
  assert.equal(r.options.method,'POST');
  assert.equal(r.options.redirect,'error');
  assert.equal(r.options.headers.authorization,
    'Basic '+Buffer.from(KEY+':X').toString('base64'));
  assert.equal(JSON.parse(r.options.body).subject,'New');
});
test('read-only credential verification rejects non-agent responses',async()=>{
  const got=[];
  const fetchImpl=async(url,options)=>{
    got.push([url,options]);
    return new Response(JSON.stringify({id:123}),{status:200,headers:{'content-type':'application/json'}});
  };
  assert.deepEqual(await verifyFreshdesk('test',KEY,{fetchImpl}),{connected:true});
  assert.equal(got[0][1].method,'GET');
  assert.match(got[0][0],/api\/v2\/agents\/me$/);
  const invalid=await verifyFreshdesk('test',KEY,{fetchImpl:async()=>new Response('{}',{status:200})});
  assert.equal(invalid.connected,false);
  assert.equal((await verifyFreshdesk('test',KEY,{fetchImpl:async()=>new Response('No',{status:401})})).connected,false);
});
test('connection verifies before persisting, encrypts credentials, and never returns raw key',async()=>{
  const queries=[];
  const db={query:async(sql,args)=>{queries.push([sql,args]);return {rows:[]};}};
  const result=await connectFreshdesk(db,tenant,{subdomain:'company',apiKey:KEY},
    {fetchImpl:async()=>new Response(JSON.stringify({id:7}),{status:200})});
  assert.equal(result.connected,true);
  assert.ok(!JSON.stringify(result).includes(KEY));
  assert.ok(queries[0][1][2].includes('.'));
  assert.ok(!queries[0][1][2].includes(KEY));
  assert.equal(queries[0][1][0],tenant);
  const failed=await connectFreshdesk(db,tenant,{subdomain:'company',apiKey:KEY},
    {fetchImpl:async()=>new Response('',{status:401})});
  assert.equal(failed.connected,false);
  assert.equal(queries.length,1);
});
test('schema is tenant-isolated and hides credentials and ticket export ledger',async()=>{
  const commands=[];
  const db={query:async(sql)=>{
    commands.push(sql);
    if(sql.includes('SELECT rolname'))return {rows:[{rolname:'anon'},{rolname:'authenticated'},{rolname:'service_role'}]};
    return {rows:[]};
  }};
  await ensureFreshdeskSchema(db);
  const all=commands.join('\n');
  assert.match(all,/respondo_freshdesk_connections/);
  assert.match(all,/respondo_freshdesk_exports/);
  assert.match(all,/REFERENCES public.tenants\(id\) ON DELETE CASCADE/);
  assert.match(all,/REFERENCES public.respondo_native_tickets\(id\) ON DELETE CASCADE/);
  assert.equal(commands.filter(x=>x.includes('ENABLE ROW LEVEL SECURITY')).length,2);
  assert.match(all,/FROM anon/);
  assert.match(all,/FROM authenticated/);
  assert.match(all,/FROM service_role/);
});
test('explicit approved ticket is exported exactly once and external ID persisted',async()=>{
  const credential=encryptCrmToken(KEY);
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes('FROM respondo_freshdesk_connections'))return {rows:[{subdomain:'company',encrypted_key:credential}]};
    if(sql.includes('FROM respondo_native_tickets'))return {rows:[{id:ticket,title:'Needs callback',details:'Please call me',priority:'urgent'}]};
    if(sql.includes('INSERT INTO respondo_freshdesk_exports'))return {rowCount:1,rows:[{status:'processing'}]};
    return {rows:[],rowCount:1};
  }};
  const sent=[];
  const result=await exportFreshdeskTicket(db,tenant,ticket,{requesterEmail:'customer@example.com',approved:true},{
    fetchImpl:async(url,options)=>{
      sent.push([url,options]);return new Response(JSON.stringify({id:937}),{status:201});
    }
  });
  assert.equal(result.status,'sent');
  assert.equal(result.externalTicketId,'937');
  assert.equal(sent.length,1);
  assert.match(sent[0][0],/company\.freshdesk\.com\/api\/v2\/tickets$/);
  const body=JSON.parse(sent[0][1].body);
  assert.equal(body.email,'customer@example.com');
  assert.equal(body.priority,4);
  assert.equal(body.status,2);
  assert.equal(calls.at(-1)[1][0],tenant);
  await assert.rejects(exportFreshdeskTicket(db,tenant,ticket,{approved:false,requesterEmail:'customer@example.com'}),TypeError);
});
test('duplicates cannot create another external ticket; failed acknowledgements are not retried',async()=>{
  const credential=encryptCrmToken(KEY);
  const mockDb=status=>({query:async(sql,args)=>{
    if(sql.includes('FROM respondo_freshdesk_connections'))return {rows:[{subdomain:'company',encrypted_key:credential}]};
    if(sql.includes('FROM respondo_native_tickets'))return {rows:[{id:ticket,title:'Helpdesk issue'}]};
    if(sql.includes('INSERT INTO respondo_freshdesk_exports'))return {rowCount:status==='new'?1:0,rows:status==='new'?[{status:'processing'}]:[]};
    if(sql.includes('SELECT status,external_ticket_id'))return {rows:[{status,external_ticket_id:'101'}]};
    return {rows:[],rowCount:1};
  }});
  let externalCalls=0;
  const duplicate=await exportFreshdeskTicket(mockDb('sent'),tenant,ticket,{requesterEmail:'c@example.org',approved:true},{
    fetchImpl:async()=>{externalCalls++;return new Response('{}',{status:200});}
  });
  assert.equal(duplicate.duplicate,true);
  assert.equal(externalCalls,0);
  const unknown=await exportFreshdeskTicket(mockDb('new'),tenant,ticket,{requesterEmail:'c@example.org',approved:true},{
    fetchImpl:async()=>{throw new Error('timeout');}
  });
  assert.equal(unknown.status,'unknown');
  assert.equal(unknown.requiresReconciliation,true);
  assert.equal(externalCalls,0);
});
test('status and disconnect do not expose stored secret or erase the export audit',async()=>{
  const queries=[];
  const db={query:async(sql,args)=>{
    queries.push([sql,args]);
    if(sql.includes('SELECT subdomain,verified_at'))return {rows:[{subdomain:'company',verified_at:'2026-11-04'}]};
    if(sql.includes('FROM respondo_freshdesk_exports'))return {rows:[{status:'sent',external_ticket_id:'123'}]};
    if(sql.includes('SELECT subdomain,encrypted_key'))return {rows:[{subdomain:'company',encrypted_key:encryptCrmToken(KEY)}]};
    return {rowCount:1,rows:[]};
  }};
  const status=await freshdeskStatus(db,tenant);
  assert.equal(status.connected,true);
  assert.ok(!JSON.stringify(status).includes(KEY));
  assert.deepEqual(await disconnectFreshdesk(db,tenant),{connected:false});
  assert.ok(!queries.some(([sql])=>sql.includes('DELETE FROM respondo_freshdesk_exports')));
});
test('Enterprise + owner authentication is enforced for all connector paths',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../server-entry.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
  assert.match(entry,/await ensureFreshdeskSchema\(pool\)/);
  assert.match(server,/app\.get\('\/api\/app\/helpdesk\/freshdesk',auth,ownerOnly,subscribed,nativeEndpoint/);
  assert.match(server,/app\.post\('\/api\/app\/helpdesk\/freshdesk',auth,ownerOnly,subscribed,nativeWriteLimiter,nativeEndpoint/);
  assert.match(server,/app\.post\('\/api\/app\/helpdesk\/freshdesk\/tickets\/:id\/export'/);
  assert.match(server,/exportFreshdeskTicket\(pool,id,req\.params\.id,req\.body\|\|\{\}\),\{quote:true\}/);
  assert.match(ui,/helpdeskIntro:/);
  assert.match(ui,/exportApproval:/);
  assert.match(ui,/checked\.checked/);
  assert.match(ui,/autocomplete='new-password'/);
});
