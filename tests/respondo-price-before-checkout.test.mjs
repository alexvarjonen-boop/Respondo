import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  respondoPricingQuestion,
  respondoCheckoutAction,
  respondoSiteNavigationAnswer,
  respondoSiteNavigationActions,
} from '../respondo-site-navigation.mjs';
import { respondoProductFaqMatch } from '../server.mjs';

const priceCases=[
  ['how much does your cheapest package cost','en','respondo-faq-cheapest-pricing',/Advanced.*€49\/month.*€39\/month/],
  ['what is your most affordable plan?','en','respondo-faq-cheapest-pricing',/Advanced/],
  ['which plan has the lowest price?','en','respondo-faq-cheapest-pricing',/€49\/month/],
  ['How much does Respondo cost?','en','respondo-faq-pricing',/€49\/month/],
  ['what do your plans cost','en','respondo-faq-pricing',/Premium - €129\/month/],
  ['Paljonko halvin paketti maksaa?','fi','respondo-faq-cheapest-pricing',/Advanced: 49 €\/kk/],
  ['Mikä on edullisin Respondon paketti?','fi','respondo-faq-cheapest-pricing',/39 €\/kk/],
  ['Paljonko Respondo maksaa?','fi','respondo-faq-pricing',/Advanced - 49€\/kk/],
  ['Vilket är ert billigaste abonnemang?','sv','respondo-faq-cheapest-pricing',/49 €\/mån/],
  ['Vad kostar Respondo?','sv','respondo-faq-pricing',/129 €\/mån/],
  ['How much does annual billing cost?','en','respondo-faq-annual-pricing',/€468\/year/],
  ['How much does monthly billing cost?','en','respondo-faq-monthly-pricing',/Advanced - €49\/month/],
];

for(const [message,lang,expectedId,expectedAnswer] of priceCases){
  test('pricing answer, '+lang+': '+message,()=>{
    assert.equal(respondoPricingQuestion(message),true);
    assert.equal(respondoSiteNavigationAnswer(message,lang),null,
      'Price questions should reach the first-party price FAQ before checkout navigation');
    const faq=respondoProductFaqMatch(message,lang);
    assert.equal(faq?.id,expectedId);
    assert.match(faq.answer,expectedAnswer);
    const actions=respondoSiteNavigationActions(message,lang,faq.id);
    assert.ok(actions.some(action=>action.type==='site_pricing'),'Real pricing page remains available');
    assert.ok(actions.some(action=>action.type==='site_signup'),'Checkout is an optional action, not the answer');
  });
}

test('explicit signup intent still gives a direct subscription action',()=>{
  const message='how do I subscribe to Respondo?';
  assert.equal(respondoPricingQuestion(message),false);
  const navigation=respondoSiteNavigationAnswer(message,'en');
  assert.match(navigation.answer,/subscribe/i);
  assert.ok(navigation.actions.some(action=>action.type==='site_signup'));
  assert.ok(respondoCheckoutAction(message,'en'));
});

test('page login and demo navigation are unaffected',()=>{
  assert.equal(respondoSiteNavigationAnswer('where do I sign in?','en')?.actions[0]?.type,'site_login');
  assert.ok(respondoSiteNavigationAnswer('try the bot','en')?.actions.some(action=>action.type==='site_demo'));
});

test('marketing assistant calls navigation then authoritative first-party FAQ',async()=>{
  const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
  const segment=server.slice(server.indexOf("app.post('/api/public/respondo-assistant/chat'"),
    server.indexOf("app.post('/api/public/:slug/chat'"));
  assert.ok(segment.indexOf('const navigation=respondoSiteNavigationAnswer(')>=0);
  assert.ok(segment.indexOf('const directFaq=respondoProductFaqMatch(')>segment.indexOf('const navigation=respondoSiteNavigationAnswer('));
  assert.match(segment,/if\(directFaq\)\{/);
});

test('demo and live widget preserve FAQ price answer when signup CTA is present',async()=>{
  const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/respondo-faq-\(\?:cheapest-pricing\|pricing\|monthly-pricing\|annual-pricing/);
  assert.match(server,/answer:firstPartyFaq\?\.answer \|\|/);
  assert.match(server,/sourceIds:firstPartyFaq \? \[firstPartyFaq.id\] : \[\]/);
  assert.ok(server.indexOf('const firstPartyFaq = firstPartyRespondo')<
    server.indexOf('const widgetSubscribe=firstPartyRespondo'));
});
