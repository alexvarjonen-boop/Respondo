import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedServiceOverview} from '../service-overview.mjs';
import {generateGroundedAnswer,chatActions} from '../server.mjs';

const website='https://nostokonepalvelu.fi';
const service=(name,id)=>({
  id:'service-'+id,source_type:'website',source_url:website+'/palvelut/',
  title:'Palvelut: '+name,answer:name,category:'Palvelut',
  keywords:['palvelut',name]
});
const services=[
 service('Nostokonepalvelu',0),
 service('Nostopalvelut ja -kalusto',1),
 service('Kuljetuspalvelut',2),
 service('Projektipalvelut',3),
 service('Rakentamisen asennukset',4),
 service('Lifting services and equipment',5),
 service('Transport services',6),
];
const contact={
  id:'contact-page',source_type:'website',source_url:website+'/yhteystiedot/',
  category:'Yhteystiedot',title:'Yhteydenottosivu',answer:website+'/yhteystiedot/',
  keywords:['yhteystiedot','contact'],
};
test('Nostokonepalvelu importer service list removes site brand and FI/EN duplicate translations',()=>{
  const fi=verifiedServiceOverview(services,{lang:'fi',companyName:'Demo company'});
  assert.ok(fi, 'services should have verified evidence');
  assert.deepEqual(fi.names,[
    'Nostopalvelut ja -kalusto','Kuljetuspalvelut','Projektipalvelut','Rakentamisen asennukset',
  ]);
  assert.doesNotMatch(fi.answer,/Lifting services|Transport services|Nostokonepalvelu/);
  assert.equal(fi.selected.length,4);
  const en=verifiedServiceOverview(services,{lang:'en',companyName:'Demo company'});
  assert.deepEqual(en.names,[
    'Lifting services and equipment','Transport services','Project services','Construction installations',
  ]);
  assert.doesNotMatch(en.answer,/Nostopalvelut|Kuljetuspalvelut|Projektipalvelut/);
  const sv=verifiedServiceOverview(services,{lang:'sv',companyName:'Demo company'});
  assert.deepEqual(sv.names,[
    'Lyfttjänster och lyftutrustning','Transporttjänster','Projekttjänster','Bygginstallationer',
  ]);
  assert.doesNotMatch(sv.answer,/Lifting services|Kuljetuspalvelut/);
});
test('real question Mitä teette yields concise, single-language company services in Try Bot engine',async()=>{
  const ans=await generateGroundedAnswer({companyName:'Demo company',rows:services,
    message:'Mitä teette?',lang:'fi'});
  assert.equal(ans.handoff,false,JSON.stringify(ans));
  assert.match(ans.answer,/Nostopalvelut ja -kalusto/);
  assert.doesNotMatch(ans.answer,/Nostokonepalvelu|Lifting services|Transport services/);
  assert.equal(ans.selected.length,4);
});
test('contact-only booking enquiries guide to verified contact page without inventing online calendar',async()=>{
  for(const [lang,message,expected] of [
    ['fi','Miten voin varata ajan?',/yhteydenottosivun kautta/],
    ['en','How can I book an appointment?',/company.s contact page/],
    ['sv','Hur kan jag boka en tid?',/företagets kontaktsida/],
  ]){
    const result=await generateGroundedAnswer({companyName:'Nostokonepalvelu Oy',
      rows:[...services,contact],message,lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
    assert.equal(result.intent,'Ajanvaraus');
    assert.deepEqual(result.sourceIds,['contact-page']);
    assert.doesNotMatch(result.answer,/voit varata ajan tästä|you can book here|voit varata suoraan/i);
    const actions=chatActions([...services,contact],message,result.handoff,lang,result.selected);
    assert.ok(actions.some(action=>action.url===website+'/yhteystiedot/' && action.mode==='website_contact'),JSON.stringify(actions));
    assert.ok(!actions.some(action=>action.url && action.type==='booking'),JSON.stringify(actions));
  }
});
test('unrelated opening-hours questions do not become booking requests',()=>{
  const actions=chatActions([contact],'Mikä on toimitusaika?',false,'fi');
  assert.ok(!actions.some(a=>a.type==='booking'||a.mode==='website_contact'),JSON.stringify(actions));
});
