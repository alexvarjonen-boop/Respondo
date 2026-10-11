import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const get=(begin,next)=>{
  const start=source.indexOf(begin);
  const end=source.indexOf(next,start+begin.length);
  assert.ok(start>=0 && end>start,'missing source segment '+begin);
  return source.slice(start,end);
};
const norm=(v)=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const contact=runInNewContext(
  get('function generalContactQuestion(', 'function directGeneralContactAnswer(')+'\ngeneralContactQuestion;',
  {normalizeSearchText:norm}
);
const language=runInNewContext(
  get('function detectConversationLanguage(', 'async function getOrCreateThread(')+'\ndetectConversationLanguage;',
  {interpretCustomerQuestion:(message)=>({text:message})}
);
const warranty=runInNewContext(
  get('function directWarrantyAnswer(', 'function directReturnPolicyAnswer(')+'\ndirectWarrantyAnswer;',
  {
    normalizeSearchText:norm,
    usableWebsiteRow:()=>true,
    knowledgeTopic:()=> 'warranty',
    cleanKnowledgeText:(v)=>String(v||''),
  }
);
test('natural English message request is a contact request',()=>{
  for(const text of [
    'how can i send you a message',
    'how can I send you a message?',
    'can I send you a message?',
    'how can I message you?',
    'how can I contact you?',
  ])assert.equal(contact(text),true,text);
  assert.equal(contact('what is the shipping price?'),false);
});
test('English questions override a Finnish UI language hint',()=>{
  assert.equal(language('how can I send you a message','fi'),'en');
  assert.equal(language('is there a waranty on the products','fi'),'en');
  assert.equal(language('is there a warranty on the products','fi'),'en');
});
test('verified warranty is expressed in English, with a sourced duration',()=>{
  const rows=[{id:'w1',category:'Takuu',title:'Takuu',answer:'Products have a 2 year warranty covering manufacturing defects.'}];
  const result=warranty(rows,'is there a warranty on the products','en');
  assert.equal(result?.handoff,false);
  assert.match(result?.answer||'',/2 years/);
  assert.equal(result?.sourceIds?.[0],'w1');
});
test('absence of warranty evidence is not a fabricated affirmative',()=>{
  assert.equal(warranty([], 'is there a warranty on the products','en'),null);
  assert.match(source,/if\(queryTopic\(cleanMessage\)==='warranty' \|\| followupKind==='warranty'\)/);
  assert.match(source,/return \{answer,handoff:false,confidence:0\.3,intent:'Takuu'/);
});
test('contact form shows in the question language and carries an actual message',()=>{
  assert.match(app,/function showPreviewLeadForm\(chat, question, answerLang=currentLang\(\)\)/);
  assert.match(app,/textarea name="message"/);
  assert.match(app,/lang:detectedLang/);
  assert.match(app,/result\.language\|\|currentLang\(\)/);
});
