import test from 'node:test';
import assert from 'node:assert/strict';
import {app, detectConversationLanguage} from '../server.mjs';

test('short FI/SV/EN questions override the page language when identifiable',()=>{
  const cases=[
    ['har putterna garanti','fi','sv'],
    ['Har putterna garanti?','en','sv'],
    ['finns det garanti på puttern','fi','sv'],
    ['hur länge gäller garantin','fi','sv'],
    ['vad kostar den','fi','sv'],
    ['har ni öppet','en','sv'],
    ['onko puttereilla takuuta','sv','fi'],
    ['paljonko tämä maksaa','en','fi'],
    ['do the putters have a warranty','fi','en'],
    ['how long does the warranty last','sv','en'],
    ['garanti','fi','fi'],
    ['garanti','sv','sv'],
  ];
  for(const [question,hint,expected] of cases) {
    assert.equal(detectConversationLanguage(question,hint),expected,
      JSON.stringify({question,hint,expected}));
  }
});

test('public demo answers a Swedish putter warranty question in Swedish on a Finnish page',async(t)=>{
  const nativeFetch=globalThis.fetch;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    const parsed=new URL(url);
    if(parsed.hostname==='translate.googleapis.com') {
      const target=parsed.searchParams.get('tl');
      if(target==='sv') {
        return new Response(JSON.stringify([[['Ja. Puttrarna har 3 månaders garanti mot material- och tillverkningsfel.']]]),{status:200});
      }
      return new Response(JSON.stringify([[[parsed.searchParams.get('q')||'']]]),{status:200});
    }
    return nativeFetch(url,options);
  });
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/public/demo-chat',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        lang:'fi',
        message:'har putterna garanti',
        publicDemo:true,
        profile:{customFacts:[{
          key:'Putterien takuu',
          category:'Takuu',
          answer:'Puttereilla on 3 kuukauden takuu. Se kattaa materiaali- ja valmistusvirheet.',
          sourceType:'website',
          sourceUrl:'https://shop.example/pages/warranty'
        }]}
      })
    });
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.handoff,false,JSON.stringify(result));
    // A verified policy may be answered directly or translated from Finnish.
    // Both routes must remain Swedish and preserve the documented duration.
    assert.match(result.answer,/garanti(?:n)?/i);
    assert.match(result.answer,/3\s*månader(?:s)?/i);
    assert.doesNotMatch(result.answer,/Puttereilla on|Tuotetiedoissa ilmoitettu takuu|3 kuukauden takuu/);
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
