import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates,isConcreteServiceLabel} from '../website-knowledge.mjs';
import {generateGroundedAnswer,chatActions} from '../server.mjs';

const html=`
<nav>
  <a href="/palvelut/asbesti-ja-haitta-ainekartoitus/">Asbesti- ja haitta-ainekartoitus</a>
  <a href="/palvelut/asbesti-ja-haitta-ainepurku/">Asbesti- ja haitta-ainepurku</a>
  <a href="/palvelut/teollisuuden-purkutyot/">Teollisuuden purkutyöt</a>
  <a href="/palvelut/rakennusten-kokonaispurku/">Rakennusten kokonaispurku</a>
  <a href="/palvelut/saneerauspurku/">Saneerauspurku</a>
  <a href="/palvelut/linjasaneerauksen-purkutyot/">Linjasaneerauksen purkutyöt</a>
  <a href="/kierratys/kierratyspalvelut/">Kierrätyspalvelut</a>
  <a href="/kierratys/betonimurske/">Betonimurske</a>
  <a href="/ota-yhteytta/">Ota yhteyttä</a>
</nav>
<section><h2>Rakennusten kokonaispurku</h2><p>Nopea ja joustava palvelu. Suurin osa haitta-ainepurkutöistämme liittyy korjaustarpeisiin.</p></section>
`;

function rows(){
  const doc=extractBusinessDocument(html,'https://purkupiha.example/');
  return essentialWebsiteCandidates({pageDocuments:[doc],products:[]}).map((row,index)=>({
    id:'row-'+index,
    category:row.category,
    title:row.title,
    answer:row.answer,
    keywords:row.keywords,
    source_type:'website',
    source_url:row.sourceUrl,
  }));
}

test('service navigation links become concrete service facts',()=>{
  const facts=rows();
  const answers=facts.filter((row)=>row.category==='Palvelut').map((row)=>row.answer);
  for(const expected of [
    'Asbesti- ja haitta-ainekartoitus',
    'Asbesti- ja haitta-ainepurku',
    'Teollisuuden purkutyöt',
    'Rakennusten kokonaispurku',
    'Saneerauspurku',
    'Linjasaneerauksen purkutyöt',
    'Kierrätyspalvelut',
    'Betonimurske',
  ]) assert.ok(answers.includes(expected),expected+' missing: '+JSON.stringify(answers));
});

test('broad service question lists concrete services instead of marketing copy',async()=>{
  const result=await generateGroundedAnswer({rows:rows(),message:'mitä palveluja tarjoatte',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/Palveluihimme kuuluvat:/);
  assert.match(result.answer,/Rakennusten kokonaispurku/);
  assert.match(result.answer,/Saneerauspurku/);
  assert.match(result.answer,/Kierrätyspalvelut/);
  assert.doesNotMatch(result.answer,/^Nopea ja joustava palvelu:/);
});

test('quote question returns a real quote/contact action when site has one',async()=>{
  const facts=rows();
  const result=await generateGroundedAnswer({rows:facts,message:'mistä pyydän tarjouksen',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  const actions=chatActions(facts,'mistä pyydän tarjouksen',false,'fi',result.selected);
  const quote=actions.find((action)=>action.type==='quote');
  assert.ok(quote,JSON.stringify(actions));
  assert.equal(quote.url,'https://purkupiha.example/ota-yhteytta/');
});


test('employee titles and completed-project headlines are not service names',()=>{
  const rejected=[
    'Purkupiha järjesti talontyhjennystempauksia Vaasassa',
    'Purkupiha toteutti vaativan teollisuuspurun Valion Seinäjoen tehtaalla',
    'Liiketoimintapäällikkö, Kierrätyspalvelut ja betonimurske',
    'Toimialapäällikkö, tarjouslaskenta: rakennusten kokonaispurku',
    'Toimitusjohtaja, rakennusten ja teollisuuden purkutyöt',
  ];
  const accepted=['Rakennusten kokonaispurku','Asbesti- ja haitta-ainekartoitus','Kierrätyspalvelut','Betonimurske'];
  for(const label of rejected) assert.equal(isConcreteServiceLabel(label),false,label);
  for(const label of accepted) assert.equal(isConcreteServiceLabel(label),true,label);
});

test('news and staff links do not enter the service facts during a new import',()=>{
  const doc=extractBusinessDocument(`
  <nav>
    <a href="/palvelut/saneerauspurku/">Saneerauspurku</a>
    <a href="/ajankohtaista/vaasan-purku/">Purkupiha järjesti talontyhjennystempauksia Vaasassa</a>
    <a href="/toimipisteet/helsinki/">Liiketoimintapäällikkö, Kierrätyspalvelut ja betonimurske</a>
  </nav>`, 'https://purkupiha.example/');
  const services=essentialWebsiteCandidates({pageDocuments:[doc],products:[]})
    .filter(row=>row.category==='Palvelut');
  assert.deepEqual(services.map(row=>row.answer),['Saneerauspurku']);
  assert.equal(services[0].sourceUrl,'https://purkupiha.example/palvelut/saneerauspurku/');
});

test('existing contaminated imports still answer what do you do using clean services',async()=>{
  const base=rows();
  const noise=[
    'Purkupiha järjesti talontyhjennystempauksia Vaasassa',
    'Purkupiha toteutti vaativan teollisuuspurun Valion Seinäjoen tehtaalla',
    'Liiketoimintapäällikkö, Kierrätyspalvelut ja betonimurske',
    'Toimialapäällikkö, tarjouslaskenta: rakennusten kokonaispurku',
  ].map((answer,index)=>({
    id:'noisy-'+index,category:'Palvelut',title:'Palvelut: '+answer,answer,
    keywords:['palvelut'],source_type:'website',source_url:'https://purkupiha.example/'
  }));
  const result=await generateGroundedAnswer({rows:[...noise,...base],message:'mitä teette',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/Rakennusten kokonaispurku/);
  assert.match(result.answer,/Saneerauspurku/);
  assert.doesNotMatch(result.answer,/talontyhjennys|Valion|Purkupiha järjesti|Purkupiha toteutti|päällikkö|tarjouslaskenta/i);
});
