import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const media=readFileSync(new URL('../public/media/index.html',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const appClient=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const fiTool=readFileSync(new URL('../public/tools/asiakaspalvelubotti-testi.html',import.meta.url),'utf8');
const enTool=readFileSync(new URL('../public/tools/ai-chatbot-evaluation.html',import.meta.url),'utf8');

test('media kit provides factual, accessible, linkable product background without invented claims',()=>{
  assert.match(media,/<html lang="fi">/);
  assert.match(media,/<title>Respondo AI – tuotetiedot medialle ja hakemistoille<\/title>/);
  assert.match(media,/<link rel="canonical" href="https:\/\/respondoai\.fi\/media\/">/);
  assert.match(media,/<meta name="robots" content="index,follow/);
  assert.match(media,/<main>/);
  assert.match(media,/<h1>Respondo AI – tuote yhdellä silmäyksellä\.<\/h1>/);
  assert.ok(media.includes('respondo-approved-arrow-20261012.png'),'Use final approved logo');
  assert.ok(media.includes('info@respondoai.fi'),'Use exact official contact address');
  assert.ok(media.includes('/tools/asiakaspalvelubotti-testi.html'),'Publish useful independent-use resource');
  assert.ok(media.includes('/tools/ai-chatbot-evaluation.html'),'Link real English tool');
  assert.ok(media.includes('lang="en"'),'Properly label English copy');
  assert.ok(media.includes('ei ole riippumaton tuotearvio'),'No independent review claim');
  assert.ok(media.includes('ei osta tai vaadi linkityksiä'),'No paid or mandatory backlink scheme');
  assert.ok(media.includes('Hinnoittelu ja tilaaminen'),'Explain where to verify live prices');
  assert.ok(media.includes('Maksullinen tilaaminen on toistaiseksi rajattu suomalaisille yrityksille'),'Honest checkout country');
  assert.ok(!/Starter 34,90|Advanced 44,90|Business 54,90/.test(media),'Do not hardcode obsolete prices');
  assert.ok(!/Y-tunnus\s*\d{7}-\d|\d+[\s.]?000 asiakka/i.test(media),'Do not invent registrations or customer counts');
});

test('editorial resources are discoverable from public homepage/footer and both scorecards',()=>{
  assert.ok(appClient.includes('href="/media/"')&&appClient.includes('"Mediamateriaali"'),'Public footer must link media kit');
  assert.ok(server.includes("SEO_CANONICAL_ORIGIN + '/media/'"),'Sitemap must include media resource');
  assert.ok(server.includes('Respondo AI tuotetiedot medialle'),'SSR homepage fallback should link');
  assert.ok(fiTool.includes('<a href="/media/">Tuotetiedot medialle</a>'));
  assert.ok(enTool.includes('<a href="/media/">Media kit &amp; official product facts</a>'));
});

test('standalone press facts route is live HTML with canonical and sitemap entry',async(t)=>{
  const {app}=await import('../server.mjs');
  const running=await new Promise(resolve=>{
    const server=app.listen(0,'127.0.0.1',()=>resolve(server));
  });
  t.after(()=>new Promise((resolve,reject)=>running.close(e=>e?reject(e):resolve())));
  const base='http://127.0.0.1:'+running.address().port;
  const r=await fetch(base+'/media/');
  assert.equal(r.status,200,'Press kit not served as static HTML');
  assert.match(r.headers.get('content-type')||'',/text\/html/);
  const html=await r.text();
  assert.ok(html.includes('Yhteys'));
  assert.ok(html.includes('respondo-approved-arrow-20261012.png'));
  assert.ok(html.includes('href="https://respondoai.fi/media/"'));
  const sitemap=await (await fetch(base+'/sitemap.xml')).text();
  assert.equal(sitemap.split('/media/</loc>').length-1,1,'Only one canonical media entry in sitemap');
  assert.ok(!sitemap.includes('/media/?lang='),'Do not create fake translated media URLs');
});
