import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const appClient = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('public widget APIs do not trust missing Origin or Referer', () => {
  assert.match(server, /const external = !origin \|\| normalizeHost\(origin\.hostname\) !== baseHost;/);
  assert.match(server, /const externalWidgetRequest = !origin \|\| normalizeHost\(origin\.hostname\) !== baseHost;/);
  assert.doesNotMatch(server, /const external = Boolean\(origin && normalizeHost\(origin\.hostname\) !== baseHost\);/);
});

test('public tenant access follows only the workspace subscription', () => {
  assert.match(server, /WHERE t\.slug=\$1[\s\S]*AND t\.subscription_status IN \('active','trialing'\)/);
  assert.match(server, /COALESCE\(t\.subscription_cancel_at_period_end,false\)=false/);
  assert.match(server, /t\.current_period_end > NOW\(\)/);
  assert.doesNotMatch(server, /COALESCE\(t\.subscription_status,u\.subscription_status\) IN \('active','trialing'\)/);
});

test('website imports are pinned against DNS rebinding and scoped to the active tenant', () => {
  assert.match(server, /function pinnedPublicRequest\(/);
  assert.match(server, /lookup\(_hostname, lookupOptions, callback\)/);
  assert.match(server, /lookupOptions && lookupOptions\.all/);
  assert.match(server, /job=\{id:jobId,userId:req\.user\.sub,tenantId,website,status:'running'/);
  assert.match(server, /job\.tenantId!==tenantId/);
});

test('website importer blocks non-public address ranges beyond RFC1918', () => {
  assert.match(server, /a === 100 && b >= 64 && b <= 127/);
  assert.match(server, /a === 198 && \(b === 18 \|\| b === 19\)/);
  assert.match(server, /a >= 224/);
  assert.match(server, /value\.startsWith\('\:\:ffff\:'\)/);
  assert.match(server, /value\.startsWith\('ff'\)/);
});

test('website importer revalidates redirects and pins only vetted public DNS results', () => {
  assert.match(server,/dns\.lookup\(host, \{ all: true \}\)/);
  assert.match(server,/addresses\.some\(\(x\) => isPrivateAddress\(x\.address\)\)/);
  assert.match(server,/dns\.lookup\(host, \{ all:true, verbatim:true \}\)/);
  assert.match(server,/addresses\.some\(\(entry\) => isPrivateAddress\(entry\.address\)\)/);
  assert.match(server,/const resolved = await resolvePinnedPublicAddress\(url\)/);
  assert.match(server,/pinnedPublicRequest\(url, resolved, controller\.signal/);
  assert.match(server,/url = await assertPublicHttpUrl\(new URL\(location,url\)\.href\)/);
  assert.match(server,/for \(let redirects = 0; redirects < 4; redirects\+\+\)/);
  assert.doesNotMatch(server,/fetchPublicResource[\s\S]{0,1800}\bfetch\(url/);
});

test('agent live takeover resolves the agent tenant instead of owner_user_id=agent id', () => {
  assert.match(server, /req\.user\.role === 'agent'[\s\S]{0,500}SELECT t\.\* FROM tenants t JOIN users u ON u\.id=t\.owner_user_id WHERE t\.id=\$1/);
  assert.match(server, /ct\.assigned_agent_id=\$3[\s\S]{0,120}u\.status='active'[\s\S]{0,120}t\.active=true/);
});

test('owner free checkout bypass is env-configured, reusable and separate from referrals', () => {
  assert.match(server, /process\.env\.OWNER_FREE_CODE/);
  assert.doesNotMatch(server, /const FREE_REFERRAL_CODE = ['"][A-Z0-9-]+['"]/);
  assert.match(server, /async function consumeOwnerFreeCode\(_client, value\)/);
  assert.match(server, /return isFreeReferralCode\(value\)/);
  assert.doesNotMatch(server, /owner_free_code_used_sha256/);
  assert.ok((server.match(/consumeOwnerFreeCode\(client, referralCode\)/g)||[]).length >= 2);
  assert.match(server, /referrer_user_id=\$1 AND stripe_discount_applied=TRUE LIMIT 1/);
});

test('production start path enables the paid-service safety guard', () => {
  assert.equal(pkg.scripts.start, 'node server-entry.mjs');
});

test('signup checkout can recover a recreated pending account without losing a completed Stripe session', () => {
  assert.match(server, /async function resolveSignupCheckoutTarget\(session\)/);
  assert.match(server, /Recovered checkout for recreated pending account/);
  assert.match(server, /Duplicate signup subscription cancellation failed/);
});


test('user-configured WooCommerce and action webhooks use DNS-pinned outbound requests', () => {
  assert.match(server, /async function readPinnedResponse\(/);
  assert.match(server, /const resolved = await resolvePinnedPublicAddress\(url\);[\s\S]{0,500}pinnedPublicRequest\(url,resolved,controller\.signal/);
  assert.doesNotMatch(server, /async function wooApi[\s\S]{0,1200}await fetch\(url/);
  assert.doesNotMatch(server, /async function dispatchActionWebhook[\s\S]{0,1600}await fetch\(url/);
});

test('authentication and checkout routes have dedicated abuse limits', () => {
  assert.match(server, /const loginLimiter = rateLimit\(/);
  assert.match(server, /const checkoutLimiter = rateLimit\(/);
  assert.match(server, /app\.post\('\/api\/auth\/login', loginLimiter,/);
  assert.match(server, /app\.post\('\/api\/auth\/agent-login', loginLimiter,/);
  assert.match(server, /app\.post\('\/api\/auth\/start-checkout', checkoutLimiter,/);
});

test('production refuses to start with an ephemeral JWT secret', () => {
  assert.match(server, /NODE_ENV === 'production'[\s\S]{0,120}JWT_SECRET is required in production/);
});


test('removed Twilio voice and SMS routes are absent from production server', () => {
  for (const marker of [
    "/api/app/voice",
    "/api/voice/:slug",
    "/api/sms/:slug/incoming",
    "sendTwilioSms(",
    "twilioApi(",
  ]) {
    assert.equal(server.includes(marker), false, 'Unexpected removed voice/SMS marker: ' + marker);
  }
});


test('sessions can be revoked and staff password reset revokes old staff JWTs', () => {
  assert.match(server, /ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version/);
  assert.match(server, /ALTER TABLE support_agents ADD COLUMN IF NOT EXISTS session_version/);
  assert.match(server, /session_version=session_version\+1/);
  assert.match(server, /app\.post\('\/api\/app\/support-agents\/:id\/password'/);
  assert.match(server, /sv:Number\(user\.session_version \|\| 0\)/);
});

test('owner password changes rotate the session and staff administration is owner-only', () => {
  assert.match(server, /app\.post\('\/api\/app\/account\/password', auth, ownerOnly, loginLimiter/);
  assert.match(server, /UPDATE users SET password_hash=\$1,session_version=session_version\+1/);
  assert.match(server, /setSession\(res,updated\.rows\[0\]\)/);
  assert.match(server, /app\.post\('\/api\/app\/support-agents', auth, ownerOnly, subscribed/);
  assert.match(server, /app\.delete\('\/api\/app\/support-agents\/:id', auth, ownerOnly, subscribed/);
  assert.match(server, /app\.post\('\/api\/app\/support-agents\/:id\/status', auth, ownerOnly, subscribed/);
  assert.match(server, /app\.post\('\/api\/app\/live\/:id\/assign', auth, ownerOnly, subscribed/);
});


test('owner login email changes require the current password and rotate sessions', () => {
  assert.match(server, /app\.post\('\/api\/app\/account\/email', auth, ownerOnly, loginLimiter/);
  assert.match(server, /bcrypt\.compare\(currentPassword,rr\.rows\[0\]\.password_hash\)/);
  assert.match(server, /SELECT 1 FROM users WHERE lower\(email\)=lower\(\$1\) AND id<>\$2 LIMIT 1/);
  assert.match(server, /SET email=\$1,session_version=session_version\+1,updated_at=NOW\(\)/);
  assert.match(server, /stripe\.customers\.update\(stripeCustomerId,\{ email:newEmail \}\)/);
  assert.match(server, /setSession\(res,updated\.rows\[0\]\)/);
});

test('production requires a dedicated data encryption key while retaining legacy decryption compatibility', () => {
  assert.match(server, /DATA_ENCRYPTION_KEY is required in production/);
  assert.match(server, /const LEGACY_SECRET_KEY = crypto\.createHash\('sha256'\)\.update\(JWT\)\.digest\(\)/);
  assert.match(server, /decryptSecretWithKey\(text, LEGACY_SECRET_KEY\)/);
});


test('browser page traffic is canonicalized without redirecting APIs or widget traffic', () => {
  assert.match(server, /if \(process\.env\.NODE_ENV === 'production'\) \{[\s\S]{0,900}accept\.includes\('text\/html'\)/);
  assert.match(server, /req\.path\.startsWith\('\/api\/'\)/);
  assert.match(server, /requestHost !== canonicalHost[\s\S]{0,120}res\.redirect\(308, BASE \+ req\.originalUrl\)/);
});


test('UI translation failure degrades gracefully and legacy icon requests do not 404', () => {
  assert.doesNotMatch(server, /res\.status\(503\)\.json\(\{ error: lang === 'sv' \? 'Översättningstjänsten är tillfälligt otillgänglig\.'/);
  assert.match(server, /String\(value \|\| pending\[i\] \|\| ''\)/);
  assert.match(server, /\/favicon\.ico/);
  assert.match(server, /\/apple-touch-icon\.png/);
  assert.match(server, /\/apple-touch-icon-precomposed\.png/);
  assert.match(server, /sendFile\(path\.join\(__dirname,'public','favicon\.svg'\)\)/);
});


test('anonymous language switching stays local instead of calling an authenticated API', () => {
  assert.match(appClient, /if \(location\.pathname === '\/app'\)[\s\S]{0,220}\/api\/auth\/language/);
  const languageBlock = appClient.slice(appClient.indexOf('function bindLanguageSwitch'), appClient.indexOf('function nav'));
  assert.match(languageBlock, /localStorage\.setItem\('respondo_lang', lang\)/);
});


test('runtime schema migration is serialized across service replicas', () => {
  assert.match(server, /pg_advisory_lock\(hashtext\('respondo_runtime_schema_v1'\)\)/);
  assert.match(server, /pg_advisory_unlock\(hashtext\('respondo_runtime_schema_v1'\)\)/);
  assert.match(server, /withRuntimeSchemaLock\(\(\) => ensureRuntimeSchema\(\)\)/);
});


test('booking serializes the slot before the final Google Calendar conflict check', () => {
  const bookingStart=server.indexOf("if (type === 'booking')");
  const bookingEnd=server.indexOf("await q(\n      `INSERT INTO action_requests",bookingStart);
  assert.ok(bookingStart>=0 && bookingEnd>bookingStart);
  const block=server.slice(bookingStart,bookingEnd);
  const lock=block.indexOf('FOR UPDATE');
  const calendarCheck=block.indexOf('googleCalendarHasConflict(');
  const markBooked=block.indexOf("status='booked'");
  assert.ok(lock>=0,'booking row lock missing');
  assert.ok(calendarCheck>lock,'Google Calendar must be checked after acquiring the slot lock');
  assert.ok(markBooked>calendarCheck,'slot must only be booked after the calendar conflict check');
  assert.match(block,/if \(conflict\) \{[\s\S]{0,140}ROLLBACK[\s\S]{0,180}status\(409\)/);
  assert.match(block,/Google Calendar conflict check failed[\s\S]{0,220}status\(503\)/);
});

test('booking slot and action request commit atomically and Calendar creation is retry-safe', () => {
  const bookingStart=server.indexOf("if (type === 'booking')");
  const bookingEnd=server.indexOf("if (!actionInserted)",bookingStart);
  assert.ok(bookingStart>=0 && bookingEnd>bookingStart);
  const block=server.slice(bookingStart,bookingEnd);
  const markBooked=block.indexOf("UPDATE booking_slots SET status='booked'");
  const insertAction=block.indexOf('INSERT INTO action_requests');
  const commit=block.indexOf("client.query('COMMIT')");
  assert.ok(markBooked>=0 && insertAction>markBooked && commit>insertAction,
    'slot booking and action request must commit in the same transaction');
  assert.match(server, /calendarEventId=\('respondo' \+ String\(actionRequest\.id/);
  assert.match(server, /response\.status === 409 && calendarEventId/);
  assert.match(server, /duplicate:true/);
});

test('public non-chat endpoints are rate limited', () => {
  assert.match(server, /const publicReadLimiter = rateLimit/);
  assert.match(server, /const siteVisitLimiter = rateLimit/);
  assert.match(server, /const paymentVerifyLimiter = rateLimit/);
  assert.match(server, /const channelApiLimiter = rateLimit/);
  assert.ok(server.includes("app.post('/api/public/site-visit', siteVisitLimiter, async"));
  assert.ok(server.includes("app.get('/api/public/config', publicReadLimiter, async"));
  assert.ok(server.includes("app.get('/api/public/:slug/widget-token', publicReadLimiter, async"));
  assert.ok(server.includes("app.get('/api/public/:slug', publicReadLimiter, async"));
  assert.ok(server.includes("app.get('/api/public/payment/verify', paymentVerifyLimiter, async"));
  assert.ok(server.includes("app.post('/api/channel/:slug/message', channelApiLimiter, async"));
});


test('production health requires database and Stripe billing configuration', () => {
  assert.match(server, /DATABASE_URL is required in production/);
  assert.match(server, /Stripe billing configuration is required in production/);
  assert.match(server, /BASE_URL must be a valid HTTPS URL in production/);
  assert.match(server, /All six live Stripe price IDs are required in production/);
  assert.match(server, /function productionStripePricesConfigured\(\)/);
  for (const env of [
    'STRIPE_BASIC_MONTHLY_PRICE_ID','STRIPE_BASIC_YEARLY_PRICE_ID',
    'STRIPE_ADVANCED_MONTHLY_PRICE_ID','STRIPE_ADVANCED_YEARLY_PRICE_ID',
    'STRIPE_BUSINESS_MONTHLY_PRICE_ID','STRIPE_BUSINESS_YEARLY_PRICE_ID',
  ]) assert.match(server,new RegExp(env));
  assert.match(server, /ok: Boolean\(pool\) && stripeConfigured/);
});


test('dashboard mutations reject cross-site browser requests without affecting public APIs', () => {
  assert.match(server, /function rejectCrossSiteAuthenticatedMutation/);
  assert.match(server, /req\.path\.startsWith\('\/api\/app\/'\)/);
  assert.match(server, /fetchSite === 'cross-site'/);
  assert.match(server, /new URL\(originValue\)\.hostname/);
  assert.doesNotMatch(server, /req\.path\.startsWith\('\/api\/public\/'\)[\s\S]{0,120}rejectCrossSiteAuthenticatedMutation/);
});
