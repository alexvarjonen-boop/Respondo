import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app} from '../server.mjs';

const backend=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const frontend=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('dashboard preview loads session cookies using the installed manual cookie parser',()=>{
  const start=backend.indexOf("app.post('/api/public/demo-chat'");
  const end=backend.indexOf("app.post('/api/public/demo-lead'",start);
  assert.ok(start>=0 && end>start);
  const route=backend.slice(start,end);
  assert.match(route,/const token = cookies\(req\)\[COOKIE\]/);
  assert.doesNotMatch(route,/req\.cookies\?\.respondo_session/);
  assert.match(route,/approved=true ORDER BY updated_at DESC/);
  assert.match(route,/previewIsFirstPartyRespondo=isFirstPartyRespondoTenant/);
  assert.match(route,/body\.dashboardPreview === true/);

  const previewStart=frontend.indexOf('const previewHistory = [];');
  assert.ok(previewStart>=0);
  const dashboardPreview=frontend.slice(previewStart,frontend.indexOf("$('#previewForm')?.addEventListener('submit'",previewStart)+2000);
  assert.match(dashboardPreview,/dashboardPreview: true/);
  assert.doesNotMatch(dashboardPreview,/loadPreviewFacts|customFacts/);
});

test('dashboard preview with no authenticated session refuses to masquerade as empty demo',async()=>{
  const server=app.listen(0);
  try{
    await new Promise(resolve=>server.once('listening',resolve));
    const address=server.address();
    const response=await fetch('http://127.0.0.1:'+address.port+'/api/public/demo-chat',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({dashboardPreview:true,message:'mitä teette',lang:'fi',profile:{companyName:'Example Company'}}),
    });
    assert.equal(response.status,401);
    const json=await response.json();
    assert.match(json.error,/Istunto on vanhentunut/);
  }finally{
    await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  }
});

test('public Try Bot demo remains usable without an authenticated cookie',async()=>{
  const server=app.listen(0);
  try{
    await new Promise(resolve=>server.once('listening',resolve));
    const address=server.address();
    const response=await fetch('http://127.0.0.1:'+address.port+'/api/public/demo-chat',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({publicDemo:true,message:'mitä teette',lang:'fi',
        profile:{companyName:'Demo company',services:'Ikkunanpesu ja ikkunanpesupalvelut.'}}),
    });
    assert.equal(response.status,200);
    const json=await response.json();
    assert.equal(typeof json.answer,'string');
  }finally{
    await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  }
});
