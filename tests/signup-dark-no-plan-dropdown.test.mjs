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

function renderSignup(plan,locale='fi',extra='') {
  const source=app.slice(setupStart,setupEnd)+'\n'+app.slice(start,end);
  const t=(fi,sv,en)=>({fi,sv,en}[locale]||fi);
  const signup=new Function('location','cfg','nav','appText','currentLang','socialAuthButtons','checkoutBusinessTerms','footer','esc','oauthErrorMessage',source+'\nreturn signup;')(
    { pathname:'/tilaus', search:'?plan='+encodeURIComponent(plan)+'&lang='+locale+extra },
    {ownerTestEnabled:false,businessId:'3599437-5',sellerName:'Respondo AI'},
    () => '<header class="nav"></header>',t,()=>locale,
    (flow,p)=>'<a class="social-auth-btn" href="/api/auth/oauth/google/start?flow='+flow+'&plan='+p+'"></a>',
    () => '<label class="business-terms-consent">Consent</label>',
    () => '<footer class="footer"></footer>',
    v => String(v).replace(/[&<>"]/g, ''),
    () => ''
  );
  return signup();
}

for(const [plan,name,price,charged] of [
  ['basic_monthly','Advanced','49 €','Laskutus kuukausittain'],
  ['basic_yearly','Advanced','39 €','468 € veloitetaan vuosittain'],
  ['advanced_monthly','Premium','129 €','Laskutus kuukausittain'],
  ['advanced_yearly','Premium','119 €','1428 € veloitetaan vuosittain'],
  ['business_monthly','Enterprise','149 €','Laskutus kuukausittain'],
  ['business_yearly','Enterprise','139 €','1668 € veloitetaan vuosittain']
]){
  test('signup keeps exact plan without a dropdown: '+plan,()=>{
    const html=renderSignup(plan);
    assert.match(html,/class="signup-dark-shell"/);
    assert.ok(html.includes('type="hidden" name="plan" value="'+plan+'"'));
    assert.ok(!html.includes('<select name="plan"'));
    assert.ok(!html.includes('<optgroup'));
    assert.ok(html.includes('<strong>'+name+'</strong>'));
    assert.ok(html.includes(price));
    assert.ok(html.includes(charged));
    assert.ok(html.includes('href="/hinnat?lang=fi"'));
    assert.match(html,/name="setupService" value="1"/);
    assert.match(html,/199 €/);
    assert.ok(html.includes('/api/auth/oauth/google/start?flow=signup&plan='+plan));
  });
}

test('the plan is preserved in Swedish and English signup without selector',()=>{
  for(const locale of ['sv','en']){
    const html=renderSignup('business_yearly',locale);
    assert.ok(html.includes('type="hidden" name="plan" value="business_yearly"'));
    assert.ok(html.includes('href="/hinnat?lang='+locale+'"'));
    assert.ok(!html.includes('<select name="plan"'));
  }
});

test('unsupported plan URL fails closed to existing Advanced monthly signup',()=>{
  const html=renderSignup('something_else');
  assert.ok(html.includes('type="hidden" name="plan" value="basic_monthly"'));
});

test('signup-only dark stylesheet loads after old marketing theme and retains readable contrast',()=>{
  assert.match(shell,/logo-reveal\.css[^"]*">\s*<link rel="stylesheet" href="\/signup-dark\.css/);
  assert.match(stylesheet,/#app \.signup-dark-shell \.formpage\.signup-page/);
  assert.match(stylesheet,/#app \.signup-dark-shell \.signup-page #signup/);
  assert.match(stylesheet,/\.signup-dark-shell \.nav/);
  assert.match(stylesheet,/\.business-terms-consent/);
  assert.match(stylesheet,/input\[type="checkbox"\]/);
  assert.match(stylesheet,/@media\(max-width:640px\)/);
});
