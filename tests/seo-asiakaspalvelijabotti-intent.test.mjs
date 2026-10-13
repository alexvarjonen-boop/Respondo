import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CUSTOMER_SERVICE_SEO_PATH, customerServiceLandingMarkup, customerServiceQuestions } from '../public/customer-service-landing.mjs';

const client=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const serverCode=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const home=readFileSync(new URL('../public/apple-home.js',import.meta.url),'utf8');
const shell=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('one substantial AI customer support landing page targets buyer intent across FI SV EN',()=>{
  assert.equal(CUSTOMER_SERVICE_SEO_PATH,'/asiakaspalvelubotti');
  const headings={fi:'Asiakaspalvelijabotti yrityksen verkkosivuille',sv:'AI-kundservicebot för företagets webbplats',en:'AI customer service chatbot for business websites'};
  for(const lang of ['fi','sv','en']){
    const html=customerServiceLandingMarkup(lang);
    assert.ok(html.startsWith('<main '));
    assert.ok(html.length>5200,lang+' page is too short');
    assert.ok(html.includes('<h1>'+headings[lang]+'</h1>'),lang+' wrong heading');
    assert.equal((html.match(/<details class="customer-bot-faq"/g)||[]).length,6);
    assert.equal(customerServiceQuestions(lang).length,6);
    assert.ok(html.includes('/hinnat'), 'missing pricing');
    assert.ok(html.includes('/assistant'), 'missing demo');
    assert.ok(html.includes('/kenelle-sopii'), 'missing internal links');
    assert.ok(html.includes('/guides/ai-customer-service-chatbot'),'missing helpful guide');
    if(lang!=='fi') assert.ok(html.includes('?lang='+lang),'CTA dropped lang');
    assert.ok(!/guaranteed leads|guaranteed first page|takuuvarma ykkössija/i.test(html));
  }
  const finnish=customerServiceLandingMarkup('fi').toLowerCase();
  for(const word of ['asiakaspalvelijabotti','ai-asiakaspalvelija','asiakaspalvelubotti','ihmiselle','hinnoista']){
    assert.ok(finnish.includes(word), 'missing legitimate semantic term '+word);
  }
});

test('both renderers use a single canonical content source and matching SEO titles',()=>{
  assert.ok(serverCode.includes('customerServiceLandingMarkup(seo.lang)'), 'initial HTML needs true semantic content');
  assert.ok(client.includes('customerServiceLandingMarkup(currentLang())'),'browser and server need same visible copy');
  assert.ok(serverCode.includes('customerServiceQuestions(seo.lang)'), 'FAQ structured data not from visible copy');
  assert.ok(serverCode.includes('Asiakaspalvelijabotti ja AI-asiakaspalvelija yritykselle | Respondo AI'));
  assert.ok(client.includes('Asiakaspalvelijabotti ja AI-asiakaspalvelija yritykselle | Respondo AI'));
  assert.ok(serverCode.includes("app.get('/asiakaspalvelijabotti'"), 'no keyword synonym redirect');
  assert.ok(home.includes('/asiakaspalvelubotti?lang='), 'homepage does not link to the primary topic');
  assert.ok(client.includes('AI-asiakaspalvelija ja asiakaspalvelijabotti'), 'audience hub missing topic link');
  assert.ok(shell.includes('customer-buyer-20261013-v1'),'stale public styles or JS');
});

test('server prerenders authoritative localized copy with indexable canonicals and valid synonym 301',async(t)=>{
  const {app}=await import('../server.mjs');
  const handle=await new Promise(resolve=>{
    const server=app.listen(0,'127.0.0.1',()=>resolve(server));
  });
  t.after(()=>new Promise((resolve,reject)=>handle.close(err=>err?reject(err):resolve())));
  const base='http://127.0.0.1:'+handle.address().port;
  for(const lang of ['fi','sv','en']){
    const url='/asiakaspalvelubotti'+(lang==='fi'?'':'?lang='+lang);
    const res=await fetch(base+url);
    assert.equal(res.status,200,url);
    const html=await res.text();
    assert.ok(html.includes('<html lang="'+lang+'">'),lang+' document language');
    assert.ok(html.includes('name="robots" content="index,follow'),lang+' indexing disabled');
    assert.ok(html.includes('rel="canonical"'),lang+' canonical missing');
    assert.ok(html.includes('hreflang="fi"')&&html.includes('hreflang="sv"')&&html.includes('hreflang="en"'),'missing alternate languages');
    assert.ok(html.includes(customerServiceLandingMarkup(lang)),'SSR mismatch for '+url);
    assert.ok(html.includes('"@type":"FAQPage"')||html.includes('\\\"@type\\\":\\\"FAQPage\\\"'),'JSON-LD FAQ entity missing '+lang);
  }
  const synonym=await fetch(base+'/asiakaspalvelijabotti?lang=sv',{redirect:'manual'});
  assert.equal(synonym.status,301);
  assert.ok(synonym.headers.get('location')?.endsWith('/asiakaspalvelubotti?lang=sv'));
  const unknownLang=await fetch(base+'/asiakaspalvelijabotti?lang=xx',{redirect:'manual'});
  assert.equal(unknownLang.status,301);
  assert.ok(unknownLang.headers.get('location')?.endsWith('/asiakaspalvelubotti'));
  const sitemap=await (await fetch(base+'/sitemap.xml')).text();
  assert.ok(sitemap.includes('/asiakaspalvelubotti'));
  assert.ok(!sitemap.includes('/asiakaspalvelijabotti'), 'keyword aliases should not create duplicate indexable URLs');
});
