import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { respondoSiteNavigationActions } from '../respondo-site-navigation.mjs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('the chatbot finds pricing while existing plan and legal routes stay accessible',()=>{
  const nav=app.split('function nav() {')[1]?.split('function bindHomeHeroActions()')[0];
  const footer=app.split('function footer() {')[1]?.split('function heroVisual()')[0];
  assert.ok(nav&&footer);
  assert.doesNotMatch(nav,/href="\/#pricing"|apple-menu-toggle|publicMenuMarkup/);
  assert.doesNotMatch(footer,/publicFooterNavigationMarkup|footer-site-nav/);
  assert.match(footer,/data-open-site-assistant/);
  assert.ok(footer.includes('href="/hinnat?lang=${currentLang()}"'));
  assert.ok(footer.includes('href="/kayttoehdot"'));
  for(const lang of ['fi','sv','en']){
    const actions=respondoSiteNavigationActions('Mitä hinnat ovat?',lang);
    assert.ok(actions.some(a=>new URL(a.url).pathname==='/hinnat'),lang);
  }
  assert.match(app,/path === '\/hinnat'\) html =/);
});
