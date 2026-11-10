import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bookingNoticeContent} from '../booking-customer-notices.mjs';
import {summarizeInstantDemoHtml} from '../instant-website-demo.mjs';
import {validateConversationFeedback} from '../conversation-feedback.mjs';
import {productBudgetRequest} from '../product-budget.mjs';
import {websiteCandidateFingerprint} from '../website-refresh-review.mjs';
import {summarizeQualityGaps} from '../respondo-quality-center.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('handoff preserves the tenant thread and does not falsely claim live staff',()=>{
  const server=read('server.mjs'),widget=read('public/widget.js');
  assert.match(server,/app\.post\('\/api\/public\/:slug\/handoff', publicChatLimiter/);
  assert.match(server,/validWidgetToken\(req,tenant,body\.widgetToken\)/);
  assert.match(server,/await getOrCreateThread\(tenant\.id,'website',visitorRef,visitorRef\)/);
  assert.match(server,/conversationPreserved:true,customerNotified:false/);
  assert.match(widget,/humanHelp\.addEventListener\('click'/);
  assert.match(widget,/Request sent to the team/);
});

test('transactional notices cannot claim stale confirmed booking after cancellation',()=>{
  const source=read('booking-customer-notices.mjs');
  assert.match(source,/if\(actualDecision!==kind\)/);
  assert.match(source,/throw Error\('Booking decision changed; notification withheld'\)/);
  assert.match(source,/n\.status='pending'/);
  assert.match(source,/if\(!apiKey\|\|!from\)return \{status:'not_configured'\}/);
  const mail=bookingNoticeContent({kind:'confirmed',language:'en',
    companyName:'Example <Service>',startsAt:'2027-01-03T10:00:00Z',endsAt:'2027-01-03T11:00:00Z'});
  assert.match(mail.html,/Example &lt;Service&gt;/);
  assert.doesNotMatch(mail.html,/<Service>/);
  assert.match(mail.html,/UTC/);
});

test('product shopping is constrained by approved product evidence and explicit budget',()=>{
  const req=productBudgetRequest('Find black shoes under €100, size 42');
  assert.equal(req.family,'shoe');
  assert.equal(req.color,'black');
  assert.equal(req.size,'42');
  assert.equal(req.amount,100);
  assert.equal(req.currency,'EUR');
  assert.equal(req.inclusive,false);
});

test('public demo uses strictly public metadata and interactive grounded prompts',()=>{
  const result=summarizeInstantDemoHtml(
    '<html><head><title>Acme Service</title><meta name="description" content="Repairs household devices"></head><body><h1>Acme</h1><script>privateValue=100</script></body></html>',
    'https://acme.example/');
  assert.equal(result.title,'Acme Service');
  assert.equal(result.description,'Repairs household devices');
  assert.equal(result.fullWebsiteImported,false);
  assert.equal(result.verifiedFactsOnly,true);
  const ui=read('public/instant-website-demo-ui.js');
  assert.match(ui,/rx-instant-demo-interactive/);
  assert.match(ui,/rx-instant-demo-prompt/);
  assert.match(ui,/Prices cannot be verified from homepage metadata/);
  assert.match(ui,/selectDemo\(0\)/);
  assert.match(ui,/data\.description/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
  assert.match(read('server.mjs'),/fetchPublicHtml\(url,6500,150000\)/);
});

test('refresh approval and feedback are tenant-private and never silently publish data',()=>{
  assert.equal(websiteCandidateFingerprint({sourceUrl:'https://acme.example/a',title:'Price'}),
    websiteCandidateFingerprint({sourceUrl:'https://acme.example/a',title:'price'}));
  const review=read('website-refresh-review.mjs');
  assert.match(review,/status='pending'/);
  assert.match(review,/if\(decision==='approve'\)/);
  assert.match(review,/tenant_id=\$1/);
  const id='7dc92924-3642-4d39-9354-5773d9e235d2';
  assert.deepEqual(validateConversationFeedback({conversationId:id,helpful:true}),
    {conversationId:id,helpful:true,reason:null});
  assert.throws(()=>validateConversationFeedback({conversationId:id,helpful:'yes'}),TypeError);
  assert.match(read('conversation-feedback.mjs'),/c\.visitor_ref=\$3/);
  assert.match(read('public/widget.js'),/answer-feedback-choice/);
  assert.ok(summarizeQualityGaps([{intent:'Opening hours',channel:'website',reason:'handoff'}])[0].requiresOwnerApproval);
});

test('navigation is click-initiated and production runs automated regression checks',()=>{
  const nav=read('public/guided-site-navigation.js');
  assert.match(nav,/addEventListener\('click'/);
  assert.match(nav,/url\.origin!==location\.origin/);
  assert.match(nav,/sessionStorage\.setItem/);
  assert.doesNotMatch(nav,/\.submit\(/);
  const packageFile=JSON.parse(read('package.json'));
  assert.match(packageFile.scripts.test,/node --test tests\/\*\.test\.mjs/);
  const index=read('public/index.html');
  assert.match(index,/instant-website-demo-ui\.js\?v=/);
  assert.match(index,/guided-site-navigation\.js\?v=/);
});
