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


test('Finnish follow-up about another cleaning service uses preceding action and exact proof',async()=>{
 const serviceRows=[
  {id:'gutters',category:'Palvelut',title:'Peltikattojen pesut & rännit',source_type:'website',
   answer:'Hoidamme peltikattojen pesut sekä rännien puhdistukset huolellisesti ja tehokkaasti.',
   keywords:['palvelut']},
  {id:'marketing',category:'Palvelut',title:'Palvelumme',source_type:'website',
   answer:'Tarjoamme laadukkaita kodin ja pihan huoltopalveluja ikkunanpesuista raivauksiin.',
   keywords:['palvelut']}
 ];
 const history=[{question:'pesettekö peltikattoja',answer:'Kyllä, pesemme peltikattoja.'}];
 const follow=await generateGroundedAnswer({rows:serviceRows,message:'entä rännejä',history,lang:'fi'});
 assert.equal(follow.handoff,false);
 assert.equal(follow.answer,'Kyllä, puhdistamme myös rännejä.');
 assert.deepEqual(follow.sourceIds,['gutters']);
 const direct=await generateGroundedAnswer({rows:serviceRows,message:'pesettekö rännejä?',lang:'fi'});
 assert.equal(direct.answer,'Kyllä, puhdistamme rännejä.');
 assert.equal(direct.handoff,false);
});
test('unknown or differently performed service follow-ups must not borrow proof',async()=>{
 const rows=[
  {id:'roof',category:'Palvelut',title:'Peltikattojen pesut',source_type:'website',answer:'Pesemme peltikattoja.',keywords:['palvelut']},
  {id:'installed',category:'Palvelut',title:'Rännien asennus',source_type:'website',answer:'Asennamme rännejä ja pesemme kattoja.',keywords:['palvelut']}
 ];
 const history=[{question:'pesettekö peltikattoja',answer:'Kyllä, pesemme peltikattoja.'}];
 for(const message of ['entä rännejä','entä terasseja']){
  const reply=await generateGroundedAnswer({rows,message,history,lang:'fi'});
  assert.equal(reply.handoff,true,message);
  assert.equal(reply.answer,'',message);
 }
 const unrelated=await generateGroundedAnswer({rows,message:'entä rännejä',history:[{question:'Mitä maksaa?'}],lang:'fi'});
 assert.equal(unrelated.handoff,true);
 const negative=await generateGroundedAnswer({rows:[{id:'no',category:'Palvelut',title:'Rännien puhdistus',source_type:'website',answer:'Emme puhdista rännejä.',keywords:['palvelut']}],message:'entä rännejä',history,lang:'fi'});
 assert.equal(negative.handoff,true);
});
test('specific order requests confirm only an explicitly listed service',async()=>{
 const rows=[
  {id:'junk',category:'Palvelut',title:'Palvelumme',source_type:'website',answer:'Tarjoamme monipuolisia palveluja.',keywords:['palvelut']},
  {id:'removal',category:'Palvelut',title:'Romun poisvienti',source_type:'website',answer:'Romun poisvienti: Noudamme vanhat huonekalut ja viemme tavarat kierrätykseen.',keywords:['palvelut']}
 ];
 const yes=await generateGroundedAnswer({rows,message:'voiko teiltä tilata romun poisviennin',lang:'fi'});
 assert.equal(yes.handoff,false);
 assert.equal(yes.answer,'Kyllä, voit tilata meiltä romun poisviennin.');
 assert.deepEqual(yes.sourceIds,['removal']);
 const no=await generateGroundedAnswer({rows,message:'voiko teiltä tilata lentokoneen maalauksen',lang:'fi'});
 assert.equal(no.handoff,true);
});


test('general roof cleaning questions use only the specifically approved roof subtype',async()=>{
 const roofing=[
  {id:'metal',category:'Palvelut',title:'Peltikattojen pesut',answer:'Hoidamme peltikattojen pesut ammattitaitoisesti.',source_type:'website',keywords:['palvelut']}
 ];
 const broad=await generateGroundedAnswer({rows:roofing,message:'pesettekö kattoja',lang:'fi'});
 assert.equal(broad.handoff,false);
 assert.equal(broad.answer,'Kyllä, pesemme peltikattoja.');
 assert.deepEqual(broad.sourceIds,['metal']);
 const direct=await generateGroundedAnswer({rows:roofing,message:'pesettekö peltikattoja',lang:'fi'});
 assert.equal(direct.handoff,false);
 assert.equal(direct.answer,'Kyllä, pesemme peltikattoja.');
 const anotherSubtype=await generateGroundedAnswer({rows:roofing,message:'pesettekö tiilikattoja',lang:'fi'});
 assert.equal(anotherSubtype.handoff,true);
 assert.equal(anotherSubtype.answer,'');
});
test('general roof cleaning questions reject installation, negative and unrelated services',async()=>{
 const cases=[
  [{id:'installation',category:'Palvelut',title:'Peltikattojen asennukset',answer:'Asennamme peltikattoja.',source_type:'website',keywords:['palvelut']}],
  [{id:'negative',category:'Palvelut',title:'Peltikattojen pesut',answer:'Emme pese peltikattoja.',source_type:'website',keywords:['palvelut']}],
  [{id:'other',category:'Palvelut',title:'Rännien puhdistus',answer:'Puhdistamme rännejä.',source_type:'website',keywords:['palvelut']}]
 ];
 for(const rows of cases){
  const reply=await generateGroundedAnswer({rows,message:'pesettekö kattoja?',lang:'fi'});
  assert.equal(reply.handoff,true,JSON.stringify(reply));
  assert.equal(reply.answer,'');
 }
 const tiled=[{id:'tile',category:'Palvelut',title:'Tiilikattojen pesut',answer:'Tiilikattojen pesut tehdään huolellisesti.',source_type:'website',keywords:['palvelut']}];
 const tileReply=await generateGroundedAnswer({rows:tiled,message:'pesettekö kattoja',lang:'fi'});
 assert.equal(tileReply.answer,'Kyllä, pesemme tiilikattoja.');
});


test('combined customer request confirms independently documented window and gutter services only',async()=>{
 const rows=[
  {id:'terrace',category:'Palvelut',title:'Terassin pesu',answer:'Terassi näyttää pesun ja öljyämisen jälkeen kuin uudelta.',source_type:'website',keywords:['palvelut']},
  {id:'windows',category:'Palvelut',title:'Ammattimaiset ikkunapesut',answer:'Ammattimaiset ikkunapesut koteihin ja yrityksille.',source_type:'website',keywords:['palvelut']},
  {id:'gutters',category:'Palvelut',title:'Peltikattojen pesut ja rännit',answer:'Hoidamme peltikattojen pesut sekä rännien puhdistukset huolellisesti.',source_type:'website',keywords:['palvelut']}
 ];
 const question='voiko teiltä tilata ikkunanpesun ja rännien puhdistuksen';
 const answer=await generateGroundedAnswer({rows,message:question,lang:'fi'});
 assert.equal(answer.handoff,false);
 assert.equal(answer.answer,'Kyllä, voit tilata meiltä sekä ikkunanpesun että rännien puhdistuksen.');
 assert.deepEqual(answer.sourceIds,['windows','gutters']);
 assert.doesNotMatch(answer.answer,/terassi/i);
 const other=await generateGroundedAnswer({rows,message:'onnistuuko ikkunanpesu ja rännien puhdistus?',lang:'fi'});
 assert.equal(other.handoff,false);
 assert.doesNotMatch(other.answer,/terassi/i);
});
test('combined service request cannot confirm a missing second service',async()=>{
 const windows={id:'windows',category:'Palvelut',title:'Ikkunanpesut',answer:'Teemme ikkunanpesuja.',source_type:'website',keywords:['palvelut']};
 const gutters={id:'installation',category:'Palvelut',title:'Rännien asennus',answer:'Asennamme rännejä ja pesemme kattoja.',source_type:'website',keywords:['palvelut']};
 const answer=await generateGroundedAnswer({rows:[windows,gutters],message:'voiko teiltä tilata ikkunanpesun ja rännien puhdistuksen',lang:'fi'});
 assert.equal(answer.handoff,true);
 assert.match(answer.answer,/Tiedoistamme löytyvät seuraavat palvelut: ikkunanpesu/);
 assert.match(answer.answer,/Nämä palvelut pitää vielä varmistaa: rännien puhdistus/);
 assert.doesNotMatch(answer.answer,/Kyllä, voit tilata/);
 assert.deepEqual(answer.sourceIds,['windows']);
});
test('combined service request does not borrow proof from reviews or negative claims',async()=>{
 const windows={id:'windows',category:'Palvelut',title:'Ikkunanpesut',answer:'Teemme ikkunanpesuja.',source_type:'website',keywords:['palvelut']};
 const review={id:'review',category:'Arvostelut',title:'Arvostelu',answer:'Rännien puhdistus oli erinomaista!',source_type:'website',keywords:['palvelut']};
 const negative={id:'negative',category:'Palvelut',title:'Rännien puhdistus',answer:'Emme puhdista rännejä.',source_type:'website',keywords:['palvelut']};
 for (const other of [review,negative]) {
  const result=await generateGroundedAnswer({rows:[windows,other],message:'voiko teiltä tilata ikkunanpesun ja rännien puhdistuksen',lang:'fi'});
  assert.equal(result.handoff,true);
 }
});


test('four-service booking with shared action and mixed verbs is independently verified',async()=>{
 const rows=[
  {id:'terrace',category:'Palvelut',title:'Terassin pesu ja öljyäminen',answer:'Terassin pesu ja öljyäminen onnistuvat.',source_type:'website',keywords:['palvelut']},
  {id:'roof',category:'Palvelut',title:'Peltikattojen pesut',answer:'Hoidamme peltikattojen pesut.',source_type:'website',keywords:['palvelut']},
  {id:'gutter',category:'Palvelut',title:'Rännien puhdistukset',answer:'Hoidamme rännien puhdistukset.',source_type:'website',keywords:['palvelut']},
  {id:'windows',category:'Palvelut',title:'Ikkunanpesut',answer:'Tarjoamme ikkunanpesua.',source_type:'website',keywords:['palvelut']}
 ];
 const result=await generateGroundedAnswer({
  rows,lang:'fi',
  message:'voinko tilata teiltä peltikaton ja rännien pesun, ikkunoiden pesun sekä terassin öljyämisen'
 });
 assert.equal(result.handoff,false,JSON.stringify(result));
 assert.equal(result.answer,'Kyllä, voit tilata meiltä peltikaton ja rännien pesun, ikkunoiden pesun sekä terassin öljyämisen.');
 assert.deepEqual(result.sourceIds,['roof','gutter','windows','terrace']);
 assert.doesNotMatch(result.answer,/samalla käynnillä|terassi näyttää/i);
});
test('unproven fourth service produces a truthful partial handoff, not terrace marketing copy',async()=>{
 const rows=[
  {id:'terrace',category:'Palvelut',title:'Terassin pesu',answer:'Terassi näyttää pesun ja öljyämisen jälkeen kuin uudelta.',source_type:'website',keywords:['palvelut']},
  {id:'roof',category:'Palvelut',title:'Peltikattojen pesut',answer:'Hoidamme peltikattojen pesut.',source_type:'website',keywords:['palvelut']},
  {id:'gutter',category:'Palvelut',title:'Rännien puhdistukset',answer:'Hoidamme rännien puhdistukset.',source_type:'website',keywords:['palvelut']},
  {id:'windows',category:'Palvelut',title:'Ikkunanpesut',answer:'Tarjoamme ikkunanpesua.',source_type:'website',keywords:['palvelut']}
 ];
 const result=await generateGroundedAnswer({rows,lang:'fi',
  message:'voinko tilata teiltä peltikaton ja rännien pesun, ikkunoiden pesun sekä terassin öljyämisen'});
 assert.equal(result.handoff,true);
 assert.deepEqual(result.sourceIds,['roof','gutter','windows']);
 assert.match(result.answer,/Nämä palvelut pitää vielä varmistaa: terassin öljyäminen/);
 assert.doesNotMatch(result.answer,/terassi näyttää/i);
 assert.doesNotMatch(result.answer,/Kyllä, voit tilata meiltä/i);
});
test('shared actions do not falsely turn gutter installation into gutter cleaning',async()=>{
 const rows=[
  {id:'mixed',category:'Palvelut',title:'Kattojen pesu ja rännien asennus',answer:'Pesemme peltikattoja ja asennamme rännejä.',source_type:'website',keywords:['palvelut']},
  {id:'windows',category:'Palvelut',title:'Ikkunapesu',answer:'Teemme ikkunapesuja.',source_type:'website',keywords:['palvelut']}
 ];
 const result=await generateGroundedAnswer({rows,lang:'fi',message:'voinko tilata teiltä peltikaton ja rännien pesun, ikkunoiden pesun'});
 assert.equal(result.handoff,true);
 assert.match(result.answer,/Nämä palvelut pitää vielä varmistaa: rännien pesu/);
 assert.doesNotMatch(result.answer,/Kyllä, voit tilata meiltä/i);
});


test('dashboard demo API answers verified multi-service orders and preserves partial handoffs',async()=>{
 const {app}=await import('../server.mjs');
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const endpoint='http://127.0.0.1:'+server.address().port+'/api/public/demo-chat';
 const question='voinko tilata teiltä peltikaton ja rännien pesun, ikkunoiden pesun sekä terassin öljyämisen';
 const common=[
  {key:'Peltikattojen pesut',answer:'Hoidamme peltikattojen pesut.'},
  {key:'Rännien puhdistukset',answer:'Hoidamme rännien puhdistukset.'},
  {key:'Ikkunanpesut',answer:'Tarjoamme ikkunanpesua.'}
 ];
 const ask=async customFacts=>{
  const response=await fetch(endpoint,{method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({lang:'fi',message:question,profile:{customFacts}})});
  assert.equal(response.status,200);
  return response.json();
 };
 try {
  const complete=await ask([...common,{key:'Terassin pesu ja öljyäminen',answer:'Terassin pesu ja öljyäminen onnistuvat.'}]);
  assert.equal(complete.handoff,false,JSON.stringify(complete));
  assert.match(complete.answer,/terassin öljyämisen/);
  assert.doesNotMatch(complete.answer,/terassi näyttää/i);
  const partial=await ask([...common,{key:'Terassin pesu',answer:'Terassi näyttää pesun ja öljyämisen jälkeen kuin uudelta.'}]);
  assert.equal(partial.handoff,true,JSON.stringify(partial));
  assert.match(partial.answer,/Nämä palvelut pitää vielä varmistaa: terassin öljyäminen/);
  assert.equal(partial.answer.includes('Terassi näyttää'),false);
 } finally {
  await new Promise(resolve=>server.close(resolve));
 }
});


test('direct terrace oiling question supports inflection and a common spelling variation when explicitly approved',async()=>{
 const confirmed=[{id:'oil',category:'Palvelut',title:'Terassin pesu ja öljyäminen',
   answer:'Terassin pesu ja öljyäminen onnistuvat.',source_type:'website',keywords:['palvelut']}];
 for (const message of ['öljyättekö terasseja','öljyäättekö terasseja?']) {
   const reply=await generateGroundedAnswer({rows:confirmed,message,lang:'fi'});
   assert.equal(reply.handoff,false,JSON.stringify(reply));
   assert.equal(reply.answer,'Kyllä, öljyämme terasseja.');
   assert.deepEqual(reply.sourceIds,['oil']);
 }
 const generalTitle=[{id:'explicit',category:'Palvelut',title:'Palvelut',
   answer:'Öljyämme terasseja asiakkaiden tilauksesta.',source_type:'website',keywords:['palvelut']}];
 const explicit=await generateGroundedAnswer({rows:generalTitle,message:'öljyättekö terasseja',lang:'fi'});
 assert.equal(explicit.answer,'Kyllä, öljyämme terasseja.');
 assert.equal(explicit.handoff,false);
});
test('incidental before-and-after copy and unrelated or denied oiling never count as an oiling service',async()=>{
 const cases=[
  [{id:'after',category:'Palvelut',title:'Terassin pesu',
    answer:'Terassi näyttää pesun ja öljyämisen jälkeen kuin uudelta.',source_type:'website',keywords:['palvelut']}],
  [{id:'wrong',category:'Palvelut',title:'Laiturien öljyäminen',
    answer:'Öljyämme laitureita.',source_type:'website',keywords:['palvelut']}],
  [{id:'no',category:'Palvelut',title:'Terassin öljyäminen',
    answer:'Emme öljyä terasseja, tarjoamme vain pesua.',source_type:'website',keywords:['palvelut']}],
  [{id:'review',category:'Arvostelut',title:'Terassien öljyäminen',
    answer:'Öljyämme terasseja.',source_type:'website',keywords:['palvelut']}]
 ];
 for (const rows of cases) {
   const reply=await generateGroundedAnswer({rows,message:'öljyättekö terasseja',lang:'fi'});
   assert.equal(reply.handoff,true,JSON.stringify(reply));
   assert.equal(reply.answer,'');
 }
});
test('preview HTTP endpoint confirms explicit oiling and refuses incidental oiling claims',async()=>{
 const {app}=await import('../server.mjs');
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const endpoint='http://127.0.0.1:'+server.address().port+'/api/public/demo-chat';
 const ask=async facts=>{
   const res=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},
     body:JSON.stringify({lang:'fi',message:'öljyäättekö terasseja',profile:{customFacts:facts}})});
   assert.equal(res.status,200);
   return res.json();
 };
 try {
   const yes=await ask([{key:'Terassin pesu ja öljyäminen',answer:'Tarjoamme terassien pesua ja öljyämistä.'}]);
   assert.equal(yes.handoff,false,JSON.stringify(yes));
   assert.equal(yes.answer,'Kyllä, öljyämme terasseja.');
   const uncertain=await ask([{key:'Terassin pesu',answer:'Terassi näyttää pesun ja öljyämisen jälkeen kuin uudelta.'}]);
   assert.equal(uncertain.handoff,true);
   assert.doesNotMatch(uncertain.answer,/Kyllä, öljyämme/);
 } finally {
   await new Promise(resolve=>server.close(resolve));
 }
});


test('customer photo wording: terrace wash and oiling, generic roof and gutter wash, and window wash',async()=>{
 const rows=[
   {id:'terrace',category:'Palvelut',title:'Terassin pesu ja öljyäminen',
     answer:'Terassin pesu ja öljyäminen onnistuvat.',source_type:'website'},
   {id:'roof',category:'Palvelut',title:'Peltikattojen pesut',
     answer:'Hoidamme peltikattojen pesut.',source_type:'website'},
   {id:'gutters',category:'Palvelut',title:'Rännien puhdistukset',
     answer:'Puhdistamme rännejä.',source_type:'website'},
   {id:'windows',category:'Palvelut',title:'Ikkunanpesut',
     answer:'Tarjoamme ikkunanpesua.',source_type:'website'}
 ];
 const reply=await generateGroundedAnswer({rows,lang:'fi',
   message:'voinko tilata teiltä terassin pesun ja öljyämisen, katon ja rännien pesun sekä ikkunoiden pesun'});
 assert.equal(reply.handoff,false,JSON.stringify(reply));
 assert.equal(reply.answer,'Kyllä, voit tilata meiltä terassin pesun ja öljyämisen, peltikaton ja rännien pesun sekä ikkunoiden pesun.');
 assert.deepEqual(reply.sourceIds,['terrace','roof','gutters','windows']);
});
test('a generic roof must be qualified only to the roof material proven by the source',async()=>{
 const rows=[
   {id:'tiles',category:'Palvelut',title:'Tiilikattojen pesut',
     answer:'Pesemme tiilikattoja.',source_type:'website'},
   {id:'gutter',category:'Palvelut',title:'Rännien puhdistus',
     answer:'Puhdistamme rännejä.',source_type:'website'}
 ];
 const tile=await generateGroundedAnswer({rows,lang:'fi',
   message:'voinko tilata teiltä katon ja rännien pesun'});
 assert.equal(tile.handoff,false,JSON.stringify(tile));
 assert.equal(tile.answer,'Kyllä, voit tilata meiltä sekä tiilikaton pesun että rännien pesun.');
 const noRoof=await generateGroundedAnswer({rows:[rows[1]],lang:'fi',
   message:'voinko tilata teiltä katon ja rännien pesun'});
 assert.equal(noRoof.handoff,true);
 assert.match(noRoof.answer,/Nämä palvelut pitää vielä varmistaa: katon pesu/);
 assert.doesNotMatch(noRoof.answer,/Kyllä, voit tilata/);
});
test('single terrace cleaning never proves oiling in a coordinated long request',async()=>{
 const rows=[
   {id:'terrace',category:'Palvelut',title:'Terassin pesu',
     answer:'Terassi näyttää pesun ja öljyämisen jälkeen uudelta.',source_type:'website'},
   {id:'roof',category:'Palvelut',title:'Peltikattojen pesut',
     answer:'Hoidamme peltikattojen pesut.',source_type:'website'},
   {id:'gutters',category:'Palvelut',title:'Rännien puhdistus',
     answer:'Puhdistamme rännejä.',source_type:'website'},
   {id:'windows',category:'Palvelut',title:'Ikkunapesu',
     answer:'Pesemme ikkunoita.',source_type:'website'}
 ];
 const result=await generateGroundedAnswer({rows,lang:'fi',
   message:'voinko tilata teiltä terassin pesun ja öljyämisen, katon ja rännien pesun sekä ikkunoiden pesun'});
 assert.equal(result.handoff,true);
 assert.match(result.answer,/Nämä palvelut pitää vielä varmistaa: terassin öljyäminen/);
 assert.doesNotMatch(result.answer,/Kyllä, voit tilata/);
 assert.deepEqual(result.sourceIds,['terrace','roof','gutters','windows']);
});
test('dashboard preview API handles the exact pictured customer request',async()=>{
 const {app}=await import('../server.mjs');
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const facts=[
  {key:'Terassin pesu ja öljyäminen',answer:'Terassin pesu ja öljyäminen onnistuvat.'},
  {key:'Peltikattojen pesut',answer:'Hoidamme peltikattojen pesut.'},
  {key:'Rännien puhdistus',answer:'Puhdistamme rännejä.'},
  {key:'Ikkunanpesut',answer:'Tarjoamme ikkunanpesua.'}
 ];
 try {
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/public/demo-chat',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({lang:'fi',message:'voinko tilata teiltä terassin pesun ja öljyämisen, katon ja rännien pesun sekä ikkunoiden pesun',
      profile:{customFacts:facts}})
  });
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/peltikaton ja rännien pesun/);
  assert.match(result.answer,/terassin pesun ja öljyämisen/);
  assert.doesNotMatch(result.answer,/terassi näyttää|tätä tietoa ei löytynyt/i);
 } finally {
  await new Promise(resolve=>server.close(resolve));
 }
});


test('single booking question "voinko tilata teiltä ikkunanpesun" returns a direct service answer, never page title text',async()=>{
 const rows=[
  {id:'junk',category:'Palvelut',title:'Monitoimipojat RD – Kodin huoltopalvelut Turussa | Ikkunanpesu, Kattopesut & Raivaus | Palvelut | Yhteystiedot',
   answer:'Monitoimipojat RD – Kodin huoltopalvelut Turussa | Ikkunanpesu, Kattopesut & Raivaus Palvelut Yhteystiedot',
   source_type:'website',keywords:['palvelut']},
  {id:'windows',category:'Palvelut',title:'Ikkunanpesut',
   answer:'Tarjoamme ikkunanpesua koteihin ja yrityksille.',source_type:'website',keywords:['palvelut']}
 ];
 for(const message of ['Voinko tilata teiltä ikkunanpesun','voinko teiltä tilata ikkunanpesun?','voiko tilata teiltä ikkunanpesun']) {
   const reply=await generateGroundedAnswer({rows,message,lang:'fi'});
   assert.equal(reply.handoff,false,JSON.stringify(reply));
   assert.equal(reply.answer,'Kyllä, voit tilata meiltä ikkunanpesun.');
   assert.deepEqual(reply.sourceIds,['windows']);
   assert.doesNotMatch(reply.answer,/Monitoimipojat|Yhteystiedot|\|/i);
 }
});
test('page title/navigation text alone can never prove that a service is orderable',async()=>{
 const rows=[{
  id:'junk',category:'Palvelut',
  title:'Monitoimipojat RD – Kodin huoltopalvelut Turussa | Ikkunanpesu, Kattopesut & Raivaus | Palvelut | Yhteystiedot',
  answer:'Monitoimipojat RD – Kodin huoltopalvelut Turussa | Ikkunanpesu, Kattopesut & Raivaus Palvelut Yhteystiedot',
  source_type:'website',keywords:['palvelut']
 }];
 const reply=await generateGroundedAnswer({rows,message:'Voinko tilata teiltä ikkunanpesun',lang:'fi'});
 assert.equal(reply.handoff,true,JSON.stringify(reply));
 assert.equal(reply.answer,'');
 assert.deepEqual(reply.sourceIds,[]);
});
test('dashboard preview API handles the exact single-service booking question from the screenshot',async()=>{
 const {app}=await import('../server.mjs');
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 try {
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/public/demo-chat',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({lang:'fi',message:'Voinko tilata teiltä ikkunanpesun',profile:{customFacts:[
    {key:'Ikkunanpesut',answer:'Tarjoamme ikkunanpesua koteihin ja yrityksille.'},
    {key:'Monitoimipojat RD – Kodin huoltopalvelut Turussa | Ikkunanpesu, Kattopesut & Raivaus | Palvelut | Yhteystiedot',
     answer:'Monitoimipojat RD – Kodin huoltopalvelut Turussa | Ikkunanpesu, Kattopesut & Raivaus Palvelut Yhteystiedot'}
   ]}})
  });
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.answer,'Kyllä, voit tilata meiltä ikkunanpesun.');
  assert.doesNotMatch(result.answer,/Monitoimipojat|Yhteystiedot|\|/i);
 } finally {
  await new Promise(resolve=>server.close(resolve));
 }
});



test('verified phone number is answered literally and produces a callable action',async()=>{
 const rows=[{id:'phone',category:'Yhteystiedot',title:'Puhelinnumero',answer:'+358 40 123 4567',source_type:'website'}];
 for(const message of ['puhelinnumero','Mikä on puhelinnumeronne?']) {
   const reply=await generateGroundedAnswer({rows,message,lang:'fi'});
   assert.equal(reply.answer,'Puhelinnumeromme on +358 40 123 4567.');
   assert.equal(reply.handoff,false);
   assert.deepEqual(reply.sourceIds,['phone']);
   const actions=chatActions(rows,message,false,'fi');
   assert.ok(actions.some(a=>a.url==='tel:+358401234567'&&a.label==='Soita'));
 }
 const en=await generateGroundedAnswer({rows,message:'phone number',lang:'en'});
 assert.match(en.answer,/\+358 40 123 4567/);
 const sv=await generateGroundedAnswer({rows,message:'telefonnummer',lang:'sv'});
 assert.match(sv.answer,/\+358 40 123 4567/);
});
test('missing or invalid number never gives an empty contact promise or arbitrary number',async()=>{
 const rows=[{id:'email',category:'Yhteystiedot',title:'Sähköposti',answer:'info@example.fi',source_type:'website'},
   {id:'postcode',category:'Yhteystiedot',title:'Puhelinnumero',answer:'20100 Turku',source_type:'website'}];
 const reply=await generateGroundedAnswer({rows,message:'puhelinnumero',lang:'fi'});
 assert.equal(reply.handoff,true);
 assert.match(reply.answer,/ei löytynyt puhelinnumeroa/);
 assert.doesNotMatch(reply.answer,/Voit ottaa yhteyttä tästä/);
 const actions=chatActions(rows,'puhelinnumero',true,'fi');
 assert.ok(actions.some(a=>a.mode==='contact_form'));
 assert.equal(actions.some(a=>a.url?.startsWith('tel:')),false);
 const mail=await generateGroundedAnswer({rows,message:'sähköpostiosoite',lang:'fi'});
 assert.equal(mail.handoff,false);
 assert.match(mail.answer,/info@example.fi/);
});
test('demo-chat HTTP endpoint gives phone value and a phone action, or explicitly says it is unavailable',async()=>{
 const {app}=await import('../server.mjs');
 const testServer=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>testServer.once('listening',resolve));
 const ask=async profile=>{
  const response=await fetch('http://127.0.0.1:'+testServer.address().port+'/api/public/demo-chat',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({lang:'fi',message:'puhelinnumero',profile})
  });
  assert.equal(response.status,200);
  return response.json();
 };
 try {
  const found=await ask({phone:'040 123 4567'});
  assert.equal(found.answer,'Puhelinnumeromme on 040 123 4567.');
  assert.equal(found.handoff,false);
  assert.ok(found.actions.some(a=>a.url==='tel:0401234567'));
  const missing=await ask({email:'info@example.fi'});
  assert.equal(missing.handoff,true);
  assert.match(missing.answer,/ei löytynyt puhelinnumeroa/);
  assert.ok(missing.actions.some(a=>a.mode==='contact_form'));
  assert.equal(missing.actions.some(a=>a.url?.startsWith('tel:')),false);
 } finally {
  await new Promise(resolve=>testServer.close(resolve));
 }
});


test('saved company contact address outranks a later-updated website import',async()=>{
 const rows=[
   {id:'import-old',title:'Sähköposti',category:'Yhteystiedot',answer:'old@example.fi',source_type:'website'},
   {id:'profile-new',title:'Sähköposti',category:'Yrityksen perustiedot',answer:'new@example.fi',source_type:'profile'}
 ];
 const result=await generateGroundedAnswer({rows,message:'sähköpostiosoite',lang:'fi'});
 assert.equal(result.answer,'Sähköpostiosoitteemme on new@example.fi.');
 assert.deepEqual(result.sourceIds,['profile-new']);
 const action=chatActions(rows,'sähköpostiosoite',false,'fi');
 assert.equal(action.find(a=>a.url?.startsWith('mailto:'))?.url,'mailto:new@example.fi');
 const reOrdered=await generateGroundedAnswer({rows:[...rows].reverse(),message:'sähköpostiosoite',lang:'fi'});
 assert.equal(reOrdered.answer,result.answer);
});
test('dashboard exposes a separate editable business-email save and does not confuse it with login email',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const appSource=readFileSync(fileURLToPath(new URL('../public/app.js',import.meta.url)),'utf8');
 assert.match(appSource,/id="profileContactEmail" name="email" type="email"/);
 assert.match(appSource,/id="saveProfileEmail"/);
 assert.match(appSource,/api\/app\/business-email/);
 assert.match(appSource,/Kirjautumissähköposti ei muutu/);
 assert.doesNotMatch(appSource,/id="profileContactEmail"[^>]+readonly/);
});
