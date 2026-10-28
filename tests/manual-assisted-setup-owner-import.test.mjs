import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const server=read('server.mjs');
const traffic=read('public/traffic.html');

test('owner-only paid assisted setup importer uses existing safe crawler, bounded extraction and tenant-scoped writes',()=>{
  const start=server.indexOf("app.post('/api/app/internal/setup-service-requests/:id/import'");
  const end=server.indexOf("app.get('/api/app/internal/setup-service-requests'",start);
  assert.ok(start>0&&end>start);
  const flow=server.slice(start,end);
  assert.match(flow,/auth, ownerTrafficOnly/);
  assert.match(flow,/setupAdminImportLocks/);
  assert.match(flow,/sr\.website_url/);
  assert.match(flow,/t\.subscription_status IN \('active','trialing'\)/);
  assert.match(flow,/fetchWebsiteBundle\(website,45,32000/);
  assert.match(flow,/websiteKnowledgeCandidates\(bundle\)\.slice\(0,250\)/);
  assert.match(flow,/usableWebsiteRow/);
  assert.match(flow,/normalizeHost\(sourceUrl\)!==normalizeHost\(website\)/);
  assert.match(flow,/INSERT INTO knowledge/);
  assert.match(flow,/tenant_id=\$1/);
  assert.match(flow,/job\.tenant_id/);
  assert.match(flow,/BEGIN/);
  assert.match(flow,/COMMIT/);
  assert.match(flow,/ROLLBACK/);
});

test('manual setup credentials are owner-only, hashed, and never emailed by endpoint',()=>{
  const start=server.indexOf("app.post('/api/app/internal/setup-service-requests/:id/credentials'");
  const end=server.indexOf("// Owner confirms personal handover",start);
  const flow=server.slice(start,end);
  assert.ok(start>0&&end>start);
  assert.match(flow,/auth, ownerTrafficOnly, loginLimiter/);
  assert.match(flow,/bcrypt\.hash\(password,12\)/);
  assert.doesNotMatch(flow,/UPDATE tenants SET contact_email=/);
  assert.match(flow,/session_version=session_version\+1/);
  assert.doesNotMatch(flow,/api\.resend\.com|smtp|sendMail\(/i);
  assert.match(flow,/manualDeliveryRequired:true/);
  assert.match(server,/app\.post\('\/api\/app\/internal\/setup-service-requests\/:id\/ready'/);
  assert.match(server,/res\.status\(410\)/);
});

test('owner /trafic UI presents importer, seven-day deadline and manual credential handover',()=>{
  assert.match(server,/app\.get\('\/trafic'/);
  assert.match(traffic,/id="setup-orders"/);
  assert.match(traffic,/data-setup-import/);
  assert.match(traffic,/data-setup-create/);
  assert.match(traffic,/data-setup-handover/);
  assert.match(traffic,/\+7\*86400000/);
  assert.match(traffic,/status!=='credentials_created'/);
  assert.match(traffic,/\/import'/);
  assert.match(traffic,/\/credentials'/);
  assert.match(traffic,/\/handover'/);
  assert.match(traffic,/navigator\.clipboard\.writeText/);
  assert.match(traffic,/private browser window/);
});

test('customer gets seven-day processed notice from the business mailbox only after paid Stripe checkout',()=>{
  const a=server.indexOf('async function notifySetupServiceAfterCheckout(session)');
  const b=server.indexOf('async function sendHomepageContactEmail(',a);
  const flow=server.slice(a,b);
  assert.match(flow,/session\?\.status !== 'complete'/);
  assert.match(flow,/session\?\.payment_status !== 'paid'/);
  assert.match(flow,/viimeistään viikon kuluessa tilauksestasi/);
  assert.match(flow,/Respondo AI <info@respondoai\.fi>/);
  assert.match(flow,/ON CONFLICT\(session_id\) DO NOTHING/);
});
