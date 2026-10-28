import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateGroundedAnswer,chatActions} from '../server.mjs';
const read = path => readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const app=read('app.js');
const index=read('index.html');
const css=read('demo-preview-polish-v21.css');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('public demo uses the authentic logo instead of generic robot without changing customer selections',()=>{
  assert.match(app,/bot_avatar:'respondo-official'/);
  assert.match(app,/raw === 'respondo-official'/);
  assert.match(app,/\/respondo-approved-arrow-20261012\.png/);
  assert.match(app,/function botAvatarMarkup/);
  assert.match(app,/BOT_AVATAR_PRESETS/);
  assert.match(app,/data-avatar="\$\{avatar.id\}"/);
});

test('iPhone Try Bot heading stays below fixed 66px navigation when scrolled into view',()=>{
  assert.match(css,/dashboard-premium-shell\.demo-dashboard-shell #live-preview/);
  assert.match(css,/scroll-margin-top:max\(138px/);
  assert.match(css,/\.preview-device-top \.preview-avatar img/);
  assert.match(css,/@media \(max-width:760px\)/);
  assert.equal(css.split('{').length,css.split('}').length);
  assert.match(index,/demo-preview-polish-v21\.css\?v=20261028-iphone-demo-title-brand-v21/);
  assert.match(index,/app\.js\?v=[^"]+-footer-rights-v18-demo-v21/);
});

test('missing demo contact page is recovered for booking question from the selected website only',()=>{
  const route=server.slice(server.indexOf("app.post('/api/public/demo-chat'"),server.indexOf("app.post('/api/public/demo-lead'"));
  assert.match(route,/const bookingContactEnquiry=/);
  assert.match(route,/generalContactQuestion\(message\)\|\|bookingContactEnquiry/);
  assert.match(route,/const website=normalizeWebUrl\(profile.website,false\)/);
  assert.match(route,/fetchWebsiteBundle\(/);
  assert.doesNotMatch(route,/const website=normalizeWebUrl\(process\.env\.OWNER_WEBSITE/);
});

test('a real imported contact page answers a crane-service booking enquiry without inventing free times',async()=>{
  const contact={
    id:'nosto-contact',source_type:'website',
    source_url:'https://nostokonepalvelu.fi/yhteystiedot/',
    category:'Yhteystiedot',title:'Yhteydenottosivu',
    answer:'https://nostokonepalvelu.fi/yhteystiedot/'
  };
  const answer=await generateGroundedAnswer({
    companyName:'Nostokonepalvelu Oy',rows:[contact],
    message:'Miten voin varata ajan?',lang:'fi',
  });
  assert.equal(answer.handoff,false,JSON.stringify(answer));
  assert.match(answer.answer,/vahvistettua ajanvarauskalenteria/);
  const actions=chatActions([contact],'Miten voin varata ajan?',false,'fi',answer.selected);
  assert.ok(actions.some(x=>x.url===contact.answer&&x.mode==='website_contact'),JSON.stringify(actions));
  assert.equal(actions.some(x=>x.type==='booking'&&x.url===contact.answer),false);
});
