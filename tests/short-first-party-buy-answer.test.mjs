import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRespondoFaqRows} from '../respondo-faq.mjs';
import {respondoProductFaqMatch} from '../server.mjs';

test('owner purchase FAQ seed never directs customers to removed Try for free button',()=>{
  const rows=buildRespondoFaqRows({siteUrl:'https://respondoai.fi',supportEmail:'info@respondoai.fi'});
  for(const lang of ['fi','sv','en']){
    const row=rows.find(x=>x.lang===lang && /Miten aloitan tilauksen|Hur startar jag ett abonnemang|How do I start a subscription/.test(x.title));
    assert.ok(row,lang);
    assert.ok(row.answer.includes('/tilaus'),lang);
    assert.doesNotMatch(row.answer,/Kokeile ilmaiseksi|Prova gratis|Try for free/i);
  }
});

test('first-party demo answers the screenshot buy question without a full catalogue, VAT or trial dump',()=>{
  const sample=respondoProductFaqMatch('Miten tän voi ostaa','fi',[]);
  assert.equal(sample?.id,'respondo-faq-buy');
  assert.ok(sample.answer.length<210);
  assert.match(sample.answer,/respondoai.fi\/tilaus/);
  assert.doesNotMatch(sample.answer,/3 päivän|vuositilaukset:|arvonlisäveroa ei peritä/i);
});

test('trial and annual details remain available when explicitly requested',()=>{
  assert.equal(respondoProductFaqMatch('Onko ilmainen kokeilu?','fi')?.id,'respondo-faq-trial');
  assert.equal(respondoProductFaqMatch('Mitä vuositilaus maksaa?','fi')?.id,'respondo-faq-annual-pricing');
});
