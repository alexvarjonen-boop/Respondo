import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBusinessDocument,
  essentialWebsiteCandidates,
  essentialWebsiteProfile,
  usableWebsiteRow,
} from '../website-knowledge.mjs';
import {chatActions, generateGroundedAnswer} from '../server.mjs';

const root='https://jagputters.fi/';
const contact='https://jagputters.fi/pages/contact';
const storefront='<html><nav><a href="/products/jag-steel">JAG Steel</a><a href="/pages/contact">Contact</a><a href="/pages/shipping">Ordering/Shipping</a></nav><form id="newsletter"><input type="email" name="email"><button>Subscribe</button></form></html>';
const contactHtml='<html><h1>Send us a message</h1><form id="contact_form" action="/contact#contact_form" method="post"><input name="contact[name]" placeholder="Your name"><input name="contact[email]" type="email" placeholder="Your email"><textarea name="contact[body]" placeholder="Your message"></textarea><button type="submit">SEND</button></form></html>';

function rowsFrom(bundle) {
  return essentialWebsiteCandidates(bundle).map((fact,i)=>({
    ...fact,id:'import-'+i,source_type:'website',source_url:fact.sourceUrl,
  }));
}

test('JAG contact page and real form become an approved link, not a quote',()=>{
  const home=extractBusinessDocument(storefront,root);
  const page=extractBusinessDocument(contactHtml,contact);
  assert.equal(home.contactForm,false,'newsletter is not a contact form');
  assert.equal(page.contactForm,true);
  const bundle={finalUrl:root,pageDocuments:[home,page]};
  const facts=essentialWebsiteCandidates(bundle);
  const contactFact=facts.find(x=>x.title==='Yhteydenottolomake');
  assert.equal(contactFact?.category,'Yhteystiedot');
  assert.equal(contactFact?.answer,contact);
  assert.equal(usableWebsiteRow({...contactFact,source_type:'website'}),true);
  assert.equal(essentialWebsiteProfile(bundle).contactUrl,contact);
  assert.equal(facts.some(x=>x.title==='Tarjouspyyntölomake'),false,'contact page is not a quote request');
});

test('navigation contact link survives even when contact page fetch fails',()=>{
  const bundle={finalUrl:root,pageDocuments:[extractBusinessDocument(storefront,root)]};
  const facts=essentialWebsiteCandidates(bundle);
  assert.equal(facts.find(x=>x.title==='Yhteydenottosivu')?.answer,contact);
  assert.equal(essentialWebsiteProfile(bundle).contactUrl,contact);
});

test('newsletter and product links never turn into a contact form',()=>{
  const page=extractBusinessDocument(
    '<a href="/products/contact-lenses">Contact lenses</a><form id="newsletter"><input type="email" name="email"></form>',
    'https://example.fi/'
  );
  assert.equal(page.contactForm,false);
  assert.equal(essentialWebsiteCandidates({pageDocuments:[page]}).some(x=>/Yhteydenottolomake|Yhteydenottosivu/.test(x.title)),false);
});

test('visitor can find JAG website contact form in Finnish, English, and Swedish',async()=>{
  const rows=rowsFrom({finalUrl:root,pageDocuments:[
    extractBusinessDocument(storefront,root),
    extractBusinessDocument(contactHtml,contact),
  ]});
  const examples=[
    ['fi','Mistä voin ottaa yhteyttä?',/yhteydenottolomakkeella/i],
    ['en','How can I contact you?',/contact form/i],
    ['sv','Hur kan jag kontakta er?',/kontaktformuläret/i],
  ];
  for(const [lang,message,expected] of examples) {
    const answer=await generateGroundedAnswer({companyName:'JAG Putters',rows,message,lang});
    assert.equal(answer.handoff,false,lang+': should answer, not ask for a lead');
    assert.match(answer.answer,expected);
    const actions=chatActions(rows,message,answer.handoff,lang,answer.selected);
    assert.ok(actions.some(x=>x.url===contact && x.mode==='website_contact'),lang+': missing web contact action');
    assert.equal(actions.some(x=>x.mode==='contact_form'),false,lang+': do not request contact details instead');
  }
});

test('missing phone/email still offers the verified website form without inventing contact data',async()=>{
  const rows=rowsFrom({finalUrl:root,pageDocuments:[extractBusinessDocument(storefront,root)]});
  for(const [lang,message] of [
    ['fi','Mikä on sähköpostiosoitteenne?'],
    ['en','What is your phone number?'],
    ['sv','Vad är er e-post?'],
  ]) {
    const result=await generateGroundedAnswer({companyName:'JAG Putters',rows,message,lang});
    assert.equal(result.handoff,false);
    assert.ok(chatActions(rows,message,result.handoff,lang).some(x=>x.url===contact));
    assert.equal(chatActions(rows,message,result.handoff,lang).some(x=>x.mode==='contact_form'),false);
  }
});

test('quote and contact URLs stay separate and do not steal each others actions',()=>{
  const html='<nav><a href="/contact">Contact</a><a href="/request-quote">Request a quote</a></nav>';
  const rows=rowsFrom({finalUrl:'https://example.fi/',pageDocuments:[extractBusinessDocument(html,'https://example.fi/')]});
  assert.equal(rows.find(x=>x.title==='Yhteydenottosivu')?.answer,'https://example.fi/contact');
  assert.equal(rows.find(x=>x.title==='Tarjouspyyntölomake')?.answer,'https://example.fi/request-quote');
  assert.equal(chatActions(rows,'How can I contact you?',false,'en').find(x=>x.mode==='website_contact')?.url,'https://example.fi/contact');
  assert.ok(chatActions(rows,'Can I request a quote?',false,'en').some(x=>x.type==='quote' && x.url==='https://example.fi/request-quote'));
});
