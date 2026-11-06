import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const server=read('server.mjs');
const guide=read('public/integration-onboarding.js');
const docs=read('docs/microsoft-outlook-production.md');

test('Microsoft OAuth authorizes each account in common with delegated mailbox access',()=>{
  const start=server.indexOf('function nativeMailOauthConfig(provider)');
  const end=server.indexOf("app.get('/api/app/integrations/readiness'",start);
  const config=server.slice(start,end);
  assert.match(config,/https:\/\/login\.microsoftonline\.com\/common\/oauth2\/v2\.0\/authorize/);
  assert.match(config,/scope:'offline_access User\.Read Mail\.Read Mail\.Send'/);
  assert.match(config,/MICROSOFT_CLIENT_ID/);
  assert.match(config,/MICROSOFT_CLIENT_SECRET/);
  assert.match(docs,/AzureADandPersonalMicrosoftAccount/);
});

test('Outlook OAuth callback stays on same validated hostname for host-only session cookies',()=>{
  assert.match(server,/const nativeMailRedirect=\(provider,req\)=>\{/);
  assert.match(server,/hostname==='respondoai\.fi'\|\|hostname==='www\.respondoai\.fi'/);
  assert.match(server,/return 'https:\/\/'\+hostname\+suffix/);
  assert.match(server,/return BASE\+suffix/);
  assert.match(server,/redirect_uri:nativeMailRedirect\(provider,req\),response_type:'code'/);
  assert.match(server,/redirect_uri:nativeMailRedirect\(provider,req\)/);
  assert.doesNotMatch(server,/redirect_uri:nativeMailRedirect\(provider\)(?:,|\})/);
  assert.match(docs,/https:\/\/www\.respondoai\.fi\/api\/app\/native\/mail\/outlook\/callback/);
  assert.match(docs,/https:\/\/respondoai\.fi\/api\/app\/native\/mail\/outlook\/callback/);
});

test('tenant admin approval denied does not misleadingly look like user cancelled',()=>{
  const block=server.slice(server.indexOf("app.get('/api/app/native/mail/:provider/callback'"),server.indexOf('async function nativeMailRefresh'));
  assert.match(block,/admin_approval_required/);
  assert.match(block,/AADSTS\(\?:90094\|65001\|65004\|650056\)/);
  assert.match(block,/destination\(adminApproval\?'admin_approval_required':'cancelled'\)/);
  assert.match(guide,/admin_approval_required:\[/);
  assert.match(guide,/Organisaatiosi Microsoft 365 -ylläpitäjän/);
  assert.match(guide,/Organisationens Microsoft 365-administratör/);
  assert.match(guide,/Your Microsoft 365 administrator must approve/);
});

test('OAuth mailbox state remains tenant-bound and external replies require owner approval',()=>{
  const start=server.indexOf("app.get('/api/app/native/mail/:provider/start'");
  const end=server.indexOf('async function nativeMailRefresh',start);
  const handlers=server.slice(start,end);
  assert.match(handlers,/flow:'native_mail',provider,nonce,userId:req\.user\.sub,tenantId:/);
  assert.match(handlers,/state\.nonce!==cookie/);
  assert.match(handlers,/user\.sub!==state\.userId/);
  assert.match(handlers,/owner_user_id=\$1 AND id=\$2/);
  assert.match(server,/if\(req\.body\?\.approved!==true\)return res\.status\(400\)/);
  assert.match(docs,/Do not claim a connection is live until/);
});
