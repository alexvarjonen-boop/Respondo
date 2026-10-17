import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const read = (filename) => readFileSync(new URL('../' + filename, import.meta.url), 'utf8');
const html = read('public/index.html');
const productJS = read('public/cinematic-product-scenes.js');
const productCSS = read('public/cinematic-product-scenes.css');
const storyJS = read('public/cinematic-marketing.js');

test('cinematic assets are loaded in the public page after the original story', () => {
  const oldStyle = html.indexOf('/cinematic-marketing.css?');
  const newStyle = html.indexOf('/cinematic-product-scenes.css?');
  const oldScript = html.indexOf('/cinematic-marketing.js?');
  const newScript = html.indexOf('/cinematic-product-scenes.js?');
  assert.ok(oldStyle >= 0 && newStyle > oldStyle, 'new CSS should override the original cinematic visuals');
  assert.ok(oldScript >= 0 && newScript > oldScript, 'new JS should initialize after the original story');
  assert.equal(html.match(/\/cinematic-product-scenes\.css\?/g)?.length, 1);
  assert.equal(html.match(/\/cinematic-product-scenes\.js\?/g)?.length, 1);
});

test('animated scenes are syntactically valid and use existing scroll stages', () => {
  assert.doesNotThrow(() => new Script(productJS, { filename: 'cinematic-product-scenes.js' }));
  assert.match(storyJS, /cinema-story/);
  assert.match(storyJS, /data-cinema-step/);
  assert.match(productJS, /\.cinema-story/);
  assert.match(productJS, /\.cinema-flow-stage/);
  for (const number of [1, 2, 3]) {
    assert.match(productCSS, new RegExp('data-active-step="' + number + '"'));
    assert.match(productJS, new RegExp('data-scene="' + number + '"'));
  }
  assert.match(productJS, /new MutationObserver/);
});

test('three languages and approved brand asset are present', () => {
  for (const language of ['fi', 'sv', 'en']) {
    assert.match(productJS, new RegExp('\\n    ' + language + ':\\{'));
  }
  assert.match(productJS, /respondo-approved-arrow-20261012\.png/);
  assert.match(productJS, /aria-hidden="true"/);
  assert.match(productCSS, /prefers-reduced-motion:reduce/);
  assert.match(productJS, /prefers-reduced-motion: reduce/);
});

test('illustrative scenes do not call APIs or replace functional chatbot and calculator', () => {
  assert.doesNotMatch(productJS, /\bfetch\s*\(/);
  assert.doesNotMatch(productJS, /\bXMLHttpRequest\b/);
  assert.doesNotMatch(productJS, /innerHTML\s*=\s*['"]?/);
  assert.match(productJS, /\.apple-product-stage/);
  assert.doesNotMatch(productJS, /jobValueSlider|missedSlider|monthlyValue/);
  assert.doesNotMatch(productJS, /\.apple-hero-actions/);
});
