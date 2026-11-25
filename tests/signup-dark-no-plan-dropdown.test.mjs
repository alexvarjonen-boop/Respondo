import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const stylesheet=readFileSync(new URL('../public/signup-dark.css',import.meta.url),'utf8');
const shell=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const start=app.indexOf('function signup() {');
const end=app.indexOf('\nfunction login() {',start);
assert.ok(start>0 && end>start);
const setupStart=app.indexOf('function setupServiceOption() {');
const setupEnd=app.indexOf('\nfunction bindSetupServiceOptions()',setupStart);
assert.ok(setupStart>0 && setupEnd>setupStart,'real optional setup-service markup must exist');
const countryStart=app.indexOf('function checkoutBillingCountryField() {');
const countryEnd=app.indexOf('\nfunction billingCountryNotice()',countryStart);
assert.ok(countryStart>0 && countryEnd>countryStart,'international billing-country field must exist');

function renderSignup(plan,locale='fi',extra='') {
  const source=app.slice(countryStart,countryEnd)+'\n'+app.slice(setupStart,setupEnd)+'\n'+app.slice(start,end);
  const t=(fi,sv,en)=>({fi,sv,en}[locale]||fi);
  const signup=new Function('document','location','cfg','nav','appText','currentLang','socialAuthButtons','checkoutBusinessTerms','footer','esc','oauthErrorMessage','passwordStrengthMarkup',source+'\nreturn signup;')(
    {addEventListener(){}},
    { pathname:'/tilaus', search:'?plan='+encodeURIComponent(plan)+'&lang='+locale+extra },
    {ownerTestEnabled:false,businessId:'3599437-5',sellerName:'Respondo AI'},
    () => '<header class="nav"></header>',t,()=>locale,
    (flow,p)=>'<a class="social-auth-btn" href="/api/auth/oauth/google/start?flow='+flow+'&plan='+p+'"></a>',
    () => '<label class="business-terms-consent">Consent</label>',
    () => '<footer class="footer"></footer>',
    v => String(v).replace(/[&<>"]/g, ''),
    () => '',
    () => '<div class="password-strength-panel"></div>'
  );
  return signup();
}

// New public signup has one 350 EUR monthly subscription. Old links must never
// silently revive legacy prices, annual billing or old tier selectors.
for(const requested of [
  'respondo_monthly','basic_monthly','basic_yearly',
  'advanced_monthly','advanced_yearly','business_monthly','business_yearly',
  'something_else'
]){
  test('signup normalizes old or unknown plan URL to current single plan: '+requested,()=>{
    const html=renderSignup(requested);
    assert.match(html,/class="signup-dark-shell"/);
    assert.match(html,/name="billingCountry" autocomplete="country" required/);
    assert.match(html,/<option value="FI" selected>/);
    assert.ok(html.includes('type="hidden" name="plan" value="respondo_monthly"'));
    assert.ok(!html.includes('<select name="plan"'));
    assert.ok(!html.includes('<optgroup'));
    assert.ok(html.includes('<strong>Respondo AI</strong>'));
    assert.ok(html.includes('350 €/kk'));
    assert.ok(html.includes('Laskutus kuukausittain'));
    assert.ok(html.includes('href="/hinnat?lang=fi"'));
    assert.match(html,/name="setupService" value="1"/);
    assert.ok(html.includes('200 €'));
    assert.ok(html.includes('/api/auth/oauth/google/start?flow=signup&plan=respondo_monthly'));
  });
}
test('single plan is identical on Swedish and English checkout',()=>{
  for(const locale of ['sv','en']){
    const html=renderSignup('business_yearly',locale);
    assert.ok(html.includes('type="hidden" name="plan" value="respondo_monthly"'));
    assert.ok(html.includes('href="/hinnat?lang='+locale+'"'));
    assert.ok(html.includes('350 €'));
    assert.ok(!html.includes('<select name="plan"'));
    assert.ok(html.includes('200 €'));
  }
});

test('signup-only dark stylesheet loads after old marketing theme and retains readable contrast',()=>{
  assert.ok(shell.indexOf('/apple-home.css') >= 0);
  assert.ok(shell.indexOf('/signup-dark.css') > shell.indexOf('/apple-home.css'));
  assert.match(stylesheet,/#app \.signup-dark-shell \.formpage\.signup-page/);
  assert.match(stylesheet,/#app \.signup-dark-shell \.signup-page #signup/);
  assert.match(stylesheet,/\.signup-dark-shell \.nav/);
  assert.match(stylesheet,/\.business-terms-consent/);
  assert.match(stylesheet,/input\[type="checkbox"\]/);
  assert.match(stylesheet,/@media\(max-width:640px\)/);
});
