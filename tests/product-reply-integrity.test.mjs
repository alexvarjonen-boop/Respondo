import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProductKnowledgeRow } from '../website-knowledge.mjs';
import { isPhysicalClubProduct, productBudgetRequest, groundedBudgetProductAnswer } from '../product-budget.mjs';
import { verifyRetailAnswer } from '../product-reply-integrity.mjs';
import { generateGroundedAnswer, verifiedProductCards } from '../server.mjs';

function row(id,name,price,type='Putters'){
  const url='https://jagputters.fi/products/'+id;
  return {id,category:'Tuotteet',title:name,
    answer:'Tuote: '+name+'. Hinta: '+price+' EUR. Linkki: '+url+'. Tuoteryhmä: '+type+'.',
    approved:true,source_url:url};
}
const gift=row('gift','JAG Putters Gift Card',25,'Gift Card');
const club=row('blade','JAG Satin Black Blade Putter',199);
const expensive=row('steel','JAG Steel Putter',349);
const parse=parseProductKnowledgeRow;
const clubFamily=()=> 'club';
const clubMatch=(p)=>isPhysicalClubProduct(p);
const answer=(selected,sourceIds=selected.map(x=>x.id))=>({
  answer:'Our selection includes these products.',intent:'Tuotteet',handoff:false,
  confidence:0.99,sourceIds,selected,
});
const audit=(result,known,message='onko teillä mailoja alle 300€?',lang='fi')=>
  verifyRetailAnswer(result,known,message,lang,parse,clubFamily,clubMatch);

test('approved on-budget same-tenant product goes through without rewriting',()=>{
  const result=answer([club]);
  assert.strictEqual(audit(result,[club,gift,expensive]),result);
});
test('single-product catalog without explicit citation gets the exact approved source',()=>{
  const uncited=answer([club],[]);
  const guarded=audit(uncited,[club,gift]);
  assert.deepEqual(guarded.sourceIds,['blade']);
  assert.equal(guarded.selected[0],club);
  assert.equal(guarded.handoff,false);
  assert.notEqual(guarded.qualityFlag,'product_integrity_conflict');
});
test('a product from another tenant cannot create an implicit citation',()=>{
  const uncited=answer([club],[]);
  const guarded=audit(uncited,[gift]);
  assert.equal(guarded.qualityFlag,'product_integrity_conflict');
  assert.deepEqual(guarded.selected,[]);
});
test('different tenant row cannot borrow matching product ID',()=>{
  const impostor={...club,answer:club.answer.replace('199','99')};
  const result=audit(answer([impostor]),[club]);
  assert.equal(result.qualityFlag,'product_integrity_conflict');
  assert.equal(result.handoff,false);
  assert.equal(result.selected.length,0);
  assert.equal(result.sourceIds.length,0);
  assert.doesNotMatch(result.answer,/99/);
});
test('unapproved row is rejected even if cited by the answer',()=>{
  const candidate={...club,approved:false};
  const result=audit(answer([candidate]),[candidate]);
  assert.equal(result.qualityFlag,'product_integrity_conflict');
});
test('card must be supported by a matching citation',()=>{
  const result=audit(answer([club],['gift']),[club,gift]);
  assert.equal(result.qualityFlag,'product_integrity_conflict');
  assert.equal(result.selected.length,0);
});
test('gift cards cannot masquerade as physical golf clubs',()=>{
  const result=audit(answer([gift]),[gift,club]);
  assert.equal(result.qualityFlag,'product_integrity_conflict');
  assert.doesNotMatch(result.answer,/Gift Card/);
});
test('priced product cannot exceed exclusive or inclusive budget',()=>{
  assert.equal(audit(answer([expensive]),[club,expensive]).qualityFlag,'product_integrity_conflict');
  assert.equal(audit(answer([club]),[club],'mailoja alle 199€').qualityFlag,'product_integrity_conflict');
  const accepted=answer([club]);
  assert.strictEqual(audit(accepted,[club],'mailoja enintään 199€'),accepted);
});
test('unsupported currency or missing verified price cannot lead to a card',()=>{
  const usd={...club,id:'usd',answer:club.answer.replace('199 EUR','199 USD')};
  assert.equal(audit(answer([usd]),[usd]).qualityFlag,'product_integrity_conflict');
  const noPrice={...club,id:'no-price',answer:club.answer.replace('Hinta: 199 EUR.','')};
  assert.equal(audit(answer([noPrice]),[noPrice]).qualityFlag,'product_integrity_conflict');
});
test('a safe no-match answer remains visible without encouraging a contact handoff',()=>{
  const result={answer:'Hyväksytyistä tuotetiedoista ei löytynyt vahvistettuja mailoja alle 300 €.',
    intent:'Tuotteet',handoff:false,confidence:0.35,sourceIds:[],selected:[]};
  assert.strictEqual(audit(result,[]),result);
});
test('unsupported affirmative product budget without any citation is blocked',()=>{
  const result=audit({answer:'Kyllä, löytyy alle 300 €.',intent:'Tuotteet',
    handoff:false,confidence:0.99,sourceIds:[],selected:[]},[]);
  assert.equal(result.qualityFlag,'product_integrity_conflict');
});
test('conversation and service topics are not changed by the retail guard',()=>{
  const result={answer:'Hei! Miten voin auttaa?',handoff:false,intent:'Keskustelu',sourceIds:[],selected:[]};
  assert.strictEqual(audit(result,[]),result);
  const handoff={...result,intent:'Tuotteet',handoff:true};
  assert.strictEqual(audit(handoff,[]),handoff);
});
test('full answer engine preserves legitimate shop cards and rejects gift cards for golf questions',async()=>{
  const rows=[gift,club,expensive];
  for(const [question,limit] of [
    ['onko teillä mailoja alle 300€?',300],
    ['Onko teillä puttereita alle 300 euroa?',300],
    ['Do you have clubs under €300?',300],
    ['Har ni klubbor under 300 €?',300],
  ]){
    const lang=/^Do /i.test(question)?'en':/^Har /i.test(question)?'sv':'fi';
    const result=await generateGroundedAnswer({companyName:'JAG Putters',rows,message:question,lang});
    assert.equal(result.handoff,false,question);
    const cards=verifiedProductCards(result);
    assert.ok(cards.length>0,question);
    assert.ok(cards.every(c=>c.price<limit && /putter/i.test(c.name) && !/gift/i.test(c.name)),question);
  }
});
test('deterministic price-constraint matrix never recommends unsupported prices',()=>{
  const products=[gift,club,expensive].map(r=>({...parse(r),row:r}));
  for(let threshold=100;threshold<=420;threshold+=5){
    for(const [prefix,inclusive] of [['mailoja alle',false],['mailoja enintään',true]]){
      const message=prefix+' '+threshold+' €';
      const parsed=productBudgetRequest(message);
      assert.equal(parsed.inclusive,inclusive);
      const result=groundedBudgetProductAnswer(products,message,'fi');
      const audited=audit(result,[gift,club,expensive],message);
      assert.ok(!audited.qualityFlag, message);
      for(const r of audited.selected){
        const p=parse(r);
        assert.ok(isPhysicalClubProduct(p),message);
        assert.ok(inclusive?p.price<=threshold:p.price<threshold,message);
      }
    }
  }
});
