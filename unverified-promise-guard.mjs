// Never transform a generated answer into proof that a booking, payment,
// refund or order operation actually happened. Checked facts must come from
// a transaction-specific backend path, not from chat text or generic FAQs.
import { evaluateFreeQualityScenario } from './respondo-free-quality-gates.mjs';
const ACTION_FLAGS=new Set([
  'unverified_booking','unverified_refund','unverified_payment',
  'unverified_order','unverified_availability'
]);
export function guardUnverifiedPromises(result,{question='',lang='fi'}={}){
  if(!result||result.handoff||!String(result.answer||'').trim())return result;
  const language=['fi','sv','en'].includes(lang)?lang:'fi';
  const screen=evaluateFreeQualityScenario({
    question:String(question||'Question').slice(0,1200),
    answer:String(result.answer).slice(0,5000),
    language,proof:{} // a generated reply can NEVER prove a transaction
  });
  const violations=screen.flags.filter(flag=>ACTION_FLAGS.has(flag.code));
  if(!violations.length)return result;
  return {...result,answer:'',handoff:true,confidence:0.1,
    sourceIds:[],selected:[],qualityFlag:'unverified_transaction_promise',
    blockedPromiseTypes:violations.map(flag=>flag.code)};
}
