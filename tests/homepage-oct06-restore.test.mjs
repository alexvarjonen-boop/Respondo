import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('public homepage uses the October 6 immersive layout',()=>{
  const start=app.indexOf('async function home()');
  const end=app.indexOf('\n\nfunction signup()',start);
  assert.ok(start>=0 && end>start);
  const home=app.slice(start,end);

  assert.match(home,/hero-immersive/);
  assert.doesNotMatch(home,/geoAnswerSection\(\)/);
  assert.match(home,/cinematicConversationScene\(\)/);
  assert.match(home,/horizontalProductStory\(\)/);
  assert.match(home,/productWorldScene\(\)/);
  assert.match(home,/motionDepthScene\(\)/);
  assert.match(home,/trustPortalScene\(\)/);
  assert.match(home,/dataImpactScene\(\)/);
  assert.match(home,/post-calculator-features/);
  assert.match(home,/final-cta-immersive/);
  assert.doesNotMatch(home,/premiumHomeSections|premium-home-page|lp-closing/);
  assert.match(app,/<b>YRITYKSESI<\/b>/);
  assert.doesNotMatch(app,/<div class="cinema-phone-top"><span><\/span><b>RESPONDO<\/b>/);
  assert.doesNotMatch(app,/<span class="mini-mark">R<\/span>\s*<b>RESPONDO AI<\/b>/);
});

test('redesigned homepage stylesheet is no longer loaded',()=>{
  assert.doesNotMatch(index,/premium-home\.css/);
  assert.match(index,/app\.js\?v=20261007-home-cleanup-v1/);
});
