import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates,essentialWebsiteProfile} from '../website-knowledge.mjs';
import {generateGroundedAnswer,specificServiceConfirmation,selectRelevantKnowledge,chatActions,queryTopic} from '../server.mjs';
const html = `<!doctype html><html><head><title>Paras firma | Etusivu | Palvelut</title></head><body>
<nav><a href="/">Etusivu</a><a href="/palvelut">Palvelut</a><a href="/contact">Ota yhteyttä</a></nav>
<h1>Paras palvelu juuri sinulle!</h1><section><h2>Palvelut</h2><p>Teemme ikkunanpesuja ja kattojen pesuja.</p>
<h3>Ikkunanpesu</h3><p>Hinta alkaen 49.90 € / tunti, sisältää ALV:n.</p></section>
<section class="testimonials"><h2>Asiakkaiden kokemuksia</h2><p>Teemme myös avaruusalusten huoltoa. Paras palvelu 5/5!</p></section>
<section><h2>Arvostelut</h2><p>Teemme putkiremontteja todella nopeasti.</p></section>
<section><h2>Aukioloajat</h2><p>Ma–pe 9–17, la 10–14, su suljettu.</p></section>
<footer><a href="tel:+358401234567">Soita meille</a><a href="mailto:info@example.fi">Lähetä viesti</a><p>Osoite: Testikatu 1, 20100 Turku</p><p>Kaikki oikeudet pidätetään.</p></footer>
<a href="/pyyda-tarjous?type=pesu&amp;lang=fi#lomake">Pyydä tarjous</a>
<div class="cookie-banner"><p>Hyväksy evästeet</p></div><script>const price='Ilmainen palvelu';</script>
</body></html>`;
const bundle={finalUrl:'https://example.fi/', pageDocuments:[extractBusinessDocument(html,'https://example.fi/')]};
const facts=essentialWebsiteCandidates(bundle);
const rows=facts.map((x,i)=>({...x,id:String(i),source_type:'website',source_url:x.sourceUrl}));
test('extracts only essential business facts, never page headings, menus or reviews',()=>{
 assert.ok(facts.some(x=>x.category==='Palvelut'));
 assert.ok(facts.some(x=>x.category==='Hinnat' && x.answer.includes('49.90 €')));
 assert.ok(facts.some(x=>x.category==='Aukioloajat'));
 assert.equal(facts.some(x=>/Etusivu|Paras palvelu|avaruusalus|putkiremont|eväste|const |oikeudet/.test(x.answer)),false);
 assert.ok(facts.every(x=>['Palvelut','Hinnat','Aukioloajat','Yhteystiedot','Tarjouspyyntö'].includes(x.category)));
});
test('preserves exact phone/email, quote URL, query and fragment',()=>{
 const p=essentialWebsiteProfile(bundle);
 assert.equal(p.phone,'+358401234567');
 assert.equal(p.email,'info@example.fi');
 assert.equal(p.quoteRequestUrl,'https://example.fi/pyyda-tarjous?type=pesu&lang=fi#lomake');
 assert.match(p.address,/Testikatu/);
 assert.equal(p.notes,'');
});
test('finds external form and contact link in navigation without importing its menu',()=>{
 const b={pageDocuments:[extractBusinessDocument('<nav><a href="https://forms.example.com/q/abc">Request a quote</a></nav>','https://example.fi')]};
 assert.equal(essentialWebsiteCandidates(b)[0]?.answer,'https://forms.example.com/q/abc');
});
test('keeps service pricing out of service-only results',()=>{
 assert.equal(queryTopic('Mitä ikkunanpesu maksaa?'),'pricing');
 const selected=selectRelevantKnowledge(rows,'Mitä ikkunanpesu maksaa?');
 assert.equal(selected[0]?.category,'Hinnat');
 assert.ok(!selectRelevantKnowledge(rows,'Mitä palveluja teette?').some(x=>x.category==='Hinnat'));
});
test('does not infer extra services, free prices, schedules or opposite activities',()=>{
 assert.equal(specificServiceConfirmation('Teettekö ikkunanpesuja?',rows),'Kyllä, teemme ikkunanpesuja.');
 for(const q of ['Teettekö ikkunanpesuja ja putkiremontteja?','Teettekö ikkunanpesuja ilmaiseksi?','Teettekö ikkunanpesuja huomenna?','Maalaatteko kattoja?']) assert.equal(specificServiceConfirmation(q,rows),'',q);
 assert.equal(specificServiceConfirmation('Teettekö ikkunanpesuja?',[{category:'Palvelut',answer:'Emme tee ikkunanpesuja.'}]),'');
});
test('legacy review and heading cannot become evidence',()=>{
 const bad=[{id:'review',category:'Palvelut',source_type:'website',title:'Arvostelut',answer:'Teemme putkiremontteja.'},{id:'heading',source_type:'website',category:'Palvelut',title:'Palvelut',answer:'Palvelut – Paras firma | Etusivu'}];
 assert.equal(selectRelevantKnowledge(bad,'Mitä palveluja teette?').length,0);
 assert.equal(specificServiceConfirmation('Teettekö putkiremontteja?',bad),'');
});
test('quote reply and exact button work in all three languages without translator',async()=>{
 for(const [lang,message] of [['fi','Miten pyydän tarjouksen?'],['sv','Kan jag få en offert?'],['en','Can I request a quote?']]) {
  const old=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('translation unavailable')};
  try {
   const r=await generateGroundedAnswer({rows,message,lang});
   assert.equal(r.handoff,false);
   assert.equal(r.answer.includes('https:'),false);
   const actions=chatActions(rows,message,false,lang);
   assert.equal(actions.filter(x=>x.type==='quote').length,1);
   assert.equal(actions.find(x=>x.type==='quote').url,essentialWebsiteProfile(bundle).quoteRequestUrl);
  } finally {globalThis.fetch=old;}
 }
});
test('unknown specific service is handed to a person instead of listing unrelated services',async()=>{
 const r=await generateGroundedAnswer({rows,message:'Teettekö kuuhuoltoja?',lang:'fi'});
 assert.equal(r.handoff,true);assert.equal(r.answer,'');
});
test('preserves Swedish hours and English decimal prices',()=>{
 const b={pageDocuments:[extractBusinessDocument('<h2>Öppettider</h2><p>Mån–fre 09:00–17:00</p><h2>Services</h2><p>We provide window cleaning.</p><h2>Prices</h2><p>Window cleaning costs $49.95 per hour.</p>','https://example.fi')]};
 const f=essentialWebsiteCandidates(b);
 assert.ok(f.some(x=>x.category==='Aukioloajat'));
 assert.ok(f.some(x=>x.category==='Hinnat'&&x.answer.includes('$49.95')));
});

test('full demo HTTP endpoint preserves prices and quote buttons without translation service', async()=>{
 const {app}=await import('../server.mjs');
 const server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.on('listening',resolve));
 const request=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error('translator unavailable')};
 const endpoint=`http://127.0.0.1:${server.address().port}/api/public/demo-chat`;
 try {
  for(const [lang,message] of [['fi','Miten pyydän tarjouksen?'],['sv','Kan jag få en offert?'],['en','Can I get a quote?'],['fi','Mitä ikkunanpesu maksaa?']]) {
   const res=await request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lang,message,profile:essentialWebsiteProfile(bundle)})});
   assert.equal(res.status,200);
   const result=await res.json();assert.equal(result.handoff,false,JSON.stringify(result));
   if(message.includes('maksaa')) assert.match(result.answer,/49\.90 €/);
   else assert.equal(result.actions.filter(a=>a.type==='quote').length,1);
  }
 } finally {globalThis.fetch=request; await new Promise(resolve=>server.close(resolve));}
});

test('keeps each service attached to its own table price',()=>{
 const t=extractBusinessDocument('<section><h2>Hinnasto</h2><table><tr><th>Palvelu</th><th>Hinta</th></tr><tr><td>Ikkunanpesu</td><td>49 €/h</td></tr><tr><td>Ulkomaalaus</td><td>120 €/h</td></tr></table></section>','https://example.fi/prices');
 const priceFacts=essentialWebsiteCandidates({pageDocuments:[t]}).filter(x=>x.category==='Hinnat');
 assert.ok(priceFacts.some(x=>/Ikkunanpesu: 49 €\/h/.test(x.answer)));
 assert.ok(priceFacts.some(x=>/Ulkomaalaus: 120 €\/h/.test(x.answer)));
 assert.equal(priceFacts.some(x=>/^49 €\/h$|^120 €\/h$/.test(x.answer)),false);
 const priceRows=priceFacts.map((x,i)=>({...x,id:String(i),source_type:'website'}));
 assert.match(selectRelevantKnowledge(priceRows,'Mitä ulkomaalaus maksaa?')[0]?.answer||'',/120 €/);
 assert.equal(selectRelevantKnowledge(priceRows,'Mitä putkiremontti maksaa?').length,0);
});
test('a general price question still finds the published price',()=>{
 assert.ok(selectRelevantKnowledge(rows,'Paljonko tämä maksaa?').some(x=>x.category==='Hinnat'));
});

test('broad service question gives one factual sentence without repeating imported marketing text',async()=>{
 const sample=[
  {id:'promo',category:'Palvelut',title:'Palvelut: Helppo ja nopea palvelu',answer:'Helppo ja nopea palvelu! Varaa aika helposti ja jätä loput meidän hoidettavaksi.',source_type:'website',keywords:['palvelut']},
  {id:'services',category:'Palvelut',title:'Palvelut: kodin ja pihan huolto',answer:'Palvelumme: Tarjoamme luotettavia kodin ja pihan huoltopalveluja – ikkunanpesuista raivauksiin. Kaikki työmme ovat kotitalousvähennyskelpoisia.',source_type:'website',keywords:['palvelut']},
  {id:'repeat',category:'Palvelut',title:'Ammattimaiset ikkunapesut',answer:'Ammattimaiset ikkunapesut koteihin, yrityksille ja taloyhtiöille. Pesemme ikkunat huolellisesti.',source_type:'website',keywords:['palvelut']}
 ];
 const result=await generateGroundedAnswer({rows:sample,message:'Mitä palveluja teette?',lang:'fi'});
 assert.equal(result.handoff,false);
 assert.match(result.answer,/Tarjoamme .*kodin ja pihan huoltopalveluja/i);
 assert.doesNotMatch(result.answer,/Helppo ja nopea|Kaikki työmme|varaa aika|Ammattimaiset ikkunapesut/i);
 assert.ok(result.answer.length<180);
});
