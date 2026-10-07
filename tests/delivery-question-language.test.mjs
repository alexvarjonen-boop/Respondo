import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../server.mjs';

test('English delivery questions override Finnish page language, including the screenshot typo',async(t)=>{
  const english='Domestic orders arrive in 3–5 business days.';
  const nativeFetch=globalThis.fetch;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    const parsed=new URL(url);
    if(parsed.hostname==='translate.googleapis.com') {
      const answer=parsed.searchParams.get('tl')==='en'?english:'Kuinka kauan toimitus kestää?';
      return new Response(JSON.stringify([[[answer]]]),{status:200});
    }
    return nativeFetch(url,options);
  });
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {
    for(const message of ['how long des delivery take','how long does delivery take','how long?','delivery time?']) {
      const response=await fetch(`http://127.0.0.1:${server.address().port}/api/public/demo-chat`,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({lang:'fi',message,publicDemo:true,profile:{customFacts:[{
          key:'Toimitusaika',category:'Toimitus ja seuranta',answer:'Kotimaiset tilaukset saapuvat 3–5 arkipäivässä.',sourceType:'website',sourceUrl:'https://shop.example/shipping'
        }]}})
      });
      assert.equal(response.status,200);
      const result=await response.json();
      assert.equal(result.handoff,false,JSON.stringify(result));
      assert.equal(result.answer,english,message);
    }
  } finally {await new Promise(resolve=>server.close(resolve));}
});


test('natural multilingual delivery-time paraphrases keep delivery intent and duration',async()=>{
  const { generateGroundedAnswer }=await import('../server.mjs');
  const rows=[{
    id:'delivery',
    category:'Toimitus',
    title:'Toimitusaika',
    answer:'Domestic orders usually arrive within 3-5 business days.',
    keywords:['delivery','toimitus','leverans'],
    source_type:'website',
    source_url:'https://shop.example/shipping',
  }];
  for(const [lang,message] of [
    ['fi','Montako arkipäivää toimitus kestää?'],
    ['fi','Milloin tilaus yleensä saapuu?'],
    ['en','How many business days does delivery take?'],
    ['en','When should an order usually arrive?'],
    ['sv','Hur många arbetsdagar tar leveransen?'],
    ['sv','När brukar en beställning komma fram?'],
  ]){
    const result=await generateGroundedAnswer({companyName:'Shop',rows,message,history:[],lang});
    assert.equal(result.handoff,false,message+' '+JSON.stringify(result));
    assert.equal(result.intent,'Toimitus',message+' '+JSON.stringify(result));
    assert.match(result.answer,/3\s*[-–]\s*5/,message+' '+result.answer);
  }
});
