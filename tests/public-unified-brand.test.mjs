import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = name => readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('public Respondo brand theme is loaded last without touching dashboard or widget',()=>{
 const html=read('index.html'),css=read('respondo-unified-brand.css');
 const pos=html.indexOf('/respondo-unified-brand.css?v=');
 assert.ok(pos>html.indexOf('/chat-first-home.css?v='),'brand theme should override legacy Apple/iOS light styles');
 assert.match(css,/#app \.seo-landing-page \.seo-landing-hero/);
 assert.match(css,/#app \.pricing-page/);
 assert.match(css,/#app \.contact-page/);
 assert.match(css,/#app \.features-page/);
 assert.match(css,/#app \.global-guide-page/);
 assert.match(css,/respondo-hero-arrow\.svg/);
 assert.doesNotMatch(css,/\.appshell|\.dashboard-premium-shell|\.fx-assistant/);
 const arrow=read('respondo-hero-arrow.svg');
 const original=read('respondo-symbol.svg').match(/<path d="([^"]+)"/)?.[1];
 assert.ok(arrow.includes(original),'brand hero arrow must use official arrow geometry');
});
