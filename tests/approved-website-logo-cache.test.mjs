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

test('website logo is the approved arrow in desktop and mobile branding',()=>{
  assert.ok(app.includes('<img src="'+approved+'"'));
  assert.ok(menu.includes('src="'+approved+'"'));
  assert.ok(effects.includes('src="'+approved+'"'));
  assert.ok(html.includes('rel="icon" type="image/png" href="'+approved+'?v='+version+'"'));
  assert.ok(html.includes('rel="apple-touch-icon" sizes="180x180" href="'+approved+'?v='+version+'"'));
  assert.ok(!app.includes('/favicon.svg?v=20261008-ra-logo-v1'));
  assert.ok(!menu.includes('/favicon.svg?v=20261008-ra-logo-v1'));
});

test('HTML and imported navigation have fresh cache keys for desktop branding',()=>{
  const sources=Array.from(html.matchAll(/src="([^"]+)"/g),m=>m[1]);
  assert.ok(sources.some(src=>src.startsWith('/app.js?v=')&&src.includes(version)));
  assert.ok(sources.some(src=>src.startsWith('/effects.js?v=')&&src.includes(version)));
  assert.ok(app.includes('./apple-nav.js?v='+version));
  assert.ok(server.includes("res.setHeader('Cache-Control','no-store')"));
  assert.ok(server.includes("filePath.endsWith('apple-nav.js')"));
});
