import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fi=readFileSync(new URL('../public/tools/asiakaspalvelubotti-testi.html',import.meta.url),'utf8');
const en=readFileSync(new URL('../public/tools/ai-chatbot-evaluation.html',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const home=readFileSync(new URL('../public/apple-home.js',import.meta.url),'utf8');
const shell=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const topics=readFileSync(new URL('../public/ai-topic-pages.mjs',import.meta.url),'utf8');
const landing=readFileSync(new URL('../public/customer-service-landing.mjs',import.meta.url),'utf8');

test('free Finnish 25-question resource is truly useful, crawlable and not a lead-capture gate',()=>{
  assert.match(fi,/<html lang="fi">/);
  assert.match(fi,/<title>Asiakaspalvelubotin testi/);
  assert.match(fi,/<meta name="robots" content="index,follow/);
  assert.match(fi,/<h1>Onko <span>asiakaspalvelubottisi<\/span> valmis oikeille asiakkaille\?<\/h1>/);
  const articles=[...fi.matchAll(/<article class="case" data-id="(CAT\d{2})" data-category="([^"]+)" data-risk="([^"]+)">/g)];
  assert.equal(articles.length,25,'25 visible test cases must exist in initial HTML');
  assert.deepEqual(articles.map(x=>x[1]),Array.from({length:25},(_,i)=>'CAT'+String(i+1).padStart(2,'0')));
  assert.ok(articles.some(x=>x[3]==='kriittinen'));
  for(const topic of ['Tietopohja','Verkkokauppa','Ajanvaraus','Ihmiselle siirto','Kielet','Jatkokysymykset','Tietojen eristys','Rehellisyys'])
    assert.ok(articles.some(x=>x[2]===topic),'missing risk topic: '+topic);
  assert.ok(fi.includes('data-status="pass"')&&fi.includes('data-status="fail"')&&fi.includes('data-status="review"'));
  assert.ok(fi.includes('id="export"')&&fi.includes('id="reset"'));
  assert.ok(fi.includes("localStorage.setItem(KEY"),'answers must be kept locally');
  assert.ok(fi.includes("URL.createObjectURL(new Blob"),'export is local file generation');
  assert.ok(fi.includes("a.download='asiakaspalvelubotti-25-testin-arviointi.csv'"),'need practical export');
  assert.ok(!/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(fi),'do not transmit assessment results');
  assert.ok(fi.includes('sertifikaatti'),'vendor-created tool should disclose limitation');
  assert.ok(fi.includes('työkalua saa käyttää')||fi.includes('Työkalua saa käyttää'),'usable with competing tools');
});

test('language version, canonical and sitemap references are reciprocal and unique',()=>{
  assert.match(fi,/<link rel="canonical" href="https:\/\/respondoai\.fi\/tools\/asiakaspalvelubotti-testi\.html">/);
  assert.match(fi,/hreflang="en" href="https:\/\/respondoai\.fi\/tools\/ai-chatbot-evaluation\.html"/);
  assert.match(en,/hreflang="fi" href="https:\/\/respondoai\.fi\/tools\/asiakaspalvelubotti-testi\.html"/);
  assert.ok(en.includes('lang="fi">Suomeksi</a>'),'English resource should point to Finnish resource');
  assert.match(server,/SEO_CANONICAL_ORIGIN \+ '\/tools\/asiakaspalvelubotti-testi\.html'/);
  assert.ok(!server.includes("'  '/tools/asiakaspalvelubotti-testi.html',"),'standalone tool should not be SPA prerendered');
});

test('contextual links connect buyer and AI topic pages to the assessment',()=>{
  assert.ok(topics.includes("'/tools/asiakaspalvelubotti-testi.html'"));
  assert.ok(landing.includes("'/tools/asiakaspalvelubotti-testi.html'"));
  assert.ok(!home.includes('apple-learning-links'),'homepage guide promotion should remain removed');
  assert.ok(shell.includes('-fi-scorecard-v1'),'public module cache must be invalidated');
});

test('free Finnish evaluation tool is served as a real static HTML page and included in sitemap',async(t)=>{
  const {app}=await import('../server.mjs');
  const listener=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server))});
  t.after(()=>new Promise((resolve,reject)=>listener.close(e=>e?reject(e):resolve())));
  const base='http://127.0.0.1:'+listener.address().port;
  const response=await fetch(base+'/tools/asiakaspalvelubotti-testi.html');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type')||'',/text\/html/);
  const html=await response.text();
  assert.ok(html.includes('data-id="CAT25"'),'page must render all questions without client JS');
  assert.ok(html.includes('id="export"'),'CSV interaction missing');
  const site=await (await fetch(base+'/sitemap.xml')).text();
  assert.ok(site.includes('/tools/asiakaspalvelubotti-testi.html</loc>'));
  assert.equal(site.split('/tools/asiakaspalvelubotti-testi.html</loc>').length-1,1,'standalone canonical should occur once in sitemap');
});
