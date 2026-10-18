import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server = fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const css = fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

function sourceFunction(source, start, end, injected) {
  const a = source.indexOf(start);
  const b = source.indexOf(end,a + start.length);
  assert.ok(a >= 0 && b > a,'expected function source is present');
  return new Function(...Object.keys(injected),source.slice(a,b) + '\nreturn ' + start.slice(9,start.indexOf('(')) + ';')(...Object.values(injected));
}

function renderPricing(lang) {
  const text=(fi,sv,en)=>({fi,sv,en})[lang];
  const build = sourceFunction(app,'function pricingSection() {','\n\nfunction bindPricingPeriodSwitch()',{
    appText:text,appLocale:()=>lang==='en'?'en-US':'fi-FI',currentLang:()=>lang,esc:(str)=>String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  });
  return build();
}

test('billing selector renders three real subscription options for FI/SV/EN',()=>{
  for(const lang of ['fi','sv','en']){
    const html=renderPricing(lang);
    assert.equal((html.match(/class="price-card pricing-choice-card/g)||[]).length,3);
    assert.equal((html.match(/class="pricing-period-option/g)||[]).length,2);
    assert.match(html,/data-billing-period="monthly" aria-pressed="true"/);
    assert.match(html,/data-billing-period="yearly" aria-pressed="false"/);
    assert.match(html,/data-plan-code="basic" data-monthly-price="49" data-yearly-monthly-price="39"/);
    assert.match(html,/data-plan-code="advanced" data-monthly-price="129" data-yearly-monthly-price="119"/);
    assert.match(html,/data-plan-code="business" data-monthly-price="149" data-yearly-monthly-price="139"/);
    assert.equal((html.match(/class="btn price-btn pricing-select-btn"/g)||[]).length,3);
    assert.ok(html.includes('/tilaus?plan=business_monthly&amp;lang='+lang));
    assert.ok(html.includes('/tilaus?plan=advanced_monthly&amp;lang='+lang));
    assert.ok(html.includes('/tilaus?plan=basic_monthly&amp;lang='+lang));
  }
});

test('annual display is equivalent monthly price, but full annual charge is disclosed',()=>{
  const fi=renderPricing('fi');
  const en=renderPricing('en');
  assert.match(fi,/468 € laskutetaan vuosittain/);
  assert.match(fi,/1428 € laskutetaan vuosittain/);
  assert.match(fi,/1668 € laskutetaan vuosittain/);
  assert.match(en,/€1668 billed annually/);
  assert.match(css,/\.pricing-period-option:focus-visible/);
});

test('plan toggle updates prices, payment cycle, and checkout destination together',()=>{
  const cards=[['basic',49,39],['advanced',129,119],['business',149,139]].map(([code,monthly,yearly])=>{
    const parts = {price:{textContent:''},note:{textContent:''},link:{href:''}};
    return {
      dataset:{planCode:code,monthlyPrice:String(monthly),yearlyMonthlyPrice:String(yearly),monthlyNote:'monthly',yearlyNote:'yearly'},
      parts,querySelector:(sel)=>sel==='[data-plan-price]'?parts.price:sel==='[data-plan-note]'?parts.note:parts.link
    };
  });
  const controls=['monthly','yearly'].map(period=>{
    const events={};const state={};
    return {dataset:{billingPeriod:period},events,state,
      addEventListener:(name,fn)=>{events[name]=fn},
      classList:{toggle:(key,v)=>state[key]=v},
      setAttribute:(name,v)=>state[name]=v
    };
  });
  const section={querySelectorAll:(sel)=>sel==='.pricing-period-option'?controls:cards};
  const binder=sourceFunction(app,'function bindPricingPeriodSwitch() {','\n\nfunction cinematicConversationScene()',{
    document:{querySelectorAll:()=>[section]},currentLang:()=> 'fi',URLSearchParams
  });
  binder();
  assert.equal(cards[2].parts.price.textContent,'149');
  assert.equal(cards[2].parts.link.href,'/tilaus?plan=business_monthly&lang=fi');
  controls[1].events.click();
  assert.equal(cards[2].parts.price.textContent,'139');
  assert.equal(cards[2].parts.note.textContent,'yearly');
  assert.equal(cards[2].parts.link.href,'/tilaus?plan=business_yearly&lang=fi');
  assert.equal(cards[0].parts.link.href,'/tilaus?plan=basic_yearly&lang=fi');
  assert.equal(cards[1].parts.price.textContent,'119');
  assert.equal(controls[1].state['aria-pressed'],'true');
  controls[0].events.click();
  assert.equal(cards[2].parts.link.href,'/tilaus?plan=business_monthly&lang=fi');
});

test('Google OAuth securely carries chosen signup plan and language to Stripe signup form',()=>{
  assert.match(app,/socialAuthButtons\('signup',plan\)/);
  assert.match(app,/signupPlan\?\.addEventListener\('change',syncGoogleSignupPlan\)/);
  assert.match(server,/Object\.hasOwn\(PLAN_DEFINITIONS,String\(req\.query\.plan \|\| ''\)\)/);
  assert.match(server,/jwt\.sign\(\{ provider, flow, nonce, .*\{plan:oauthPlan\}/);
  const code=server.slice(server.indexOf('function oauthSignupReturnUrl('),server.indexOf('\nasync function finishOauth('));
  assert.ok(code.startsWith('function oauthSignupReturnUrl('));
  const getUrl=new Function('PLAN_DEFINITIONS','URLSearchParams',code+'\nreturn oauthSignupReturnUrl;')({
    business_yearly:{},basic_monthly:{},advanced_yearly:{}
  },URLSearchParams);
  assert.equal(getUrl('google',{plan:'business_yearly',lang:'sv'}),'/tilaus?oauth=google&plan=business_yearly&lang=sv');
  assert.equal(getUrl('google',{plan:'bad_plan',lang:'bad_lang'}),'/tilaus?oauth=google');
  assert.match(server,/return res\.redirect\(oauthSignupReturnUrl\('google',statePayload\)\)/);
  assert.match(app,/location\.href = result\.url/);
  assert.match(server,/app\.post\('\/api\/auth\/start-checkout'/);
});
