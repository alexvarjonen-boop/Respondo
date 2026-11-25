import test from 'node:test';
import assert from 'node:assert/strict';
import {runCloudflareSyntheticCheck} from '../cloudflare-synthetic-check.mjs';
import {resetConversationalAIBudgetForTests} from '../conversational-ai.mjs';

const env={RESPONDO_CLOUDFLARE_SYNTHETIC_CHECK:'1',RESPONDO_CLOUDFLARE_FREE_CONFIRMED:'1',
  RESPONDO_CLOUDFLARE_AI_ENABLED:'0',RESPONDO_CONVERSATIONAL_AI_ENABLED:'0',
  CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'fake-token'};
const json=value=>({ok:true,status:200,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})});

test('synthetic check stays disabled without free confirmation or while customer AI enabled',async()=>{
  for(const e of [{...env,RESPONDO_CLOUDFLARE_SYNTHETIC_CHECK:'0'},
    {...env,RESPONDO_CLOUDFLARE_FREE_CONFIRMED:'0'},
    {...env,RESPONDO_CLOUDFLARE_AI_ENABLED:'1'},
    {...env,RESPONDO_CONVERSATIONAL_AI_ENABLED:'1'}]){
    assert.deepEqual(await runCloudflareSyntheticCheck({env:e,fetchImpl:()=>{throw Error('unexpected request')}}),{skipped:true});
  }
});
test('benchmark sends only fictional fixtures and reports six bounded outcomes without secrets',async()=>{
  resetConversationalAIBudgetForTests();
  const responses=[
    {kind:'protected',search_queries:['ikkunanpesun hinta','ensi viikolla']},
    {kind:'protected',search_queries:['fönstertvätt pris']},
    {kind:'business',search_queries:['office cleaning']},
    {kind:'business',search_queries:['stair cleaning']},
    {answerable:true,answer:'Tarjoamme toimistosiivousta yrityksille.',evidence:[{source:'F1',quote:'We provide recurring office cleaning for businesses.'}]},
    {answerable:true,answer:'Vi erbjuder kontorsstädning för företag.',evidence:[{source:'F1',quote:'We provide recurring office cleaning for businesses.'}]}
  ];
  const logs=[];let count=0;
  const result=await runCloudflareSyntheticCheck({env,log:x=>logs.push(x),fetchImpl:async(url,options)=>{
    assert.match(url,/api\.cloudflare\.com/);
    assert.doesNotMatch(options.body,/fake-token/);
    return json(responses[count++]);
  }});
  assert.equal(count,6);
  assert.deepEqual(result,{passed:6,total:6,expected:6});
  assert.doesNotMatch(logs.join('\n'),/fake-token|CLOUDFLARE_ACCOUNT_ID|ikkunanpesun hinta/);
});
test('benchmark stops on rate limit or forbidden',async()=>{
  resetConversationalAIBudgetForTests();
  let count=0;const result=await runCloudflareSyntheticCheck({env,log:()=>{},fetchImpl:async()=>{
    count++;return {ok:false,status:429};
  }});
  assert.equal(count,1);assert.equal(result.passed,0);
});
