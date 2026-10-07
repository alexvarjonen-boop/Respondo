import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('production SEO canonical stays on www.respondoai.fi instead of Railway hosts',()=>{
  assert.match(server,/SEO_CANONICAL_ORIGIN/);
  assert.match(server,/https:\/\/www\.respondoai\.fi/);
  assert.match(server,/index:false/);
  assert.match(server,/app\.get\('\/index\.html'/);
});

test('crawl discovery exposes robots sitemap and AI-readable site summary',()=>{
  assert.match(server,/app\.get\('\/robots\.txt'/);
  assert.match(server,/User-agent: OAI-SearchBot/);
  assert.match(server,/app\.get\('\/sitemap\.xml'/);
  assert.match(server,/app\.get\('\/llms\.txt'/);
});

test('server SEO shell contains canonical hreflang schema and non-JS indexable content',()=>{
  assert.match(server,/rel="canonical"/);
  assert.match(server,/hreflang="x-default"/);
  assert.match(server,/SoftwareApplication/);
  assert.match(server,/BreadcrumbList/);
  assert.match(server,/seoNoScriptMarkup\(seo, req\.path\)/);
});

test('intent landing pages are indexable and routed in both server and browser',()=>{
  for(const path of ['/asiakaspalvelubotti','/verkkokauppa-chatbot','/ajanvaraus-chatbot']){
    assert.ok(server.includes("'" + path + "'"), path + ' missing from server SEO config');
    assert.ok(app.includes("'" + path + "'"), path + ' missing from client routes');
  }
  assert.match(app,/function seoLandingPage\(path\)/);
});

test('homepage keeps descriptive product content without the removed explainer section',()=>{
  assert.match(app,/AI-asiakaspalvelu yritykselle/);
  const start=app.indexOf('async function home()');
  const end=app.indexOf('\n\nfunction signup()',start);
  const home=app.slice(start,end);
  assert.doesNotMatch(home,/geoAnswerSection\(\)|geo-answer-section|respondo-explained/);
  assert.match(home,/cinematicConversationScene\(\)/);
  assert.match(home,/horizontalProductStory\(\)/);
  assert.doesNotMatch(app,/premiumHomeSections\(appText, currentLang\(\), FEATURE_COUNT\)/);
});
