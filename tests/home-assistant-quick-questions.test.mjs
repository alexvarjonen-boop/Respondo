import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('homepage assistant binds all three quick question buttons',()=>{
  assert.ok(effects.includes("document.querySelectorAll('.fx-quick button').forEach(b => b.addEventListener('click'"));
  assert.ok(!effects.includes("$('.fx-quick button').forEach"));
});

test('homepage loads the corrected site assistant build and creates it on the homepage',()=>{
  assert.ok(index.includes('/effects.js?v=20261007-restore-oct06-v1'));
  const initStart=effects.indexOf('function init()');
  const initSource=effects.slice(initStart,initStart+1400);
  assert.ok(initSource.includes("if (location.pathname === '/')"));
  assert.ok(initSource.includes('leftSectionRail(); assistant();'));
});
