import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates,usableWebsiteRow} from '../website-knowledge.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const site='https://teollisuusesimerkki.fi/';
function structuredFaqPage(items, type='FAQPage'){
  const schema={'@context':'https://schema.org','@type':type,mainEntity:items.map(([name,text])=>({
    '@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}
  }))};
  return '<html><head><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body><main><h1>Asiakaspalvelu</h1></main></body></html>';
}
const rowsFrom=html=>essentialWebsiteCandidates({finalUrl:site,pageDocuments:[
  extractBusinessDocument(html,site+'faq/')
]}).map((v,i)=>({...v,id:'faq-row-'+i,source_type:'website',source_url:v.sourceUrl}));

test('schema FAQPage acceptedAnswers are imported even if the actual accordion is JS-only',()=>{
  const rows=rowsFrom(structuredFaqPage([
    ['Tarvitaanko nostokaluston käyttöön kulkulupa?','Kulkulupa tarvitaan tehdasalueelle, ja se haetaan tilaajalta ennen työmaalle saapumista.'],
    ['Saako nosturin kuljetukseen tilata saattajan?','Saattaja voidaan järjestää erillisestä pyynnöstä.']
  ]));
  const access=rows.find(row=>row.title==='Tarvitaanko nostokaluston käyttöön kulkulupa?');
  assert.ok(access,JSON.stringify(rows));
  assert.match(access.answer,/Kulkulupa tarvitaan tehdasalueelle/);
  assert.equal(access.source_url,site+'faq/');
  assert.equal(usableWebsiteRow(access),true);
  assert.equal(rows.length,2);
});

test('previously unknown company-specific question gets a grounded direct answer, not contact fallback',async()=>{
  const rows=rowsFrom(structuredFaqPage([
    ['Tarvitaanko nostokaluston käyttöön kulkulupa?','Kulkulupa tarvitaan tehdasalueelle, ja se haetaan tilaajalta ennen työmaalle saapumista.'],
    ['Miten kuljetuskustannukset lasketaan?','Kuljetuskustannukset lasketaan matkan ja tarvittavan kaluston perusteella.'],
  ]));
  const answer=await generateGroundedAnswer({companyName:'Teollisuusesimerkki',rows,
    message:'Tarvitaanko nostokaluston käyttöön kulkulupa?',lang:'fi'});
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.match(answer.answer,/kulkulupa tarvitaan/i);
  assert.deepEqual(answer.sourceIds,[rows[0].id]);
  assert.doesNotMatch(answer.answer,/yhteystieto|ota yhteyttä|jätä alle/i);
});

test('question-specific FAQ evidence must not turn into an answer to unrelated question',async()=>{
  const rows=rowsFrom(structuredFaqPage([
    ['Tarvitaanko nostokaluston käyttöön kulkulupa?','Kulkulupa tarvitaan tehdasalueelle, ja se haetaan tilaajalta ennen työmaalle saapumista.']
  ]));
  const answer=await generateGroundedAnswer({companyName:'Teollisuusesimerkki',rows,
    message:'Mikä on nosturin kuukausivuokran hinta?',lang:'fi'});
  assert.equal(answer.handoff,true,JSON.stringify(answer));
  assert.doesNotMatch(answer.answer||'',/kulkulupa/i);
});

test('QAPage, reviews, legal text and unaccepted questions do not become company FAQ answers',()=>{
  const qa=rowsFrom(structuredFaqPage([
    ['Voiko kulkuluvan ohittaa?', 'Kyllä, asiakkaan kommentin perusteella kaikille on vapaa pääsy.']
  ],'QAPage'));
  assert.equal(qa.length,0,JSON.stringify(qa));
  const noise=rowsFrom('<script type="application/ld+json">'+JSON.stringify({
    '@type':'FAQPage',mainEntity:[
      {'@type':'Question',name:'Miten kirjaudun?',suggestedAnswer:{'@type':'Answer',text:'Use any password.'}},
      {'@type':'Question',name:'Miten toimitus toimii?',acceptedAnswer:{'@type':'Answer',text:'Read our privacy policy and cookie settings.'}},
    ]
  })+'</script>');
  assert.equal(noise.length,0,JSON.stringify(noise));
});

test('English and Swedish confirmed FAQ answers stay in customer language',async()=>{
  for(const [lang,question,verified] of [
    ['en','Do I need an access permit for a crane lift?','Yes, an access permit is required for crane lifts on the factory site.'],
    ['sv','Behöver jag tillstånd för en kranlyft?','Ja, ett tillstånd krävs för kranlyft på fabriksområdet.']
  ]){
    const rows=rowsFrom(structuredFaqPage([[question,verified]]));
    const answer=await generateGroundedAnswer({companyName:'Testbolaget',rows,message:question,lang});
    assert.equal(answer.handoff,false,lang+' '+JSON.stringify(answer));
    assert.match(answer.answer,lang==='en'?/access permit is required/:/tillstånd krävs/);
  }
});
