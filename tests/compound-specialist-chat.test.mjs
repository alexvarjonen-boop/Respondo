import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer } from '../server.mjs';

const row=(id,title,answer=title,category='Palvelut')=>({
  id,title,answer,category,approved:true,source_type:'website',
  source_url:'https://workshop.example/palvelut'
});
const facts=[
  row('brakes','Jarrupalojen vaihto'),
  row('rod','Raidetangonpään vaihto'),
];
const answer=(message,rows=facts,lang='fi')=>generateGroundedAnswer({
  companyName:'Test Workshop',rows,message,lang,history:[]
});

test('chat answers two documented specialist tasks, never just the first',async()=>{
  for(const [lang,message] of [
    ['fi','Vaihdatteko jarrupaloja ja raidetangon päitä?'],
    ['sv','Byter ni bromsbelägg och styrleder?'],
    ['en','Do you replace brake pads and tie rod ends?'],
  ]){
    const res=await answer(message,facts,lang);
    assert.equal(res.handoff,false,message+' '+JSON.stringify(res));
    assert.deepEqual(res.sourceIds,['brakes','rod'],message);
    assert.match(res.answer,/^1\. /);
    assert.match(res.answer,/\n2\. /);
  }
});
test('chat keeps partial compound-service answer unverified',async()=>{
  const res=await answer('Vaihdatteko jarrupaloja ja raidetangon päitä?',[facts[0]]);
  assert.equal(res.handoff,true,JSON.stringify(res));
  assert.deepEqual(res.sourceIds,['brakes']);
  assert.match(res.answer,/vahvistusta raidetangon/);
});
test('a service-category question title with a noncommittal reply is not proof',async()=>{
  const res=await answer('Vaihdatteko jarrupaloja?',[
    row('unconfirmed','Vaihdatteko jarrupaloja?','Ota yhteyttä saadaksesi lisätietoja.')
  ]);
  assert.equal(res.handoff,true,JSON.stringify(res));
  assert.deepEqual(res.sourceIds,[]);
});
test('an explicit negative authored service answer is never overwritten by its heading',async()=>{
  const res=await answer('Vaihdatteko jarrupaloja?',[
    row('no','Jarrupalojen vaihto','Emme tee tätä työtä.')
  ]);
  assert.equal(res.handoff,false,JSON.stringify(res));
  assert.deepEqual(res.sourceIds,['no']);
  assert.match(res.answer,/ei tarjota/);
});
