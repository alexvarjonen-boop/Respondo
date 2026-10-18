import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicFooterNavigationMarkup } from '../public/apple-nav.js';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('pricing stays directly accessible in footer in FI SV EN, without a menu',()=>{
  const nav=app.split('function nav() {')[1]?.split('function bindHomeHeroActions()')[0];
  const footer=app.split('function footer() {')[1]?.split('function heroVisual()')[0];
  assert.ok(nav && footer);
  assert.doesNotMatch(nav,/href="\/#pricing"|apple-menu-toggle|publicMenuMarkup/);
  assert.match(footer,/publicFooterNavigationMarkup\(appText,currentLang\(\)\)/);
  for (const [lang,index] of [['fi',0],['sv',1],['en',2]]) {
    const tr=(...v)=>v[index];
    const links=publicFooterNavigationMarkup(tr,lang);
    assert.ok(links.includes('href="/hinnat?lang='+lang+'"'),lang);
    assert.ok(links.includes('href="/kirjaudu?lang='+lang+'"'),lang);
  }
  assert.match(app,/path === '\/hinnat'\) html =/);
});
