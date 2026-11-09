import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {
  isRespondoCapabilityQuestion,isRespondoCustomerValueQuestion
} from '../respondo-capability-intent.mjs';
import {respondoSiteNavigationActions,respondoSiteNavigationAnswer} from '../respondo-site-navigation.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const server=read('server.mjs');
const experience=read('public/respondo-experience.mjs');
const effects=read('public/effects.js');
const index=read('public/index.html');
const begin=server.indexOf('function respondoProductFaqMatch(');
const end=server.indexOf('\nfunction ',begin+20);
assert.ok(begin>=0&&end>begin);
const normalizeSearchText=value=>String(value||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9åäö€+\s-]/g,' ')
  .replace(/\s+/g,' ').trim();
const match=vm.runInNewContext(server.slice(begin,end)+'\nrespondoProductFaqMatch',{
  normalizeSearchText,
  isRespondoCapabilityQuestion,
  isRespondoCustomerValueQuestion,
  broadProductQuestion:()=>false
});

const questions=[
  ['How can Respondo help customers on my business website?','en',
    ['visitors','services and products','prices and opening hours','contact and quote requests','booking flows','staff']],
  ['How does Respondo help my website visitors?','en',['visitors','company-approved']],
  ['What can this chatbot do for my customers?','en',['contact and quote requests']],
  ['How will the bot help our customers?','en',['Finnish, Swedish and English']],
  ['Miten Respondo auttaa yritykseni asiakkaita verkkosivuilla?','fi',
    ['verkkosivujesi kävijöitä','palvelut ja tuotteet','yhteydenottoja','ajanvarauspolussa']],
  ['Miten botti auttaa asiakkaita?','fi',['hyväksyttyihin tietoihin']],
  ['Mitä hyötyä Respondosta on asiakkailleni?','fi',['tarjouspyyntöjä']],
  ['Hur hjälper Respondo kunderna på vår webbplats?','sv',
    ['besökare','kontakt- och offertförfrågningar']],
  ['Hur kan Respondo hjälpa mina kunder?','sv',['bokningsflöden']]
];
for(const [question,lang,required] of questions){
  test('customer outcome answered directly ('+lang+'): '+question,()=>{
    assert.equal(isRespondoCustomerValueQuestion(question),true,'visitor outcome intent');
    const reply=match(question,lang,[]);
    assert.equal(reply?.id,'respondo-faq-customer-value','must avoid FAQ website-import retrieval');
    assert.equal(typeof reply.answer,'string');
    for(const word of required) assert.ok(reply.answer.toLowerCase().includes(word.toLowerCase()),word);
    assert.doesNotMatch(reply.answer,/website import scans|verkkosivujen tietojen tuonti|crawl/i);
    const actions=respondoSiteNavigationActions(question,lang,reply.id,'https://respondoai.fi');
    const paths=actions.map(a=>new URL(a.url).pathname);
    assert.ok(paths.includes('/assistant'),'must provide a genuine Try Bot action');
    assert.ok(paths.includes(lang==='en'?'/features':lang==='sv'?'/funktioner':'/ominaisuudet'),
      'must provide a first-party features action');
  });
}

test('import, login, data-protection, specific pricing and general enquiries keep their own intents',()=>{
  const negatives=[
    ['How does Respondo import data from a website?','en'],
    ['How can I import my website details?','en'],
    ['Miten Respondo skannaa verkkosivuni?','fi'],
    ['Hur importerar Respondo information?','sv'],
    ['How do I contact Respondo customer support?','en'],
    ['How much does Respondo cost?','en'],
    ['How can I sign in to Respondo?','en'],
    ['What is your privacy policy for customer data?','en']
  ];
  for(const [question] of negatives)assert.equal(isRespondoCustomerValueQuestion(question),false,question);
  assert.equal(match('Mitä Respondo maksaa?','fi',[])?.id,'respondo-faq-pricing');
  assert.equal(match('Mitä Respondo osaa?','fi',[])?.id,'respondo-faq-features-overview');
  assert.ok(respondoSiteNavigationAnswer('How do I sign in?','en')?.answer);
});

test('site assistant resolves outcome question before tenant lookup and broad website retrieval',()=>{
  const begin=server.indexOf("app.post('/api/public/respondo-assistant/chat'");
  const faq=server.indexOf('const directFaq=respondoProductFaqMatch(',begin);
  const db=server.indexOf('const ownerEmail=cleanEmail(',begin);
  const broadWebsite=server.indexOf('const websiteQuestion=',begin);
  assert.ok(begin>=0&&faq>begin&&db>faq&&broadWebsite>db);
  assert.ok(server.slice(faq,db).includes('if(directFaq)'));
  assert.match(server,/if\(isRespondoCustomerValueQuestion\(message\)\)/);
});

test('experience Ask AI does not resend the identical automatic demo prompt on return',()=>{
  assert.match(experience,/let experienceOpeningSent=false/);
  assert.match(experience,/if\(text===c\.startPrompt && experienceOpeningSent\)\{input\.focus\(\);return;\}/);
  assert.match(experience,/if\(text===c\.startPrompt\)experienceOpeningSent=true/);
  assert.match(experience,/form\.requestSubmit\(\)/);
  assert.match(effects,/if\(clean===lastSubmittedText && Date\.now\(\)-lastSubmittedAt<3500\)return/);
  assert.match(effects,/form\.message\.disabled = true/);
  assert.match(effects,/\/api\/public\/respondo-assistant\/chat/);
});

test('changed marketing assistant and experience files carry new asset versions',()=>{
  assert.match(index,/respondo-experience\.mjs\?v=20261109-immersive-stage-v1-visitor-value-v2/);
  assert.match(index,/firstparty-smart-assist-v1-customer-benefits-v2-mobile-simplify-v9/);
});
