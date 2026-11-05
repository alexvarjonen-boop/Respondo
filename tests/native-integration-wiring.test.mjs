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
