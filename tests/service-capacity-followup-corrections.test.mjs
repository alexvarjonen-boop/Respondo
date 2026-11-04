import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitServiceSlots,serviceDialogue} from '../service-capacity.mjs';

const tenant='af65da90-85a5-4ae1-9260-14355ace433f';
const visitor='service-followup-customer';
const rule={serviceKey:'window_cleaning',minutesPerWindow:5,baseMinutes:10,
  bufferMinutes:30,largeMultiplier:1.5,doubleSidedMultiplier:2,
  difficultAccessMinutes:30,maxWindows:60,enabled:true};

function conversation(){
  let session=false;
  let facts={},preferred_text='';
  const db={query:async(sql,args)=>{
    assert.equal(args?.[0],tenant,'every service state query must be tenant-scoped');
    if(sql.includes('SELECT config,enabled'))
      return {rows:[{config:rule,enabled:true}],rowCount:1};
    if(sql.includes('SELECT facts,preferred_text'))
      return {rows:session?[{facts,preferred_text}]:[],rowCount:session?1:0};
    if(sql.includes('INSERT INTO respondo_service_dialogues')){
      session=true;
      facts=JSON.parse(args[2]);
      preferred_text=args[3]||'';
      return {rows:[],rowCount:1};
    }
    if(sql.includes('DELETE FROM respondo_service_dialogues')){
      session=false;facts={};preferred_text='';return {rows:[],rowCount:1};
    }
    throw Error('Unexpected service SQL: '+sql);
  }};
  return {db,get preferred(){return preferred_text;}};
}

test('window-cleaning customer corrects 3 PM, changes weekday and supplies new time',async()=>{
  const state=conversation();
  const answer=(message)=>serviceDialogue(state.db,tenant,visitor,message,'fi',async()=>[]);
  assert.equal((await answer('Olisko teillä perjantaina kello 3 aikaa?')).status,'needs_service');
  assert.equal((await answer('30 isoo ikkunaa')).status,'needs_details');
  assert.equal((await answer('molemmilt puolilt ja normaalisti pääsee')).status,'needs_time');
  assert.equal((await answer('iltapäivällä')).status,'no_slots');
  assert.equal(state.preferred,'friday at 15:00');
  assert.equal((await answer('entä maanantaina klo 10 aamulla?')).status,'no_slots');
  assert.equal(state.preferred,'monday at 10:00 am');
  assert.equal((await answer('entä tiistaina')).status,'no_slots');
  assert.equal(state.preferred,'tuesday','new weekday must not inherit previous clock');
  assert.equal((await answer('klo 14')).status,'no_slots');
  assert.equal(state.preferred,'tuesday at 14:00');
  assert.equal((await answer('entä keskiviikkona klo 3')).status,'needs_time');
  assert.equal((await answer('klo 15')).status,'no_slots');
  assert.equal(state.preferred,'wednesday at 15:00');
});

test('Swedish and English weekday corrections replace previous requested appointment',async()=>{
  const fi=conversation();
  const answer=(db,message,lang)=>serviceDialogue(db,tenant,visitor,message,lang,async()=>[]);
  await answer(fi.db,'Ikkunanpesu 30 isoo ikkunaa molemmilta puolilta helposti pääsee','fi');
  await answer(fi.db,'perjantaina klo 15','fi');
  assert.equal(fi.preferred,'friday at 15:00');
  await answer(fi.db,'onsdag kl 14','sv');
  assert.equal(fi.preferred,'wednesday at 14:00');
  await answer(fi.db,'on Monday at 16:00','en');
  assert.equal(fi.preferred,'monday at 16:00');
});

test('explicitly unavailable, booked or blocked slot cannot be offered',()=>{
  const start=new Date(Date.now()+48*3600_000);
  const end=new Date(start.getTime()+4*3600_000);
  const base={starts_at:start.toISOString(),ends_at:end.toISOString()};
  assert.equal(fitServiceSlots([{...base,status:'booked'}],240).length,0);
  assert.equal(fitServiceSlots([{...base,status:'blocked'}],240).length,0);
  assert.equal(fitServiceSlots([{...base,status:'open'}],240).length,1);
  assert.equal(fitServiceSlots([base],240).length,1);
});

test('chat appointment candidates exclude both booked slots and native confirmed reservations',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const start=server.indexOf('async function configuredServiceSlots(');
  const stop=server.indexOf("app.get('/api/public/:slug/booking-slots'",start);
  assert.ok(start>=0&&stop>start);
  const sql=server.slice(start,stop);
  assert.match(sql,/available\.status='open'/);
  assert.match(sql,/occupied\.status='booked'/);
  assert.match(sql,/confirmed\.status='confirmed'/);
  assert.match(sql,/occupied\.starts_at<available\.ends_at/);
  assert.match(sql,/confirmed\.ends_at>available\.starts_at/);
  assert.match(sql,/fitServiceSlots\(slots,requiredMinutes,busy\)/);
});
