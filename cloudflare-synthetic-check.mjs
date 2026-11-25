// Synthetic-only diagnostic. Never pass live customer data to this runner.
// Production conversational inference remains disabled until approved.
import {interpretConversationalQuestion,tryConversationalAIResponse} from './conversational-ai.mjs';

const planCases=[
  {id:'fi-dialect-price-date',question:'paljo maksais ikkunoitte pesu ja onnistuuks ens viikol?',kind:'protected',match:[/ikkun|window|fönster/i,/ensi viik|next week|nästa veck/i,/hint|maks|pric|cost|pris/i]},
  {id:'sv-colloquial',question:'va kostar de o tvätta fönstren?',kind:'protected',match:[/fönster|fönstertvätt|window|ikkun/i,/pris|kost|price|hint|maks/i]},
  {id:'mixed-language-service',question:'teetteks myös office cleaningii?',kind:'business',match:[/toimisto|office|kontor/i,/siiv|clean|städ/i]},
  {id:'fi-followup',question:'entä kerrostalon rappukäytävät?',history:[{question:'Millaisia siivouspalveluja tarjoatte?'}],kind:'business',match:[/rappu|porras|stair|trapp/i]}
];
const facts=[{id:'synthetic-office',source_type:'website',source_url:'https://synthetic.example/services',approved:true,title:'Office cleaning / toimistosiivous / kontorsstädning',answer:'We provide recurring office cleaning for businesses.'}];
const answerCases=[
  {id:'fi-grounded-answer',question:'hoidatteks toimistojen siivouksii?',lang:'fi',match:/toimisto/i},
  {id:'sv-grounded-answer',question:'kan ni städa kontor?',lang:'sv',match:/kontor/i}
];

export async function runCloudflareSyntheticCheck({env=process.env,fetchImpl=fetch,log=console.info}={}){
  if(env.RESPONDO_CLOUDFLARE_SYNTHETIC_CHECK!=='1' ||
     env.RESPONDO_CLOUDFLARE_FREE_CONFIRMED!=='1' ||
     env.RESPONDO_CLOUDFLARE_AI_ENABLED==='1' ||
     env.RESPONDO_CONVERSATIONAL_AI_ENABLED==='1')return {skipped:true};
  // Only hard-coded fictional questions and facts enter this isolated check.
  const testEnv={...env,RESPONDO_CLOUDFLARE_AI_ENABLED:'1',
    RESPONDO_CLOUDFLARE_PRIVACY_APPROVED:'1',RESPONDO_CONVERSATIONAL_AI_ENABLED:'0',
    RESPONDO_CONVERSATIONAL_AI_INCLUDE_MANUAL:'0',RESPONDO_CONVERSATIONAL_AI_MAX_DAILY:'6'};
  const results=[];
  for(const c of [...planCases,...answerCases]){
    let status=0;const started=Date.now();
    const tracked=async(url,options)=>{
      const response=await fetchImpl(url,options);status=Number(response?.status|| (response?.ok?200:0));return response;
    };
    let passed=false;
    if(c.kind){
      const result=await interpretConversationalQuestion({question:c.question,history:c.history,env:testEnv,fetchImpl:tracked});
      passed=result?.kind===c.kind && c.match.every(r=>r.test(result.searchQueries.join(' ')));
    }else{
      const result=await tryConversationalAIResponse({question:c.question,rows:facts,lang:c.lang,
        plan:{kind:'business',searchQueries:['office cleaning','toimistosiivous','kontorsstädning']},
        env:testEnv,fetchImpl:tracked});
      passed=!!result && result.sourceIds?.includes('synthetic-office') && c.match.test(result.answer);
    }
    const entry={case:c.id,passed:Boolean(passed),http:status,ms:Date.now()-started};
    results.push(entry);
    log('RESPONDO_CF_SYNTHETIC '+JSON.stringify(entry));
    if([401,403,429].includes(status))break;
  }
  const summary={passed:results.filter(r=>r.passed).length,total:results.length,expected:planCases.length+answerCases.length};
  log('RESPONDO_CF_SYNTHETIC_SUMMARY '+JSON.stringify(summary));
  return summary;
}
