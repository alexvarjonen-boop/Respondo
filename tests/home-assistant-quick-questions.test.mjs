import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('homepage assistant binds all three quick question buttons',()=>{
  assert.ok(effects.includes("document.querySelectorAll('.fx-quick button').forEach(b => b.addEventListener('click'"));
  assert.ok(!effects.includes("$('.fx-quick button').forEach"));
});

test('homepage loads the cache-busted effects build with the quick question fix',()=>{
  assert.match(index,/effects\.js\?v=20261005-plans-v2/);
});
