import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runFreeQualitySuite,evaluateFreeQualityScenario} from '../respondo-free-quality-gates.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('widget restores only bounded same-visitor same-tab conversations',()=>{
  const code=read('public/widget.js');
  assert.match(code,/SESSION_HISTORY_KEY/);
  assert.match(code,/encodeURIComponent\(serviceOrigin\)/);
  assert.match(code,/encodeURIComponent\(company\)/);
  assert.match(code,/saved\.visitorRef!==visitorRef/);
  assert.match(code,/saved\.savedAt>Date\.now\(\)\+60000/);
  assert.match(code,/SESSION_HISTORY_TTL_MS/);
  assert.match(code,/sessionTranscript=sessionTranscript\.slice\(-12\)/);
  assert.match(code,/restoreSessionTranscript\(\)/);
  assert.match(code,/rememberSessionMessage\(shownAnswer,'bot'\)/);
  assert.doesNotMatch(code,/localStorage\.setItem\(SESSION_HISTORY_KEY/);
});

test('critical website assets are checked during production smoke',()=>{
  const code=read('scripts/production-smoke.mjs');
  for(const path of ['/widget.js','/instant-website-demo-ui.js',
    '/integration-onboarding.js','/respondo-symbol.svg']) assert.ok(code.includes(path));
  assert.match(code,/checkedAssets:\s*4/);
});

test('FI, SV, EN tentative appointments are not silently presented as confirmed availability',()=>{
  for(const [language,answer] of [
    ['fi','Kello 15 on vapaana.'],
    ['sv','Kl. 15 är ledig.'],
    ['en','3 PM is available.']
  ]){
    const question=language==='fi'?'Onko aikaa?':language==='sv'?'Finns det tid?':'Is there a slot?';
    const without=evaluateFreeQualityScenario({language,question,answer});
    assert.ok(without.flags.some(f=>f.code==='unverified_availability'));
    const withProof=evaluateFreeQualityScenario({language,question,answer,
      proof:{availabilityVerified:true}});
    assert.ok(!withProof.flags.some(f=>f.code==='unverified_availability'));
    assert.equal(withProof.factualCorrectnessProven,false);
  }
});

test('100 context-specific free answer regressions run without paid API calls',()=>{
  const safePhrases=[
    ['fi','Tarkistamme saatavuuden työn keston perusteella.'],
    ['sv','Vi kontrollerar lediga tider efter att ha bekräftat arbetets längd.'],
    ['en','We will check the calendar after confirming the job duration.']
  ];
  const cases=Array.from({length:100},(_,i)=>{
    const [language,answer]=safePhrases[i%3];
    const unsafe=i%10===9;
    return {
      language,
      question:'Customer appointment inquiry '+String(i+1),
      answer:unsafe
        ? language==='fi'?'Klo 15 on vapaana.'
          :language==='sv'?'Kl. 15 är ledig.':'3 PM is available.'
        :answer
    };
  });
  const result=runFreeQualitySuite({cases});
  assert.equal(result.total,100);
  assert.equal(result.flagged,10);
  assert.equal(result.high,10);
  assert.equal(result.critical,0);
  assert.equal(result.gatePass,false);
  assert.equal(result.paidAiCalls,0);
  assert.equal(result.providerCalls,0);
  assert.equal(result.notFullAccuracyValidation,true);
});
