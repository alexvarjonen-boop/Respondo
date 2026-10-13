import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { app } from '../server.mjs';

const client=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const serverCode=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('guides route handles trailing slash and does not collide with the public/guides feed directory',async(t)=>{
  const listener=await new Promise(resolve=>{const srv=app.listen(0,'127.0.0.1',()=>resolve(srv));});
  t.after(()=>new Promise((resolve,reject)=>listener.close(err=>err?reject(err):resolve())));
  const origin='http://127.0.0.1:'+listener.address().port;

  for(const [pathname,lang,title] of [
    ['/guides?lang=fi','fi','AI-asiakaspalvelun oppaat'],
    ['/guides/?lang=fi','fi','AI-asiakaspalvelun oppaat'],
    ['/guides?lang=sv','sv','Guider till AI-kundservice'],
    ['/guides/?lang=en','en','Guides to AI customer support'],
    ['/guides/?lang=sv','sv','Guider till AI-kundservice'],
    ['/guides?lang=en','en','Guides to AI customer support'],
    ['/guides/ai-customer-service-chatbot?lang=fi','fi','AI-asiakaspalvelubotti']
  ]){
    const response=await fetch(origin+pathname,{redirect:'manual'});
    assert.equal(response.status,200,'Must not redirect or 404: '+pathname);
    assert.equal(response.headers.get('location'),null,'Must not redirect to a slash path: '+pathname);
    const html=await response.text();
    assert.ok(html.includes('<html lang="'+lang+'">'),pathname);
    assert.ok(html.includes(title),'Server-rendered guides absent: '+pathname);
    assert.ok(!html.includes('name="robots" content="noindex,nofollow"'),pathname);
    if(pathname.startsWith('/guides?')||pathname.startsWith('/guides/?')){
      assert.match(html,/<link rel="canonical" href="https:\/\/respondoai\.fi\/guides(?:\?lang=(?:sv|en))?">/);
      assert.match(html,/class="global-guide-card"/,'Guide directory cards must be available without JavaScript');
    }
  }

  const feed=await fetch(origin+'/guides/feed.xml',{redirect:'manual'});
  assert.equal(feed.status,200,'RSS feed must remain available');
  assert.match(await feed.text(),/<rss\b|<feed\b/);
});

test('browser handles trailing slash and metadata without falling into 404',()=>{
  assert.ok(client.includes("const path = location.pathname.replace(/\\/+$/, '') || '/';"));
  assert.ok(serverCode.includes('redirect:false,'));
  assert.match(client,/GLOBAL_GUIDE_PATHS\.includes\(path\)/);
});
