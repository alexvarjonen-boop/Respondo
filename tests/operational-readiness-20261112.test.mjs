import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkProtectedCapabilityRoutes} from '../scripts/production-smoke.mjs';
import {screenRecordedAnswers} from '../respondo-reliability-lab.mjs';
import {autoRefreshEligible,acceptedRefreshCandidate} from '../website-refresh-policy.mjs';
import {stageWebsiteRefresh} from '../website-refresh-review.mjs';
import {setFreeWorkflowEnabled} from '../respondo-free-actions.mjs';
import {summarizeConversionData} from '../respondo-conversion-analytics.mjs';

const tenant='6dfac903-66a3-4386-98e2-461ab47e2314';
const source='4ff55e70-5c13-4c33-a369-5f19294bb52d';
const workflow='5318d11d-f2b7-4d04-b53a-b889d1be7693';

test('all six sensitive capability APIs reject anonymous access in live smoke',async()=>{
 const seen=[];
 const anonymous=async(url,init)=>{
  seen.push({url:url.pathname,init});
  return {status:401,headers:{get:()=> 'application/json; charset=utf-8'}};
 };
 const result=await checkProtectedCapabilityRoutes('https://www.respondoai.fi',anonymous);
 assert.equal(result.tested,6);
 assert.equal(result.authenticatedWorkflowsVerified,false);
 assert(seen.every(x=>x.init.method==='GET'&&x.init.redirect==='follow'));
 assert(seen.some(x=>x.url==='/api/app/native/free-workflows'));
 await assert.rejects(checkProtectedCapabilityRoutes('https://www.respondoai.fi',
  async()=>({status:404,headers:{get:()=> 'application/json'}})),/Protected API missing/);
});

test('a numeric answer different from its cited approved price is flagged for review',()=>{
 const rows=[{id:source,approved:true,title:'Basic cleaning',category:'Prices',
  answer:'The price is 49 EUR.'}];
 const result=screenRecordedAnswers([{id:tenant,question:'How much?',
  answer:'The price is 79 EUR.',source_ids:[source]}],rows);
 assert.equal(result.recordedRepliesScreened,1);
 assert(result.findingsByType.some(x=>x.code==='possible_cited_price_mismatch'));
 assert.equal(result.factualCorrectnessProven,false);
 const noCitation=screenRecordedAnswers([{id:tenant,question:'How much?',
  answer:'The price is 79 EUR.',source_ids:[]}],rows);
 assert(!noCitation.findingsByType.some(x=>x.code==='possible_cited_price_mismatch'));
});

test('refresh scheduler rejects local targets and credentialed source URLs',()=>{
 const now=Date.now();
 for(const website of ['http://localhost/','http://sub.localhost/',
  'https://127.0.0.1/','http://[::1]/','http://10.1.1.1/',
  'https://user:password@example.org/']){
  assert.equal(autoRefreshEligible(now,null,true,'active',website),false,website);
 }
 assert.equal(autoRefreshEligible(now,null,true,'active','https://example.org/'),true);
 const candidate={title:'Opening hours',category:'Hours',answer:'Mon-Fri 8-16.',
  sourceUrl:'https://user:password@example.org/hours'};
 assert.equal(acceptedRefreshCandidate(candidate,'https://example.org/',()=>true),null);
});

test('unchanged refresh is only skipped for approved and unchanged metadata',async()=>{
 const queries=[];
 const data={title:'Opening hours',category:'Hours',answer:'Mon-Fri 8-16.',
  sourceUrl:'https://example.org/hours',keywords:['opening']};
 const db={query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.startsWith('SELECT id,answer,category'))return {rows:[
   {id:source,answer:data.answer,category:data.category,keywords:data.keywords}
  ]};
  return {rows:[]};
 }};
 assert.deepEqual(await stageWebsiteRefresh(db,tenant,data),{status:'unchanged'});
 assert(queries.some(x=>x.sql.includes('approved=TRUE')));
 assert(queries.some(x=>x.sql.includes('UPDATE knowledge SET verified_at=NOW()')));
 assert(!queries.some(x=>x.sql.includes('INSERT INTO respondo_website_refresh_reviews')));
});

test('unapproved knowledge cannot suppress a pending website change review',async()=>{
 const queries=[];
 const data={title:'Opening hours',category:'Hours',answer:'Mon-Fri 8-16.',
  sourceUrl:'https://example.org/hours',keywords:['opening']};
 const db={query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.startsWith('SELECT id,answer,category'))return {rows:[]};
  if(sql.includes('INSERT INTO respondo_website_refresh_reviews'))
   return {rows:[{status:'pending'}]};
  return {rows:[]};
 }};
 assert.deepEqual(await stageWebsiteRefresh(db,tenant,data),{status:'pending'});
 const inserted=queries.find(x=>x.sql.includes('INSERT INTO respondo_website_refresh_reviews'));
 assert(inserted);
 assert.match(inserted.sql,/respondo_website_refresh_reviews.status='approved'/);
 assert.match(inserted.sql,/respondo_website_refresh_reviews.category=EXCLUDED.category/);
 assert.match(inserted.sql,/respondo_website_refresh_reviews.keywords=EXCLUDED.keywords/);
 assert(!queries.some(x=>x.sql.includes('UPDATE knowledge SET verified_at')));
});

test('a saved unsafe workflow cannot be activated and can still be disabled',async()=>{
 const queries=[];
 const db={query:async(sql,args)=>{
  queries.push(sql);
  if(sql.includes('SELECT name,trigger_key'))return {rows:[{
   name:'Unsafe old workflow',trigger_key:'lead_captured',conditions:{},
   actions:[{type:'send_email',title:'Send without consent'}]
  }]};
  return {rows:[{id:workflow,enabled:false}]};
 }};
 await assert.rejects(setFreeWorkflowEnabled(db,tenant,workflow,true),/Unsafe workflow action/);
 assert(!queries.some(sql=>sql.includes('UPDATE respondo_free_workflows')));
 await setFreeWorkflowEnabled(db,tenant,workflow,false);
 assert(queries.some(sql=>sql.includes('UPDATE respondo_free_workflows')));
});

test('paid action flags remain unverified until matched with a payment ledger',()=>{
 const result=summarizeConversionData([{channel:'website',engaged:10,converted:2}],
  [{request_type:'quote',submitted:2,paid_quotes:2}],[],[]);
 assert.equal(result.reportedPaidQuotes,2);
 assert.equal(result.verifiedPayments,0);
 assert.equal(result.paymentsLedgerVerified,false);
 assert.equal(result.actionRatePercent,20);
 const unsafe=summarizeConversionData([{channel:'website',engaged:Infinity,converted:8}],
  [{request_type:'quote',submitted:-5,paid_quotes:Infinity}],[],[]);
 assert.equal(unsafe.engagedVisitors,0);
 assert.equal(unsafe.reportedPaidQuotes,0);
 const ui=readFileSync(new URL('../public/native-ai-operations.js',import.meta.url),'utf8');
 assert.match(ui,/Quotes marked paid \(unverified\)/);
 assert.doesNotMatch(ui,/Verified paid quotes/);
});


test('protected API smoke accepts only the two branded hosts after redirect', async()=>{
 const canonical=async(url)=>({
  url:'https://respondoai.fi'+url.pathname,
  status:401,
  headers:{get:()=> 'application/json'}
 });
 assert.equal((await checkProtectedCapabilityRoutes('https://www.respondoai.fi',canonical)).tested,6);
 const foreign=async(url)=>({
  url:'https://evil.example'+url.pathname,
  status:401,
  headers:{get:()=> 'application/json'}
 });
 await assert.rejects(checkProtectedCapabilityRoutes('https://www.respondoai.fi',foreign),/Off-site/);
 const loginPage=async()=>({
  url:'https://respondoai.fi/login',
  status:401,
  headers:{get:()=> 'application/json'}
 });
 await assert.rejects(checkProtectedCapabilityRoutes('https://www.respondoai.fi',loginPage),/redirect path/);
});
