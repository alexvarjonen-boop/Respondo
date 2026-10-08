import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const styles=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const home=readFileSync(new URL('../public/apple-home.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('desktop gradient does not affect the sticky homepage CTA',()=>{
  assert.ok(styles.includes('.nav .navactions .btn.ink:not(.nav-home-scroll-trial){'));
  assert.ok(home.includes('a.btn.ink.nav-home-scroll-trial.is-visible{'));
  assert.ok(home.includes('background:#0071e3!important;'));
  assert.ok(home.includes('background-image:none!important;'));
  assert.ok(index.includes('header-blue-v1'));
});
test('dark final feature card and footer brand have readable text',()=>{
  assert.ok(styles.includes('.features-page .features-final-card h2'));
  assert.ok(styles.includes('.features-page .features-final-card small,'));
  assert.ok(styles.includes('.features-page .features-final-card p{'));
  assert.ok(styles.includes('.features-page .footer .brand-word{'));
  assert.ok(styles.includes('-webkit-text-fill-color:#fff!important'));
});
