import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  experienceLocale,experienceCopy,experienceRecommendations,mountRespondoExperience
} from '../public/respondo-experience.mjs';

const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const javascript=read('respondo-experience.mjs');
const css=read('respondo-experience.css');
const index=read('index.html');
const legacy=read('effects.js');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('FI/SV/EN immersive journey copy and all three plan names are available',()=>{
  for(const language of ['fi','sv','en']){
    assert.equal(experienceLocale(language),language);
    const c=experienceCopy(language);
    for(const key of [
      'eyebrow','hello','intro','home','discover','fit','pricing','ask','try','begin',
      'services','ecommerce','bookings','goalQuestion','answerGoal','leadGoal','bookingGoal',
      'resultNote','planTrial','select','close','live','visualHome','fromChat'
    ])assert.ok(typeof c[key]==='string'&&c[key].trim().length>0,language+' '+key);
    assert.equal(c.phases.length,3);
    assert.equal(c.phaseCopy.length,3);
    assert.equal(c.planDescriptions.length,3);
    assert.deepEqual(c.plans,['Advanced','Premium','Enterprise']);
  }
  assert.equal(experienceLocale('de'),'en');
  assert.equal(experienceLocale(''),'en');
});

test('two-stage business intent choices produce bounded, localized illustrative outcomes',()=>{
  const expected=[
    ['services','answers','Palveluyritys','Nopeat vastaukset'],
    ['ecommerce','leads','Verkkokauppa','Yhteydenotot'],
    ['bookings','bookings','Ajanvarausyritys','Varauspyynnöt']
  ];
  for(const [business,goal,categoryText,goalText] of expected){
    const result=experienceRecommendations(business,goal,'fi');
    assert.deepEqual({categoryText:result.categoryText,goalText:result.goalText},{categoryText,goalText});
    assert.equal(result.category,business);
    assert.equal(result.priority,goal);
  }
  assert.equal(experienceRecommendations('weird','unknown').category,'services');
  assert.equal(experienceRecommendations('weird','unknown').priority,'answers');
  assert.equal(experienceRecommendations('services','answers','sv').goalText,'Snabba svar');
  assert.equal(experienceRecommendations('ecommerce','leads','en').categoryText,'Online store');
});

test('experience is real separate interactive surface, with progressive choice, plans and existing AI conversation',()=>{
  assert.match(javascript,/function drawHome\(\)/);
  assert.match(javascript,/function drawDiscover\(\)/);
  assert.match(javascript,/function drawFit\(\)/);
  assert.match(javascript,/function drawPricing\(\)/);
  assert.match(javascript,/function renderOptions\(options,callback\)/);
  assert.match(javascript,/state\.journeyStep=1;drawFit\(\)/);
  assert.match(javascript,/state\.journeyStep=2;drawFit\(\)/);
  assert.match(javascript,/const result=experienceRecommendations\(state\.business,state\.goal,lang\)/);
  assert.match(javascript,/box\.insertBefore\(stage,messages\)/);
  assert.match(javascript,/form\.addEventListener\('submit',focusChat,true\)/);
  assert.match(javascript,/form\.requestSubmit\(\)/);
  assert.match(javascript,/function showStage\(\)/);
  assert.match(javascript,/const PLANS=\[/);
  assert.match(javascript,/name:'Advanced',price:49,plan:'basic_monthly'/);
  assert.match(javascript,/name:'Premium',price:129,plan:'advanced_monthly'/);
  assert.match(javascript,/name:'Enterprise',price:149,plan:'business_monthly'/);
  assert.match(javascript,/\/tilaus\?plan=/);
  assert.match(javascript,/linkTo\('\/assistant',lang\)/);
});

test('existing first-party chatbot and secure navigation stay intact; no invented booking or payment actions',()=>{
  assert.match(legacy,/\/api\/public\/respondo-assistant\/chat/);
  assert.match(legacy,/siteAssistantHistory\.slice\(-6\)/);
  assert.match(legacy,/const allowedPaths = new Set/);
  assert.match(legacy,/if \(!allowedPaths\.has\(destination\.pathname\)\) continue/);
  assert.match(legacy,/form\.addEventListener\('submit'/);
  assert.match(javascript,/form\.addEventListener\('submit',focusChat,true\)/);
  assert.match(javascript,/const input=form\.querySelector\('input\[name="message"\]'\)/);
  assert.doesNotMatch(javascript,/fetch\(|POST|DELETE|location\.assign\(|localStorage\.setItem\(/);
  assert.match(javascript,/Actual answers and actions always depend on your company/);
});

test('no disruption to separate live tenant widgets, checkout or public Try Bot',()=>{
  assert.equal(mountRespondoExperience(null),false);
  assert.equal(mountRespondoExperience({body:null}),false);
  assert.equal(mountRespondoExperience({
    body:{classList:{contains:()=>false}},
    location:{pathname:'/assistant'}
  }),false);
  for(const path of ['/app','/demo']){
    assert.equal(mountRespondoExperience({
      body:{classList:{contains:()=>false}},location:{pathname:path}
    }),false);
  }
  assert.match(javascript,/querySelector\('#respondo-site-chat\.fx-firstparty-smart'\)/);
  assert.match(javascript,/body\.classList\.contains\('assistant-standalone'\)/);
  assert.match(javascript,/documentRef\.querySelector\('#respondo-site-chat\.fx-firstparty-smart'\)/);
  assert.ok(!javascript.includes('widget.js'));
  assert.match(legacy,/if\(!standAlone\(\) && !box\.classList\.contains\('rx-experience-ready'\)\)/);
});

test('cinematic full viewport has mobile layout, focus trap and reduced motion',()=>{
  assert.match(css,/body\.rx-experience-open\{overflow:hidden!important\}/);
  assert.match(css,/\.rx-experience-backdrop\{/);
  assert.match(css,/z-index:10008!important/);
  assert.match(css,/width:min\(1130px,calc\(100vw - 60px\)\)!important/);
  assert.match(css,/@media\(max-width:610px\)/);
  assert.match(css,/height:100dvh!important/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.rx-orbit-core/);
  assert.match(css,/\.rx-orbit-ring/);
  assert.match(javascript,/event\.key!=='Tab'/);
  assert.match(javascript,/isOpen\?'dialog':'region'/);
  assert.match(javascript,/box\.setAttribute\('aria-modal','true'\)/);
  assert.match(javascript,/backdrop\.addEventListener\('click',\(\)=>close\.click\(\)\)/);
  assert.match(javascript,/box\.querySelector\('\.rx-tab\[aria-selected="true"\]'\)/);
});

test('new files are cache-busted while legacy SEO, language flags and existing assets remain present',()=>{
  assert.match(index,/\/respondo-experience\.css\?v=20261109-immersive-stage-v1/);
  assert.match(index,/\/respondo-experience\.mjs\?v=20261109-immersive-stage-v1/);
  assert.match(index,/\/effects\.css\?v=20261109-firstparty-smart-assist-v1/);
  assert.match(index,/\/effects\.js\?v=/);
  assert.match(index,/\/app\.js\?v=/);
  assert.match(pkg.scripts.check,/node --check public\/respondo-experience\.mjs/);
});
