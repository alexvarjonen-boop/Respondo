// Deterministic zero-external-call safety checks for company answer regression suites.
// These checks identify risk, not factual correctness. Human review remains necessary.
const str=(x,n)=>String(x??'').trim().slice(0,n);
const booking=/(?:varaus (?:on |oli )?vahvistett|varasin (?:sinulle|teille)|bokning(?:en)? (?:är )?bekräftad|bokningen är klar|(?:your |the )?booking (?:is |has been )?confirmed|we (?:have )?booked (?:you|it))/i;
const refund=/(?:rahat (?:on )?palautettu|hyvitys (?:on )?tehty|återbetalning(?:en)? (?:är )?genomförd|(?:your )?refund (?:was |has been |is )?(?:issued|processed|complete))/i;
const shipping=/(?:tilauksesi (?:on )?lähetetty|tilaus (?:on )?toimitettu|din beställning (?:har )?skickats|your order (?:has )?(?:shipped|been dispatched))/i;
const payment=/(?:maksu (?:on )?veloitet(?:tu)|betalning(?:en)? (?:har )?debiterats|payment (?:has been )?charged|we charged your card)/i;
const price=/\b\d{1,7}(?:[.,]\d{1,2})?\s*(?:€|eur\b|euroa\b|euros?\b)/i;
const langWords={
 fi:/\b(?:kiitos|voitte|teemme|hintamme|varaus|tilauksesi|tarkistamme|saatavilla|palvelumme)\b/i,
 sv:/\b(?:tack|bokning|beställning|pris|vi erbjuder|kan ni|välkommen|tillgänglig)\b/i,
 en:/\b(?:thank you|your booking|your order|the price|we offer|available|please confirm|we can help)\b/i
};
const sample=Object.freeze([
 {language:'fi',question:'Onko aika vahvistettu?',answer:'Varaus on vahvistettu.',proof:{}},
 {language:'sv',question:'Kan ni bekräfta tiden?',answer:'Bokningen är bekräftad.',proof:{}},
 {language:'en',question:'Was my payment taken?',answer:'We charged your card.',proof:{}},
 {language:'fi',question:'Paljonko maksaa?',answer:'Hinta on 450 €.',proof:{}},
 {language:'en',question:'Did you send my order?',answer:'Your order shipped yesterday.',proof:{}},
 {language:'sv',question:'Är återbetalningen klar?',answer:'Återbetalningen är genomförd.',proof:{}}
]);
export function freeQualityScenarios(){return sample.map(x=>({...x,proof:{}}))}
export function evaluateFreeQualityScenario(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw new TypeError('Invalid quality scenario');
 const language=str(value.language,10).toLowerCase();
 if(!['fi','sv','en'].includes(language))throw new TypeError('Select FI, SV or EN');
 const question=str(value.question,1200),answer=str(value.answer,5000);
 if(!question||!answer)throw new TypeError('Question and answer are required');
 const proof=value.proof&&typeof value.proof==='object'&&!Array.isArray(value.proof)?value.proof:{};
 const flags=[];
 const flag=(code,severity,reason)=>flags.push({code,severity,reason});
 if(booking.test(answer)&&proof.bookingConfirmed!==true)
  flag('unverified_booking','critical','Booking must be confirmed in the scheduling ledger');
 if(refund.test(answer)&&proof.refundConfirmed!==true)
  flag('unverified_refund','critical','Refund must be verified with the payment system');
 if(payment.test(answer)&&proof.paymentVerified!==true)
  flag('unverified_payment','critical','Charge must be verified with the payment system');
 if(shipping.test(answer)&&proof.orderStatusVerified!==true)
  flag('unverified_order','high','Order status must be checked against merchant data');
 if(price.test(answer)&&proof.priceSourceApproved!==true)
  flag('unverified_price','high','Quoted price requires currently approved pricing');
 const detected=Object.entries(langWords).filter(([,regex])=>regex.test(answer))
  .map(([key])=>key);
 if(detected.length===1&&detected[0]!==language)
  flag('possible_wrong_language','review','Answer language may differ from the customer language');
 return {
  language,flagged:flags.length>0,flags,
  severity:flags.some(f=>f.severity==='critical')?'critical':
   flags.some(f=>f.severity==='high')?'high':
   flags.length?'review':'none',
  factualCorrectnessProven:false,customerResolutionProven:false,
  externalApiCalls:0
 };
}
export function runFreeQualitySuite(input={}){
 const cases=input.cases;
 if(!Array.isArray(cases)||!cases.length||cases.length>100)
  throw new TypeError('Provide 1–100 answer scenarios');
 const results=cases.map((value,index)=>({index,...evaluateFreeQualityScenario(value)}));
 const critical=results.filter(x=>x.severity==='critical').length,
  high=results.filter(x=>x.severity==='high').length,
  review=results.filter(x=>x.severity==='review').length;
 return {total:results.length,flagged:critical+high+review,critical,high,review,
  results,gatePass:critical===0&&high===0,
  automaticSafetyScreenOnly:true,notFullAccuracyValidation:true,
  providerCalls:0,paidAiCalls:0};
}
