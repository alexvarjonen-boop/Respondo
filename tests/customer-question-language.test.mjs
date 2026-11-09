import test from 'node:test';
import assert from 'node:assert/strict';
import {detectCustomerQuestionLanguage} from '../question-language.mjs';

test('FI/SV/EN customer text overrides the website locale, including informal and mistyped questions',()=>{
  const cases=[
    ['Onko teillä ajanvaraus?', 'en','fi'],
    ['Paljoks tää maksaa?', 'sv','fi'],
    ['Kauanko toimitus kestää?', 'en','fi'],
    ['Onks huomenna auki?', 'sv','fi'],
    ['Kiitti avusta', 'en','fi'],
    ['Vad kostar den?', 'fi','sv'],
    ['Hur länge gäller garantin?', 'en','sv'],
    ['Har ni öppet?', 'en','sv'],
    ['Finns det garanti på puttern?', 'fi','sv'],
    ['När kan jag boka?', 'fi','sv'],
    ['Tack för hjälpen', 'fi','sv'],
    ['How much is it?', 'fi','en'],
    ['Can I book an appointment?', 'sv','en'],
    ['What does shipping cost?', 'fi','en'],
    ['How long des delivery take?', 'sv','en'],
    ['Thanks for your help', 'sv','en'],
    ['Wht is the price?', 'fi','en'],
    ['har putterna garanti', 'fi','sv'],
    ['onko puttereilla takuuta', 'sv','fi'],
  ];
  for(const [question,page,expected] of cases){
    assert.equal(detectCustomerQuestionLanguage(question,page),expected,
      JSON.stringify({question,page,expected}));
  }
});

test('neutral replies follow the last identifiable customer language, not the original page locale',()=>{
  const cases=[
    ['ok','fi',[{question:'How much does delivery cost?'}],'en'],
    ['ja','en',[{question:'Vad kostar leveransen?'}],'sv'],
    ['OK','sv',[{question:'Onko teillä auki huomenna?'}],'fi'],
    ['garanti','fi',[{question:'Har ni öppet?'},{question:'How long is the warranty?'}],'en'],
    ['ok','en',[{question:'Vad kostar det?'},{question:'Paljonko se maksaa?'}],'fi'],
    ['ok','fi',[{answer:'How much does it cost?'}],'fi'],
    ['ok','sv',[],'sv'],
    ['garanti','fi',[],'fi'],
    ['garanti','sv',[],'sv'],
    ['ja','fi',[],'fi'],
    ['ja','sv',[],'sv'],
  ];
  for(const [question,page,history,expected] of cases){
    assert.equal(detectCustomerQuestionLanguage(question,page,history),expected,
      JSON.stringify({question,page,history,expected}));
  }
});

test('explicit code switching wins over history; opaque references do not force language changes',()=>{
  const history=[{question:'Vad kostar tjänsten?'},{question:'How much is delivery?'}];
  assert.equal(detectCustomerQuestionLanguage('Paljonko tämä maksaa?','en',history),'fi');
  assert.equal(detectCustomerQuestionLanguage('Hur mycket kostar det?','en',history),'sv');
  assert.equal(detectCustomerQuestionLanguage('What about the price?','fi',[{question:'Vad kostar det?'}]),'en');
  assert.equal(detectCustomerQuestionLanguage('ABC-900','fi',[{question:'Har ni öppet?'}]),'sv');
  assert.equal(detectCustomerQuestionLanguage('https://example.com/shipping','sv',[]),'sv');
});

test('Try Bot answers catalog questions in the actual question language across page locale switches',async()=>{
  const {app}=await import('../server.mjs');
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const endpoint='http://127.0.0.1:'+server.address().port+'/api/public/demo-chat';
  const facts=[{
    key:'Sample store product',category:'Tuotteet',
    answer:'Tuote: Sample Bag. Tuoteryhmä: Bags. Hinta: 35 EUR. Linkki: https://shop.example/products/sample-bag.',
    sourceType:'website',sourceUrl:'https://shop.example/products/sample-bag'
  }];
  try {
    for(const [page,question,expected,wrong] of [
      ['en','Vad säljer ni?',/^I vårt sortiment finns bland annat:/,/^Our selection|^Valikoimassamme/],
      ['sv','What do you sell?',/^Our selection includes, for example:/,/^I vårt sortiment|^Valikoimassamme/],
      ['en','Mitä myytte?',/^Valikoimastamme/,/^I vårt sortiment|^Our selection/],
    ]){
      const response=await fetch(endpoint,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({lang:page,message:question,profile:{customFacts:facts}})
      });
      assert.equal(response.status,200,question);
      const body=await response.json();
      assert.equal(body.handoff,false,question+' '+JSON.stringify(body));
      assert.match(body.answer,expected,question);
      assert.doesNotMatch(body.answer,wrong,question);
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});
