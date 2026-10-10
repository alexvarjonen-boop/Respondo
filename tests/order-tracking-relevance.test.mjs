import test from 'node:test';
import assert from 'node:assert/strict';
import { generateGroundedAnswer, chatActions, app } from '../server.mjs';

const productRows = [
  {
    id:'jag-headcover',
    category:'Tuotteet',
    title:'JAG Headcover',
    answer:'Tuote: JAG Headcover. Hinta: 29 EUR. Linkki: https://example.fi/products/jag-headcover',
    keywords:['jag','headcover','golf'],
    source_type:'website',
    source_url:'https://example.fi/products/jag-headcover',
  },
  {
    id:'jag-putter',
    category:'Tuotteet',
    title:'JAG Satin Black - Putter',
    answer:'Tuote: JAG Satin Black - Putter. Hinta: 299 EUR. Linkki: https://example.fi/products/jag-putter',
    keywords:['jag','putter','golf'],
    source_type:'website',
    source_url:'https://example.fi/products/jag-putter',
  },
];

test('order-tracking questions never show unrelated products or invent tracking', async () => {
  for (const [message,lang] of [
    ['Voiko tilausta seurata?', 'fi'],
    ['Can I track my order?', 'en'],
    ['Kan jag spåra min beställning?', 'sv'],
  ]) {
    const result = await generateGroundedAnswer({rows:productRows,message,lang});
    assert.equal(result.handoff,true,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Tilauksen seuranta');
    assert.equal(result.selected.length,0);
    assert.deepEqual(result.sourceIds,[]);
    const actions=chatActions(productRows,message,result.handoff,lang,productRows);
    assert.equal(actions.some(action=>action.type==='product' || action.type==='catalog'),false,JSON.stringify(actions));
  }
});

test('tracking answer may cite verified delivery evidence but not unrelated stock',async()=>{
  const delivery={
    id:'tracking-instructions',
    category:'Toimitus ja seuranta',
    title:'Tilauksen seuranta',
    answer:'Saat seurantatunnuksen sähköpostitse, kun tilaus on lähetetty.',
    source_type:'website',
    source_url:'https://example.fi/toimitus',
  };
  const result=await generateGroundedAnswer({rows:[...productRows,delivery],message:'Voiko tilausta seurata?',lang:'fi'});
  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.equal(result.intent,'Tilauksen seuranta');
  assert.ok(result.sourceIds.includes(delivery.id),JSON.stringify(result));
  assert.match(result.answer,/seurantatunnuksen/i);
  const actions=chatActions([...productRows,delivery],'Voiko tilausta seurata?',false,'fi',result.selected);
  assert.equal(actions.some(action=>action.type==='product'),false);
});

test('an unanswered product request cannot show unverified candidate links',()=>{
  const actions=chatActions(productRows,'Mikä on paras putteri?',true,'fi',productRows);
  assert.equal(actions.some(action=>action.type==='product'),false,JSON.stringify(actions));
});

test('demo tracking fallback does not show fake order form or random product links',async()=>{
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/public/demo-chat',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        publicDemo:true,lang:'fi',message:'Voiko tilausta seurata?',
        profile:{companyName:'JAG demo',customFacts:productRows.map(row=>({
          key:row.title,category:row.category,answer:row.answer,
          sourceType:'website',sourceUrl:row.source_url,
        }))},
      }),
    });
    assert.equal(response.status,200);
    const payload=await response.json();
    assert.match(payload.answer,/tilauksen seurantaan/i);
    assert.equal(payload.handoff,true);
    assert.equal(payload.actions.some(action=>action.type==='product' || action.type==='order_status'),false,JSON.stringify(payload.actions));
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
