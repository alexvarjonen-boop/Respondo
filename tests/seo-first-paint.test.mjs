import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('SEO first paint guard hides only temporary server-rendered main while JS boots',()=>{
  const guard=html.indexOf('id="respondo-first-paint-guard"');
  const js=html.indexOf('id="respondo-first-paint-script"');
  const body=html.indexOf('<body>');
  assert.ok(guard>=0&&js>guard&&js<body,'guard must be in the head before initial paint');
  assert.match(html,/html\.respondo-awaiting-client #app > main\{visibility:hidden!important\}/);
  assert.match(html,/document\.documentElement\.classList\.add\('respondo-awaiting-client'\)/);
  assert.match(html,/setTimeout\(\(\)=>document\.documentElement\.classList\.remove\('respondo-awaiting-client'\),8000\)/,'JS loading failure must reveal fallback');
  assert.ok(!html.includes('<noscript><div id="app">'),'do not disable crawlers/non-JS content');
});

test('client hydration and failure restore visibility',()=>{
  const mounted=app.indexOf("$('#app').innerHTML = html;");
  const revealed=app.indexOf("document.documentElement.classList.remove('respondo-awaiting-client');",mounted);
  assert.ok(mounted>=0&&revealed>mounted&&revealed-mounted<4500 && !/\bawait\b/.test(app.slice(mounted,revealed)),'reveal client content synchronously after mounting and setup-service notice');
  const catchBlock=app.slice(app.indexOf('route().catch((error) => {'));
  assert.match(catchBlock,/classList\.remove\('respondo-awaiting-client'\)/);
});
