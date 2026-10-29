import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const traffic=readFileSync(new URL('../public/traffic.html',import.meta.url),'utf8');

const helperStart=server.indexOf('function setupCheckoutPaymentConfirmed(session)');
const helperEnd=server.indexOf('async function notifySetupServiceAfterCheckout(session)',helperStart);
assert.ok(helperStart>0 && helperEnd>helperStart);
const checkoutConfirmed=new Function(server.slice(helperStart,helperEnd)+';return setupCheckoutPaymentConfirmed;')();

const paid={mode:'subscription',status:'complete',payment_status:'paid',amount_total:19900,metadata:{setup_service:'1'}};
const sponsored={mode:'subscription',status:'complete',payment_status:'no_payment_required',amount_total:0,
  metadata:{setup_service:'1',owner_promo_zero_setup:'1',owner_promo_zero_recurring:'1'}};

test('setup fulfillment permits paid checkout or exact zero-euro founder checkout, never unpaid orders',()=>{
  assert.equal(checkoutConfirmed(paid),true);
  assert.equal(checkoutConfirmed(sponsored),true);
  for(const invalid of [
    {...sponsored,amount_total:19900},
    {...sponsored,metadata:{setup_service:'1',owner_promo_zero_setup:'1'}},
    {...sponsored,metadata:{setup_service:'1',owner_promo_zero_recurring:'1'}},
    {...sponsored,status:'open'},
    {...sponsored,mode:'payment'},
    {...sponsored,payment_status:'unpaid'},
    {...paid,payment_status:'unpaid'},
  ])assert.equal(checkoutConfirmed(invalid),false,JSON.stringify(invalid));
});

test('one-time setup line is 199 euros normally and 0 euros with personal founder code',()=>{
  const start=server.indexOf('function setupServiceCheckoutLineItem(ownerFree=false)');
  const end=server.indexOf('async function stripeCheckoutLineItem(plan)',start);
  assert.ok(start>0&&end>start);
  const makeItem=new Function('SETUP_SERVICE_PRICE_CENTS',server.slice(start,end)+';return setupServiceCheckoutLineItem;')(19900);
  for(const [free,price] of [[false,19900],[true,0]]){
    const item=makeItem(free);
    assert.equal(item.quantity,1);
    assert.equal(item.price_data.unit_amount,price);
    assert.equal(item.price_data.currency,'eur');
    assert.equal(Object.hasOwn(item.price_data,'recurring'),false);
  }
  assert.equal(checkoutConfirmed(sponsored),true);
});

test('both signup routes show two independent zero-priced Stripe items without requiring payment card',()=>{
  for(const [from,to] of [
    ["app.post('/api/auth/start-checkout'","app.get('/api/auth/checkout-success'"],
    ["app.post('/api/app/workspaces/checkout'","// These internal operations are restricted"],
  ]){
    const start=server.indexOf(from),end=server.indexOf(to,start);
    assert.ok(start>0&&end>start);
    const code=server.slice(start,end);
    assert.match(code,/setupServiceCheckoutLineItem\(freeReferral\)/);
    assert.match(code,/ownerFreeSetupCheckoutLineItem\((normalizedPlan|plan)\)/);
    assert.match(code,/payment_method_collection:\s*freeReferral && setupService \? 'if_required' : 'always'/);
    assert.match(code,/owner_promo_zero_recurring:'1',owner_promo_zero_setup:'1'/);
    assert.match(code,/setup_billing_mode:'after_handover'/);
  }
});

test('email intake is deduplicated, localized and accurately describes sponsored order',()=>{
  const start=server.indexOf('async function notifySetupServiceAfterCheckout(session)');
  const end=server.indexOf('async function sendHomepageContactEmail(',start);
  assert.ok(start>0&&end>start);
  const code=server.slice(start,end);
  assert.match(code,/if \(!setupCheckoutPaymentConfirmed\(session\)\)/);
  assert.match(code,/ownerFreeSetup=session.metadata.owner_promo_zero_setup==='1'/);
  assert.match(code,/ON CONFLICT\(session_id\) DO NOTHING/);
  assert.match(code,/pg_try_advisory_lock/);
  assert.match(code,/customer_emailed_at=NOW\(\)/);
  assert.match(code,/owner_emailed_at=NOW\(\)/);
  assert.match(code,/Respondo AI <info@respondoai.fi>/);
  assert.match(code,/https:\/\/api.resend.com\/emails/);
  assert.match(code,/Henkilökohtaisella kampanjakoodilla sekä käyttöönottopalvelu että tilauspaketti ovat maksuttomia/);
  assert.match(code,/Med din personliga kampanjkod är både installationen och abonnemanget kostnadsfria/);
  assert.match(code,/Your personal promotion code makes both the setup service and subscription free/);
  assert.match(code,/ownerFreeSetup\?'Uusi maksuton kampanjakäyttöönotto'/);
  assert.match(code,/viimeistään viikon kuluessa tilauksestasi/);
  assert.match(code,/inom en vecka/);
  assert.match(code,/within one week/);
});

test('manual credential delivery is never represented as an automatic email',()=>{
  assert.match(traffic,/navigator.clipboard.writeText/);
  assert.match(traffic,/info@respondoai.fi/);
  assert.match(traffic,/result.freeOwnerPromotion\?'billingFree':'billingNow'/);
  assert.match(server,/manualDeliveryRequired:true/);
  assert.match(server,/manualHandoverConfirmed:true/);
  assert.doesNotMatch(server,/async function sendReadySetupServiceEmailOnce/);
  assert.match(app,/\/api\/public\/owner-promo-preview/);
  assert.match(app,/name="setupService" value="1"/);
  assert.match(app,/data-setup-price/);
});


test('mock email provider receives exactly one localized buyer and owner notice for a free setup', async()=>{
  const start=server.indexOf('async function notifySetupServiceAfterCheckout(session)');
  const end=server.indexOf('async function sendHomepageContactEmail(',start);
  const source=server.slice(start,end);
  const sent=[];
  const timestamps={customer_emailed_at:null,owner_emailed_at:null};
  let holds=0;
  const mockClient={
    async query(sql){
      if(sql.includes('pg_try_advisory_lock'))return {rows:[{locked:true}]};
      if(sql.includes('SELECT customer_emailed_at,owner_emailed_at'))return {rows:[{...timestamps}]};
      if(sql.includes('SET customer_emailed_at=NOW()'))timestamps.customer_emailed_at=new Date();
      if(sql.includes('SET owner_emailed_at=NOW()'))timestamps.owner_emailed_at=new Date();
      return {rows:[],rowCount:1};
    },
    release(){},
  };
  const query=async(sql)=>{
    if(sql.includes('SELECT u.email,u.full_name,u.preferred_language'))return {rowCount:1,rows:[{
      email:'customer@example.test',full_name:'Test Buyer',preferred_language:'fi',company_name:'Test Company',
    }]};
    return {rows:[],rowCount:1};
  };
  const make=new Function(
    'setupCheckoutPaymentConfirmed','holdAssistedSetupBilling','stripe','pool','q','cleanEmail',
    'process','brandedEmailHtml','escapeEmailHtml','BASE','fetch',
    source+';return notifySetupServiceAfterCheckout;'
  );
  const notify=make(checkoutConfirmed,async()=>{holds++;return {held:true};},
    {},{connect:async()=>mockClient},query,
    v=>String(v||'').trim().toLowerCase(),
    {env:{RESEND_API_KEY:'fake',EMAIL_VERIFICATION_FROM:'info@respondoai.fi',
      CONTACT_NOTIFICATION_TO:'owner@example.test'}},
    ({title,content})=>'<h1>'+title+'</h1>'+content,
    text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;'),
    'https://respondoai.fi',
    async(_url,request)=>{sent.push(JSON.parse(request.body));return {ok:true};}
  );
  const session={mode:'subscription',status:'complete',payment_status:'no_payment_required',amount_total:0,
    id:'cs_test_founder_free_setup_012345',subscription:'sub_test_founder',
    metadata:{user_id:'user-test',tenant_id:'tenant-test',setup_website:'https://company.fi',
      setup_service:'1',setup_billing_mode:'after_handover',
      owner_promo_zero_recurring:'1',owner_promo_zero_setup:'1'}
  };
  const first=await notify(session);
  assert.equal(first.customerSent,true);
  assert.equal(sent.length,2);
  assert.equal(sent[0].from,'Respondo AI <info@respondoai.fi>');
  assert.deepEqual(sent[0].to,['customer@example.test']);
  assert.deepEqual(sent[1].to,['owner@example.test']);
  assert.match(sent[0].html,/maksuttomia \(0 €\)/);
  assert.match(sent[0].html,/viimeistään viikon kuluessa/);
  assert.match(sent[1].html,/tilaus ovat 0 €/);
  assert.doesNotMatch(sent[1].html,/Asiakas on ostanut 199 €/);
  assert.ok(timestamps.customer_emailed_at && timestamps.owner_emailed_at);
  const second=await notify(session);
  assert.equal(second.customerSent,true);
  assert.equal(sent.length,2,'webhook + success redirect should not send duplicates');
  assert.equal(holds,2);
  const bad=await notify({...session,payment_status:'unpaid'});
  assert.equal(bad.paymentPending,true);
  assert.equal(sent.length,2);
});
