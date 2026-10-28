import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const server=read('server.mjs');
const css=read('public/workspace-orbit-v28.css');
const html=read('public/index.html');

test('post-onboarding preview uses a legible dark bot bubble, preserving the chosen bot identity',()=>{
  assert.match(css,/respondo-workspace-chat-card #previewChat \.preview-bubble\.bot/);
  assert.match(css,/background:#252a34!important/);
  assert.match(css,/-webkit-text-fill-color:#f0f3f9!important/);
  assert.match(css,/max-width:min\(92%,560px\)/);
  assert.match(css,/white-space:pre-wrap!important/);
  assert.match(css,/respondo-workspace-review-link/);
  assert.match(css,/text-decoration:underline/);
  assert.match(html,/workspace-orbit-v28\.css\?v=20261028-mobile-pinned-v37/);
});
test('buying Respondo gets the current short answer rather than outdated promo or tax claims',()=>{
  const start=server.indexOf('function respondoProductFaqMatch(');
  const end=server.indexOf('\nfunction ',start+20);
  assert.ok(start>=0 && end>start);
  const normalizeSearchText=value=>String(value||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9åäö€+\s-]/g,' ')
    .replace(/\s+/g,' ').trim();
  const fn=vm.runInNewContext(server.slice(start,end)+'\nrespondoProductFaqMatch',{
    normalizeSearchText,
    isRespondoCapabilityQuestion:()=>false,
    broadProductQuestion:()=>false,
  });
  for(const [message,lang] of [['Miten tämän voi ostaa?','fi'],['How can I subscribe to Respondo?','en'],['Hur beställer jag Respondo?','sv']]){
    const result=fn(message,lang,[]);
    assert.equal(result?.id,'respondo-faq-buy',message);
    assert.ok(result.answer.length<280,result.answer.length+' chars');
    assert.ok(result.answer.includes('respondoai.fi/tilaus'));
    assert.doesNotMatch(result.answer,/Kokeile ilmaiseksi|Try for free|Prova gratis|vähäisen liiketoiminnan/i);
  }
});
