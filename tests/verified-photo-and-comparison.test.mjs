import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeVisitorPhoto,visitorPhotoMessage,validPhotoId,saveVisitorPhoto} from '../verified-photo-assist.mjs';
import {compareApprovedProducts} from '../verified-product-comparison.mjs';
import {guardUnverifiedPromises} from '../unverified-promise-guard.mjs';

const safePng='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC';
const tenant='11111111-1111-4111-8111-111111111111';
const imageId='22222222-2222-4222-8222-222222222222';

test('image intake accepts small raster images but not active content or oversize images',()=>{
  const photo=decodeVisitorPhoto(safePng);
  assert.equal(photo.mimeType,'image/png');
  assert.equal(photo.width,1);
  assert.equal(photo.height,1);
  assert.ok(photo.bytes.length>=32);
  assert.throws(()=>decodeVisitorPhoto('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),TypeError);
  assert.throws(()=>decodeVisitorPhoto(safePng.replace('image/png','image/jpeg')),TypeError);
  assert.throws(()=>decodeVisitorPhoto('data:image/png;base64,'+'A'.repeat(2_600_000)),RangeError);
});

test('photo response never promises visual diagnosis, in all languages',()=>{
  for(const lang of ['fi','sv','en']){
    const response=visitorPhotoMessage(lang,{ocrText:'serial number 123',reviewQueued:true});
    assert.match(response,/123/);
    assert.doesNotMatch(response,/confirmed damage|vaurio on vahvistettu|skadan är bekräftad/i);
    assert.ok(response.length>80);
  }
});

test('photo persistence scopes inserts to one tenant and visitor and applies a retention limit',async()=>{
  let writes=[];
  const db={query:async(sql,values=[])=>{
    writes.push({sql,values});
    if(sql.includes('COUNT(*)'))return {rows:[{n:0}]};
    if(sql.includes('RETURNING id'))return {rows:[{id:imageId}]};
    return {rows:[]};
  }};
  const photo=decodeVisitorPhoto(safePng);
  const id=await saveVisitorPhoto(db,{tenantId:tenant,visitorRef:'visitor-123456',photo,question:'What is this?'});
  assert.equal(id,imageId);
  assert.ok(writes.some(item=>item.sql.includes('DELETE FROM')));
  const inserted=writes.find(item=>item.sql.includes('INSERT INTO'));
  assert.equal(inserted.values[0],tenant);
  assert.equal(inserted.values[1],'visitor-123456');
  assert.equal(inserted.values[2],'image/png');
  assert.equal(validPhotoId(imageId),true);
  assert.equal(validPhotoId('malicious'),false);
});

test('comparison uses two named approved products and preserves exact known values',()=>{
  const rows=[
    {id:'a',approved:true,title:'Alpha Table',url:'https://store.example/alpha'},
    {id:'b',approved:true,title:'Beta Table',url:'https://store.example/beta'},
    {id:'c',approved:false,title:'Gamma Table',url:'https://store.example/gamma'},
  ];
  const parse=row=>({name:row.title,url:row.url,price:row.id==='a'?199:249,
    currency:'EUR',sizes:['M'],colors:['Black']});
  const answer=compareApprovedProducts(rows,'Compare Alpha Table versus Beta Table','en',parse);
  assert.ok(answer);
  assert.deepEqual(answer.sourceIds,['a','b']);
  assert.match(answer.answer,/199 EUR/);
  assert.match(answer.answer,/249 EUR/);
  assert.doesNotMatch(answer.answer,/Gamma/);
  assert.equal(compareApprovedProducts(rows,'Compare Alpha Table versus Gamma Table','en',parse),null);
  assert.equal(compareApprovedProducts(rows,'Compare these products','en',parse),null);
  assert.equal(compareApprovedProducts(rows,'Tell me about Alpha Table and Beta Table','en',parse),null);
});

test('AI promise guard blocks unsupported completed customer transactions',()=>{
  for(const [lang,answer] of [
    ['fi','Varaus on vahvistettu.'],['sv','Bokningen är bekräftad.'],
    ['en','We charged your card.'],['en','Your order has shipped.'],
    ['en','Your refund has been processed.']
  ]){
    const out=guardUnverifiedPromises({answer,handoff:false,confidence:0.95,sourceIds:['seed']},
      {question:'Has this happened?',lang});
    assert.equal(out.handoff,true);
    assert.equal(out.answer,'');
    assert.equal(out.qualityFlag,'unverified_transaction_promise');
  }
  const safe={answer:'You can request a booking; the company will confirm it.',
    handoff:false,confidence:0.8,sourceIds:['source']};
  assert.equal(guardUnverifiedPromises(safe,{question:'Can I book?',lang:'en'}),safe);
  const factual={answer:'We offer 2 sizes of this product.',handoff:false,
    confidence:0.9,sourceIds:['source']};
  assert.equal(guardUnverifiedPromises(factual,{question:'Sizes?',lang:'en'}),factual);
});
