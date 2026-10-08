import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

function loadTaxGuard(stripe) {
  const start=server.indexOf("const TAX_CHECKOUT_COUNTRIES = new Set(['FI']);");
  const end=server.indexOf("function checkoutTaxExemptionMessage",start);
  assert.ok(start>0 && end>start,'country guard not found');
  const code=server.slice(start,end);
  return vm.runInNewContext(code+"\n({checkoutCountryPolicy,checkoutIsCountryPolicyCompliant,enforceCompletedCheckoutCountryPolicy})",{
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

test('signup and both workspace forms collect and send country',()=>{
  assert.equal((app.match(/name="billingCountry"/g)||[]).length,3);
  assert.equal((app.match(/billingCountry:\s*(?:form.get|String\(fd.get)/g)||[]).length,3);
  assert.match(app,/billingCountryNotice/);
  assert.match(html,/tax-country-guard-v1/);
  assert.equal((server.match(/tax_country_policy:/g)||[]).length,4);
  assert.match(server,/enforceCompletedCheckoutCountryPolicy\(session\)/);
  assert.match(server,/checkoutCountryPolicy\(req.body\?\.billingCountry\)/);
});

test('only declared Finnish business customers can enter either checkout',()=>{
  assert.equal((app.match(/name="businessPurchase"/g)||[]).length,3);
  assert.equal((app.match(/businessPurchase:\s*(?:form.get|fd.get)/g)||[]).length,3);
  assert.match(server,/if\s*\(req\.body\?\.businessPurchase !== true\)/);
  assert.match(server,/if\s*\(req\.body\?\.businessPurchase!==true\)/);
  assert.match(app,/Maksulliset tilaukset ovat toistaiseksi saatavilla vain Suomessa sijaitseville yrityksille/);
});

test('legal sole-trader seller is disclosed in fallback app',()=>{
  assert.match(app,/Alex Varjonen \(Respondo AI -palvelu\), Y-tunnus/);
  assert.match(app,/sellerName: 'Alex Varjonen/);
  assert.match(server,/sellerName: 'Alex Varjonen/);
  assert.match(html,/seller-b2b-v2/);
  assert.equal((server.match(/automatic_tax:\s*\{\s*enabled:\s*false\s*\}/g)||[]).length,2);
});
