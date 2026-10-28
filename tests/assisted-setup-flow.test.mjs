import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const server = read('server.mjs');
const app = read('public/app.js');

test('199-euro setup is opt-in, one-time and checked on both paid subscription checkouts', () => {
  const itemStart=server.indexOf('function setupServiceCheckoutLineItem()');
  const itemEnd=server.indexOf('async function stripeCheckoutLineItem(',itemStart);
  assert.ok(itemStart>=0 && itemEnd>itemStart);
  const item=server.slice(itemStart,itemEnd);
  assert.match(server,/SETUP_SERVICE_PRICE_CENTS\s*=\s*19900/);
  assert.match(item,/unit_amount:SETUP_SERVICE_PRICE_CENTS/);
  assert.doesNotMatch(item,/recurring\s*:/);
  assert.equal((server.match(/line_items:setupService\s*\?\s*\[checkoutLineItem,setupServiceCheckoutLineItem\(\)\]\s*:\s*\[checkoutLineItem\]/g)||[]).length,2);
  assert.match(app,/type="checkbox" name="setupService" value="1"/);
  assert.doesNotMatch(app.slice(app.indexOf('function setupServiceOption()'),app.indexOf('function bindSetupServiceOptions()')),/type="checkbox"[^>]*checked/);
});

test('assisted setup requires a website and replaces the signup password with a post-setup setup link',()=>{
  assert.match(app,/name="setupWebsite"/);
  assert.match(app,/url\.required=checkbox\.checked/);
  assert.match(app,/passwordInput\.required=!checkbox\.checked&&!socialSignup/);
  assert.match(server,/setupServiceWebsiteUrl\(req\.body\?\.setupWebsite,setupService\)/);
  assert.match(server,/bcrypt\.hash\(\(socialSignup \|\| setupService\) \? crypto\.randomBytes\(32\)/);
  assert.match(server,/!socialSignup && !setupService && \(!password/);
});

test('customer and owner get confirmation only for completed paid Stripe orders, never for an uncompleted checkout',()=>{
  const start=server.indexOf('async function notifySetupServiceAfterCheckout(session)');
  const end=server.indexOf('async function sendHomepageContactEmail(',start);
  assert.ok(start>=0 && end>start);
  const flow=server.slice(start,end);
  assert.match(flow,/session\?\.status !== 'complete'/);
  assert.match(flow,/session\?\.payment_status !== 'paid'/);
  assert.match(flow,/setup_service_requests \(/);
  assert.match(flow,/ON CONFLICT\(session_id\) DO NOTHING/);
  assert.match(flow,/customer_emailed_at=NOW\(\)/);
  assert.match(flow,/owner_emailed_at=NOW\(\)/);
  assert.match(flow,/Käyttöönottopalvelusi on vastaanotettu/);
  assert.match(flow,/verkkosivustoon/);
  assert.match(flow,/turvallisen kertakäyttöisen linkin/);
  assert.match(server,/notifySetupServiceAfterCheckout\(session\)/);
});

test('the customer sees localized order confirmation, not a fake claim that an email was delivered',()=>{
  assert.match(app,/function setupOrderConfirmation\(\)/);
  assert.match(app,/\/kayttoonotto-vahvistettu/);
  assert.match(app,/get\('email'\)==='sent'/);
  assert.match(app,/Olemme lähettäneet sinulle sähköpostia/);
  assert.match(app,/Vahvistussähköposti on käsittelyssä/);
  assert.match(app,/Lähetämme kirjautumisosoitteesi ja turvallisen linkin/);
  assert.match(server,/return res\.redirect\('\/kayttoonotto-vahvistettu\?email='/);
});

test('only the verified Respondo owner can mark installation ready and send a secure password-creation link',()=>{
  const start=server.indexOf('async function sendReadySetupServiceEmailOnce(sessionId)');
  const end=server.indexOf("app.get('/api/app/workspaces/checkout-success'",start);
  assert.ok(start>=0 && end>start);
  const flow=server.slice(start,end);
  assert.match(flow,/ready_emailed_at/);
  assert.match(flow,/if\(job\.ready_emailed_at\) return \{ready:true,alreadySent:true\}/);
  assert.match(flow,/crypto\.randomBytes\(32\)\.toString\('base64url'\)/);
  assert.match(flow,/crypto\.createHash\('sha256'\)/);
  assert.match(flow,/password_reset_tokens/);
  assert.match(flow,/INTERVAL '7 days'/);
  assert.match(flow,/status='ready',ready_emailed_at=NOW\(\)/);
  assert.match(flow,/auth, ownerTrafficOnly/);
  assert.match(app,/setupServiceAdminList/);
  assert.match(app,/data-setup-ready/);
  assert.match(app,/Onko tämän yrityksen botti oikeasti valmis tarkistettavaksi/);
  assert.doesNotMatch(flow,/password:\s*initialPasswordToken/);
});
