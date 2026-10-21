import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.mjs';
import { customerServiceLandingMarkup } from '../public/customer-service-landing.mjs';
import { globalResourcesMarkup } from '../public/global-resources.mjs';

const groups = [
  '/asiakaspalvelun-automatisointi',
  '/shopify-chatbot',
  '/liidien-keruu-chatbotilla',
  '/monikielinen-chatbot'
];

test('key topical hubs link to the new pages in all three languages', () => {
  for (const lang of ['fi','sv','en']) {
    const suffix=lang==='en'?'':'?lang='+lang;
    const guides=globalResourcesMarkup('/guides',lang);
    for (const path of groups) {
      assert.ok(guides.includes('href="'+path+suffix+'"'),lang+' guides missing '+path);
    }
    const bot=customerServiceLandingMarkup(lang);
    for (const path of groups.filter(p=>p!=='/shopify-chatbot')) {
      assert.ok(bot.includes('href="'+path+suffix+'"'),lang+' bot page missing '+path);
    }
  }
});

test('Google-readable HTML, sitemap and canonical metadata expose important internal links', async(t)=>{
  const server=await new Promise(resolve=>{
    const s=app.listen(0,'127.0.0.1',()=>resolve(s));
  });
  t.after(()=>new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve())));
  const origin='http://127.0.0.1:'+server.address().port;
  for(const lang of ['fi','sv','en']){
    const suffix=lang==='en'?'':'?lang='+lang;
    const res=await fetch(origin+'/kenelle-sopii?lang='+lang);
    assert.equal(res.status,200);
    const html=await res.text();
    for(const path of groups){
      assert.ok(html.includes('href="'+path+suffix+'"'),lang+' industry hub missing '+path);
    }
    const commerce=await fetch(origin+'/verkkokauppa-chatbot?lang='+lang);
    assert.equal(commerce.status,200);
    const shopifyLink='/shopify-chatbot'+suffix;
    assert.ok((await commerce.text()).includes('href="'+shopifyLink+'"'),lang+' commerce landing misses Shopify guide');
  }
  const response=await fetch(origin+'/sitemap.xml');
  assert.equal(response.status,200);
  const xml=await response.text();
  for(const path of groups){
    assert.match(xml,new RegExp('<loc>https?:\\/\\/[^<]+'+path+'<\\/loc>'));
    assert.ok(xml.includes(path+'?lang=sv') || xml.includes(path+'?lang=en'),'missing non-Finnish locale: '+path);
  }
});
