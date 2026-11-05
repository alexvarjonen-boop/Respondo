import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  crmProviderAllowed,encryptCrmToken,decryptCrmToken,
  verifyCrmCredential,readCrmCredential,connectCrmCredential,
  crmConnectorStatus,disconnectCrmCredential
} from '../crm-connectors.mjs';

const secret='respondo-crm-connector-test-only-strong-key-abc123';
process.env.DATA_ENCRYPTION_KEY=secret;
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('CRM tokens use authenticated encryption and never survive tampering or the wrong key',()=>{
  const token='pat-eu1-abcdefghijklmnopqrstuvwxyz123456';
  const ciphertext=encryptCrmToken(token);
  assert.ok(!ciphertext.includes(token));
  assert.equal(decryptCrmToken(ciphertext),token);
  assert.notEqual(encryptCrmToken(token),ciphertext,'unique IV');
  assert.throws(()=>decryptCrmToken(ciphertext,{DATA_ENCRYPTION_KEY:'another-long-and-different-encryption-secret'}));
  // Flip an actual ciphertext byte. Replacing trailing base64url characters
  // can change only unused padding bits and accidentally preserve the bytes.
  const pieces=ciphertext.split('.');
  const bytes=Buffer.from(pieces[2],'base64url');
  bytes[0]^=0x01;
  const tampered=[pieces[0],pieces[1],bytes.toString('base64url')].join('.');
  assert.throws(()=>decryptCrmToken(tampered));
  assert.equal(crmProviderAllowed('hubspot'),true);
  assert.equal(crmProviderAllowed('pipedrive'),true);
  assert.equal(crmProviderAllowed('arbitrary-url'),false);
  assert.throws(()=>encryptCrmToken('abc'));
});

test('HubSpot verification is read-only, scoped to official HTTPS host and token',async()=>{
  let called=0;
  const result=await verifyCrmCredential('hubspot','pat-eu1-abcdefghijklmnop',{fetchImpl:async(url,options)=>{
    called++;
    assert.equal(url,'https://api.hubapi.com/crm/v3/objects/contacts?limit=1');
    assert.equal(options.method,'GET');
    assert.equal(options.redirect,'error');
    assert.equal(options.headers.authorization,'Bearer pat-eu1-abcdefghijklmnop');
    assert.ok(options.signal);
    return {ok:true,status:200};
  }});
  assert.deepEqual(result,{ok:true});
  assert.equal(called,1);
});

test('Pipedrive uses required x-api-token header; denied accounts are not connected',async()=>{
  const result=await verifyCrmCredential('pipedrive','pipedrive-long-token-1234567',{fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.pipedrive.com/api/v1/users/me');
    assert.equal(options.headers['x-api-token'],'pipedrive-long-token-1234567');
    assert.equal(options.headers.authorization,undefined);
    return {ok:false,status:401};
  }});
  assert.deepEqual(result,{ok:false,status:401});
});

test('connecting a provider verifies before saving credentials and settings in one transaction',async()=>{
  const sql=[];
  const db={
    connect:async()=>({query:async(query,args)=>{sql.push({query,args});return {rows:[]};},release:()=>sql.push({query:'release'})})
  };
  const result=await connectCrmCredential(db,'tenant-one','hubspot','pat-eu1-abcdefghijklmnop',{
    fetchImpl:async()=>({ok:true,status:200})
  });
  assert.deepEqual(result,{connected:true,provider:'hubspot'});
  assert.ok(sql.some(row=>row.query==='BEGIN'));
  assert.ok(sql.some(row=>row.query==='COMMIT'));
  const row=sql.find(row=>row.query.includes('INSERT INTO respondo_crm_credentials'));
  assert.deepEqual(row.args.slice(0,2),['tenant-one','hubspot']);
  assert.ok(!row.args[2].includes('pat-eu1'));
  assert.equal(decryptCrmToken(row.args[2]),'pat-eu1-abcdefghijklmnop');
  const setting=sql.find(row=>row.query.includes('INSERT INTO respondo_crm_settings'));
  assert.deepEqual(setting.args,['tenant-one','hubspot']);
});

test('failed credential verification cannot write a token or enable the connector',async()=>{
  let wrote=false;
  const db={connect:async()=>{wrote=true;throw Error('Unexpected DB transaction');}};
  const result=await connectCrmCredential(db,'tenant-one','pipedrive','abcdefghijklmnop123',{
    fetchImpl:async()=>({ok:false,status:403})
  });
  assert.equal(result.connected,false);
  assert.equal(wrote,false);
});

test('status never leaks tokens and queries always constrain tenant ID',async()=>{
  const calls=[];
  const db={query:async(sql,args)=>{
    calls.push({sql,args});
    if(sql.includes('FROM respondo_crm_settings'))return {rows:[{provider:'hubspot',enabled:true}]};
    if(sql.includes('FROM respondo_crm_credentials'))return {rows:[{provider:'hubspot',verified_at:'2026-11-04T01:00:00Z'}]};
    return {rows:[{status:'pending',total:2},{status:'failed',total:1}]};
  }};
  const status=await crmConnectorStatus(db,'tenant-one');
  assert.deepEqual(status.queue,{pending:2,failed:1});
  assert.equal(status.connected,true);
  assert.ok(!JSON.stringify(status).includes('token'));
  assert.ok(calls.every(call=>call.args.length===1&&call.args[0]==='tenant-one'));
});

test('readCrmCredential does not treat legacy mock settings as encrypted credentials',async()=>{
  const db={query:async()=>({rows:[{provider:'pipedrive',enabled:true}]})};
  assert.equal(await readCrmCredential(db,'tenant-a'),null);
});

test('disconnect deletes credential, disables sync and clears unsent outbox in transaction',async()=>{
  const sql=[];
  const db={connect:async()=>({query:async(statement,args)=>{sql.push({statement,args});return {rows:[]};},release:()=>{}})};
  assert.deepEqual(await disconnectCrmCredential(db,'tenant-a'),{connected:false});
  assert.equal(sql[0].statement,'BEGIN');
  assert.ok(sql.some(x=>x.statement.includes('enabled=FALSE')));
  assert.ok(sql.some(x=>x.statement.startsWith('DELETE FROM respondo_crm_credentials')));
  assert.ok(sql.some(x=>x.statement.includes('respondo_crm_outbox')));
  assert.equal(sql.at(-1).statement,'COMMIT');
  assert.ok(sql.filter(x=>x.args?.length).every(x=>x.args[0]==='tenant-a'));
});

test('connector endpoints are tenant-scoped, owner-only, plan-gated and never return stored keys',()=>{
  const server=read('server.mjs');
  const app=read('public/app.js');
  const workspace=read('public/workspace-continuation-v24.js');
  const html=read('public/index.html');
  const ui=read('public/crm-connectors.js');
  const boot=read('server-entry.mjs');
  for(const route of ['get','post','delete'])assert.match(server,new RegExp("app\\."+route+"\\('/api/app/connectors/crm"));
  assert.match(server,/ownerOnly,subscribed,crmConnectorLimiter/);
  assert.match(server,/requirePlanCapability\(req,res,'allCurrentFeatures'\)/);
  assert.match(server,/active_tenant_for_user/);
  assert.match(boot,/ensureCrmCredentialsSchema/);
  assert.match(read('crm-connectors.mjs'),/REVOKE ALL PRIVILEGES ON TABLE/);
  assert.match(read('crm-connectors.mjs'),/pg_roles/);
  assert.match(boot,/await initializeCrmConnectors\(\)/);
  assert.match(app,/id="crm-integration"/);
  assert.match(workspace,/integrations:'native-operations'/);
  assert.match(workspace,/CRM connectors/);
  assert.match(html,/crm-connectors\.js\?v=/);
  assert.match(html,/crm-connectors\.css\?v=/);
  assert.match(ui,/credentials:'same-origin'/);
  assert.match(ui,/type="password"/);
  assert.doesNotMatch(server,/res\.json\(\{[^}]*token_ciphertext/);
});

test('existing credentials are processed on the Railway web service without a paid scheduler',()=>{
  const server=read('server.mjs');
  const worker=read('scripts/process-crm-outbox.mjs');
  assert.match(server,/deliverDueCrmLeads/);
  assert.match(server,/deliverCrmProvider\(tenantId,event,\{pool\}\)/);
  assert.match(server,/crmDeliveryTimer\.unref\(\)/);
  assert.match(worker,/!process\.env\.DATA_ENCRYPTION_KEY/);
});

test('CRM UI has readable light-on-dark labels and dark-on-light input text',()=>{
  const css=read('public/crm-connectors.css');
  assert.match(css,/\.respondo-crm-fields :is\(input,select\)/);
  assert.match(css,/-webkit-text-fill-color:#172638!important/);
  assert.match(css,/background:#f7f8fa!important/);
  assert.match(css,/\.respondo-crm-actions button/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
