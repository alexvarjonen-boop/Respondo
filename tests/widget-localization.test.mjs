import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const widget = await readFile(new URL('../public/widget.js', import.meta.url), 'utf8');

test('widget covers Swedish online state and English 12-hour time formatting', () => {
  assert.match(widget, /'paikalla':'online'/);
  assert.match(widget, /widgetLang === 'en' \? 'en-GB-u-hc-h12'/);
  assert.doesNotMatch(widget, /widgetLang === 'en' \? 'en-GB'\s*:/);
});

test('all t() Finnish keys have a Swedish translation entry', () => {
  const used = [...widget.matchAll(/\bt\(\s*'((?:\\'|[^'])*)'\s*,/g)]
    .map((match) => match[1].replace(/\\'/g,"'"));
  const mapBlock=(widget.match(/const SV_WIDGET = new Map\(Object\.entries\(\{([\s\S]*?)\}\)\);/)||[])[1]||'';
  const extraBlock=(widget.match(/const EXTRA_SV_WIDGET = \{([\s\S]*?)\};/)||[])[1]||'';
  const keys=new Set();
  const keyRe=/"([^"]+)"\s*:|'([^']+)'\s*:/g;
  for(const block of [mapBlock,extraBlock]){
    let match;
    while((match=keyRe.exec(block))) keys.add(match[1]||match[2]);
  }
  const missing=[...new Set(used)].filter((key)=>!keys.has(key));
  assert.deepEqual(missing,[]);
});
