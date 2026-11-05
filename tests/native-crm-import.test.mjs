import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCrmContacts,fetchNativeCrmContacts,importNativeCrmContacts} from '../native-crm-import.mjs';
const tenant='22222222-2222-4222-8222-222222222222';
test('HubSpot and Pipedrive normalize contact identity without cross-tenant writes',()=>{
 assert.deepEqual(normalizeCrmContacts('hubspot',{results:[{id:'123',properties:{
  firstname:'Anna',lastname:'Laine',email:'ANNA@example.com',phone:'0401234567'}}]}),[{
  externalId:'123',name:'Anna Laine',email:'anna@example.com',phone:'0401234567'}]);
 assert.deepEqual(normalizeCrmContacts('pipedrive',{data:[{id:321,name:'Oskar',
  emails:[{value:'o@example.com'}],phones:[{value:'+358401234567'}]}]}),[{
  externalId:'321',name:'Oskar',email:'o@example.com',phone:'+358401234567'}]);
});
test('CRM read endpoints are allowlisted, and responses bounded',async()=>{
 for(const provider of ['hubspot','pipedrive']){
  const output=await fetchNativeCrmContacts(provider,'fake-valid-provider-token',{fetcher:async(url,opts)=>{
   assert.equal(opts.method,'GET');
   assert.equal(opts.redirect,'error');
   assert(['api.hubapi.com','api.pipedrive.com'].includes(new URL(url).hostname));
   return {ok:true,text:async()=>JSON.stringify(provider==='hubspot'?{results:[]}:{data:[]})};
  }});
  assert.deepEqual(output,[]);
 }
 await assert.rejects(fetchNativeCrmContacts('evil','fake-valid-provider-token'),/must be connected/);
});
function fakeDatabase(){
 const calls=[];
 const client={query:async(sql,params)=>{
  calls.push({sql,params});
  if(sql.includes('FROM respondo_native_crm_imports'))return {rows:[],rowCount:0};
  if(sql.includes('FROM respondo_native_contacts')&&sql.includes('lower(email)'))return {rows:[],rowCount:0};
  if(sql.includes('INSERT INTO respondo_native_contacts'))return {rows:[{id:'33333333-3333-4333-8333-333333333333'}],rowCount:1};
  return {rows:[],rowCount:1};
 },release:()=>{}};
 const db={query:async(sql)=>{
  if(sql.includes('FROM respondo_crm_settings'))return {rows:[{provider:'hubspot',enabled:true}]};
  if(sql.includes('FROM respondo_crm_credentials'))return {rows:[{provider:'hubspot',token_ciphertext:'fake'}]};
  throw Error('Unexpected query');
 },connect:async()=>client};
 return {db,calls};
}
test('import rejects missing approval and mismatched selections before any provider fetch',async()=>{
 const {db}=fakeDatabase();
 await assert.rejects(importNativeCrmContacts(db,tenant,{approved:false,provider:'hubspot',externalIds:['1']}),/Explicit approval/);
 await assert.rejects(importNativeCrmContacts(db,tenant,{approved:true,provider:'hubspot',externalIds:[]}),/Explicit approval/);
});

test('approved selected HubSpot contacts are imported transactionally with tenant isolation',async()=>{
 const original=process.env.DATA_ENCRYPTION_KEY;
 process.env.DATA_ENCRYPTION_KEY='unit-test-only-encryption-key-32-bytes';
 try{
  const {encryptCrmToken}=await import('../crm-connectors.mjs');
  const encrypted=encryptCrmToken('fake-valid-crm-access-token');
  const writes=[];
  const client={
   query:async(sql,params)=>{
    writes.push({sql,params});
    if(sql.includes('FROM respondo_native_crm_imports'))return {rowCount:0,rows:[]};
    if(sql.includes('FROM respondo_native_contacts'))return {rowCount:0,rows:[]};
    if(sql.includes('INSERT INTO respondo_native_contacts'))
     return {rowCount:1,rows:[{id:'33333333-3333-4333-8333-333333333333'}]};
    return {rowCount:1,rows:[]};
   },release:()=>{}
  };
  const db={
   connect:async()=>client,
   query:async(sql,params)=>{
    if(sql.includes('FROM respondo_crm_settings'))
     return {rowCount:1,rows:[{provider:'hubspot',enabled:true}]};
    if(sql.includes('FROM respondo_crm_credentials'))
     return {rowCount:1,rows:[{provider:'hubspot',token_ciphertext:encrypted}]};
    throw Error('Unexpected SQL '+sql);
   }
  };
  const fetcher=async(url,options)=>{
   assert.equal(new URL(url).hostname,'api.hubapi.com');
   assert.equal(options.method,'GET');
   return {ok:true,text:async()=>JSON.stringify({results:[{id:'remote-1',properties:{
    firstname:'Anna',lastname:'Laine',email:'anna@example.com',phone:'0401234567'
   }}]})};
  };
  const result=await importNativeCrmContacts(db,tenant,{
   approved:true,provider:'hubspot',externalIds:['remote-1']},{fetcher});
  assert.equal(result.imported,1);
  assert.equal(result.externalUpdates,0);
  assert(writes.some(c=>c.sql.includes('FOR UPDATE')&&c.params[0]===tenant));
  assert(writes.some(c=>c.sql.includes('INSERT INTO respondo_native_crm_imports')&&
    c.params[0]===tenant&&c.params[2]==='remote-1'));
  assert(writes.some(c=>c.sql.includes('COMMIT')));
 }finally{
  if(original===undefined)delete process.env.DATA_ENCRYPTION_KEY;
  else process.env.DATA_ENCRYPTION_KEY=original;
 }
});
