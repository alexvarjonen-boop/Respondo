import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('native channel intake has owner authentication, tenant scope and idempotency',()=>{
 assert.match(server,/app\.post\('\/api\/app\/native-integrations\/inbox', auth, ownerOnly, subscribed/);
 assert.match(server,/ON CONFLICT\(tenant_id,channel,external_message_id\) DO NOTHING/);
 assert.match(server,/SELECT id FROM tenants WHERE owner_user_id=\$1 AND id=active_tenant_for_user\(\$1\)/);
});
test('native email drafts never send without approval',()=>{
 assert.match(server,/autoSent:false/);
 assert.match(server,/requiresApproval:true/);
 assert.doesNotMatch(server.slice(server.indexOf("app.post('/api/app/native-integrations/inbox'"),server.indexOf("app.get('/api/app/native-integrations/inbox'")),/sendMail\(|sendEmail\(/);
});
test('booking proposals only use saved tenant slots, not submitted free times',()=>{
 const block=server.slice(server.indexOf("app.post('/api/app/booking-proposals'"),server.indexOf("app.post('/api/app/integrations'"));
 assert.match(block,/FROM booking_slots/);
 assert.doesNotMatch(block,/req\.body\?\.windows/);
 assert.match(block,/findSuitableStarts/);
});
test('calendar outage does not expose unverified slots',()=>{
 const block=server.slice(server.indexOf("app.get('/api/public/:slug/booking-slots'"),server.indexOf("app.get('/api/public/payment/verify'"));
 assert.match(block,/Google Calendar availability filter failed[\s\S]{0,160}slots = \[\]/);
});
test('dashboard exposes booking duration configuration and native channel review',()=>{
 assert.match(app,/id="nativeDurationForm"/);
 assert.match(app,/id="nativeProposalForm"/);
 assert.match(app,/id="nativeInboxList"/);
 assert.match(app,/id="nativeIntegrationForm"/);
 assert.match(app,/\/api\/app\/service-duration-rules/);
 assert.match(app,/\/api\/app\/native-integrations\/inbox/);
});

test('public booking refuses bypassing configured service duration rules',()=>{
 const block=server.slice(server.indexOf("app.post('/api/public/:slug/action-request'"),server.indexOf("app.post('/api/app/booking-slots/generate'"));
 assert.match(block,/anyRules\.rowCount && !fields\.serviceId/);
 assert.match(block,/serviceEstimate\.totalMinutes\*60000/);
});
test('public availability filters out shorter slots and asks for quantity',()=>{
 const block=server.slice(server.indexOf("app.get('/api/public/:slug/booking-slots'"),server.indexOf("app.get('/api/public/payment/verify'"));
 assert.match(block,/needsDetails:true/);
 assert.match(block,/estimateServiceDuration/);
 assert.match(block,/estimate\.totalMinutes\*60000/);
});
test('embedded chat requests available slots using service and quantity',()=>{
 const widget=fs.readFileSync(new URL('../public/widget.js',import.meta.url),'utf8');
 assert.match(widget,/name="serviceId"/);
 assert.match(widget,/name="quantity"/);
 assert.match(widget,/params\.set\('serviceId',serviceSelect\.value\)/);
 assert.match(widget,/params\.set\('quantity',quantityInput\.value\)/);
});

test('provider secrets are encrypted server-side and never listed or returned',()=>{
 assert.match(server,/native_provider_credentials/);
 assert.match(server,/encryptSecret\(token\)/);
 const status=server.slice(server.indexOf("app.get('/api/app/native-integrations/status'"),
   server.indexOf("app.post('/api/app/native-integrations/settings'"));
 assert.doesNotMatch(status,/encrypted_token/);
 const connect=server.slice(server.indexOf("app.post('/api/app/native-integrations/connect'"),
   server.indexOf("app.post('/api/app/native-integrations/disconnect'"));
 assert.match(connect,/ownerOnly/);
 assert.doesNotMatch(connect,/accessToken:token|token:token/);
});
test('provider inbox sync requires a verified connection and only creates review drafts',()=>{
 const sync=server.slice(server.indexOf("app.post('/api/app/native-integrations/sync'"),
  server.indexOf("app.get('/api/app/native-integrations/status'"));
 assert.match(sync,/i\.mode='connected'/);
 assert.match(sync,/ON CONFLICT\(tenant_id,channel,external_message_id\) DO NOTHING/);
 assert.match(sync,/autoSent:false/);
});
test('provider UI has connect and sync actions without credential display',()=>{
 assert.match(app,/id="nativeProviderConnectForm"/);
 assert.match(app,/id="nativeProviderSyncForm"/);
 assert.match(app,/\/api\/app\/native-integrations\/connect/);
 assert.match(app,/\/api\/app\/native-integrations\/sync/);
});

test('Gmail OAuth requests least-privilege readonly access with CSRF and tenant verification',()=>{
 const section=server.slice(server.indexOf("app.get('/api/app/native-integrations/gmail/start'"),server.indexOf("app.post('/api/app/native-integrations/connect'"));
 assert.match(section,/auth, ownerOnly, subscribed/);
 assert.match(section,/gmail\.readonly/);
 assert.match(section,/setOauthState\(res,nonce,'google'\)/);
 const callback=server.slice(server.indexOf("if \(statePayload.flow === 'native_gmail'\) \{"),server.indexOf("if \(statePayload.flow === 'calendar'\) \{",server.indexOf("if \(statePayload.flow === 'native_gmail'\) \{")) ;
 assert.match(callback,/sessionUser\.sub!==statePayload\.userId/);
 assert.match(callback,/encryptSecret\(refreshToken\)/);
 assert.match(callback,/readProvider\(\{provider:'gmail'/);
});
test('Gmail refresh token is encrypted at rest',()=>{
 assert.match(server,/encrypted_refresh_token TEXT/);
 assert.match(server,/decryptSecret\(stored\.rows\[0\]\.encrypted_refresh_token\)/);
 assert.match(server,/https:\/\/oauth2\.googleapis\.com\/token/);
});
