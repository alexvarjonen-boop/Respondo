import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMovingIntake as advance,MOVING_FIELDS,isMainioTenant} from '../moving-intake.mjs';
import {handleMovingIntake} from '../moving-intake-store.mjs';
const tenant={id:'tenant-a',website:'https://www.mainiomuuttopalvelu.fi'};
const now=new Date('2026-11-01T12:00:00Z');
const values=['Test Person','test@example.com','0401234567','2','12.12.2030','Koko asunto','3 vuotta','Testikatu 1, Turku','60','Kerrostalo, 3, hissi','Kyllä','Esimerkkikatu 2, Turku','Rivitalo, 1, ei hissiä','20 metriä','En tiedä','Ei'];
function step(state,message,lang='fi'){return advance({tenant,state,message,lang,now});}
function completed(lang='fi') {
 let r=step(null,'muuttotarjous',lang);
 for(const value of values)r=step(r.state,value,lang);
 return r;
}
test('only the exact merchant website enables intake',()=>{
 assert.equal(isMainioTenant(tenant),true);
 for(const website of ['https://mainiomuuttopalvelu.fi.evil.example','https://other.example','invalid'])assert.equal(advance({tenant:{website},message:'muuttotarjous'}),null);
});
test('ordinary questions keep the grounded answer path',()=>assert.equal(step(null,'Mitä muutto maksaa?'),null));
test('all fields collected in order and explicit confirmation required',()=>{
 let r=completed();assert.equal(r.state.status,'review');assert.equal(r.submit,undefined);
 assert.equal(Object.keys(r.state.answers).length,MOVING_FIELDS.length);
 assert.equal(step(r.state,'joo').submit,undefined);
 r=step(r.state,'vahvista');assert.equal(r.submit,true);assert.match(r.answer,/ei ole vielä vahvistettu/);
 assert.equal(step(r.state,'vahvista'),null);
});
test('invalid email and impossible or past dates do not advance',()=>{
 const s={status:'collecting',step:1,answers:{name:'Test'},lang:'fi'};
 assert.equal(step(s,'invalid').state.step,1);
 for(const date of ['31.2.2030','1.1.2020','huomenna'])assert.equal(step({...s,step:4},date).state.step,4);
});
test('uncertain box quantity is preserved without invented number',()=>assert.equal(completed().state.answers.boxes,'En tiedä'));
test('questions do not become collected field data',()=>assert.equal(step({status:'collecting',step:7,answers:{},lang:'fi'},'Paljonko maksaa?'),null));
test('a reviewed field can be corrected without losing other answers',()=>{
 const review=completed();let r=step(review.state,'korjaa 8');assert.equal(r.state.step,7);
 r=step(r.state,'Uusi testiosoite, Turku');assert.equal(r.state.status,'review');assert.equal(r.state.answers.from,'Uusi testiosoite, Turku');assert.equal(r.state.answers.to,values[11]);
 assert.equal(review.state.answers.from,values[7]);
});
test('cancel clears state without creating a request',()=>{const r=step(completed().state,'peruuta');assert.equal(r.state,null);assert.equal(r.submit,undefined);});
test('English and Swedish keep language during short numeric replies',()=>{
 for(const [lang,word] of [['en','confirm'],['sv','bekräfta']]){
  const r=completed(lang);assert.equal(r.state.lang,lang);
  const saved=step(r.state,word,'fi');assert.equal(saved.submit,true);assert.equal(saved.state.lang,lang);
 }
});
function database(state,{fail=false,mode='ai'}={}){
 const calls=[];
 const client={async query(sql,args){calls.push({sql,args});if(sql.startsWith('SELECT'))return {rows:[{moving_intake:state,mode,visitor_ref:'visitor-a'}]};if(fail&&sql.startsWith('INSERT'))throw Error('database unavailable');return {rows:[]};},release(){calls.push({sql:'RELEASE'});}};
 return {pool:{async connect(){return client;}},calls};
}
test('confirmation saves request and state in one tenant-scoped transaction',async()=>{
 const db=database(completed().state);const r=await handleMovingIntake({...db,tenant,threadId:'thread-a',message:'vahvista',lang:'fi'});
 assert.equal(r.submit,true);assert.equal(db.calls[0].sql,'BEGIN');
 const select=db.calls.find(c=>c.sql.startsWith('SELECT'));assert.match(select.sql,/tenant_id=\$2 FOR UPDATE/);assert.deepEqual(select.args,['thread-a','tenant-a']);
 const insert=db.calls.find(c=>c.sql.startsWith('INSERT'));const payload=JSON.parse(insert.args[3]);assert.equal(payload.requiresHumanApproval,true);assert.equal(payload.fields.email,'test@example.com');
 assert.equal(db.calls.at(-2).sql,'COMMIT');assert.equal(r.state.answers,undefined);
});
test('failed persistence rolls back and never reports saved',async()=>{
 const db=database(completed().state,{fail:true});await assert.rejects(handleMovingIntake({...db,tenant,threadId:'thread-a',message:'vahvista',lang:'fi'}));
 assert.equal(db.calls.at(-2).sql,'ROLLBACK');assert.ok(!db.calls.some(c=>c.sql==='COMMIT'));
});
test('human takeover is checked again under the thread lock',async()=>{
 const db=database(completed().state,{mode:'human'});assert.equal(await handleMovingIntake({...db,tenant,threadId:'thread-a',message:'vahvista',lang:'fi'}),null);assert.ok(!db.calls.some(c=>c.sql.startsWith('INSERT')));
});
test('repeated confirmation never inserts a second request',async()=>{
 const db=database({status:'submitted',lang:'fi'});assert.equal(await handleMovingIntake({...db,tenant,threadId:'thread-a',message:'vahvista',lang:'fi'}),null);assert.ok(!db.calls.some(c=>c.sql.startsWith('INSERT')));
});
