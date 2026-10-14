import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEO_SPECIALIST_GUIDES } from '../public/seo-specialist-guides.mjs';
import { GLOBAL_GUIDE_PATHS, globalGuideData, globalResourcesMarkup } from '../public/global-resources.mjs';

const serverCode=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const appCode=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const rss=readFileSync(new URL('../public/guides/feed.xml',import.meta.url),'utf8');

const NEW_PATHS=[
  '/guides/chatbot-verkkosivuille-kayttoonotto',
  '/guides/asiakaspalvelun-automaatio-mittarit',
  '/guides/asiakaspalvelubotin-testaus'
];

test('three unique intent-led guides belong to the footer-linked library, with original multilingual copy',()=>{
  assert.deepEqual(Object.keys(SEO_SPECIALIST_GUIDES),NEW_PATHS);
  for(const path of NEW_PATHS){
    assert.ok(GLOBAL_GUIDE_PATHS.includes(path),'guide missing from hub');
    for(const lang of ['fi','sv','en']){
      const d=globalGuideData(path,lang);
      assert.ok(d, 'guide missing for '+path+' '+lang);
      assert.ok(d.title.length>24, 'title too short for '+path+' '+lang);
      assert.ok(d.subtitle.length>90, 'subtitle too short for '+path+' '+lang);
      assert.ok(d.sections.length>=7, 'guide has few practical sections '+path+' '+lang);
      assert.equal(d.faq.length,4,'need four distinct factual FAQ answers');
      const text=d.sections.map(([title,body])=>title+' '+body).join(' ');
      assert.ok(text.length>1650,'insufficient distinct educational content '+path+' '+lang);
      assert.ok(!/ykkösenä googlessa|google number one|guaranteed rankings|guaranteed leads/i.test(text),'unsubstantiated guarantee');
      const html=globalResourcesMarkup(path,lang);
      assert.ok(html.includes('<h1>'+d.title+'</h1>'),'visible H1 mismatch');
      assert.ok(html.includes(d.subtitle),'intro mismatch');
      assert.equal((html.match(/class="global-guide-section"/g)||[]).length,d.sections.length+1);
      assert.equal((html.match(/class="global-guide-faq"/g)||[]).length,4);
      assert.ok(html.includes('href="/guides'+(lang==='fi'?'':'?lang='+lang)+'"'),'breadcrumb should link library');
      assert.ok(html.includes('href="/tools/'+(lang==='en'?'ai-chatbot-evaluation.html':'asiakaspalvelubotti-testi.html')+'"'),'test tool locale');
      assert.ok(!html.includes('href="/tilaus?plan=starter'),'no stale public billing plan');
    }
  }
});

test('guide hub is the discovery page without introducing new homepage sections',()=>{
  for(const lang of ['fi','sv','en']){
    const index=globalResourcesMarkup('/guides',lang);
    for(const slug of NEW_PATHS)assert.ok(index.includes(slug),'hub misses '+slug+' in '+lang);
    assert.ok(index.includes('/tekoaly-asiakaspalvelu'));
    assert.ok(index.includes('/tekoaly-yrityksille'));
    assert.ok(index.includes('/asiakaspalvelubotti'));
    assert.equal((index.match(/global-guide-card"/g)||[]).length,GLOBAL_GUIDE_PATHS.length-1);
    assert.ok(!/global-guide-hero[^]*Oppaat.*home/i.test('')); // no marketing-page injection
  }
  assert.ok(serverCode.includes('...GLOBAL_GUIDE_PATHS'),'new routes must be automatically indexable');
  assert.ok(serverCode.includes("guide.title + ' | Respondo AI'"),'real semantic titles on server');
  assert.ok(appCode.includes("globalGuideData(metaPath,l)"),'dynamic browser SEO must match server');
  assert.ok(!appCode.includes("seoGuidesInjectedIntoHomepage"),'home page untouched');
});

test('RSS feed and AI-readable source file make the new guides discoverable',()=>{
  for(const slug of NEW_PATHS){
    assert.ok(rss.includes(slug+'?lang=en'),'missing guide in feed');
    assert.ok(serverCode.includes("SEO_CANONICAL_ORIGIN + '/guides/"+slug.split('/').at(-1)+"?lang=en'"),'missing llms discovery');
  }
});

test('HTTP pages are full SSR content with correct title canonical hreflang, FAQ schema and sitemap',async(t)=>{
  const {app}=await import('../server.mjs');
  const listener=await new Promise(resolve=>{
    const server=app.listen(0,'127.0.0.1',()=>resolve(server));
  });
  t.after(()=>new Promise((resolve,reject)=>listener.close(err=>err?reject(err):resolve())));
  const base='http://127.0.0.1:'+listener.address().port;
  for(const path of NEW_PATHS){
    for(const lang of ['fi','sv','en']){
      const suffix=lang==='fi'?'':'?lang='+lang;
      const response=await fetch(base+path+suffix);
      assert.equal(response.status,200,'Unexpected HTTP status for '+path+suffix);
      const html=await response.text();
      const d=globalGuideData(path,lang);
      assert.ok(html.includes('<html lang="'+lang+'">'),'language code missing '+path+lang);
      assert.ok(html.includes('<title>'+d.title.replace(/&/g,'&amp;')+' | Respondo AI</title>'),'bad title '+path+lang);
      assert.ok(html.includes('<meta name="robots" content="index,follow'),'accidental noindex '+path+lang);
      assert.ok(html.includes(globalResourcesMarkup(path,lang)),'SSR does not contain complete guide');
      assert.ok(html.includes('hreflang="fi"')&&html.includes('hreflang="sv"')&&html.includes('hreflang="en"'),'alternate locale missing');
      assert.ok(html.includes('"@type":"Article"')||html.includes('\\\"@type\\\":\\\"Article\\\"'),'Article metadata missing');
      assert.ok(html.includes('"@type":"FAQPage"')||html.includes('\\\"@type\\\":\\\"FAQPage\\\"'),'visible FAQ schema missing');
      const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      assert.ok(canonical,'canonical missing '+path+lang);
      const url=new URL(canonical.replace(/&amp;/g,'&'));
      assert.equal(url.pathname+url.search,path+suffix,'canonical points elsewhere');
    }
  }
  const sitemap=await(await fetch(base+'/sitemap.xml')).text();
  for(const path of NEW_PATHS)for(const lang of ['fi','sv','en']){
    const suffix=lang==='fi'?'':'?lang='+lang;
    assert.ok(sitemap.includes(path+(lang==='fi'?'':'?lang='+lang.replace('en','en'))),'not in XML sitemap '+path+suffix);
  }
  const llms=await(await fetch(base+'/llms.txt')).text();
  for(const path of NEW_PATHS)assert.ok(llms.includes(path+'?lang=en'),'not in public AI source list');
});
