import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appleHomeMarkup } from '../public/apple-home.js';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/apple-home.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

for (const [lang,index] of [['fi',0],['sv',1],['en',2]]) {
  test('homepage hero CTA destinations and language are correct for '+lang,()=>{
    const t=(...v)=>v[index];
    const home=appleHomeMarkup(t,lang,145);
    assert.match(home,new RegExp('data-respondo-hero-cta="signup" href="/tilaus\\?lang='+lang+'"'));
    assert.match(home,new RegExp('data-respondo-hero-cta="demo" href="/assistant\\?lang='+lang+'"'));
  });
}
test('CTA links sit above noninteractive decorations and retain pointer input',()=>{
  assert.match(css,/\\.apple-home-page \\.apple-hero-actions\\{position:relative!important;z-index:30!important/);
  assert.match(css,/pointer-events:auto!important/);
  assert.match(css,/\\.apple-stage-typography\\)\\{pointer-events:none!important/);
});
test('hero CTA navigation keeps regular clicks working and modified clicks native',()=>{
  const source=app.slice(app.indexOf('function bindHomeHeroActions()'),app.indexOf('function bindHomeScrollTrial()'));
  assert.ok(source.includes("window.location.assign(destination.href)"));
  assert.ok(source.includes("event.metaKey || event.ctrlKey"));
  assert.ok(app.includes("bindHomeHeroActions();"));
  assert.match(html,/app\\.js\\?v=[^"]+hero-cta-v1/);
});
