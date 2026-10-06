import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FEATURE_HIGHLIGHTS,FEATURE_GROUPS,FEATURE_COUNT} from '../public/features-data.js';

const expectedFi=[
 'Oppii yrityksen verkkosivuilta ja muodostaa tietopohjan.',
 'Ymmärtää vapaasti muotoiltuja kysymyksiä.',
 'Vastaa yrityksen omilla tiedoilla.',
 'Toimii suomeksi, ruotsiksi ja englanniksi.',
 'Vastaa asiakkaan kielellä, vaikka tietopohja olisi suomeksi.',
 'Muistaa keskustelun kontekstia ja ymmärtää jatkokysymyksiä.',
 'Ohjaa ihmiselle, jos vastausta ei löydy.',
 'Kerää asiakkaan yhteystiedot jatkoyhteydenottoa varten.',
 'Ohjaa tarvittaessa ajanvaraukseen tai tarjouspyyntöön.',
 'Yritys hallitsee itse botin tietoja, asetuksia ja ulkoasua.'
];

test('requested ten customer-facing essentials are first and in exact order',()=>{
 assert.equal(FEATURE_HIGHLIGHTS.length,10);
 assert.deepEqual(FEATURE_HIGHLIGHTS.map(x=>x[0]),expectedFi);
 assert.ok(FEATURE_HIGHLIGHTS.every(x=>x.length===3 && x.every(Boolean)));
});

test('all detailed features remain below the ten essentials',()=>{
 assert.equal(FEATURE_COUNT,FEATURE_GROUPS.reduce((n,g)=>n+g.items.length,0));
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/FEATURE_HIGHLIGHTS\.map/);
 assert.match(app,/10 TÄRKEINTÄ/);
 assert.match(app,/yksityiskohtaista ominaisuutta/);
});

test('public mobile header stays fixed on phones and dashboard pages do not opt in',()=>{
 const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const block=css.split('/* 2026-10-01 mobile public header:')[1]||'';
 assert.ok(block);
 assert.match(block,/body\.public-nav-active \.nav\s*\{[^}]*position:fixed!important/s);
 assert.match(block,/body\.public-nav-active \.nav\s*\{[^}]*top:0!important/s);
 assert.match(block,/body\.public-nav-active \.nav\s*\{[^}]*left:0!important/s);
 assert.match(block,/body\.public-nav-active \.nav\s*\{[^}]*right:0!important/s);
 assert.match(block,/body\.public-nav-active #app\s*\{[^}]*padding-top:var\(--public-mobile-header-height\)!important/s);
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/classList\.toggle\('public-nav-active', Boolean\(document\.querySelector\('#app \.nav'\)\)\)/);
 assert.match(html,/styles\.css\?v=20261006-flags-v2/);
 assert.match(html,/app\.js\?v=20261006-flags-v2/);
});
