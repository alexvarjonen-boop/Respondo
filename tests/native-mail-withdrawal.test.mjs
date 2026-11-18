import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {app} from '../server.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all legacy Gmail/Outlook mailbox endpoints fail closed, including direct OAuth links',async()=>{
  const server=await new Promise(resolve=>{
    const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));
  });
  try{
    const origin='http://127.0.0.1:'+server.address().port;
    const cases=[
      ['GET','/api/app/native/mail/status'],
      ['GET','/api/app/native/mail/gmail/start'],
      ['GET','/api/app/native/mail/outlook/start'],
      ['GET','/api/app/native/mail/gmail/callback?code=example&state=example'],
      ['POST','/api/app/native/mail/gmail/sync'],
      ['DELETE','/api/app/native/mail/outlook'],
      ['POST','/api/app/native/inbox/00000000-0000-0000-0000-000000000000/mail-reply']
    ];
    for(const [method,path] of cases){
      const response=await fetch(origin+path,{method,redirect:'manual'});
      assert.equal(response.status,410,method+' '+path);
      assert.equal((await response.json()).code,'native_mail_disabled',path);
      assert.equal(response.headers.get('location'),null,path);
    }
    // This separate OAuth route is normal customer sign-in, not mailbox read.
    const login=await fetch(origin+'/api/auth/oauth/google/start?flow=login',{redirect:'manual'});
    assert.equal(login.status,302);
    assert.notEqual(login.headers.get('location'),null);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('native mailbox worker is off even if old environment flag is set',()=>{
  const server=read('server.mjs');
  assert.match(server,/const NATIVE_MAIL_CONNECTIONS_ENABLED=false/);
  assert.match(server,/if\(!NATIVE_MAIL_CONNECTIONS_ENABLED\|\|!pool/);
  assert.match(server,/if\(NATIVE_MAIL_CONNECTIONS_ENABLED\)\{\s+const mailPollTimer/);
  assert.match(server,/gmail:NATIVE_MAIL_CONNECTIONS_ENABLED&&google/);
  assert.match(server,/outlook:NATIVE_MAIL_CONNECTIONS_ENABLED&&microsoft/);
  assert.match(server,/app\.get\('\/api\/auth\/google|GOOGLE_CLIENT_ID/);
});

test('owner interface has no Gmail/Outlook setup controls or searchable mailbox entry',()=>{
  const appJs=read('public/app.js');
  const onboarding=read('public/integration-onboarding.js');
  const workspace=read('public/workspace-continuation-v24.js');
  const index=read('public/index.html');
  assert.doesNotMatch(appJs,/<article class="panel" id="native-mail-connections"/);
  assert.doesNotMatch(onboarding,/\{id:'(?:gmail|outlook)',group:'mail'/);
  assert.doesNotMatch(onboarding,/\{id:'mail',label:/);
  assert.doesNotMatch(workspace,/\['native-mail-connections',translate/);
  assert.doesNotMatch(workspace,/\['Sähköpostin yhdistäminen'/);
  assert.match(index,/app\.js\?v=[^"]*native-mail-disabled-v50/);
  assert.match(index,/integration-onboarding\.js\?v=[^"]*native-mail-disabled-v50/);
  assert.match(appJs,/workspace-continuation-v24\.js\?v=[^']*native-mail-disabled-v50/);
});
