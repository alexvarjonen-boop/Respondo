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
    assert.match(en.answer,/^We sell golf equipment, including:/);
    assert.doesNotMatch(en.answer,/Valikoimassamme|I vårt sortiment|Tuote:|Tuoteryhmä:/);

    const sv=await ask('Vad säljer ni?');
    assert.equal(sv.handoff,false,JSON.stringify(sv));
    assert.match(sv.answer,/^Vi säljer golfutrustning, bland annat:/);
    assert.doesNotMatch(sv.answer,/Valikoimassamme|Our selection includes|Tuote:|Tuoteryhmä:/);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});


test('public Try Bot warranty answers stay in the question language without paid/free translation',async()=>{
  const {app}=await import('../server.mjs');
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const endpoint='http://127.0.0.1:'+server.address().port+'/api/public/demo-chat';
  const facts=[{
    key:'JAG putters warranty',
    category:'Takuu',
    answer:'JAG putters comes with a 3 month warranty against defects in materials and workmanship.',
    sourceType:'website',
    sourceUrl:'https://jagputters.fi/pages/warranty',
  }];
  try {
    for(const [lang,message,expected,foreign] of [
      ['fi','Onko näissä takuu?',/3 kuukautta.*materiaali- ja valmistusvirheet/i,/3 month warranty|workmanship/i],
      ['fi','Kuinka pitkä takuu puttereilla on?',/3 kuukautta/i,/3 month warranty/i],
      ['sv','Har puttrarna garanti?',/3 månader.*material- och tillverkningsfel/i,/3 month warranty/i],
      ['en','Do these putters have a warranty?',/3 months.*materials and workmanship/i,/kuukautta|tillverkningsfel/i],
    ]) {
      const response=await fetch(endpoint,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({
          lang,publicDemo:true,message,
          profile:{companyName:'JAG Putters',customFacts:facts},
        }),
      });
      assert.equal(response.status,200,message);
      const body=await response.json();
      assert.equal(body.handoff,false,JSON.stringify(body));
      assert.equal(body.intent,'Takuu',JSON.stringify(body));
      assert.match(body.answer,expected,message+': '+body.answer);
      assert.doesNotMatch(body.answer,foreign,message+': '+body.answer);
    }
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
