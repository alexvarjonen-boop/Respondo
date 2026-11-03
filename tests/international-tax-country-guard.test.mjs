import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

function loadTaxGuard(stripe) {
  const start=server.indexOf("const TAX_CHECKOUT_COUNTRIES = new Set(['FI','US']);");
  const end=server.indexOf("function checkoutTaxExemptionMessage",start);
  assert.ok(start>0 && end>start,'country guard not found');
  const code=server.slice(start,end);
  return vm.runInNewContext(code+"\n({checkoutCountryPolicy,checkoutIsCountryPolicyCompliant,enforceCompletedCheckoutCountryPolicy,ensureUSStripeTaxReady})",{
    stripe,console:{error(){}}
  });
}

test('international country guard is fail-closed by default',()=>{
  const guard=loadTaxGuard(null);
  assert.equal(guard.checkoutCountryPolicy('FI').ok,true);
  for(const country of ['US','SE','DE','GB','CA','AU','',null,'XX','F1']){
    assert.equal(guard.checkoutCountryPolicy(country).ok,false,String(country));
  }
  assert.equal(guard.checkoutCountryPolicy(' fi ').ok,true);
  const us=guard.checkoutCountryPolicy('US',{state:'CA',businessId:'12-3456789'});
  assert.equal(us.ok,true);
  assert.equal(us.automaticTax,true);
  assert.equal(us.policyVersion,'us-b2b-tax-20261103');
  assert.equal(guard.checkoutCountryPolicy('US',{state:'CA',businessId:'123456789'}).ok,true);
  assert.equal(guard.checkoutCountryPolicy('US',{state:'XX',businessId:'12-3456789'}).ok,false);
  assert.equal(guard.checkoutCountryPolicy('US',{state:'NY',businessId:'invalid'}).ok,false);
});

test('completed Checkout must use declared and confirmed Finnish billing address',()=>{
  const guard=loadTaxGuard(null);
  const input=(country)=>({
    metadata:{tax_country_policy:'fi-only-20261008',billing_country:'FI'},
    customer_details:{address:{country}}
  });
  assert.equal(guard.checkoutIsCountryPolicyCompliant(input('FI')),true);
  assert.equal(Boolean(guard.checkoutIsCountryPolicyCompliant(input('US'))),false);
  assert.equal(Boolean(guard.checkoutIsCountryPolicyCompliant(input(''))),false);
  assert.equal(guard.checkoutIsCountryPolicyCompliant({metadata:{}}),true); // Historical checkouts.
});

test('mismatched Checkout address cancels subscription before account activation',async()=>{
  const canceled=[];
  const guard=loadTaxGuard({subscriptions:{
    async retrieve(id){return {id,status:'trialing'};},
    async cancel(id){canceled.push(id);}
  }});
  const result=await guard.enforceCompletedCheckoutCountryPolicy({
    id:'cs_test_foreign',subscription:'sub_test_foreign',
    metadata:{tax_country_policy:'fi-only-20261008',billing_country:'FI'},
    customer_details:{address:{country:'US'}}
  });
  assert.equal(result,false);
  assert.deepEqual(canceled,['sub_test_foreign']);
});

test('country selection and US state are visible while other countries remain blocked',()=>{
  assert.equal((app.match(/<input type="hidden" name="billingCountry" value="FI">/g)||[]).length,0);
  assert.equal((app.match(/\$\{checkoutBillingCountryField\(\)\}/g)||[]).length,3);
  assert.match(app, /<select name="billingCountry" autocomplete="country" required>/);
  assert.match(app, /Laskutusmaa','Faktureringsland','Billing country/);
  assert.match(app, /Ask about international ordering/);
  assert.match(app, /name="billingState" autocomplete="address-level1" disabled/);
  assert.equal((app.match(/billingState:String\(fd.get\('billingState'\)/g)||[]).length,2);
  assert.match(app, /billingState:form.get\('billingState'\)/);
  assert.equal((app.match(/billingCountry:(?:form.get|String\(fd.get)/g)||[]).length,3);
  assert.match(app,/billingCountryNotice/);
  assert.match(html,/tax-country-guard-v1/);
  assert.equal((server.match(/tax_country_policy:/g)||[]).length,4);
  assert.match(server,/enforceCompletedCheckoutCountryPolicy\(session\)/);
  assert.match(server,/checkoutCountryPolicy\(req.body\?\.billingCountry,\{state:req.body\?\.billingState,businessId\}\)/);
  assert.match(app, /\['FI','US'\]\.includes\(String\(fd.get\('billingCountry'\)/);
});

test('business-only order declaration is required for both checkout endpoints',()=>{
  // Terms acceptance includes the business-only purchase declaration; only one checkbox is shown.
  assert.equal((app.match(/name="businessPurchase"/g)||[]).length,0);
  assert.equal((app.match(/checkoutBusinessTerms\('(?:terms|acceptedTerms)', '(?:checkrow field full|workspace-terms)'\)/g)||[]).length,3);
  assert.equal((app.match(/businessPurchase:/g)||[]).length,3);
  assert.match(app,/businessPurchase:!!form\.get\('terms'\)/);
  assert.equal((app.match(/businessPurchase:fd\.get\('acceptedTerms'\)==='on'/g)||[]).length,2);
  assert.match(server,/if\s*\(req\.body\?\.businessPurchase !== true\)/);
  assert.match(server,/if\s*\(req\.body\?\.businessPurchase!==true\)/);
});

test('seller is identifiable and domestic VAT status is disclosed',()=>{
  const terms=fs.readFileSync(new URL('../public/legal-content.js',import.meta.url),'utf8');
  assert.match(terms,/Respondo AI, Y-tunnus 3599437-5/);
  assert.match(terms,/Maksulliset tilaukset ovat saatavilla Suomessa ja Yhdysvalloissa/);
  assert.match(terms,/Paid subscriptions are available to businesses in Finland and the United States/);
  assert.match(app,/sellerName: 'Respondo AI'/);
  assert.match(server,/sellerName: 'Respondo AI'/);
  assert.match(server,/automatic_tax:\s*\{\s*enabled:\s*checkoutCountry\.automaticTax\s*\}/);
  assert.match(server,/automatic_tax:\{enabled:checkoutCountry\.automaticTax\}/);
  assert.match(server,/settings\?\.defaults\?\.tax_code!=='txcd_10103001'/);
  assert.equal((server.match(/business_purchase:\s*'1'/g)||[]).length,4);
});

test('US completed checkout enforces exact billing state and Stripe Tax, not merely US country',()=>{
  const guard=loadTaxGuard(null);
  const fixture=(state,tax=true,country='US')=>({
    metadata:{tax_country_policy:'us-b2b-tax-20261103',billing_country:'US',billing_state:'CA',business_purchase:'1'},
    customer_details:{address:{country,state}},
    automatic_tax:{enabled:tax}
  });
  assert.equal(guard.checkoutIsCountryPolicyCompliant(fixture('CA')),true);
  assert.equal(guard.checkoutIsCountryPolicyCompliant(fixture('NY')),false);
  assert.equal(guard.checkoutIsCountryPolicyCompliant(fixture('CA',false)),false);
  assert.equal(guard.checkoutIsCountryPolicyCompliant(fixture('CA',true,'FI')),false);
});
test('US checkout requires live SaaS Stripe Tax configuration',async()=>{
  const good=loadTaxGuard({tax:{settings:{retrieve:async()=>({status:'active',defaults:{tax_code:'txcd_10103001'}})}}});
  await good.ensureUSStripeTaxReady('US');
  const bad=loadTaxGuard({tax:{settings:{retrieve:async()=>({status:'pending',defaults:{tax_code:'txcd_10103001'}})}}});
  await assert.rejects(()=>bad.ensureUSStripeTaxReady('US'));
  await bad.ensureUSStripeTaxReady('FI');
});
