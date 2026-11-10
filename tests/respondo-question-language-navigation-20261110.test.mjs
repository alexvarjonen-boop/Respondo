import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCustomerQuestionLanguage } from '../question-language.mjs';
import { respondoSiteNavigationActions, respondoCheckoutAction, respondoSiteNavigationAnswer } from '../respondo-site-navigation.mjs';

const ORIGIN='https://respondoai.fi';

test('Finnish question from English page opens Finnish site content',()=>{
  const question='Miten se upotetaan omalle verkkosivulle?';
  const answerLanguage=detectCustomerQuestionLanguage(question,'en');
  assert.equal(answerLanguage,'fi');
  const actions=respondoSiteNavigationActions(question,answerLanguage,'',ORIGIN);
  const guide=actions.find(action=>action.type==='site_product');
  assert.ok(guide,'installation question must link to the product explanation');
  const destination=new URL(guide.url);
  assert.equal(destination.pathname,'/asiakaspalvelubotti');
  assert.equal(destination.searchParams.get('lang'),'fi','English UI preference must not override Finnish question');
  assert.equal(guide.label,'Näin Respondo toimii');
});

test('Finnish, Swedish and English assistant actions preserve the selected response language',()=>{
  for(const lang of ['fi','sv','en']){
    for(const query of ['Miten Respondo toimii?','Paljonko Respondo maksaa?']){
      const actions=respondoSiteNavigationActions(query,lang,'',ORIGIN);
      assert.ok(actions.length>0);
      for(const action of actions){
        const url=new URL(action.url);
        assert.equal(url.origin,ORIGIN);
        assert.equal(url.searchParams.get('lang'),lang);
      }
    }
    const checkout=respondoCheckoutAction('Haluan tilata Respondon',lang,'',ORIGIN);
    assert.ok(checkout);
    assert.equal(new URL(checkout.url).searchParams.get('lang'),lang);
    const signup=respondoSiteNavigationAnswer('Luo tili',lang,ORIGIN);
    assert.ok(signup);
    for(const action of signup.actions)assert.equal(new URL(action.url).searchParams.get('lang'),lang);
  }
});

test('Feature page link targets remain language-specific',()=>{
  for(const [lang,path] of [['fi','/ominaisuudet'],['sv','/funktioner'],['en','/features']]){
    const actions=respondoSiteNavigationActions('ominaisuudet',lang,'',ORIGIN);
    const features=actions.find(action=>action.type==='site_features');
    assert.ok(features);
    assert.equal(new URL(features.url).pathname,path);
    assert.equal(new URL(features.url).searchParams.get('lang'),lang);
  }
});
