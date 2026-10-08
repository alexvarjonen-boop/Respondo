import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

function loadFooterUpdater(stripe){
  const start=code.indexOf('const RESPONDO_DOMESTIC_INVOICE_FOOTER =');
  const end=code.indexOf("function checkoutTaxExemptionMessage(lang='fi')",start);
  assert.ok(start>0 && end>start,'seller footer helper must exist');
  return vm.runInNewContext(
    "const TAX_COUNTRY_POLICY_VERSION='fi-only-20261008';\n"+
    code.slice(start,end)+
    "\n({ensureNewDomesticSubscriptionSellerFooter,RESPONDO_DOMESTIC_INVOICE_FOOTER})",
    {stripe}
  );
}
const session=(billing_country, business_purchase='1')=>({
  metadata:{tax_country_policy:'fi-only-20261008',billing_country,business_purchase}
});

test('verified new domestic business subscription gets seller footer on future invoices',async()=>{
  const changes=[];
  const helper=loadFooterUpdater({subscriptions:{async update(id,params){changes.push({id,params});}}});
  assert.equal(await helper.ensureNewDomesticSubscriptionSellerFooter('sub_new',session('FI')),true);
  assert.equal(changes.length,1);
  assert.equal(changes[0].id,'sub_new');
  const footer=changes[0].params.invoice_settings.footer;
  for(const text of ['Alex Varjonen','Respondo AI','3599437-5','ei ole arvonlisäverorekisterissä']){
    assert.ok(footer.includes(text),text);
  }
});

test('no foreign, personal, unversioned or historical subscriptions are altered',async()=>{
  const changes=[];
  const helper=loadFooterUpdater({subscriptions:{async update(id,params){changes.push({id,params});}}});
  for(const [id,meta] of [
    ['sub_foreign',session('US')],
    ['sub_not_business',session('FI','0')],
    ['sub_preexisting',{metadata:{billing_country:'FI'}}],
    ['sub_unknown',{metadata:{}}],
    ['',session('FI')],
  ]) {
    assert.equal(await helper.ensureNewDomesticSubscriptionSellerFooter(id,meta),false);
  }
  assert.deepEqual(changes,[]);
});

test('new checkout webhook sets recurring invoice footer only after duplicate guard',()=>{
  const guard=code.indexOf("return res.json({ received:true, duplicateCheckout:true });");
  const updater=code.indexOf('await ensureNewDomesticSubscriptionSellerFooter(incomingSubscriptionId, session)');
  assert.ok(updater>guard && updater<guard+1500,'must not update canceled duplicate subscription');
  assert.match(code,/console\.error\('New subscription invoice seller footer update failed'/);
});
