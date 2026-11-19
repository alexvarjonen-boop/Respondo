import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(filename)=>readFileSync(new URL('../'+filename,import.meta.url),'utf8');
const html=read('public/index.html');
const effects=read('public/effects.js');
const server=read('server.mjs');

test('feature overview keeps its verified page button without repeating the raw URL',()=>{
  const begin=server.indexOf('function respondoProductFaqMatch(');
  const end=server.indexOf('\nfunction ',begin+10);
  assert.ok(begin>=0&&end>begin);
  const faq=server.slice(begin,end);
  assert.match(faq,/id:'respondo-faq-features-overview'/);
  assert.doesNotMatch(faq,/https:\/\/respondoai\.fi\/(?:ominaisuudet|funktioner|features)/);
  assert.match(effects,/Array\.isArray\(data\.actions\)/);
  assert.match(effects,/let displayedAnswer = answer/);
  assert.match(effects,/used\.has\(destination\.pathname\)/);
  assert.match(effects,/typing\.firstChild\.nodeValue = displayedAnswer/);
  assert.match(html,/effects\.js\?v=[^"]+-logo-sound-cleanlinks-v2/);
});
