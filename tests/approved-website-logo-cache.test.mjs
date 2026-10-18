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
  assert.ok(!app.includes('/favicon.svg?v=20261008-ra-logo-v1'));
  assert.ok(!menu.includes('/favicon.svg?v=20261008-ra-logo-v1'));
});


test('Search favicon is a real ICO containing the approved arrow, with stable crawlable URLs',()=>{
  const icon=readFileSync(new URL('../public/favicon.ico',import.meta.url));
  const original=readFileSync(new URL('../public/respondo-approved-arrow-20261012.png',import.meta.url));
  assert.equal(icon.readUInt16LE(0),0); // ICO reserved bytes
  assert.equal(icon.readUInt16LE(2),1); // image type ICO
  assert.equal(icon.readUInt16LE(4),1); // one embedded image
  assert.equal(icon.readUInt32LE(14),original.length);
  assert.equal(icon.readUInt32LE(18),22); // PNG begins after the icon directory
  assert.ok(icon.subarray(22).equals(original)); // exactly the approved logo, not the old RA mark
  assert.ok(html.includes('rel="icon" type="image/x-icon" href="/favicon.ico"'));
  assert.ok(html.includes('rel="icon" type="image/png" sizes="128x128" href="'+approved+'"'));
  assert.ok(html.includes('rel="apple-touch-icon" href="'+approved+'"'));
});

test('HTML and imported navigation have fresh cache keys for desktop branding',()=>{
  const sources=Array.from(html.matchAll(/src="([^"]+)"/g),m=>m[1]);
  assert.ok(sources.some(src=>src.startsWith('/app.js?v=')&&src.includes(version)));
  assert.ok(sources.some(src=>src.startsWith('/effects.js?v=')&&src.includes(version)));
  assert.ok(!app.includes('publicFooterNavigationMarkup(appText,currentLang())'));
  assert.ok(app.includes('data-open-site-assistant'));
  assert.ok(server.includes("res.setHeader('Cache-Control','no-store')"));
  assert.ok(server.includes("filePath.endsWith('apple-nav.js')"));
});
