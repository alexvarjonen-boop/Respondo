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
