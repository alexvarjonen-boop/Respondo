import test from 'node:test';
import assert from 'node:assert/strict';
import { premiumHomeSections } from '../public/premium-home.js';

for (const [index, lang, company] of [[0,'fi','Yrityksesi'],[1,'sv','Ditt företag'],[2,'en','Your company']]) {
  test(`homepage customer-facing examples use the company brand in ${lang}`, () => {
    const html=premiumHomeSections((...copy)=>copy[index],lang,100);
    const chatHeaders=[...html.matchAll(/class="lp-chat-head"[\s\S]*?<b>(.*?)<\/b>/g)].map(match=>match[1]);
    assert.equal(chatHeaders.length,3);
    assert.ok(chatHeaders.every(name=>name===company));
    assert.match(html, /RESPONDO AI/); // Product branding remains in the workspace.
    assert.ok(html.includes(`/assistant?lang=${lang}`));
    assert.ok(html.includes(`/ominaisuudet?lang=${lang}`));
  });
}

test('homepage story is semantic content with genuine trial links and labelled sample data', () => {
  const html=premiumHomeSections((fi)=>fi,'fi',100);
  assert.match(html, /<h1 id="lp-title">[\s\S]*?AI-asiakaspalvelu yritykselle\./);
  assert.match(html, /href="\/tilaus"/);
  for (const id of ['how','features','control']) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /Havainnollistava esimerkki/);
  assert.match(html, /Esimerkkiajat/);
  assert.match(html, /Verkkosivutuonti: Advanced \/ Business/);
  assert.doesNotMatch(html, /<canvas|<iframe|<script|fx-assistant-launch|widget\.js/);
});
