import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('public/index.html');
const app=read('public/app.js');
const menu=read('public/apple-nav.js');
const effects=read('public/effects.js');
const server=read('server.mjs');

const approved='/respondo-approved-arrow-20261012.png';
const version='20261012-approved-arrow-desktop-v2';

test('desktop and mobile header, menu, assistant, and browser icon use approved arrow',()=>{
  assert.ok(app.includes('<img src="'+approved+'"'));
  assert.ok(menu.includes('src="'+approved+'"'));
  assert.ok(effects.includes('src="'+approved+'"'));
  assert.ok(html.includes('rel="icon" type="image/png" href="'+approved+'?v='+version+'"'));
  assert.ok(html.includes('rel="apple-touch-icon" sizes="180x180" href="'+approved+'?v='+version+'"'));
  assert.doesNotMatch(app,/favicon\\.svg\\?v=20261008-ra-logo-v1/);
  assert.doesNotMatch(menu,/favicon\\.svg\\?v=20261008-ra-logo-v1/);
});

test('desktop gets new revision of logo-bearing JS modules instead of a previously cached old-logo revision',()=>{
  assert.match(html,/src="\\/app\\.js\\?v=[^" ]*20261012-approved-arrow-desktop-v2"/);
  assert.match(html,/src="\\/effects\\.js\\?v=[^" ]*20261012-approved-arrow-desktop-v2"/);
  assert.ok(app.includes("./apple-nav.js?v="+version));
  assert.ok(server.includes("res.setHeader('Cache-Control','no-store')"));
  assert.ok(server.includes("filePath.endsWith('apple-nav.js')"));
});
