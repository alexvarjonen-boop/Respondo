import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const start=source.indexOf('let finnishInclusiveVatRatePromise = null;');
const end=source.indexOf('// Applies only to newly created, verified Finnish B2B subscriptions.',start);
assert.ok(start>=0 && end>start,'domestic VAT implementation must exist');
const implementation=source.slice(start,end);

function harness(stripe) {
  const context={stripe};
  runInNewContext(implementation+'\nthis.exports = {checkoutItemsWithDomesticVat,finnishInclusiveVatRateId};',context);
  return context.exports;
}

test('Finnish checkout applies an included 25.5% VAT rate to recurring plan and one-time setup, without changing prices',async()=>{
  let created=0;
  const stripe={taxRates:{
    list:async()=>({data:[{id:'txr_existing',active:true,country:'FI',percentage:25.5,inclusive:true,display_name:'ALV'}]}),
    create:async()=>{created++;throw Error('should reuse existing VAT rate');},
  }};
  const {checkoutItemsWithDomesticVat}=harness(stripe);
  const items=[{price:'price_existing',quantity:1},{price_data:{currency:'eur',unit_amount:19900},quantity:1}];
  const result=await checkoutItemsWithDomesticVat('FI',items);
  assert.deepEqual(Array.from(result,x=>Array.from(x.tax_rates)),[['txr_existing'],['txr_existing']]);
  assert.equal(result[0].price,'price_existing');
  assert.equal(result[1].price_data.unit_amount,19900);
  assert.equal(items[0].tax_rates,undefined,'input line items must not be mutated');
  assert.equal(created,0);
});

test('VAT rate is inclusive, fixed at 25.5%, created once, and not applied to US Checkout',async()=>{
  let count=0;
  let received;
  const stripe={taxRates:{
    list:async()=>({data:[]}),
    create:async (params,options)=>{
      count++;received={params,options};
      return {id:'txr_new',inclusive:params.inclusive,percentage:params.percentage};
    },
  }};
  const {checkoutItemsWithDomesticVat}=harness(stripe);
  const input=[{price_data:{unit_amount:4900},quantity:1}];
  const foreign=await checkoutItemsWithDomesticVat('US',input);
  assert.equal(foreign,input);
  const one=await checkoutItemsWithDomesticVat('FI',input);
  const two=await checkoutItemsWithDomesticVat('FI',input);
  assert.equal(count,1);
  assert.equal(received.params.percentage,25.5);
  assert.equal(received.params.inclusive,true);
  assert.equal(received.params.country,'FI');
  assert.equal(one[0].price_data.unit_amount,4900);
  assert.deepEqual(Array.from(two[0].tax_rates),['txr_new']);
});

test('Checkout paths use the domestic VAT helper without changing advertised prices',()=>{
  assert.equal((source.match(/line_items:checkoutLineItems,/g)||[]).length,2);
  assert.equal((source.match(/await checkoutItemsWithDomesticVat\(/g)||[]).length,2);
  assert.match(source,/basic_monthly:4900, advanced_monthly:12900, business_monthly:14900/);
  assert.match(source,/basic_yearly:46800, advanced_yearly:142800, business_yearly:166800/);
  assert.match(source,/const SETUP_SERVICE_PRICE_CENTS = 19900;/);
  assert.doesNotMatch(source,/Myyjä ei ole arvonlisäverorekisterissä|The seller is not VAT-registered/);
});
