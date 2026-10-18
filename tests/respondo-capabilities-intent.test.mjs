import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isRespondoCapabilityQuestion } from '../respondo-capability-intent.mjs';
import { respondoSiteNavigationActions } from '../respondo-site-navigation.mjs';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const begin=server.indexOf('function respondoProductFaqMatch(');
const end=server.indexOf('\nfunction ',begin+20);
assert.ok(begin>0&&end>begin,'server exposes first-party FAQ before other knowledge retrieval');
const normalizeSearchText=value=>String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9åäö€+\s-]/g,' ')
  .replace(/\s+/g,' ').trim();
const match=vm.runInNewContext(server.slice(begin,end)+'\nrespondoProductFaqMatch',{
  normalizeSearchText,
  isRespondoCapabilityQuestion,
  broadProductQuestion:()=>false
});
const examples=[
  ['Mitä Respondo osaa?','fi'],
  ['Mitä kaikkea Respondo osaa?','fi'],
  ['Mitä tämä botti osaa?','fi'],
  ['Mihin Respondo pystyy?','fi'],
  ['Mitä Respondo tekee?','fi'],
  ['What does Respondo do?','en'],
  ['What can Respondo do?','en'],
  ['What can this bot do?','en'],
  ['Vad kan Respondo göra?','sv'],
  ['Vad gör Respondo?','sv']
];

test('the exact screenshot question returns the full verified overview, not just a language detail',()=>{
  const reply=match('Mitä Respondo osaa?','fi',[]);
  assert.equal(reply?.id,'respondo-faq-features-overview');
  for(const item of ['ympäri vuorokauden','englanniksi','tuotetietoja','liidejä','ajanvarauksia','asiakaspalvelijalle','analytiikkaa']){
    assert.ok(reply.answer.includes(item),item+' must be present');
  }
  assert.ok(reply.answer.length>350,'broad question must receive a meaningful overview');
});

test('natural Finnish Swedish and English capability questions all resolve to a feature overview',()=>{
  for(const [question,lang] of examples){
    assert.equal(isRespondoCapabilityQuestion(question),true,question);
    const response=match(question,lang,[]);
    assert.equal(response?.id,'respondo-faq-features-overview',question);
    const actions=respondoSiteNavigationActions(question,lang,response.id,'https://respondoai.fi');
    const path=lang==='sv'?'/funktioner':lang==='en'?'/features':'/ominaisuudet';
    assert.ok(actions.some(action=>new URL(action.url).pathname===path),question+' needs a features button');
  }
});

test('a question about only languages or pricing is not misclassified as a capability overview',()=>{
  for(const prompt of ['Mitä Respondo maksaa?','Puhuuko Respondo ruotsia?','Tukeeko Respondo englantia?','Miten kirjaudun sisään?']){
    assert.equal(isRespondoCapabilityQuestion(prompt),false,prompt);
  }
  assert.equal(match('Mitä Respondo maksaa?','fi',[])?.id,'respondo-faq-pricing');
  const actions=respondoSiteNavigationActions('Mitä Respondo maksaa?','fi','','https://respondoai.fi');
  assert.ok(actions.some(action=>new URL(action.url).pathname==='/hinnat'));
  assert.ok(!actions.some(action=>new URL(action.url).pathname==='/ominaisuudet'));
});

test('public assistant matches product questions before returning unrelated knowledge',()=>{
  const routeStart=server.indexOf("app.post('/api/public/respondo-assistant/chat'");
  const directFaq=server.indexOf('const directFaq=respondoProductFaqMatch(',routeStart);
  const firstSearch=server.indexOf("const ownerEmail=cleanEmail(",routeStart);
  assert.ok(routeStart>0&&directFaq>routeStart&&firstSearch>directFaq);
  assert.match(server,/isRespondoCapabilityQuestion\(q\)/);
});
