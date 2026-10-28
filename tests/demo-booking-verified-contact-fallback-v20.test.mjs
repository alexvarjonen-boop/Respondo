import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer, chatActions} from '../server.mjs';

const phone={id:'verified-phone',title:'Puhelinnumero',category:'Yhteystiedot',
  answer:'020 7480 400',source_type:'website',source_url:'https://nostokonepalvelu.fi/yhteystiedot/'};
const email={id:'verified-email',title:'Sähköposti',category:'Yhteystiedot',
  answer:'nosto@nostokonepalvelu.fi',source_type:'website',source_url:'https://nostokonepalvelu.fi/yhteystiedot/'};

test('Try Bot provides verified merchant phone/email for booking enquiry even without contact page',async()=>{
  for(const [lang,message,expected] of [
    ['fi','Miten voin varata ajan?',/soittamalla numeroon 020 7480 400 tai sähköpostitse nosto@nostokonepalvelu\.fi/],
    ['en','How can I book an appointment?',/call 020 7480 400 or email nosto@nostokonepalvelu\.fi/],
    ['sv','Hur kan jag boka en tid?',/telefon 020 7480 400 eller via e-post nosto@nostokonepalvelu\.fi/],
  ]){
    const result=await generateGroundedAnswer({companyName:'Nostokonepalvelu Oy',
      rows:[phone,email],message,lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.equal(result.intent,'Ajanvaraus');
    assert.match(result.answer,expected);
    assert.deepEqual(result.sourceIds,['verified-phone','verified-email']);
    const actions=chatActions([phone,email],message,false,lang,result.selected);
    assert.ok(actions.some(action=>action.url==='tel:0207480400'),JSON.stringify(actions));
    assert.ok(actions.some(action=>action.url==='mailto:nosto@nostokonepalvelu.fi'),JSON.stringify(actions));
    assert.ok(!actions.some(action=>action.type==='booking'&&action.url),JSON.stringify(actions));
  }
});

test('booking enquiries with only approved phone or only email give one specific actionable option',async()=>{
  for(const [rows,expected,scheme] of [
    [[phone],/020 7480 400/,'tel:'],
    [[email],/nosto@nostokonepalvelu\.fi/,'mailto:'],
  ]){
    const result=await generateGroundedAnswer({rows,message:'Miten voin varata ajan?',lang:'fi'});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,expected);
    const actions=chatActions(rows,'Miten voin varata ajan?',false,'fi',result.selected);
    assert.ok(actions.some(action=>action.url?.startsWith(scheme)),JSON.stringify(actions));
  }
});
test('without contact evidence the bot still refuses to invent a calendar',async()=>{
  const result=await generateGroundedAnswer({rows:[],message:'Miten voin varata ajan?',lang:'fi'});
  assert.equal(result.handoff,true);
  assert.doesNotMatch(result.answer||'',/020 7480 400/);
});
