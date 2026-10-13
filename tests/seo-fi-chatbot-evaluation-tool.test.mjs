import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const finnish=readFileSync(new URL('../public/tools/asiakaspalvelubotti-testi.html',import.meta.url),'utf8');
const english=readFileSync(new URL('../public/tools/ai-chatbot-evaluation.html',import.meta.url),'utf8');
const serverSource=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const clientSource=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const homepage=readFileSync(new URL('../public/apple-home.js',import.meta.url),'utf8');
const mainGuide=readFileSync(new URL('../public/customer-service-landing.mjs',import.meta.url),'utf8');
const topics=readFileSync(new URL('../public/ai-topic-pages.mjs',import.meta.url),'utf8');
const shell=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('Finnish scorecard is an original accessible 25-case resource with client-side export',()=>{
  assert.match(finnish,/<html lang="fi">/);
  assert.match(finnish,/<title>Asiakaspalvelubotin testi/);
  assert.match(finnish,/name="robots" content="index,follow/);
  assert.match(finnish,/<link rel="canonical" href="https:\/\/respondoai.fi\/tools\/asiakaspalvelubotti-testi.html"/);
  assert.equal((finnish.match(/class="case" data-id="CAT\d{2}"/g)||[]).length,25);
  for(let i=1;i<=25;i++)assert.ok(finnish.includes('data-id="CAT'+String(i).padStart(2,'0')+'"'),'missing case '+i);
  assert.equal((finnish.match(/<textarea id="note\d+"/g)||[]).length,25);
  assert.match(finnish,/Tämä on Respondo AI:n julkaisema itsearviointityökalu/);
  assert.match(finnish,/Työkalu ei arvioi chatbotin vastauksia itsenäisesti/);
  assert.match(finnish,/data-status="review"/);
  assert.match(finnish,/data-status="untested"/);
  assert.match(finnish,/window\.print/);
  assert.match(finnish,/Blob\(\[data\]/);
  assert.match(finnish,/localStorage\./);
  assert.match(finnish,/kriittinen/);
  assert.match(finnish,/Tietojen eristys/);
  assert.match(finnish,/Byter ni bromsbelägg/);
  assert.match(finnish,/Do you replace brake pads/);
  assert.doesNotMatch(finnish,/<form\b/i,'user data must not be posted to a server');
  assert.doesNotMatch(finnish,/fetch\(/,'tool should not send private notes to a backend');
  const script=[...finnish.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
  assert.equal(script.length,1);
  assert.doesNotThrow(()=>new vm.Script(script[0]),'client-side scorecard script has syntax errors');
  const ld=finnish.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ld);
  const schema=JSON.parse(ld[1]);
  assert.equal(schema['@type'],'WebApplication');
  assert.equal(schema.inLanguage,'fi');
  assert.equal(schema.offers.price,'0');
});

test('Finnish and English resources use reciprocal hreflang and are linked from relevant pages',()=>{
  const fi='https://respondoai.fi/tools/asiakaspalvelubotti-testi.html';
  const en='https://respondoai.fi/tools/ai-chatbot-evaluation.html';
  for(const html of [finnish,english]){
    assert.ok(html.includes('hreflang="fi" href="'+fi+'"'));
    assert.ok(html.includes('hreflang="en" href="'+en+'"'));
  }
  assert.match(english,/lang="fi">Suomeksi/);
  assert.ok(homepage.includes('/tools/asiakaspalvelubotti-testi.html'));
  assert.ok(homepage.includes('/tools/ai-chatbot-evaluation.html'));
  assert.ok(topics.includes('/tools/asiakaspalvelubotti-testi.html'));
  assert.ok(topics.includes('/tools/ai-chatbot-evaluation.html'));
  assert.ok(mainGuide.includes('/tools/asiakaspalvelubotti-testi.html'));
  assert.ok(mainGuide.includes('/tools/ai-chatbot-evaluation.html'));
  assert.ok(clientSource.includes('fi-test-v1'),'site visitors need versioned module updates');
  assert.ok(shell.includes('fi-scorecard-v1'),'browser should not continue loading stale app code');
  assert.ok(serverSource.includes('/tools/asiakaspalvelubotti-testi.html'),'Finnish tool absent from sitemap');
});

test('Finnish scorecard and English counterpart are HTTP-accessible with proper sitemap entries',async(t)=>{
  const {app}=await import('../server.mjs');
  const listener=await new Promise(resolve=>{
    const srv=app.listen(0,'127.0.0.1',()=>resolve(srv));
  });
  t.after(()=>new Promise((resolve,reject)=>listener.close(err=>err?reject(err):resolve())));
  const base='http://127.0.0.1:'+listener.address().port;
  for(const [path,text] of [['/tools/asiakaspalvelubotti-testi.html',finnish],['/tools/ai-chatbot-evaluation.html',english]]){
    const response=await fetch(base+path);
    assert.equal(response.status,200,path);
    assert.match(response.headers.get('content-type')||'',/text\/html/);
    assert.equal(await response.text(),text,'served resource differs from source file');
  }
  const xml=await (await fetch(base+'/sitemap.xml')).text();
  assert.match(xml,/<loc>[^<]*\/tools\/asiakaspalvelubotti-testi.html<\/loc>/);
  assert.match(xml,/<loc>[^<]*\/tools\/ai-chatbot-evaluation.html<\/loc>/);
  const home=await (await fetch(base+'/')).text();
  assert.match(home,/\/tools\/asiakaspalvelubotti-testi.html/,'homepage SSR must link to tool');
});
