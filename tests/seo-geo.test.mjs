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

test('robots and the XML sitemap serve valid readable responses on the production routes',async(t)=>{
  const { app }=await import('../server.mjs');
  const server=await new Promise((resolve)=>{
    const handle=app.listen(0,'127.0.0.1',()=>resolve(handle));
  });
  t.after(()=>new Promise((resolve,reject)=>server.close((error)=>error?reject(error):resolve())));
  const origin='http://127.0.0.1:'+server.address().port;

  const robots=await fetch(origin+'/robots.txt');
  assert.equal(robots.status,200);
  const robotsText=await robots.text();
  assert.match(robotsText,/User-agent: OAI-SearchBot/);
  assert.match(robotsText,/Sitemap: [^\n]+\/sitemap\.xml/);
  assert.ok(robotsText.split('\n').length>6,'robots.txt must have real line breaks');
  assert.doesNotMatch(robotsText,/\\n/,'robots.txt must not return literal backslash-n');

  const sitemap=await fetch(origin+'/sitemap.xml');
  assert.equal(sitemap.status,200,'sitemap endpoint must not throw a 500');
  assert.match(sitemap.headers.get('content-type')||'',/xml/i);
  const xml=await sitemap.text();
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),xml.slice(0,120));
  assert.match(xml,/<urlset[^>]+xmlns:xhtml=/);
  assert.match(xml,/<\/urlset>/);
  assert.match(xml,/<loc>[^<]*\/asiakaspalvelubotti/);
  assert.match(xml,/<loc>[^<]*\/verkkokauppa-chatbot/);
  assert.match(xml,/<loc>[^<]*\/ajanvaraus-chatbot/);
  assert.match(xml,/<xhtml:link rel="alternate" hreflang="sv"/);
  assert.match(xml,/<xhtml:link rel="alternate" hreflang="en"/);
  assert.doesNotMatch(xml,/\\n/,'sitemap must not return literal backslash-n');
});
