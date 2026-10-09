import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFollowupVariantSeed, detectContextualFollowup,
  followupCanonicalQuestion, FOLLOWUP_VARIANT_TARGET } from '../followup-variants.mjs';
import { generateGroundedAnswer } from '../server.mjs';

const history=[{question:'Mitä toimitus maksaa?',answer:'Toimitus on ilmainen yli 280 € tilauksille.'}];
const rows=[
  {id:'free',title:'Ilmainen toimitus',category:'Toimitus ja seuranta',answer:'Toimitus on ilmainen yli 280 € tilauksille.',source_type:'website',source_url:'https://shop.example/shipping'},
  {id:'time',title:'Toimitusaika',category:'Toimitus ja seuranta',answer:'Kotimaan toimitus kestää 3–5 arkipäivää.',source_type:'website',source_url:'https://shop.example/shipping'},
  {id:'paid',title:'Toimitusmaksu',category:'Toimitus ja seuranta',answer:'Posti: 5,90 €.',source_type:'website',source_url:'https://shop.example/shipping'}
];

test('100,000 distinct additional FI, SV and EN contextual question forms across 14 business topics',()=>{
  const seed=buildFollowupVariantSeed();
  assert.equal(seed.length,FOLLOWUP_VARIANT_TARGET);
  assert.equal(new Set(seed.map(x=>x.language+'|'+x.normalized)).size,seed.length);
  for(const lang of ['fi','sv','en']){
    const subset=seed.filter(x=>x.language===lang);
    assert.ok(subset.length>=30_000,lang+': '+subset.length);
    assert.equal(new Set(subset.map(x=>x.kind)).size,14);
  }
  for(const i of [0,77,345,1799,5999,11999,24999,49999,75999,99999]){
    const item=seed[i];
    const match=detectContextualFollowup(item.phrase,history);
    assert.equal(match?.kind,item.kind,item.phrase);
  }
});
test('shipping under-threshold follow-up never echoes unrelated delivery text',async()=>{
  for(const [msg,lang] of [
    ['Entä alle rajan ihan käytännössä','fi'],
    ['Mites sen summan alle jäävät ostokset','fi'],
    ['What about orders below the limit in this case','en'],
    ['Och beställningar under gränsen i det här fallet','sv']
  ]){
    const result=await generateGroundedAnswer({rows,message:msg,history,lang});
    assert.equal(result.handoff,false,msg+': '+JSON.stringify(result));
    assert.match(result.answer,/280/);
    assert.match(result.answer,/5,90/);
    assert.doesNotMatch(result.answer,/3–5.*arkipäivää/i);
  }
});
test('shipping duration and shipping prices remain separate with follow-up wording',async()=>{
  for(const [msg,lang,expect] of [
    ['Entä toimituksen kesto','fi',/3–5/],
    ['What about delivery time','en',/3–5/],
    ['Men hur är det med leveranstid','sv',/3–5/],
    ['Entä postikulut vielä','fi',/5,90/],
    ['And what about shipping costs','en',/5,90/]
  ]){
    const result=await generateGroundedAnswer({rows,message:msg,history,lang});
    assert.equal(result.handoff,false,msg+': '+JSON.stringify(result));
    assert.match(result.answer,expect,msg+': '+result.answer);
  }
});
test('no history means no inherited topic and untrusted text is not converted to facts',()=>{
  assert.equal(detectContextualFollowup('Entä alle?',[]),null);
  assert.equal(detectContextualFollowup('Entä alle?',[]),null);
  assert.equal(detectContextualFollowup('Mitä toimitus maksaa?',history),null);
  assert.equal(detectContextualFollowup('What about the pricing?',[]),null);
  assert.equal(followupCanonicalQuestion('delivery_time','sv'),'Hur lång tid tar leveransen?');
});
