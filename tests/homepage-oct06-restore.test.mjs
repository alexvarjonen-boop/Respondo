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
  assert.match(home,/appleHomeMarkup\(appText,currentLang\(\),FEATURE_COUNT\)/);
  assert.match(home,/apple-home-page/);
  assert.doesNotMatch(home,/cinematicConversationScene\(\)|horizontalProductStory\(\)|productWorldScene\(\)|motionDepthScene\(\)|trustPortalScene\(\)|dataImpactScene\(\)/);
  assert.doesNotMatch(home,/calculatorSection\(\)|pricingSection\(\)|contactSection\(\)/);
});

test('Apple-inspired homepage and fullscreen menu styles are loaded',()=>{
  assert.match(index,/apple-home\.css\?v=20261008-apple-production-v1/);
  assert.match(index,/app\.js\?v=20261008-apple-production-v1/);
  assert.match(app,/publicMenuMarkup\(appText,currentLang\(\)\)/);
  assert.match(app,/bindPublicMenu\(\)/);
});
