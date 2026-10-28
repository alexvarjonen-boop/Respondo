import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedServiceOverview} from '../service-overview.mjs';
import {generateGroundedAnswer, chatActions} from '../server.mjs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');

const site='https://nostokonepalvelu.fi';
const service=(name,i)=>({
  id:'nosto-'+i,source_type:'website',source_url:site+'/palvelut/',
  category:'Palvelut',title:'Palvelut: '+name,answer:name,keywords:['palvelut',name],
});
const businessRows=[
  service('Nostokonepalvelu',0),  // The company brand, not an offering.
  service('Nostopalvelut ja -kalusto',1),
  service('Kuljetuspalvelut',2),
  service('Projektipalvelut',3),
  service('Rakentamisen asennukset',4),
  service('Haalaus ja tunkkaus',5),
  service('Henkilönostimet',6),
  service('Lifting services and equipment',7),
  service('Transport services',8),
];
const contactRow={
  id:'contact',category:'Yhteystiedot',title:'Yhteydenottosivu',
  answer:site+'/yhteystiedot/',source_type:'website',source_url:site+'/yhteystiedot/'
};

test('Nostokonepalvelu service list removes brand-only heading and duplicated English aliases',()=>{
  for(const [lang,expected] of [
    ['fi',/Nostopalvelut ja -kalusto.*Kuljetuspalvelut/],
    ['sv',/Lyfttjänster och lyftutrustning.*Transporttjänster/],
    ['en',/Lifting services and equipment.*Transport services/],
  ]){
    const result=verifiedServiceOverview(businessRows,{lang,companyName:'Nostokonepalvelu Oy'});
    assert.ok(result,lang);
    assert.match(result.answer,expected,lang);
    assert.equal(result.names.length,6,lang+JSON.stringify(result.names));
    assert.doesNotMatch(result.answer,/Palvelut:\s*Nostokonepalvelu|, Nostokonepalvelu|and Nostokonepalvelu/);
    assert.equal((result.answer.match(/Lifting services and equipment/g)||[]).length,lang==='en'?1:0);
    assert.equal((result.answer.match(/Transport services/g)||[]).length,lang==='en'?1:0);
  }
});

test('Finnish customer question on English demo gets a concise Finnish service overview',async()=>{
  const a=await generateGroundedAnswer({companyName:'Nostokonepalvelu Oy',rows:businessRows,message:'Mitä teette?',lang:'fi'});
  assert.equal(a.handoff,false,JSON.stringify(a));
  assert.equal(a.intent,'Palvelut');
  assert.match(a.answer,/^Palveluihimme kuuluvat:/);
  assert.match(a.answer,/Nostopalvelut ja -kalusto/);
  assert.doesNotMatch(a.answer,/Lifting services|Transport services|Nostokonepalvelu(?=,| ja |\.)/i);
  assert.ok(a.answer.length<300,JSON.stringify(a));
  assert.ok(a.sourceIds.length>0);
});

test('booking question uses verified business contact page, never invents a calendar',async()=>{
  for(const [message,lang,needle] of [
    ['Miten voin varata ajan','fi',/vahvistettua ajanvarauskalenteria/],
    ['How can I book an appointment?','en',/could not verify an online booking calendar/],
    ['Hur kan jag boka en tid?','sv',/kunde inte bekräfta någon bokningskalender/],
  ]){
    const rows=[...businessRows,contactRow];
    const a=await generateGroundedAnswer({companyName:'Nostokonepalvelu Oy',rows,message,lang});
    assert.equal(a.handoff,false,message+JSON.stringify(a));
    assert.equal(a.intent,'Ajanvaraus',message);
    assert.match(a.answer,needle);
    const actions=chatActions(rows,message,a.handoff,lang,a.selected);
    assert.ok(actions.some(x=>x.url===site+'/yhteystiedot/'&&x.mode==='website_contact'),JSON.stringify(actions));
    assert.equal(actions.some(x=>x.type==='booking'&&x.url===site+'/yhteystiedot/'),false);
    assert.equal(a.sourceIds[0],contactRow.id);
  }
});

test('verified phone alone gives honest booking enquiry path without unconfirmed time slots',async()=>{
  const phone={id:'phone',category:'Yhteystiedot',title:'Puhelinnumero',
    answer:'020 7480 400',source_type:'profile'};
  const a=await generateGroundedAnswer({
    companyName:'Nostokonepalvelu Oy',rows:[phone],
    message:'Miten voin varata ajan',lang:'fi',
  });
  assert.equal(a.handoff,false,JSON.stringify(a));
  assert.equal(a.intent,'Ajanvaraus');
  assert.match(a.answer,/vahvistettua ajanvarauskalenteria/);
  assert.deepEqual(a.sourceIds,['phone']);
});

test('delivery and opening-hours questions cannot become booking confirmation',async()=>{
  const a=await generateGroundedAnswer({rows:[contactRow],message:'Mikä on toimitusaika?',lang:'fi'});
  assert.notEqual(a.intent,'Ajanvaraus');
  assert.equal(chatActions([contactRow],'Mikä on toimitusaika?',false,'fi').some(x=>x.type==='booking'),false);
});

test('Try Bot defaults to brand arrow and leaves avatars configurable for tenant accounts',()=>{
  const app=read('app.js');
  const index=read('index.html');
  const style=read('demo-preview-polish-v19.css');
  assert.match(app,/bot_avatar:'respondo-official'/);
  assert.match(app,/if\(raw === 'respondo-official'\)/);
  assert.match(app,/respondo-approved-arrow-20261012\.png/);
  assert.match(app,/data-avatar="\$\{avatar\.id\}"/);
  assert.match(style,/#live-preview/);
  assert.match(style,/scroll-margin-top:max\(138px/);
  assert.match(style,/@media \(max-width:760px\)/);
  assert.match(index,/demo-preview-polish-v19\.css\?v=20261028-iphone-try-bot-v19/);
  assert.match(index,/app\.js\?v=[^"]+-footer-rights-v18-demo-v19/);
});
