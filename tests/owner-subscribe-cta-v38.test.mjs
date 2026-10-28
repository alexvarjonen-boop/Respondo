import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const ws=read('workspace-continuation-v24.js'),app=read('app.js'),css=read('workspace-continuation-v24.css'),html=read('index.html');

test('demo owner has one clear subscription button immediately after chat scan status',()=>{
  assert.match(ws,/respondo-workspace-owner-cta/);
  assert.match(ws,/href="\/tilaus\?lang=\$\{lang\}"/);
  assert.match(ws,/Tilaa Respondo/);
  assert.match(ws,/Beställ Respondo/);
  assert.match(ws,/Subscribe to Respondo/);
  assert.ok(ws.indexOf('respondo-workspace-owner-cta')>ws.indexOf('respondo-workspace-scan'));
  assert.match(css,/\.respondo-workspace-subscribe-link/);
  assert.match(css,/min-height:46px/);
});
test('only an explicit Respondo platform buying intent gets fallback in owner preview replies',()=>{
  assert.match(app,/function previewRespondoSubscribeAction\(message, lang='en'\)/);
  assert.match(app,/mentionsRespondo/);
  assert.match(app,/if\(!mentionsRespondo \|\| !buying\)return null/);
  assert.match(app,/new URL\('\/tilaus',location\.origin\)/);
  assert.match(app,/function previewWithOwnerSubscribe\(actions,question,lang\)/);
  assert.match(app,/existing\.some\(item=>item\?\.type==='site_signup'/);
  assert.equal((app.match(/previewWithOwnerSubscribe\(result\.actions,question,currentLang\(\)\)/g)||[]).length,2);
});
test('real merchant product cards and existing support links remain distinct',()=>{
  assert.match(app,/appendPreviewProductCards\(bubble,result\.products,currentLang\(\)\)/);
  assert.match(app,/actionWrap\.appendChild\(link\)/);
  assert.match(app,/wrap\.appendChild\(link\)/);
  assert.match(app,/link\.href=action\.url/);
  assert.match(html,/workspace-continuation-v24\.css\?v=[^"]*owner-subscribe-v38/);
  assert.match(html,/app\.js\?v=[^"]*owner-subscribe-v38/);
  assert.match(app,/workspace-continuation-v24\.js\?v=20261028-owner-subscribe-v38/);
});
