import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('public homepage renders a compact 3-card feature story instead of legacy immersive sections',()=>{
  const start=app.indexOf('async function home()');
  const end=app.indexOf('\n\nfunction signup()',start);
  assert.ok(start>=0 && end>start);
  const home=app.slice(start,end);
  assert.match(home,/appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT,pricingSection\(\)\)/);
  assert.match(home,/apple-home-page/);
  assert.doesNotMatch(home,/cinematicConversationScene\(\)|horizontalProductStory\(\)|productWorldScene\(\)|motionDepthScene\(\)|trustPortalScene\(\)|dataImpactScene\(\)/);
  assert.doesNotMatch(home,/calculatorSection\(\)|contactSection\(\)/);
});

test('Apple-inspired homepage uses the chatbot instead of a page directory',()=>{
  assert.match(index,/apple-home\.css\?v=20261008-apple-production-header-contrast-v2/);
  assert.match(index,/app\.js\?v=20261008-apple-production-v1/);
  assert.doesNotMatch(app,/publicFooterNavigationMarkup/);
  assert.match(app,/data-open-site-assistant/);
  assert.doesNotMatch(app,/publicMenuMarkup\(appText,currentLang\(\)\)/);
  assert.doesNotMatch(app,/bindPublicMenu\(\)/);
});

test('mobile header keeps branding and flags; chat opens from footer',()=>{
  const css=fs.readFileSync(new URL('../public/apple-home.css',import.meta.url),'utf8');
  const modern=fs.readFileSync(new URL('../public/mobile-public-polish.css',import.meta.url),'utf8');
  assert.match(css,/body\.public-nav-active \.apple-home-page \.nav\s*\{[^}]*background:#f5f5f7!important/s);
  assert.match(css,/\.apple-home-page \.nav \.brand-word\s*\{[^}]*color:#1d1d1f!important/s);
  assert.match(modern,/\.nav \.navactions/);
  assert.match(modern,/footer-ask-respondo/);
  assert.doesNotMatch(app.slice(app.indexOf('function nav()'),app.indexOf('function bindHomeHeroActions()')),/apple-menu-toggle/);
});
