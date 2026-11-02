import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOnboardingCheckupEmail,
  validTrustpilotReviewUrl,
  enqueueOnboardingCheckup,
  runDueOnboardingCheckups,
} from '../onboarding-checkup.mjs';

const TRUSTPILOT_URL='https://www.trustpilot.com/review/example.test';

test('only HTTPS links hosted by Trustpilot are accepted',()=>{
  assert.equal(validTrustpilotReviewUrl(TRUSTPILOT_URL),TRUSTPILOT_URL);
  for(const url of ['https://trustpilot.com.evil.example/review/respondoai.fi',
    'http://www.trustpilot.com/review/respondoai.fi',
    'javascript:alert(1)','https://evil.test/redirect?to=trustpilot.com','']) {
    assert.equal(validTrustpilotReviewUrl(url),'');
  }
});

test('dark branded checkup is localized to Finnish, Swedish and English',()=>{
  for(const [language,needle] of [
    ['fi','Miten ensimmäinen viikko on sujunut?'],
    ['sv','Hur har din första vecka gått?'],
    ['en','How has your first week been?'],
  ]) {
    const mail=buildOnboardingCheckupEmail({language,trustpilotUrl:TRUSTPILOT_URL,firstName:'Test'});
    assert.ok(mail.html.startsWith('<!doctype html>'));
    assert.ok(mail.html.includes('respondo-email-arrow-20261012-2fe95894.png'));
    assert.ok(mail.html.includes(needle));
    assert.ok(mail.html.includes('Trustpilot'));
    assert.ok(mail.html.includes(TRUSTPILOT_URL));
    assert.ok(mail.html.includes('https://www.respondoai.fi/app'));
    assert.ok(mail.text.includes(TRUSTPILOT_URL));
    assert.ok(mail.subject.includes('Respondo AI'));
  }
});

test('name is HTML-escaped and review solicitation is neutral',()=>{
  const mail=buildOnboardingCheckupEmail({language:'en',firstName:'<script>alert(1)</script>',
    trustpilotUrl:TRUSTPILOT_URL});
  assert.ok(mail.html.includes('&lt;script&gt;'));
  assert.ok(!mail.html.includes('<script>alert'));
  assert.ok(mail.text.includes('positive, negative or mixed'));
  assert.ok(!mail.text.includes('five-star'));
});

test('invalid Trustpilot configuration does not produce an email',()=>{
  assert.throws(()=>buildOnboardingCheckupEmail({trustpilotUrl:'https://nottrustpilot.com/review/abc'}));
});

test('queue stores a single tenant milestone exactly seven days later',async()=>{
  let captured;
  const client={query:async(sql,params)=>{
    captured={sql,params};
    return {rowCount:1};
  }};
  assert.equal(await enqueueOnboardingCheckup(client,'tenant-id'),true);
  assert.deepEqual(captured.params,['tenant-id']);
  assert.ok(captured.sql.includes("INTERVAL '7 days'"));
  assert.ok(captured.sql.includes('ON CONFLICT(tenant_id) DO NOTHING'));
});

test('sender stays idle without a configured verified review link',async()=>{
  let called=false;
  const pool={query:async()=>{called=true;throw new Error('unexpected query');}};
  const outcome=await runDueOnboardingCheckups(pool,{apiKey:'test-key',trustpilotUrl:''});
  assert.equal(outcome.skipped,true);
  assert.equal(called,false);
});


test('due sender uses Resend idempotency and marks a successful delivery sent',async()=>{
  const calls=[];
  const previousFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});
    return {ok:true,json:async()=>({id:'test-resend-id'})};
  };
  const pool={query:async(sql,params)=>{
    if(sql.startsWith('WITH due AS'))return {rowCount:1,rows:[{tenant_id:'5fd2dc80-6f26-4c11-bf66-f564409beee6',attempt_count:1}]};
    if(sql.startsWith('SELECT u.email'))return {rows:[{email:'buyer@example.org',full_name:'Test Buyer',preferred_language:'fi'}]};
    if(sql.includes("status='sent'"))return {rowCount:1,rows:[]};
    return {rowCount:0,rows:[]};
  }};
  try{
    const result=await runDueOnboardingCheckups(pool,{apiKey:'test-key',trustpilotUrl:TRUSTPILOT_URL});
    assert.equal(result.processed,1);
    assert.equal(calls.length,1);
    assert.equal(calls[0].url,'https://api.resend.com/emails');
    assert.equal(calls[0].options.headers['Idempotency-Key'],'respondo-week-one-5fd2dc80-6f26-4c11-bf66-f564409beee6');
    const email=JSON.parse(calls[0].options.body);
    assert.deepEqual(email.to,['buyer@example.org']);
    assert.ok(email.subject.includes('ensimmäinen viikko'));
    assert.ok(email.html.includes(TRUSTPILOT_URL));
  }finally{
    globalThis.fetch=previousFetch;
  }
});
