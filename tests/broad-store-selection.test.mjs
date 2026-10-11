import test from 'node:test';
import assert from 'node:assert/strict';
import { essentialWebsiteCandidates } from '../website-knowledge.mjs';
import { generateGroundedAnswer, chatActions } from '../server.mjs';

const url='https://shop.example';
const products=[
  {name:'Custom Stamping',category:'Customization',url:url+'/products/custom-stamping',price:25,currency:'EUR'},
  {name:'SuperStroke Pistol 1.0',category:'Grips',url:url+'/products/superstroke-pistol',price:35,currency:'EUR'},
  {name:'JAG Headcover',category:'Headcovers',url:url+'/products/jag-headcover',price:45,currency:'EUR'},
  {name:'JAG Satin Black - Putter',category:'Putters',url:url+'/products/jag-satin-black',price:199,currency:'EUR'},
  {name:'JAG Putters Gift Card',category:'Gift Card',url:url+'/products/jag-gift-card',price:50,maxPrice:500,currency:'EUR'},
];
const rowsFromProducts=(items=products)=>essentialWebsiteCandidates({
  finalUrl:url,products:items,pageDocuments:[],
}).map((f,i)=>({id:'product-'+i,title:f.title,answer:f.answer,
  category:f.category,keywords:f.keywords,source_type:'website',source_url:f.sourceUrl}));

test('screenshot wording "mitä kaikkea myytte" returns all sourced categories, not Custom Stamping metadata',async()=>{
  const rows=rowsFromProducts();
  const result=await generateGroundedAnswer({rows,message:'mitä kaikkea myytte',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.intent,'Tuotteet');
  assert.match(result.answer,/Valikoimastamme löytyy/i);
  for(const text of ['Putterit','Gripit','Mailansuojat','Lahjakortit','Personointi ja kustomointi']){
    assert.ok(result.answer.includes(text),text+' missing in '+result.answer);
  }
  assert.doesNotMatch(result.answer,/Tuote:|Brändi:|Hinta:|Custom Stamping\./);
  assert.deepEqual(result.selected,[],'overview must not show individual product cards');
  const actions=chatActions(rows,'mitä kaikkea myytte',false,'fi',result.selected);
  assert.equal(actions.length,1,JSON.stringify(actions));
  assert.equal(actions[0].type,'catalog');
  assert.equal(actions[0].url,url+'/collections/all');
});

test('natural Finnish retail overview variants all return categorical summaries',async()=>{
  const variants=[
    'mitä myytte','mita kaikkea myytte','mitä te oikein myytte',
    'mitä tuotteita myytte','mitä kaikkea teillä on','millainen tuotevalikoima teillä on',
  ];
  for(const question of variants){
    const result=await generateGroundedAnswer({rows:rowsFromProducts(),message:question,lang:'fi'});
    assert.equal(result.handoff,false,question+': '+JSON.stringify(result));
    assert.match(result.answer,/Valikoimastamme löytyy/i,question+': '+result.answer);
    assert.deepEqual(result.selected,[]);
  }
});

test('English and Swedish whole-store questions are localized naturally',async()=>{
  for(const [message,lang,start] of [
    ['What all do you sell?','en','Our selection includes'],
    ['What do you sell?','en','Our selection includes'],
    ['Vad säljer ni?','sv','I vårt sortiment'],
    ['Vad allt säljer ni?','sv','I vårt sortiment'],
  ]){
    const result=await generateGroundedAnswer({rows:rowsFromProducts(),message,lang});
    assert.equal(result.handoff,false,message+': '+JSON.stringify(result));
    assert.ok(result.answer.startsWith(start),message+': '+result.answer);
    assert.doesNotMatch(result.answer,/Tuote:|Brändi:/);
  }
});

test('narrow product question keeps product-specific answers and evidence',async()=>{
  const result=await generateGroundedAnswer({
    rows:rowsFromProducts(),message:'Paljonko JAG Satin Black - Putter maksaa?',lang:'fi',
  });
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/199/);
  assert.doesNotMatch(result.answer,/Valikoimastamme löytyy/);
  assert.ok(result.selected.length>=1);
});

test('generic merchandising does not invent categories absent from the store',async()=>{
  const rows=rowsFromProducts([
    {name:'Cotton T-shirt',category:'Clothing',url:url+'/products/shirt',price:15},
    {name:'Running Shoes',category:'Shoes',url:url+'/products/shoes',price:65},
  ]);
  const result=await generateGroundedAnswer({rows,message:'mitä kaikkea myytte',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/Vaatteet/);
  assert.match(result.answer,/Kengät/);
  assert.doesNotMatch(result.answer,/Putterit|Gripit|Lahjakortit/);
});
