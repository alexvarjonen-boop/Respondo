import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateGroundedAnswer} from '../server.mjs';
import {essentialWebsiteCandidates} from '../website-knowledge.mjs';

const gift={name:'JAG Putters Gift Card',price:50,maxPrice:500,currency:'EUR',
  url:'https://jagputters.example/products/jag-putters-gift-card',
  category:'Gift Card',brand:'JAG Putters',description:'Gift card for golf equipment'};
const putter={name:'JAG Satin Steel - Putter',price:199,currency:'EUR',
  url:'https://jagputters.example/products/jag-satin-steel-putter',
  category:'Putters'};

const knowledge=()=>essentialWebsiteCandidates({
  finalUrl:'https://jagputters.example/',
  products:[putter,gift],pageDocuments:[],
}).map((fact,index)=>({
  id:'row-'+index,category:fact.category,title:fact.title,answer:fact.answer,
  keywords:fact.keywords,source_type:'website',source_url:fact.sourceUrl,
}));

test('yes/no product-category questions find an English-named gift card from Finnish',async()=>{
  for(const question of ['myyttekö lahjakortteja','Saako teiltä lahjakortteja?','Löytyykö lahjakortteja?']){
    const result=await generateGroundedAnswer({rows:knowledge(),message:question,lang:'fi'});
    assert.equal(result.handoff,false,question+' '+JSON.stringify(result));
    assert.match(result.answer,/Kyllä, myymme lahjakortteja/i);
    assert.match(result.answer,/50/);
    assert.match(result.answer,/500/);
    assert.ok(result.selected.some(row=>row.source_url.endsWith('/jag-putters-gift-card')));
    assert.equal(result.selected.some(row=>row.title.includes('Satin Steel')),false);
  }
});

test('the same verified product is found in English and Swedish',async()=>{
  for(const [question,lang,fragment] of [
    ['Do you sell gift cards?','en',/Yes, we sell gift cards/i],
    ['Har ni presentkort?','sv',/Ja, vi säljer presentkort/i],
  ]){
    const result=await generateGroundedAnswer({rows:knowledge(),message:question,lang});
    assert.equal(result.handoff,false,JSON.stringify(result));
    assert.match(result.answer,fragment);
  }
});

test('not seeing a product is not evidence the shop does not offer it',async()=>{
  const rows=essentialWebsiteCandidates({finalUrl:'https://jagputters.example/',
    products:[putter],pageDocuments:[]}).map((item,i)=>({
      id:'row-'+i,category:item.category,title:item.title,answer:item.answer,
      keywords:item.keywords,source_type:'website',source_url:item.sourceUrl,
    }));
  const result=await generateGroundedAnswer({rows,message:'myyttekö lahjakortteja',lang:'fi'});
  assert.doesNotMatch(result.answer||'',/Kyllä.*lahjakort/i);
  assert.equal(result.selected?.some(row=>row.title?.includes('Satin Steel')),false);
});

test('public demo can retrieve an omitted product family from its own storefront',async()=>{
  const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/async function recoverMissingStorefrontFamily\(website,message,knownRows=\[\]\)/);
  assert.match(server,/fetchShopifyCatalog\('',siteOrigin,250,Date\.now\(\)\+9000,true\)/);
  assert.match(server,/normalizeHost\(product\.url\)===normalizeHost\(siteOrigin\)/);
  assert.match(server,/const requestedFamily=requestedProductFamilyAvailability\(message\)/);
  assert.match(server,/sessionImport\.candidates=\[/);
  assert.match(server,/persistDemoWebsiteImport\(demoImportId,target,sessionImport\.candidates\)/);
});
