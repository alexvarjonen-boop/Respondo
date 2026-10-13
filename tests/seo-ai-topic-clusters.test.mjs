import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AI_TOPIC_PATHS, aiTopicMarkup, aiTopicMeta } from '../public/ai-topic-pages.mjs';

const serverSrc=readFileSync(new URL('../server.mjs', import.meta.url),'utf8');
const clientSrc=readFileSync(new URL('../public/app.js', import.meta.url),'utf8');
const shell=readFileSync(new URL('../public/index.html', import.meta.url),'utf8');
const appleHome=readFileSync(new URL('../public/apple-home.js', import.meta.url),'utf8');
const mainContent=readFileSync(new URL('../public/customer-service-landing.mjs', import.meta.url),'utf8');

test('the two editorial AI topics have distinct, useful localized content, not doorway variants',()=>{
  assert.deepEqual(AI_TOPIC_PATHS,['/tekoaly-asiakaspalvelu','/tekoaly-yrityksille']);
  const heading={
    '/tekoaly-asiakaspalvelu':{'fi':'Tekoäly asiakaspalvelussa – käytännön ratkaisut yritykselle','sv':'AI i kundservice – praktiska lösningar för företag','en':'AI in customer service: practical solutions for businesses'},
    '/tekoaly-yrityksille':{'fi':'Tekoäly yrityksille – mistä kannattaa aloittaa?','sv':'AI för företag – var ska man börja?','en':'AI for small businesses: where should you start?'}
  };
  for(const p of AI_TOPIC_PATHS)for(const lang of ['fi','sv','en']){
    const markup=aiTopicMarkup(p,lang);
    const metadata=aiTopicMeta(p,lang);
    assert.ok(markup.startsWith('<main '),p+' '+lang+' needs semantic main');
    assert.ok(markup.length>2700,p+' '+lang+' thin content');
    assert.ok(markup.includes('<h1>'+heading[p][lang]+'</h1>'),p+' '+lang+' heading mismatch');
    assert.ok((markup.match(/<section class="ai-topic-section">/g)||[]).length>=5,'missing substantive sections');
    assert.equal((markup.match(/<details class="ai-topic-faq"/g)||[]).length,4,'missing FAQs');
    assert.ok(markup.includes('/asiakaspalvelubotti'),p+' needs actual chatbot solution');
    assert.ok(markup.includes('/assistant'),p+' needs an interactive demo');
    assert.ok(markup.includes('/hinnat'),p+' needs actual pricing');
    assert.ok(markup.includes('href="/'+(p==='/tekoaly-yrityksille'?'tekoaly-asiakaspalvelu':'tekoaly-yrityksille')),p+' needs topical companion');
    assert.ok(metadata?.[0]?.includes('Respondo AI'));
    assert.ok(metadata?.[1]?.length>100);
    if(lang!=='fi')assert.ok(markup.includes('?lang='+lang),'locale dropped from internal links');
  }
  assert.equal(aiTopicMarkup('/fake'),'');
  assert.equal(aiTopicMeta('/fake'),null);
  assert.ok(mainContent.includes('automaattista asiakaspalvelijaa'));
  assert.ok(mainContent.includes('asiakaspalvelu bottia'));
  assert.ok(mainContent.includes("['/tekoaly-asiakaspalvelu'"));
});

test('new pages have internal discovery, browser SEO metadata, sitemap and responsive styling',()=>{
  assert.ok(serverSrc.includes('...AI_TOPIC_PATHS'),'pages not registered for indexation');
  assert.ok(serverSrc.includes('aiTopicMarkup(routePath,seo.lang)'),'no server side HTML');
  assert.ok(serverSrc.includes('aiTopicMeta(metaPath,lang)'),'no server meta titles');
  assert.ok(clientSrc.includes('AI_TOPIC_PATHS.includes(path)'),'browser routing is missing');
  assert.ok(clientSrc.includes('aiTopicMeta(metaPath,l)'),'localized browser meta titles missing');
  assert.ok(appleHome.includes('/tekoaly-asiakaspalvelu?lang='));
  assert.ok(appleHome.includes('/tekoaly-yrityksille?lang='));
  assert.ok(clientSrc.includes('audience-related-topics'),'audience hub missing discoverable links');
  assert.ok(shell.includes('ai-topic-pages.css?v='));
  assert.ok(shell.includes('ai-topic-clusters-v1'),'browser bundle can be stale');
  assert.ok(serverSrc.includes("['/tekoaly-asiakaspalvelu'"),'server audience hub link not crawlable');
});

test('public HTTP SEO responses for two topics each in three languages, sitemap and canonical', async(t)=>{
  const {app}=await import('../server.mjs');
  const listener=await new Promise(resolve=>{
    const server=app.listen(0,'127.0.0.1',()=>resolve(server));
  });
  t.after(()=>new Promise((resolve,reject)=>listener.close(error=>error?reject(error):resolve())));
  const base='http://127.0.0.1:'+listener.address().port;
  for(const p of AI_TOPIC_PATHS)for(const lang of ['fi','sv','en']){
    const url=p+(lang==='fi'?'':'?lang='+lang);
    const res=await fetch(base+url);
    assert.equal(res.status,200,url);
    const html=await res.text();
    assert.ok(html.includes('<html lang="'+lang+'">'),'incorrect locale '+url);
    assert.ok(html.includes('<title>'+aiTopicMeta(p,lang)[0].replace(/&/g,'&amp;')+'</title>'),'bad meta title '+url);
    assert.ok(html.includes('<meta name="robots" content="index,follow'),'accidental noindex '+url);
    assert.ok(html.includes(aiTopicMarkup(p,lang)),'initial server HTML has no meaningful page content '+url);
    assert.ok(html.includes('hreflang="fi"')&&html.includes('hreflang="sv"')&&html.includes('hreflang="en"'),'missing multilingual alternates');
    const link='https://respondoai.fi'+url;
    assert.ok(html.includes('rel="canonical" href="'+link.replace(/&/g,'&amp;')+'"'),'incorrect canonical '+url);
  }
  const site=await (await fetch(base+'/sitemap.xml')).text();
  for(const path of AI_TOPIC_PATHS){
    for(const lang of ['fi','sv','en']){
      const url=path+(lang==='fi'?'':'?lang='+lang);
      const escapedUrl=url.replace('&','&amp;');
      assert.ok(site.includes(escapedUrl+'</loc>'),'missing sitemap url '+url);
    }
  }
});
