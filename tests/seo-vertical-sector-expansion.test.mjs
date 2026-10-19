import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERTICAL_LANDING_PATHS, verticalLandingMarkup, verticalMetaForPath } from '../public/vertical-landing.mjs';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const browser=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const shell=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/industry-directory.css',import.meta.url),'utf8');

test('salon and cleaning industry pages have distinct FI/SV/EN substance and conversions',()=>{
  assert.deepEqual(VERTICAL_LANDING_PATHS,['/kampaamo-chatbot','/siivousyritys-chatbot']);
  const headings={
    '/kampaamo-chatbot':['Chatbot kampaamolle ja parturille','Chatbot för frisörsalong och barberare','AI chatbot for hair salons and barbershops'],
    '/siivousyritys-chatbot':['Chatbot siivousyritykselle','AI-chatbot för städföretag','AI chatbot for cleaning companies']
  };
  for(const [path,names] of Object.entries(headings)){
    const titles=verticalMetaForPath(path);
    assert.ok(titles);
    for(const [i,lang] of ['fi','sv','en'].entries()){
      const content=verticalLandingMarkup(path,lang);
      assert.ok(content.length>1800,'too little content for '+path+' '+lang);
      assert.ok(content.startsWith('<main '),'missing semantic main');
      assert.ok(content.includes('<h1>'+names[i]+'</h1>'),'incorrect translated heading');
      assert.equal((content.match(/<article>/g)||[]).length,4,'expected four distinct service cases');
      assert.equal((content.match(/<details class="vertical-faq-item"/g)||[]).length,4,'expected four specific FAQs');
      assert.ok(content.includes('/assistant'),'missing demo CTA');
      assert.ok(content.includes('/hinnat'),'missing pricing CTA');
      assert.ok(content.includes('/kenelle-sopii'),'missing directory crosslink');
      assert.ok(content.includes('?lang='+lang) || lang==='fi','language lost from CTA');
      assert.ok(titles[lang][0].includes('Respondo AI'));
      assert.ok(titles[lang][1].length>=90);
      assert.ok(!/guaranteed roi|guaranteed leads|varmasti enemmän/i.test(content),'misleading promise');
    }
  }
  assert.equal(verticalLandingMarkup('/unknown','fi'),'');
  assert.equal(verticalMetaForPath('/unknown'),null);
});

test('new industries are linked from the audience hub and both SEO routers',()=>{
  for(const path of VERTICAL_LANDING_PATHS){
    assert.ok(server.includes("...VERTICAL_LANDING_PATHS"),'not added to server sitemap or indexability');
    assert.ok(browser.includes("'"+path+"'"),'industry directory does not link '+path);
  }
  assert.ok(browser.includes('VERTICAL_LANDING_PATHS.includes(path)'),'browser route must render industries');
  assert.ok(browser.includes('verticalMetaForPath(metaPath)'),'browser SEO metadata fallback absent');
  assert.ok(server.includes('verticalMetaForPath(metaPath)'),'server SEO metadata fallback absent');
  assert.ok(server.includes('verticalLandingMarkup(routePath, seo.lang)'),'server initial content absent');
  assert.match(css,/vertical-faq-item/);
  assert.match(shell,/industry-directory\.css\?v=[^"]+-vertical-20261013-v1/);
  assert.match(shell,/app\.js\?v=[^"]+-vertical-20261013-v1/);
});

test('six localized industry pages are indexable, prerendered and included in sitemap',async(t)=>{
  const {app}=await import('../server.mjs');
  const listener=await new Promise(resolve=>{
    const server=app.listen(0,'127.0.0.1',()=>resolve(server));
  });
  t.after(()=>new Promise((resolve,reject)=>listener.close(error=>error?reject(error):resolve())));
  const root='http://127.0.0.1:'+listener.address().port;
  for(const path of VERTICAL_LANDING_PATHS){
    for(const lang of ['fi','sv','en']){
      const url=path+(lang==='en'?'':'?lang='+lang);
      const response=await fetch(root+url);
      assert.equal(response.status,200,url);
      const html=await response.text();
      assert.ok(html.includes('<html lang="'+lang+'">'),'wrong document language '+url);
      const title=verticalMetaForPath(path)[lang][0].replace(/&/g,'&amp;');
      assert.ok(html.includes('<title>'+title+'</title>'),'wrong page title '+url);
      assert.ok(html.includes('<meta name="robots" content="index,follow'),'unexpected noindex '+url);
      const initial=html.split('<div id="app">')[1]?.split('</main>')[0] || '';
      assert.ok(initial.includes(verticalLandingMarkup(path,lang).slice(0,100)),'localized page not in initial HTML '+url);
      assert.ok(initial.includes('<h1>'),'missing crawlable main heading '+url);
      assert.ok(initial.includes('vertical-faq-item'),'missing crawlable FAQs '+url);
      assert.ok(html.includes('hreflang="en"'),'missing en alternate '+url);
      assert.ok(html.includes('hreflang="sv"'),'missing sv alternate '+url);
    }
  }
  const xml=await (await fetch(root+'/sitemap.xml')).text();
  for(const path of VERTICAL_LANDING_PATHS){
    assert.ok(xml.includes(path+'?lang=fi</loc>'),'missing Finnish sitemap url '+path);
    assert.ok(xml.includes(path+'</loc>'),'missing English sitemap url '+path);
    assert.ok(xml.includes(path+'?lang=sv</loc>'),'missing Swedish sitemap url '+path);
  }
});
