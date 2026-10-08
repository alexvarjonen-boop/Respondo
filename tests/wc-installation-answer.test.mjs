import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGroundedAnswer} from '../server.mjs';

const asService=(id,title,answer)=>({
  id, category:'Palvelut', title, answer,
  source_type:'website', source_url:'https://putkifirma.example/palvelut',
});

test('WC installation synonyms and short question forms use verified service facts in Finnish',async()=>{
  const rows=[asService('wc-1','WC-istuimen asennus','Asennamme WC-istuimia ja vaihdamme vanhat pöntöt uusiin.')];
  for(const message of [
    'Asennatteko wc', 'Asennatteko WC?', 'Voitteko asentaa WC-istuimen?',
    'Asennatteko vessanpönttöjä?',
  ]){
    const result=await generateGroundedAnswer({rows,message,lang:'fi'});
    assert.equal(result.handoff,false,message+': '+JSON.stringify(result));
    assert.match(result.answer,/asennamme WC-istuimia/i,message);
    assert.deepEqual(result.sourceIds,['wc-1'],message);
  }
});

test('WC installation is understood in English and Swedish even from Finnish facts',async()=>{
  const rows=[asService('wc-1','WC-istuimen asennus','Asennamme WC-istuimia.')];
  for(const [message,lang,expected] of [
    ['Do you install toilets?','en',/Yes, we install toilets/],
    ['Can you install a WC?','en',/Yes, we install toilets/],
    ['Installerar ni toaletter?','sv',/Ja, vi installerar toaletter/],
    ['Kan ni montera en WC?','sv',/Ja, vi installerar toaletter/],
  ]){
    const result=await generateGroundedAnswer({rows,message,lang});
    assert.equal(result.handoff,false,message+': '+JSON.stringify(result));
    assert.match(result.answer,expected,message);
    assert.deepEqual(result.sourceIds,['wc-1']);
  }
});

test('WC-related building work never proves WC fixture installation',async()=>{
  const rows=[
    asService('bathroom','Kylpyhuoneremontit','Teemme WC-tilojen remontteja.'),
    asService('other','Asennuspalvelut','WC-tiloihin hanojen asennus ja kalusteiden huolto.'),
  ];
  for(const message of ['Asennatteko wc','Voitteko asentaa WC-istuimen?','Do you install toilets?']){
    const lang=message.startsWith('Do')?'en':'fi';
    const result=await generateGroundedAnswer({rows,message,lang});
    assert.equal(result.handoff,true,message+': '+JSON.stringify(result));
    assert.deepEqual(result.sourceIds,[]);
  }
});

test('explicit refusal overrides a service heading and missing service facts hand off',async()=>{
  for(const rows of [
    [asService('not-offered','WC-istuimen asennus','Emme asenna WC-istuimia.')],
    [asService('not-offered-en','Toilet installation',"We don't install toilets.")],
    [],
  ]){
    for(const [message,lang] of [['Asennatteko wc?','fi'],['Do you install toilets?','en']]){
      const result=await generateGroundedAnswer({rows,message,lang});
      assert.equal(result.handoff,true,message+': '+JSON.stringify(result));
      assert.deepEqual(result.sourceIds,[]);
    }
  }
});
