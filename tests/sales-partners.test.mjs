import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SALES_PARTNER_PROGRAM_ENABLED='1';
process.env.SALES_PARTNER_LEGAL_APPROVED='1';
process.env.SALES_PARTNER_CONTRACT_VERSION='test-reviewed-v1';

const {qualifyingAnnualInvoice,savePartnerCheckout,partnerCheckoutCompleted,partnerInvoicePaid}=await import('../sales-partners.mjs');

const invoice=(values={})=>({id:'in_first',amount_paid:46800,status:'paid',...values});
const annual={id:'sub_one',items:{data:[{price:{id:'price_yearly',recurring:{interval:'year'}}}]}};
const monthly={id:'sub_month',items:{data:[{price:{id:'price_monthly',recurring:{interval:'month'}}}]}};
const annualLine=[{id:'il_first',type:'subscription',price:{id:'price_yearly'},amount:46800}];
test('paid first annual recurring invoice qualifies',()=>assert.equal(qualifyingAnnualInvoice(invoice(),annual,annualLine),true));
test('free trial does not qualify',()=>assert.equal(qualifyingAnnualInvoice(invoice({amount_paid:0}),annual,annualLine),false));
test('monthly subscription never qualifies',()=>assert.equal(qualifyingAnnualInvoice(invoice(),monthly,annualLine),false));
test('unpaid or open invoices do not qualify',()=>assert.equal(qualifyingAnnualInvoice(invoice({status:'open'}),annual,annualLine),false));
test('setup-service invoice with 0 EUR annual line does not qualify',()=>assert.equal(qualifyingAnnualInvoice(invoice({amount_paid:19900}),annual,[{type:'invoiceitem',amount:19900},{type:'subscription',price:{id:'price_yearly'},amount:0}]),false));
test('discount to 0 EUR annual line does not qualify',()=>assert.equal(qualifyingAnnualInvoice(invoice({amount_paid:19900}),annual,[{type:'subscription',price:{id:'price_yearly'},amount:0}]),false));
test('unrelated one-off invoice price does not qualify',()=>assert.equal(qualifyingAnnualInvoice(invoice(),annual,[{type:'invoiceitem',price:{id:'price_setup'},amount:19900}]),false));
test('Stripe modern pricing.price_details line format qualifies',()=>assert.equal(qualifyingAnnualInvoice(invoice(),annual,[{type:'subscription',pricing:{price_details:{price:'price_yearly'}},amount:46800}]),true));
test('attribution writes one idempotent checkout record (SQL has conflict protection)',async()=>{
 const calls=[],db={query:async(sql,params)=>{calls.push({sql,params});return {rowCount:1,rows:[]};}};
 await savePartnerCheckout(db,{partner:{id:'partner-a'},sessionId:'cs_valid',userId:'u',tenantId:'t'});
 assert.equal(calls.length,1);assert.match(calls[0].sql,/ON CONFLICT\(checkout_session_id\) DO NOTHING/);
 assert.deepEqual(calls[0].params.slice(1),['partner-a','cs_valid','u','t']);
});
test('completion associates Stripe subscription id with recorded checkout',async()=>{
 const calls=[],db={query:async(sql,params)=>{calls.push({sql,params})}};
 await partnerCheckoutCompleted(db,{id:'cs_one',subscription:'sub_one'});
 assert.equal(calls.length,1);assert.deepEqual(calls[0].params,['cs_one','sub_one']);
});
test('one paid annual invoice records one review-only 50 EUR commission',async()=>{
 const calls=[],db={query:async(sql,params)=>{calls.push({sql,params});if(sql.startsWith('SELECT'))return {rowCount:1,rows:[{id:'attr',partner_id:'partner-a'}]};return {rowCount:1,rows:[]};}};
 const stripe={invoices:{listLineItems:async()=>({data:annualLine})}};
 await partnerInvoicePaid(db,stripe,invoice(),annual);
 const insert=calls.find(x=>x.sql.includes('INSERT INTO respondo_sales.commissions'));
 assert.ok(insert);assert.match(insert.sql,/pending_review/);assert.match(insert.sql,/ON CONFLICT\(subscription_id\) DO NOTHING/);
 assert.deepEqual(insert.params.slice(1),['partner-a','attr','sub_one','in_first',5000]);
});
test('zero-euro and setup invoices never create commission',async()=>{
 const calls=[],db={query:async(sql,params)=>{calls.push(sql);return{rowCount:1,rows:[{id:'attr',partner_id:'p'}]};}};
 const stripe={invoices:{listLineItems:async()=>({data:[{type:'subscription',price:{id:'price_yearly'},amount:0}]})}};
 await partnerInvoicePaid(db,stripe,invoice({amount_paid:19900}),annual);
 assert.equal(calls.some(sql=>sql.includes('INSERT INTO respondo_sales.commissions')),false);
});