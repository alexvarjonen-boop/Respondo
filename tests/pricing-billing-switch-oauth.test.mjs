import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const styles=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const htmlShell=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

function sourceFunction(source, start, end) {
  const begin=source.indexOf(start);
  const finish=source.indexOf(end,begin+start.length);
  assert.ok(begin>=0 && finish>begin, 'function source is present');
  return source.slice(begin,finish);
}

test('three shared subscription cards have a single purchase link, monthly/annual data and a visible toggle',()=>{
  const sectionFn=sourceFunction(app,'function pricingSection()','function bindPricingBillingToggle()');
  const pricingSection=new Function('appText','appLocale','currentLang',sectionFn+';return pricingSection;')(
    (fi)=>fi,()=> 'fi-FI',()=> 'fi'
  );
  const markup=pricingSection();
  assert.match(markup,/data-billing-option="monthly" aria-pressed="true"/);
  assert.match(markup,/data-billing-option="yearly" aria-pressed="false"/);
  assert.ok(markup.indexOf('pricing-billing-switch')<markup.indexOf('pricing-wrap'));
  for(const [tier,code,monthly,annual] of [
    ['Advanced','basic',49,39],['Premium','advanced',129,119],['Enterprise','business',149,139]
  ]){
    assert.ok(markup.includes('data-plan-code="'+code+'" data-plan-name="'+tier+'" data-monthly-price="'+monthly+'" data-yearly-price="'+annual+'"'));
    assert.ok(markup.includes('href="/tilaus?plan='+code+'_monthly&lang=fi"'));
  }
  assert.equal((markup.match(/class="price-card /g)||[]).length,3);
  assert.equal((markup.match(/class="btn price-btn" data-plan-signup/g)||[]).length,3);
  assert.match(markup,/Veloitus 1668 € kerran vuodessa/);
  assert.match(styles,/\.pricing-billing-switch/);
  assert.match(htmlShell,/styles\.css\?v=[^"]*billing-switch-20261018-v1/);
  assert.match(htmlShell,/app\.js\?v=[^"]*billing-switch-oauth-20261018-v1/);
});

test('billing switch updates the price, accessibility states and signup destinations',()=>{
  const snippet=sourceFunction(app,'function bindPricingBillingToggle()','function cinematicConversationScene()');
  const toggle=(period)=>{
    const attributes={};
    return {
      dataset:{billingOption:period}, attributes,
      setAttribute(key,value){attributes[key]=value;},
      addEventListener(name,callback){if(name==='click')this.click=callback;}
    };
  };
  const monthly=toggle('monthly'), yearly=toggle('yearly');
  const cards=[];
  for(const [tier,code,m,y] of [['Advanced','basic',49,39],['Premium','advanced',129,119],['Enterprise','business',149,139]]){
    const amount={textContent:''},monthlyDetail={hidden:false},yearlyDetail={hidden:true};
    const link={attrs:{href:'/tilaus?plan='+code+'_monthly&lang=fi'},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v}};
    cards.push({
      dataset:{planCode:code,planName:tier,monthlyPrice:String(m),yearlyPrice:String(y)},
      amount,monthlyDetail,yearlyDetail,link,
      querySelector(selector){return ({'.price-amount':amount,'.price-monthly-copy':monthlyDetail,'.price-yearly-copy':yearlyDetail})[selector];},
      querySelectorAll(selector){return selector==='[data-plan-signup]'?[link]:[];}
    });
  }
  const section={querySelectorAll(selector){
    return selector==='[data-billing-option]'?[monthly,yearly]
      :selector==='.price-card[data-plan-code]'?cards:[];
  }};
  const bind=new Function('document','location','currentLang','appText',snippet+';return bindPricingBillingToggle;')(
    {querySelector(selector){return selector==='#app .pricing-section'?section:null}},
    {origin:'https://respondoai.fi'},()=>'sv',(fi,sv)=>sv
  );
  bind();
  assert.equal(monthly.attributes['aria-pressed'],'true');
  assert.equal(yearly.attributes['aria-pressed'],'false');
  assert.equal(cards[2].link.attrs.href,'/tilaus?plan=business_monthly&lang=sv');
  yearly.click();
  assert.equal(yearly.attributes['aria-pressed'],'true');
  assert.equal(monthly.attributes['aria-pressed'],'false');
  assert.deepEqual(cards.map(c=>c.amount.textContent),['39','119','139']);
  assert.ok(cards.every(c=>c.monthlyDetail.hidden===true && c.yearlyDetail.hidden===false));
  assert.deepEqual(cards.map(c=>c.link.attrs.href),[
    '/tilaus?plan=basic_yearly&lang=sv','/tilaus?plan=advanced_yearly&lang=sv','/tilaus?plan=business_yearly&lang=sv'
  ]);
  monthly.click();
  assert.deepEqual(cards.map(c=>c.amount.textContent),['49','129','149']);
  assert.equal(cards[2].link.attrs.href,'/tilaus?plan=business_monthly&lang=sv');
});

test('Google and Apple signup keep only validated subscription plans and language after OAuth',()=>{
  const helpers=sourceFunction(server,'function verifiedSignupPlan(value)','function setOauthState(res, nonce, provider');
  const {verifiedSignupPlan,signupOauthReturnUrl}=new Function(helpers+'; return {verifiedSignupPlan,signupOauthReturnUrl};')();
  for(const code of ['basic','advanced','business']){
    for(const period of ['monthly','yearly']){
      const plan=code+'_'+period;
      assert.equal(verifiedSignupPlan(plan),plan);
      for(const provider of ['google','apple']){
        assert.equal(signupOauthReturnUrl(provider,{signupPlan:plan,signupLanguage:'fi'}),'/tilaus?oauth='+provider+'&plan='+plan+'&lang=fi');
      }
    }
  }
  assert.equal(verifiedSignupPlan('owner_test'),'');
  assert.equal(verifiedSignupPlan('https://evil.test'),'');
  assert.equal(signupOauthReturnUrl('google',{signupPlan:'bad',signupLanguage:'xx'},'failed'),'/tilaus?oauth_error=failed&provider=google');
  assert.match(server,/const state = jwt\.sign\(\{ provider, flow, nonce,[^\n]*signupPlan/);
  assert.match(server,/res\.redirect\(signupOauthReturnUrl\('google',statePayload\)\)/);
  assert.match(server,/res\.redirect\(signupOauthReturnUrl\('apple',statePayload\)\)/);
  assert.match(app,/socialAuthButtons\('signup', plan\)/);
  assert.match(app,/href\.searchParams\.set\('plan', signupPlan\.value\)/);
  assert.match(app,/location\.href = result\.url/);
  assert.match(server,/app\.post\('\/api\/auth\/start-checkout'/);
});
