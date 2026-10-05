import test from 'node:test';
import assert from 'node:assert/strict';

test('demo answers in the customer question language instead of the page language', async()=>{
  const {app}=await import('../server.mjs');
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const endpoint='http://127.0.0.1:'+server.address().port+'/api/public/demo-chat';
  const productFacts=[
    {
      key:'JAG Headcover',
      category:'Tuotteet',
      answer:'Tuote: JAG Headcover. Tuoteryhmä: Headcover. Hinta: 29 EUR. Linkki: https://shop.example/products/headcover.',
      sourceType:'website',
      sourceUrl:'https://shop.example/products/headcover'
    },
    {
      key:'JAG Satin Black - Putter',
      category:'Tuotteet',
      answer:'Tuote: JAG Satin Black - Putter. Tuoteryhmä: Putter. Hinta: 199 EUR. Linkki: https://shop.example/products/putter.',
      sourceType:'website',
      sourceUrl:'https://shop.example/products/putter'
    }
  ];
  const ask=async(message)=>{
    const response=await fetch(endpoint,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        lang:'fi',
        message,
        profile:{customFacts:productFacts}
      })
    });
    assert.equal(response.status,200);
    return response.json();
  };
  try{
    const en=await ask('What do you sell?');
    assert.equal(en.handoff,false,JSON.stringify(en));
    assert.match(en.answer,/^Our selection includes, for example,/);
    assert.doesNotMatch(en.answer,/Valikoimassamme|I vårt sortiment/);

    const sv=await ask('Vad säljer ni?');
    assert.equal(sv.handoff,false,JSON.stringify(sv));
    assert.match(sv.answer,/^I vårt sortiment finns till exempel/);
    assert.doesNotMatch(sv.answer,/Valikoimassamme|Our selection includes/);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
