import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates} from '../website-knowledge.mjs';
import {extractBranchWeeklyHours} from '../branch-hours-import.mjs';
import {generateGroundedAnswer} from '../server.mjs';

const schedule=(name,hours)=>`<html><body><h1>${name}</h1><p>Pläkkisepänkatu 2, 20320 Turku</p>
<h2>Normaalit aukioloajat</h2>
${hours.map(([day,time])=>`<div>${day}</div><div>${time}</div>`).join('')}
<h2>Poikkeusajat</h2><div>31.10. Pyhäinpäivä</div><div>9 - 18</div>
<footer><h3>Asiakaspalvelu</h3><p>Asiakaspalvelumme on avoinna ma-pe klo 9-17</p></footer>
</body></html>`;
const days=[
  ['Maanantai','8 - 20'],['Tiistai','8 - 20'],
  ['Keskiviikko','8 - 20'],['Torstai','8 - 20'],
  ['Perjantai','8 - 20'],['Lauantai','9 - 18'],['Sunnuntai','10 - 18']
];
const page=(name,id,opening=days)=>{
  const url='https://chain.example/tavaratalot/'+name.toLowerCase()+'?id='+id;
  return extractBusinessDocument(schedule(name,opening),url);
};

test('realistic Motonet layout with detached weekdays and 8–20 ranges becomes one verified weekly record',()=>{
  const doc=page('Turku',71);
  const r=extractBranchWeeklyHours(doc);
  assert.equal(r.name,'Turku');
  assert.equal(r.days,7);
  assert.match(r.hours,/Ma: 08:00 - 20:00/);
  assert.match(r.hours,/La: 09:00 - 18:00/);
  assert.match(r.hours,/Su: 10:00 - 18:00/);
  assert.doesNotMatch(r.hours,/Pyhäinpäivä|Asiakaspalvelu|9 - 17/);
});

test('identical times at different stores remain two independent source-grounded rows',async()=>{
  const turku=page('Turku',71);
  const vantaa=page('Vantaa',73);
  const bundle={finalUrl:'https://chain.example/',pageDocuments:[turku,vantaa],products:[]};
  const candidates=essentialWebsiteCandidates(bundle).filter(x=>x.category==='Aukioloajat');
  assert.equal(candidates.length,2,JSON.stringify(candidates));
  assert.notEqual(candidates[0].sourceUrl,candidates[1].sourceUrl);
  const rows=candidates.map((r,i)=>({
    id:'s'+i,source_type:'website',category:r.category,title:r.title,
    answer:r.answer,keywords:r.keywords,source_url:r.sourceUrl
  }));
  const prompt=await generateGroundedAnswer({rows,message:'Mitä aukioloajat ovat?',lang:'fi'});
  assert.equal(prompt.intent,'Toimipisteen valinta',JSON.stringify(prompt));
  assert.deepEqual(prompt.branchChoices,['Turku','Vantaa']);
  const specific=await generateGroundedAnswer({rows,message:'Turun aukioloajat?',lang:'fi'});
  assert.equal(specific.handoff,false,JSON.stringify(specific));
  assert.equal(specific.sourceIds.length,1);
  assert.match(specific.answer,/Turku: Maanantai: 08:00 - 20:00/);
});

test('footer, national support and undifferentiated pages are not invented as branches',()=>{
  const html='<html><h2>Asiakaspalvelu</h2><p>Ma-Pe klo 9-17</p><p>Puhelin 030 123 456</p></html>';
  const doc=extractBusinessDocument(html,'https://chain.example/asiakaspalvelu');
  assert.equal(extractBranchWeeklyHours(doc),null);
  const fake=extractBusinessDocument('<h1>Turku</h1><p>Asiakaspalvelu avoinna maanantaisin 9-17</p>',
    'https://chain.example/tavaratalot/turku?id=71');
  assert.equal(extractBranchWeeklyHours(fake),null);
});

test('schedule validation ignores exceptional dates and rejects broken hours',()=>{
  const doc=page('Turku',71,[...days.slice(0,3),['Torstai','88 - 30'],...days.slice(4)]);
  const r=extractBranchWeeklyHours(doc);
  assert.ok(r);
  assert.equal(r.days,6);
  assert.doesNotMatch(r.hours,/88/);
  const noSchedule=page('Turku',71,[['Maanantai','8 - 20']]);
  assert.equal(extractBranchWeeklyHours(noSchedule),null);
});
