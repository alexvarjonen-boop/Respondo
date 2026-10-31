// Synthetic, tenant-scoped quality benchmark. This measures Respondo only;
// it does not imply we have run another vendor's private agent.
import { performance } from 'node:perf_hooks';
import { generateGroundedAnswer } from '../server.mjs';

const productRows = [
  {
    id:'putter',category:'Tuotteet',title:'JAG Satin Black - Putter',
    answer:'Tuote: JAG Satin Black - Putter. Tuoteryhmä: Putter. Hinta: 199 EUR. Linkki: https://example.test/products/putter.',
    keywords:['jag','putter','golf'],source_type:'website',source_url:'https://example.test/products/putter'
  },
  {
    id:'headcover',category:'Tuotteet',title:'JAG Headcover',
    answer:'Tuote: JAG Headcover. Tuoteryhmä: Headcover. Hinta: 29 EUR. Linkki: https://example.test/products/headcover.',
    keywords:['golf','headcover'],source_type:'website',source_url:'https://example.test/products/headcover'
  }
];
const faqQuestion = 'Can visitors bring pets inside the museum?';
const faq = (id,answer) => ({
  id,category:'Usein kysytyt',title:faqQuestion,answer,
  keywords:['visitors','pets','museum','rules'],
  source_type:'website',source_url:'https://museum.example/faq'
});

const cases = [
  ...[
    ['fi','Mitä myytte?',/putter|mailansuoja|golf/i],
    ['sv','Vad säljer ni?',/putter|headcover|golf/i],
    ['en','What do you sell?',/putter|headcover|golf/i],
    ['fi','Mitä teiltä voi ostaa?',/putter|mailansuoja|golf/i],
    ['en','What can I buy from you?',/putter|headcover|golf/i],
    ['sv','Vad kan jag köpa hos er?',/putter|headcover|golf/i]
  ].map(([lang,message,pattern])=>({
    name:'catalog/'+lang+'/'+message,rows:productRows,lang,message,
    validate:r=>!r.handoff && pattern.test(r.answer) && r.intent==='Tuotteet'
  })),
  ...[
    ['fi','Miten voin tilata?',/tilata|verkkokaupasta/i],
    ['en','How can I order?',/order|online store/i],
    ['sv','Hur kan jag beställa?',/beställa|webbutiken/i]
  ].map(([lang,message,pattern])=>({
    name:'ordering/'+lang,rows:productRows,lang,message,
    validate:r=>!r.handoff && pattern.test(r.answer)
  })),
  {
    name:'verified-product-price',rows:productRows,lang:'fi',message:'Mitä putterit maksaa?',
    validate:r=>!r.handoff && /199/.test(r.answer) && !/29\s*(?:eur|€)/i.test(r.answer)
  },
  {
    name:'published-faq',rows:[faq('a','No. Pets are not permitted in the museum.')],
    lang:'en',message:faqQuestion,
    validate:r=>!r.handoff && /pets are not permitted/i.test(r.answer) && r.sourceIds.includes('a')
  },
  {
    name:'duplicate-faq',rows:[faq('a','No. Pets are not permitted in the museum.'),faq('b','No. Pets are not permitted in the museum.')],
    lang:'en',message:faqQuestion,
    validate:r=>!r.handoff && /pets are not permitted/i.test(r.answer)
  },
  {
    name:'contradictory-faq',rows:[faq('a','No. Pets are not permitted in the museum.'),faq('b','Yes. Pets are allowed inside the museum.')],
    lang:'en',message:faqQuestion,
    validate:r=>r.handoff && !r.answer && r.sourceIds.length===0
  },
  {
    name:'unknown-faq',rows:[],lang:'en',message:'Is there a pet daycare service on site?',
    validate:r=>r.handoff && !r.sourceIds?.length && !/yes.*daycare/i.test(r.answer||'')
  }
];

function percentile(data,p){
  if(!data.length)return null;
  const sorted=[...data].sort((a,b)=>a-b);
  return Math.round(sorted[Math.ceil(sorted.length*p)-1]*100)/100;
}

const results=[];
for(const item of cases){
  const start=performance.now();
  try{
    const reply=await generateGroundedAnswer({
      companyName:'Fixture tenant',rows:item.rows,lang:item.lang,
      message:item.message,history:[]
    });
    const latencyMs=Math.round((performance.now()-start)*100)/100;
    results.push({
      name:item.name,pass:Boolean(item.validate(reply)),latencyMs,
      handoff:Boolean(reply.handoff),confidence:reply.confidence,
      sourceCount:Array.isArray(reply.sourceIds)?reply.sourceIds.length:0,
      // Never log customer messages or full answers in production benchmarking.
    });
  }catch(error){
    results.push({name:item.name,pass:false,error:String(error?.message||error).slice(0,160)});
  }
}
const latencies=results.map(r=>r.latencyMs).filter(Number.isFinite);
const passed=results.filter(r=>r.pass).length;
const report={
  suite:'respondo-synthetic-grounded-v1',source:'synthetic fixtures, not real customers',
  competitorMeasured:false,
  scenarios:results.length,passed,failed:results.length-passed,
  passRate:Math.round(10000*passed/results.length)/100,
  p50LatencyMs:percentile(latencies,0.5),p95LatencyMs:percentile(latencies,0.95),
  results
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(passed!==results.length) process.exitCode=1;
