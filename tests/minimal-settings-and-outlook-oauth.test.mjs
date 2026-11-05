import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const server=file('server.mjs');
const guide=file('public/integration-onboarding.js');
const css=file('public/workspace-settings-minimal-v55.css');
const workspace=file('public/workspace-continuation-v24.js');
const index=file('public/index.html');
const app=file('public/app.js');

test('Outlook OAuth missing configuration does not drop owner back into bot preview',()=>{
  assert.match(server,/const nativeMailReturn=\(provider,result\)=>'\/app\?'\+new URLSearchParams\(\{/);
  assert.match(server,/section:'integrations',provider:provider==='outlook'\?'outlook':'gmail',native_mail:result/);
  assert.match(server,/return res.redirect\(nativeMailReturn\(provider,'not_configured'\)\)/);
  assert.match(server,/const destination=code=>nativeMailReturn\(provider,code\)/);
  assert.match(server,/destination\('connected'\)/);
  assert.match(server,/destination\('cancelled'\)/);
  assert.doesNotMatch(server.slice(server.indexOf("app.get('/api/app/native/mail/:provider/start'"),
    server.indexOf("async function nativeMailRefresh")),
    /\/app\?section=automation&native_mail=/);
});

test('OAuth readiness uses server environment flags but never reveals Microsoft client secrets',()=>{
  const start=server.indexOf("app.get('/api/app/native/mail/status'");
  const end=server.indexOf("app.get('/api/app/native/mail/:provider/start'");
  const status=server.slice(start,end);
  assert.match(status,/oauthAvailable:\{/);
  assert.match(status,/outlook:Boolean\(nativeMailOauthConfig\('outlook'\)\?\.clientId&&nativeMailOauthConfig\('outlook'\)\?\.clientSecret\)/);
  assert.match(status,/connections:rows\.rows\.map/);
  assert.doesNotMatch(status,/clientId:|clientSecret:/);
  assert.match(guide,/oauthAvailable\.get\(item\.id\)===false/);
  assert.match(guide,/\['restricted','notConfigured','unverified'\]\.includes\(status\(item\)\)/);
  assert.match(guide,/mailboxFeedback\(lang,'not_configured',item\.id\)/);
  assert.match(guide,/if\(result\.mail\?\.oauthAvailable/);
});

test('returned OAuth errors are accessible and provider-specific in FI/SV/EN',()=>{
  assert.match(guide,/const oauthCode=urlParams\.get\('native_mail'\)/);
  assert.match(guide,/const oauthProvider=urlParams\.get\('provider'\)/);
  assert.match(guide,/notice\.setAttribute\('role',\(callbackOutcome==='connected'\|\|stripeCode==='return'\)\?'status':'alert'\)/);
  assert.match(guide,/const fromCallback=oauthCode&&\['gmail','outlook'\]\.includes\(oauthProvider\)/);
  assert.match(guide,/Vaatii ylläpidon asetukset/);
  assert.match(guide,/Kräver administratör/);
  assert.match(guide,/Needs administrator setup/);
});

test('minimal settings directory routes to existing live, not replacement, functionality',()=>{
  assert.match(workspace,/class="rs-settings-directory"/);
  assert.match(workspace,/class="rs-settings-directory-link" data-workspace-nav=/);
  for(const id of ['setup','answers','team','integrations','billing','profile']){
    assert.match(workspace,new RegExp("'"+id+"'\\s*,translate\\("));
  }
  assert.match(workspace,/original\.requestSubmit\(\)/);
  assert.match(workspace,/function selectView\(next\)/);
  assert.match(workspace,/showModuleTab\(primary\[selected\]\)/);
});

test('minimal design is scoped to authenticated workspace and keeps the orbit and real inputs',()=>{
  assert.match(css,/#app \.dashboard-premium-shell\.respondo-workspace-active/);
  assert.match(css,/\.rs-settings-directory-link/);
  assert.match(css,/\.rs-integration-oauth-feedback/);
  assert.match(css,/\.rs-integration-group-grid/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(index,/\/workspace-settings-minimal-v55\.css\?v=20261105-apple-settings-v55-outlook-fix-v2/);
  assert.match(index,/\/integration-onboarding\.js\?v=20261105-guided-setup-v5-callbacks-and-preflight/);
  assert.match(app,/guided-integrations-v1-apple-settings-v55/);
  assert.match(index,/settings-directory-v55-outlook-v1/);
});

test('service duration UI starts with simple fields and keeps advanced rules saved',()=>{
  const service=file('public/service-capacity-ui.js');
  assert.match(service,/const extra=\(label\)=>\{/);
  assert.match(service,/document\.createElement\('details'\)/);
  assert.match(service,/fieldTarget=extra\(t\.advanced\)/);
  assert.match(service,/const reflectMethod=\(\)=>\{/);
  assert.match(service,/unit\.closest\('\.service-field'\)\.hidden=method\.value==='fixed'/);
  assert.match(service,/method\.addEventListener\('change',reflectMethod\)/);
  assert.match(service,/for\(const \[key,input\] of Object\.entries\(fields\)\)/);
  assert.match(css,/\.rs-service-advanced-fields/);
  assert.match(css,/\.service-field\[hidden\]/);
  assert.match(index,/\/service-capacity-ui\.js\?v=20261105-service-catalog-v3-simplified/);
});
