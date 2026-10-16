import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.mjs';
import {
  ecommerceCustomerServiceMeta,
  ecommerceCustomerServiceMarkup,
} from '../public/ecommerce-customer-service.mjs';
import { customerServiceLandingMarkup } from '../public/customer-service-landing.mjs';
import { globalResourcesMarkup } from '../public/global-resources.mjs';

test('ecommerce buyer-intent content is substantial, factual and localized',()=>{
  for(const lang of ['fi','sv','en']){
    const [title,description]=ecommerceCustomerServiceMeta(lang);
    assert.ok(title.includes('Respondo AI'),lang+' title');
    assert.ok(title.length>=30 && title.length<=75,lang+' title length '+title.length);
    assert.ok(description.length>=90 && description.length<=180,lang+' description length '+description.length);
    const html=ecommerceCustomerServiceMarkup(lang);
    assert.equal((html.match(/<h1>/g)||[]).length,1,lang+' one h1');
    assert.ok((html.match(/<h2>/g)||[]).length>=6,lang+' must answer real shopping questions');
    assert.ok(html.length>2900,lang+' must be substantial');
    const suffix=lang==='fi'?'':'?lang='+lang;
    for(const path of ['/shopify-chatbot','/monikielinen-chatbot','/hinnat','/assistant']){
      assert.ok(html.includes('href="'+path+suffix+'"'),lang+' related URL '+path);
    }
    assert.ok(customerServiceLandingMarkup(lang).includes('href="/verkkokauppa-chatbot'+suffix+'"'));
    assert.ok(globalResourcesMarkup('/guides',lang).includes('href="/verkkokauppa-chatbot'+suffix+'"'));
  }
});

test('SSR e-commerce route supplies crawlable content, localized title and link equivalents',async(t)=>{
  const server=await new Promise(resolve=>{
    const handle=app.listen(0,'127.0.0.1',()=>resolve(handle));
  });
  t.after(()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())));
  const base='http://127.0.0.1:'+server.address().port;
  for(const lang of ['fi','sv','en']){
    const path='/verkkokauppa-chatbot'+(lang==='fi'?'':'?lang='+lang);
    const res=await fetch(base+path);
    assert.equal(res.status,200,path);
    assert.match(res.headers.get('content-type')||'',/text\/html/);
    const html=await res.text();
    const [title,description]=ecommerceCustomerServiceMeta(lang);
    assert.ok(html.includes('<title>'+title+'</title>'),path+' title');
    assert.ok(html.includes('content="'+description+'"'),path+' description');
    assert.ok(html.includes('<html lang="'+lang+'">'),path+' language');
    assert.ok(html.includes('<h1>'),path+' h1');
    assert.ok(html.includes('href="/shopify-chatbot'+(lang==='fi'?'':'?lang='+lang)+'"'),path+' related link');
    assert.match(html,/rel="canonical"/);
    assert.match(html,/hreflang="fi"/);
    assert.match(html,/hreflang="sv"/);
    assert.match(html,/hreflang="en"/);
    assert.ok((html.match(/<section class="ai-topic-section">/g)||[]).length>=5,path+' substantial SSR sections');
    const head=await fetch(base+path,{method:'HEAD'});
    assert.equal(head.status,200,path+' HEAD');
    assert.equal(await head.text(),'');
  }
});
