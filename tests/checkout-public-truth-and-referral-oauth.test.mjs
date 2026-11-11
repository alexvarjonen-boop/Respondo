import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {seoPricingMarkup} from '../public/seo-pricing-ssr.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('public/app.js');
const server=read('server.mjs');

test('checkout only offers tax-approved FI and US as selectable countries',()=>{
  const start=app.indexOf('function checkoutBillingCountryField() {');
  const end=app.indexOf('// Delegated binding works also when dashboard forms are rendered later.',start);
  assert.ok(start>0&&end>start);
  const html=vm.runInNewContext(app.slice(start,end)+'\ncheckoutBillingCountryField()',{
    appText:(fi)=>fi,esc:value=>String(value).replace(/&/g,'&amp;')
  });
  const billingSelect=html.split('<label class="field international-us-state-field"')[0];
  const countries=[...billingSelect.matchAll(/<option value="([A-Z]{2})"/g)].map(match=>match[1]);
  assert.deepEqual(countries,['FI','US']);
  assert.match(html,/Ask about international ordering|Kysy kansainvälisestä tilauksesta/);
  assert.match(app,/!\['FI','US'\]\.includes\(String\(signupForm\.elements\.billingCountry/);
  assert.match(server,/const TAX_CHECKOUT_COUNTRIES = new Set\(\['FI','US'\]\)/);
});

test('checkout server errors appear in the chosen customer language',()=>{
  const start=app.indexOf('function checkoutSignupErrorMessage(err) {');
  const end=app.indexOf('function signup() {',start);
  assert.ok(start>0&&end>start);
  const code=app.slice(start,end);
  const translate=(lang,message)=>vm.runInNewContext(code+'\ncheckoutSignupErrorMessage({message:provided})',{
    provided:message,
    currentLang:()=>lang,
    appText:(fi,sv,en)=>({fi,sv,en}[lang])
  });
  assert.equal(translate('en','Valitse yhdysvaltalaisen yrityksen osavaltio.'),'Choose the US state for your business.');
  assert.equal(translate('sv','Anna yhdysvaltalaisen yrityksen yhdeksännumeroinen EIN (XX-XXXXXXX).'),'Ange företagets niosiffriga amerikanska EIN (XX-XXXXXXX).');
  assert.match(translate('en','Unexpected Finnish backend error'),/Checkout could not be started/);
  assert.match(translate('sv','Unexpected Finnish backend error'),/Beställningen kunde inte startas/);
  assert.match(app,/esc\(checkoutSignupErrorMessage\(err\)\)/);
});

test('regular referral codes survive social sign-up without being added to Google OAuth state',()=>{
  assert.match(app,/if \(selectedReferral\) url\.searchParams\.set\('ref', selectedReferral\)/);
  assert.match(app,/else url\.searchParams\.delete\('ref'\)/);
  assert.match(app,/profile\.referralCode && !form\.elements\.referralCode\?\.value/);
  assert.match(server,/OAUTH_SIGNUP_REFERRAL_COOKIE/);
  assert.match(server,/res\.cookie\(OAUTH_SIGNUP_REFERRAL_COOKIE,/);
  assert.match(server,/profile\.referralCode = oauthSignupReferral\(req,statePayload\.nonce\)/);
  assert.match(server,/referralCode: profile\.referralCode \|\| ''/);
  const begin=server.indexOf('// Keep referral codes on our server, never in the Google/Apple OAuth state URL.');
  const end=server.indexOf('function oauthSignupReturnUrl(provider, statePayload)',begin);
  assert.ok(begin>0&&end>begin);
  const {oauthSignupReferral}=vm.runInNewContext(server.slice(begin,end)+'\n({oauthSignupReferral})',{
    jwt:{verify:token=>JSON.parse(token)},
    cookies:req=>req.testCookies,
    OAUTH_SIGNUP_REFERRAL_COOKIE:'ref',
    JWT:'test-only',
    normalizeReferralCode:value=>String(value||'').trim().toUpperCase()
  });
  const req={testCookies:{ref:JSON.stringify({type:'oauth-signup-referral',nonce:'right-nonce',code:' respondo-ab12cd34 '})}};
  assert.equal(oauthSignupReferral(req,'right-nonce'),'RESPONDO-AB12CD34');
  assert.equal(oauthSignupReferral(req,'wrong-nonce'),'');
  req.testCookies.ref=JSON.stringify({type:'another-cookie',nonce:'right-nonce',code:'RESPONDO-AB12CD34'});
  assert.equal(oauthSignupReferral(req,'right-nonce'),'');
});

test('localized crawlable pricing pages match the paid-country guard',()=>{
  const samples=[
    ['fi','Suomessa ja Yhdysvalloissa'],
    ['sv','Finland och USA'],
    ['en','Finland and the United States']
  ];
  for(const [lang,text] of samples){
    const html=seoPricingMarkup(lang);
    assert.ok(html.includes(text),'Missing correct '+lang+' country statement');
    assert.match(html,/<a[^>]+href="\/tilaus\?plan=basic_monthly&amp;lang=/);
    assert.match(html,/120 €/);
  }
  assert.doesNotMatch(read('public/seo-pricing-ssr.mjs'),/currently available in Finland\.'/);
});

test('old VAT exemption and Swedish €60 annual savings claims are not retained in public app copy',()=>{
  assert.doesNotMatch(app,/Arvonlisäveroa ei peritä vähäisen toiminnan vuoksi/);
  assert.doesNotMatch(app,/vuosilaskutus":"spara 60 €/);
  assert.match(app,/Suomessa verollisen kotimaan myynnin hinnat sisältävät 25,5 % arvonlisäveron/);
  assert.match(app,/vuosilaskutus":"årsfakturering"/);
});
