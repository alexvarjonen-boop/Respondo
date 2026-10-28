import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateGroundedAnswer,chatActions} from '../server.mjs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
const site='https://nostokonepalvelu.fi';
const contact={
  id:'nostokone-contact',source_type:'website',source_url:site+'/yhteystiedot/',
  category:'Yhteystiedot',title:'Yhteydenottosivu',
  answer:site+'/yhteystiedot/'
};
const rows=[
  ...['Nostopalvelut ja -kalusto','Kuljetuspalvelut','Projektipalvelut','Lifting services and equipment','Transport services'].map((name,id)=>({
    id:'service-'+id,category:'Palvelut',title:'Palvelut: '+name,answer:name,
    source_type:'website',source_url:site+'/palvelut/',
  })),
  contact
];

test('public Nostokonepalvelu demo returns a grounded booking enquiry, not a fake calendar',async()=>{
  for(const [lang,message] of [['fi','Miten voin varata ajan?'],['en','How can I book an appointment?'],['sv','Hur kan jag boka en tid?']]){
    const result=await generateGroundedAnswer({rows,companyName:'Nostokonepalvelu Oy',message,lang});
    assert.equal(result.handoff,false,message);
    assert.equal(result.intent,'Ajanvaraus',message);
    assert.deepEqual(result.sourceIds,[contact.id]);
    assert.ok(chatActions(rows,message,false,lang,result.selected).some(x=>x.mode==='website_contact'&&x.url===site+'/yhteystiedot/'));
    assert.ok(!chatActions(rows,message,false,lang,result.selected).some(x=>x.type==='booking'&&x.url===site+'/yhteystiedot/'));
  }
});

test('Try Bot self-heals contact imports on booking enquiries and never on delivery times',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/function bookingEnquiryQuestion\(message\)/);
  assert.match(server,/generalContactQuestion\(message\)\|\|bookingEnquiryQuestion\(message\)/);
  assert.match(server,/const asksHowToBook=bookingEnquiryQuestion\(cleanMessage\)/);
  assert.match(server,/toimitusaika\|toimitusajat\|aukioloaika/);
});

test('Try Bot displays the official arrow rather than the generic robot without affecting tenant bots',()=>{
  const app=read('app.js');
  const index=read('index.html');
  const css=read('demo-preview-polish-v20.css');
  assert.match(app,/bot_avatar:'respondo-official'/);
  assert.match(app,/if\(raw === 'respondo-official'\)/);
  assert.match(app,/respondo-approved-arrow-20261012\.png/);
  assert.match(app,/BOT_AVATAR_PRESETS\.find/);
  assert.match(app,/appText\('paikalla nyt','online nu','online now'\)/);
  assert.match(css,/scroll-margin-top:max\(138px/);
  assert.match(css,/\.preview-action-link/);
  assert.match(css,/\.preview-device-top \.preview-avatar img/);
  assert.match(index,/demo-preview-polish-v20\.css\?v=20261028-iphone-try-bot-v20/);
  assert.match(index,/app\.js\?v=[^"]+-footer-rights-v18-demo-v20/);
  assert.equal(css.split('{').length,css.split('}').length);
});
