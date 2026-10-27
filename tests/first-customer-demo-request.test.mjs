import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seoPricingMarkup} from '../public/seo-pricing-ssr.mjs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const segment=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)+1));
test('public demo enquiry uses existing contact form backend and does not introduce third-party handling',()=>{
 const s=segment('function contactPage()','function footer()');
 assert.match(s,/demoRequest = new URLSearchParams\(location\.search\)\.get\('intent'\) === 'demo'/);
 assert.match(s,/input name="website" type="text" inputmode="url"/);
 assert.match(s,/demoIntro/);
 assert.match(s,/demo-request-privacy/);
 assert.match(s,/name="message"/);
 assert.doesNotMatch(s,/new FormData|fetch\(/);
 const submit=segment("if (path === '/yhteystiedot')","function ");
 assert.match(app,/visitorRef:marketingLeadVisitorRef\(location\.search,demo\)/);
 assert.match(app,/buildDemoRequestMessage\(currentLang\(\),site,formData\.get\('message'\)\)/);
 assert.match(app,/fetch\('\/api\/public\/respondo-contact'/);
});
for(const lang of ['fi','sv','en']){
 test('pricing page links to website-tailored demo in '+lang,()=>{
  assert.ok(seoPricingMarkup(lang).includes('/yhteystiedot?lang='+lang+'&amp;intent=demo'));
 });
}
test('client pricing also routes demo enquiries through the current contact page',()=>{
 assert.match(app,/\/yhteystiedot\?lang=\$\{currentLang\(\)\}&amp;intent=demo/);
 assert.match(app,/Pyydä esittely omalle sivulle/);
});
