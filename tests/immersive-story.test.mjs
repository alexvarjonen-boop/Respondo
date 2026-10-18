import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL('../public/'+path,import.meta.url),'utf8');

test('storyboard assets are loaded after existing branded motion',async()=>{
  const [html,js,css] = await Promise.all([source('index.html'),source('immersive-story.js'),source('immersive-story.css')]);
  assert.match(html,/immersive-story\.css\?v=20261018-storyboard-v3/);
  assert.match(html,/immersive-story\.js\?v=20261018-storyboard-v3/);
  assert.ok(html.indexOf('cinematic-navigation.js')<html.indexOf('immersive-story.js'));
  assert.ok(html.indexOf('cinematic-navigation.css')<html.indexOf('immersive-story.css'));
  assert.doesNotThrow(()=>new Function(js));
  assert.match(css,/cx3-story-stage/);
  assert.match(css,/cx3-orbit-world/);
  assert.match(css,/cx3-current/);
});

test('feature categories are preserved as interactive details, with a sticky visual story deck',async()=>{
  const [js,css,app] = await Promise.all([source('immersive-story.js'),source('immersive-story.css'),source('app.js')]);
  assert.match(js,/qa\(':scope > details\.feature-category',catalog\)/);
  assert.match(js,/wrapper\.appendChild\(catalog\)/);
  assert.match(js,/q\('summary h2',entry\)/);
  assert.match(js,/q\('summary p',entry\)/);
  assert.match(js,/q\('\.feature-category-meta strong',entry\)/);
  assert.match(js,/stage\.setAttribute\('data-cx3-active'/);
  assert.match(js,/stage\.classList\.remove\('cx3-stage-switch'\)/);
  assert.match(js,/scrollY/);
  assert.match(js,/--cx3-spin/);
  assert.match(css,/position:sticky!important/);
  assert.match(css,/\.features-page main\{overflow:clip!important\}/);
  assert.match(css,/@media\(max-width:780px\)/);
  assert.match(app,/<details class="feature-category"/);
  assert.match(app,/<div class="feature-category-body"/);
});

test('other brand film effects use scroll not autoplay, preserve legal and checkout scope',async()=>{
  const [js,css] = await Promise.all([source('immersive-story.js'),source('immersive-story.css')]);
  assert.match(js,/addEventListener\('scroll',scheduleScroll,\{passive:true\}\)/);
  assert.match(js,/requestAnimationFrame\(scrollUpdate\)/);
  assert.match(js,/\.apple-home-page/);
  assert.match(js,/\.audience-section/);
  assert.match(js,/\.pricing-section/);
  assert.match(js,/\.seo-landing-section/);
  assert.match(js,/\.global-guide-main/);
  assert.doesNotMatch(js,/\.legalpage|\.dashboard-page|\.signup-page|\.appshell|\.footer/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/#app \.footer[\s,{]/);
  assert.doesNotMatch(css,/animation:\s*infinite/);
});
