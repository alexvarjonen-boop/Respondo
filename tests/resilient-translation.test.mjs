import test from 'node:test';
import assert from 'node:assert/strict';
import {createResilientTranslationClient} from '../resilient-translation.mjs';

test('repeated simultaneous translation is fetched only once and then cached',async()=>{
  let calls=0;
  const translate=createResilientTranslationClient({fetcher:async()=>{
    calls++;
    return new Response(JSON.stringify([[['Hej från Respondo']]]),{status:200});
  }});
  assert.deepEqual(await Promise.all([
    translate('Hei Respondolta','sv','fi'),translate('Hei Respondolta','sv','fi')
  ]),['Hej från Respondo','Hej från Respondo']);
  assert.equal(await translate('Hei Respondolta','sv','fi'),'Hej från Respondo');
  assert.equal(calls,1);
});

test('429 provider outage fails safely and pauses new outbound requests until cooldown',async()=>{
  let now=1000,calls=0;
  const translate=createResilientTranslationClient({clock:()=>now,cooldownMs:30000,fetcher:async()=>{
    calls++;
    if(calls===1)return new Response('',{status:429});
    return new Response(JSON.stringify([[['Open']]]),{status:200});
  }});
  assert.equal(await translate('Auki','en','fi'),'');
  assert.equal(await translate('Hinnat','en','fi'),'');
  assert.equal(calls,1);
  now=31001;
  assert.equal(await translate('Auki','en','fi'),'Open');
  assert.equal(calls,2);
});

test('translation never rewrites source-language text and rejects empty provider payloads',async()=>{
  let calls=0;
  const translate=createResilientTranslationClient({fetcher:async()=>{
    calls++;return new Response('{}',{status:200});
  }});
  assert.equal(await translate('Pidä hinta 49 €','fi','fi'),'Pidä hinta 49 €');
  assert.equal(await translate('Hej','en','sv'),'');
  assert.equal(calls,1);
});
