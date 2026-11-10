import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bookingNoticeContent,queueBookingNotice,sendBookingNotice} from '../booking-customer-notices.mjs';
import {validateConversationFeedback,saveConversationFeedback} from '../conversation-feedback.mjs';
import {stageWebsiteRefresh,decideWebsiteRefreshReview,websiteCandidateFingerprint} from '../website-refresh-review.mjs';
import {summarizeInstantDemoHtml} from '../instant-website-demo.mjs';
import {productBudgetRequest,groundedBudgetProductAnswer} from '../product-budget.mjs';

const root=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tenant='b1d18cd0-d2c6-4ff6-aaea-f20a18fc71af',action='20ac3aa7-fce7-4e51-873f-80e712901a47';
const conversation='612764c2-228c-4b98-8ed6-479d87b7bb47';

test('human handoff is an explicit widget action preserving the existing thread',()=>{
 const s=root('server.mjs'),widget=root('public/widget.js');
 assert.match(s,/app\.post\('\/api\/public\/:slug\/handoff', publicChatLimiter/);
 assert.match(s,/validWidgetToken\(req,tenant,body\.widgetToken\)/);
 assert.match(s,/await getOrCreateThread\(tenant\.id,'website',visitorRef,visitorRef\)/);
 assert.match(s,/mode='human',status='open',language=\$3/);
 assert.match(s,/requested:true,availableNow:agentRows\.rowCount>0/);
 assert.match(widget,/id="humanHelp"/);
 assert.match(widget,/Request saved\. No staff member is currently online/);
});

test('booking notifications are localized and escape unsafe company names',()=>{
 for(const language of ['fi','sv','en']){
  const result=bookingNoticeContent({kind:'confirmed',language,
    companyName:'Demo <script>alert(1)</script>',startsAt:'2026-11-13T10:00:00Z',endsAt:'2026-11-13T12:00:00Z'});
  assert.ok(result.html.includes('&lt;script&gt;'));
  assert.doesNotMatch(result.html,/<script>/);
  assert.ok(result.html.includes('UTC'));
 }
 assert.throws(()=>bookingNoticeContent({kind:'unknown'}),TypeError);
});

test('booking outbox is tenant restricted, deduplicated and never auto-sends without an already configured provider',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{
   calls.push([sql,args]);
   if(sql.includes('INSERT INTO respondo_booking_notices'))return {rowCount:1,rows:[{id:action}]};
   throw Error('Unexpected query');
 }};
 const q=await queueBookingNotice(db,tenant,action,'confirmed');
 assert.equal(q.queued,true);
 assert.equal(calls[0][1][0],tenant);
 assert.match(calls[0][0],/ON CONFLICT\(tenant_id,action_request_id,kind\) DO NOTHING/);
 let sent=false;
 const r=await sendBookingNotice(db,tenant,action,'confirmed',{send:async()=>{sent=true;}});
 assert.equal(r.status,'not_configured');assert.equal(sent,false);
});

test('feedback requires explicit yes/no, conversation ID, and same visitor reference',async()=>{
 assert.deepEqual(validateConversationFeedback({conversationId:conversation,helpful:true}),
   {conversationId:conversation,helpful:true,reason:null});
 assert.throws(()=>validateConversationFeedback({conversationId:conversation,helpful:'yes'}),TypeError);
 assert.throws(()=>validateConversationFeedback({conversationId:conversation,helpful:false,reason:'spam'}),TypeError);
 const calls=[];
 const db={query:async(sql,params)=>{calls.push([sql,params]);return {rowCount:1,rows:[{conversation_id:conversation}]};}};
 const r=await saveConversationFeedback(db,tenant,'anonymous-visitor-103',{conversationId:conversation,helpful:false});
 assert.equal(r.recorded,true);
 assert.equal(calls[0][1][0],tenant);
 assert.equal(calls[0][1][2],'anonymous-visitor-103');
 assert.match(calls[0][0],/c\.tenant_id=\$1 AND c\.id=\$2 AND c\.visitor_ref=\$3/);
});

test('automated site refresh detects changes without silently editing knowledge',async()=>{
 const statements=[],db={query:async(sql,args)=>{
   statements.push([sql,args]);
   if(sql.includes('SELECT id,answer FROM knowledge'))return {rows:[{id:conversation,answer:'Old approved price'}]};
   return {rowCount:1,rows:[{id:conversation,status:'pending'}]};
 }};
 const item={sourceUrl:'https://store.example/services',title:'Service price',category:'Prices',
   answer:'New price, awaiting owner review',keywords:['price','service']};
 const staged=await stageWebsiteRefresh(db,tenant,item);
 assert.equal(staged.status,'pending');
 assert.ok(statements.some(([sql])=>sql.includes('INSERT INTO respondo_website_refresh_reviews')));
 assert.ok(!statements.some(([sql])=>/UPDATE knowledge|INSERT INTO knowledge/i.test(sql)));
 assert.equal(websiteCandidateFingerprint(item).length,64);
});

test('website approval writes approved facts only after a tenant-scoped approval decision',async()=>{
 const cmds=[];
 const db={connect:async()=>({query:async(sql,args)=>{
   cmds.push([sql,args]);
   if(sql.includes('FROM respondo_website_refresh_reviews')&&sql.includes('FOR UPDATE')){
     return {rows:[{id:action,source_url:'https://example.com',title:'Title',
       category:'Services',answer:'Approved source fact',keywords:['foo']}]};
   }
   if(sql.includes('FROM knowledge')&&sql.includes('FOR UPDATE'))return {rows:[]};
   return {rows:[],rowCount:1};
 },release(){}})};
 const r=await decideWebsiteRefreshReview(db,tenant,action,'owner-1','approve');
 assert.equal(r.knowledgePublished,true);
 assert.ok(cmds.some(([sql])=>sql.includes('INSERT INTO knowledge')));
 assert.equal(cmds.at(-1)[0],'COMMIT');
});

test('safe instant website preview only reveals public metadata, not invented business facts',()=>{
 const parsed=summarizeInstantDemoHtml('<html><head><title>Acme &amp; Sons</title><meta name="description" content="We install doors"></head><body><h1>Welcome</h1><script>secret here</script></body></html>','https://acme.example/');
 assert.equal(parsed.title,'Acme & Sons');
 assert.equal(parsed.description,'We install doors');
 assert.equal(parsed.fullWebsiteImported,false);
 assert.ok(!JSON.stringify(parsed).includes('secret here'));
 assert.match(root('server.mjs'),/fetchPublicHtml\(url,6500,150000\)/);
});

test('approved-only ecommerce product filtering respects brand-independent shoe colors, size and price',()=>{
 const request=productBudgetRequest('Black shoes under €100 size 42');
 assert.equal(request.family,'shoe');assert.equal(request.color,'black');assert.equal(request.size,'42');
 const items=[
  {name:'Black sneakers',productType:'shoes',colors:['black'],sizes:['42'],price:89,currency:'EUR',row:{id:'sh1'}},
  {name:'White sneakers',productType:'shoes',colors:['white'],sizes:['42'],price:75,currency:'EUR',row:{id:'sh2'}},
  {name:'Black sneakers',productType:'shoes',colors:['black'],sizes:['42'],price:120,currency:'EUR',row:{id:'sh3'}}
 ];
 const result=groundedBudgetProductAnswer(items,'Black shoes under €100 size 42','en');
 assert.deepEqual(result.sourceIds,['sh1']);
 assert.equal(result.selected.length,1);
 assert.ok(!result.answer.includes('White'));
});

test('first-party navigation only runs after a click on an allowed site action',()=>{
 const js=root('public/guided-site-navigation.js'),index=root('public/index.html');
 assert.match(js,/a\.fx-site-action\[href\]/);
 assert.match(js,/url\.origin!==location\.origin/);
 assert.match(js,/sessionStorage\.setItem/);
 assert.doesNotMatch(js,/\bfetch\s*\(/);
 assert.match(index,/guided-site-navigation\.js\?v=/);
});

test('core safety and UI flow remain included in standard build tests',()=>{
 const pkg=JSON.parse(root('package.json'));
 assert.ok(pkg.scripts.test.includes('node --test')||pkg.scripts.test.includes('scripts/'));
 assert.match(root('public/widget.js'),/answer-feedback-choice/);
 assert.match(root('public/instant-website-demo-ui.js'),/website-demo-preview/);
 assert.match(root('public/native-ai-operations.js'),/WEBSITE_REVIEWS/);
});
