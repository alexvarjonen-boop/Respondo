import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const server = read('server.mjs');
const app = read('public/app.js');
const traffic = read('public/traffic.html');

test('199-euro assisted setup is opt-in, one-time and separately listed in both checkouts', () => {
  const start=server.indexOf('function setupServiceCheckoutLineItem()');
  const end=server.indexOf('async function stripeCheckoutLineItem(',start);
  assert.ok(start>=0 && end>start);
  const item=server.slice(start,end);
  assert.match(server,/SETUP_SERVICE_PRICE_CENTS\s*=\s*19900/);
  assert.match(item,/unit_amount:SETUP_SERVICE_PRICE_CENTS/);
  assert.doesNotMatch(item,/recurring\s*:/);
  assert.equal((server.match(/line_items:setupService\s*\?\s*\[checkoutLineItem,setupServiceCheckoutLineItem\(\)\]\s*:\s*\[checkoutLineItem\]/g)||[]).length,2);
  assert.match(app,/type="checkbox" name="setupService" value="1"/);
  assert.doesNotMatch(app.slice(app.indexOf('function setupServiceOption()'),app.indexOf('function bindSetupServiceOptions()')),/type="checkbox"[^>]*checked/);
});

test('paid assisted setup collects a website and does not require buyer to pick password',()=>{
  assert.match(app,/name="setupWebsite"/);
  assert.match(app,/url\.required=checkbox\.checked/);
  assert.match(app,/passwordInput\.required=!checkbox\.checked&&!socialSignup/);
  assert.match(server,/setupServiceWebsiteUrl\(req\.body\?\.setupWebsite,setupService\)/);
  assert.match(server,/bcrypt\.hash\(\(socialSignup \|\| setupService\) \? crypto\.randomBytes\(32\)/);
  assert.match(server,/!socialSignup && !setupService && \(!password/);
});

test('confirmation email is sent only for fully paid Stripe checkout and promises completion within one week in all locales',()=>{
  const start=server.indexOf('async function notifySetupServiceAfterCheckout(session)');
  const end=server.indexOf('async function sendHomepageContactEmail(',start);
  const flow=server.slice(start,end);
  assert.ok(start>=0 && end>start);
  assert.match(flow,/session\?\.status !== 'complete'/);
  assert.match(flow,/session\?\.payment_status !== 'paid'/);
  assert.match(flow,/ON CONFLICT\(session_id\) DO NOTHING/);
  assert.match(flow,/customer_emailed_at=NOW\(\)/);
  assert.match(flow,/owner_emailed_at=NOW\(\)/);
  assert.match(flow,/Käyttöönottopalvelusi on käsittelyssä/);
  assert.match(flow,/viimeistään viikon kuluessa tilauksestasi/);
  assert.match(flow,/inom en vecka/);
  assert.match(flow,/within one week/);
  assert.match(flow,/Respondo AI <info@respondoai.fi>/);
  assert.doesNotMatch(flow,/turvallisen kertakäyttöisen linkin/);
  assert.match(server,/notifySetupServiceAfterCheckout\(session\)/);
});

test('confirmation page explains seven-day personal credential handover, without false email claims',()=>{
  assert.match(app,/function setupOrderConfirmation\(\)/);
  assert.match(app,/\/kayttoonotto-vahvistettu/);
  assert.match(app,/get\('email'\)==='sent'/);
  assert.match(app,/Olemme lähettäneet sinulle sähköpostia/);
  assert.match(app,/Vahvistussähköposti on käsittelyssä/);
  assert.match(app,/Saat kirjautumistiedot viimeistään viikon kuluessa/);
  assert.match(app,/Valitun paketin laskutus alkaa vasta/);
  assert.doesNotMatch(app.slice(app.indexOf('function setupOrderConfirmation()'),app.indexOf('function login()',app.indexOf('function setupOrderConfirmation()'))),/salasanan luomiseen/);
});

test('owner alone can assign credentials to a purchased first workspace, securely hash and manually hand them over',()=>{
  assert.match(server,/app\.post\('\/api\/app\/internal\/setup-service-requests\/:id\/credentials', auth, ownerTrafficOnly, loginLimiter/);
  assert.match(server,/app\.post\('\/api\/app\/internal\/setup-service-requests\/:id\/handover', auth, ownerTrafficOnly, loginLimiter/);
  assert.match(server,/FOR UPDATE OF sr,u/);
  assert.match(server,/t\.subscription_status IN \('active','trialing'\)/);
  assert.match(server,/u\.stripe_subscription_id IS DISTINCT FROM t\.stripe_subscription_id/);
  assert.match(server,/bcrypt\.hash\(password,12\)/);
  assert.match(server,/session_version=session_version\+1/);
  assert.match(server,/UPDATE password_reset_tokens SET used_at=NOW\(\)/);
  assert.match(server,/status='credentials_created'/);
  assert.match(server,/status='ready'/);
  assert.match(server,/manualDeliveryRequired:true/);
  assert.doesNotMatch(server,/async function sendReadySetupServiceEmailOnce/);
  assert.match(server,/app\.post\('\/api\/app\/internal\/setup-service-requests\/:id\/ready', auth, ownerTrafficOnly, \(req,res\) => \{/);
  assert.match(server,/res\.status\(410\)/);
});

test('owner traffic page shows private setup queue and manual send controls in all languages',()=>{
  assert.match(server,/app\.get\('\/trafic'/);
  assert.match(traffic,/id="setup-orders"/);
  assert.match(traffic,/\/api\/app\/internal\/setup-service-requests/);
  assert.match(traffic,/\/credentials/);
  assert.match(traffic,/\/handover/);
  assert.match(traffic,/navigator\.clipboard\.writeText/);
  assert.match(traffic,/info@respondoai\.fi/);
  assert.match(traffic,/fi:\s*\{[\s\S]*?Luo tunnukset/);
  assert.match(traffic,/sv:\s*\{[\s\S]*?Skapa inloggning/);
  assert.match(traffic,/en:\s*\{[\s\S]*?Create credentials/);
  assert.match(app,/href="\/trafic#setup-orders"/);
  assert.doesNotMatch(app,/data-setup-ready/);
});
