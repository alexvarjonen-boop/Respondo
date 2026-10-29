import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const traffic=readFileSync(new URL('../public/traffic.html',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a);
  assert.ok(a>=0&&b>a,start);
  return src.slice(a,b);
}

test('owner dialog shows both generated values instead of a placeholder and masked password',()=>{
  assert.match(traffic,/name="loginCode" type="text"[^>]*readonly aria-label/);
  assert.match(traffic,/name="password" type="text"[^>]*autocomplete="off"/);
  assert.doesNotMatch(traffic,/name="loginCode"[^>]*placeholder/);
  assert.doesNotMatch(traffic,/name="password" type="password"/);
  assert.match(traffic,/form\.elements\.loginCode\.value=job\.setup_login_code\|\|generateSetupLoginCode\(\)/);
  assert.match(traffic,/password\.type='text'/);
});

test('browser creates 48-bit login ID and a visible 24-character temporary password on dialog opening',()=>{
  const rng=crypto.webcrypto;
  const scripts=between(traffic,'function generateSetupLoginCode(){','async function saveSetupCredentials(');
  const fields={loginCode:{value:''},password:{value:'',readOnly:false,type:'password'}};
  const form={dataset:{},elements:fields,reset(){fields.loginCode.value='';fields.password.value='';}};
  const copy={hidden:false};
  const success={textContent:'not empty'};
  const company={textContent:''};
  const error={textContent:'not empty'};
  const dialog={showModal(){this.open=true;}};
  const nodes={
    setupCredentialDialog:dialog,setupCredentialForm:form,setupDialogCompany:company,
    setupDialogError:error,setupDialogSuccess:success,setupCopyMessage:copy,
  };
  const document={
    getElementById(id){return nodes[id];},
    querySelector(selector){assert.match(selector,/password/);return fields.password;},
  };
  const jobs=[
    {session_id:'cs_example_1234567891',first_workspace:true,company_name:'Demo'},
    {session_id:'cs_existing_1234567892',first_workspace:true,company_name:'Existing',setup_login_code:'RSP-ABCDEF123456'},
  ];
  const context={crypto:rng,Uint8Array,document,setupOrders:jobs,setupSaved:false};
  vm.createContext(context);
  vm.runInContext(scripts+';this.exports={generateSetupLoginCode,openSetupCredentials,generateSetupPassword};',context);
  const {generateSetupLoginCode,openSetupCredentials,generateSetupPassword}=context.exports;
  const seen=new Set(Array.from({length:100},generateSetupLoginCode));
  assert.equal(seen.size,100);
  for(const code of seen)assert.match(code,/^RSP-[0-9A-F]{12}$/);
  openSetupCredentials(jobs[0].session_id);
  assert.match(fields.loginCode.value,/^RSP-[0-9A-F]{12}$/);
  assert.equal(fields.password.value.length,24);
  assert.equal(fields.password.type,'text');
  assert.ok(dialog.open);
  assert.equal(copy.hidden,true);
  assert.equal(company.textContent,'Demo');
  const firstCode=fields.loginCode.value;
  const firstPass=fields.password.value;
  generateSetupPassword();
  assert.equal(fields.loginCode.value,firstCode,'regenerating a password does not change customer login');
  assert.notEqual(fields.password.value,firstPass);
  openSetupCredentials(jobs[1].session_id);
  assert.equal(fields.loginCode.value,'RSP-ABCDEF123456','existing customer retains their original login');
  assert.equal(fields.password.value.length,24);
});

test('backend accepts the previewed ID only with strict format; saved code cannot be rotated',()=>{
  const route=between(server,
    "app.post('/api/app/internal/setup-service-requests/:id/credentials'",
    '// Owner confirms the customer has personally received their login details');
  assert.match(route,/requestedCode=String\(req\.body\?\.loginCode\|\|''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(route,/!\/\^RSP-\[A-F0-9\]\{12\}\$\/\.test\(requestedCode\)/);
  assert.match(route,/job\.setup_login_code\|\|requestedCode\|\|newAssistedSetupLoginCode\(\)/);
  assert.match(route,/UPDATE users SET setup_login_code=\$1,password_hash=\$2,session_version=session_version\+1/);
  assert.match(route,/return res\.json\(\{ok:true,loginCode,manualDeliveryRequired:true\}\)/);
  assert.match(route,/passwordHash=await bcrypt\.hash\(password,12\)/);
  assert.doesNotMatch(route,/UPDATE users SET email=/);
  assert.match(server,/idx_users_setup_login_code/);
});

test('saving uses the exact login ID displayed and only unlocks copying after backend confirmation',()=>{
  const body=between(traffic,'async function saveSetupCredentials(event){','async function copySetupMessage()');
  assert.match(body,/const loginCode=form\.elements\.loginCode\.value\.trim\(\)/);
  assert.match(body,/body:JSON\.stringify\(\{password,loginCode\}\)/);
  assert.match(body,/result\.loginCode!==loginCode/);
  assert.match(body,/form\.elements\.password\.readOnly=true/);
  assert.match(body,/setupSaved=true/);
  assert.match(body,/document\.getElementById\('setupCopyMessage'\)\.hidden=false/);
  assert.match(traffic,/addEventListener\('input',invalidateUnsavedSetupCredentials\)/);
  assert.match(traffic,/copy\.hidden=true/);
  assert.match(traffic,/form\.elements\.password\.value=''/);
});
