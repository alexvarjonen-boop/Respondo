import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const server=read('server.mjs'),app=read('public/app.js'),traffic=read('public/traffic.html');

test('new setup checkout prices paid setup at 199 and free founder setup at zero',()=>{
  assert.equal((server.match(/line_items:setupService\s*\?\s*\[checkoutLineItem,setupServiceCheckoutLineItem\(freeReferral\)\]\s*:\s*\[checkoutLineItem\]/g)||[]).length,2);
  assert.match(server,/SETUP_SERVICE_PRICE_CENTS\s*=\s*19900/);
  assert.match(server,/assistedSetupCheckoutTrial\(setupService\)/);
  assert.match(server,/setup_billing_mode:'after_handover'/);
  assert.match(server,/assist.*SetupCheckoutNotice\(preferredLanguage\)/);
  assert.match(server,/assist.*SetupCheckoutNotice\(user\.preferred_language\|\|'fi'\)/);
});

test('Stripe webhooks hold payment collection for paid assisted setup before acknowledging completion',()=>{
  const start=server.indexOf("if (event.type === 'checkout.session.completed')");
  const end=server.indexOf("if (event.type === 'invoice.paid')",start);
  assert.ok(start>0&&end>start);
  const flow=server.slice(start,end);
  assert.match(flow,/await holdAssistedSetupBilling\(stripe, incomingSubscriptionId\)/);
  assert.match(flow,/notifySetupServiceAfterCheckout\(session\)/);
  assert.match(flow,/setupCheckoutPaymentConfirmed\(session\) && incomingSubscriptionId/);
  assert.doesNotMatch(server,/event\.type === 'customer.subscription.created' &&[\s\S]{0,170}holdAssistedSetupBilling/);
});

test('owner-only personal handover persists a stable approval timestamp and only marks ready after Stripe release',()=>{
  const start=server.indexOf("app.post('/api/app/internal/setup-service-requests/:id/handover'");
  const end=server.indexOf("// Disable the former auto-delivery endpoint",start);
  assert.ok(start>0&&end>start);
  const route=server.slice(start,end);
  assert.match(route,/auth, ownerTrafficOnly, loginLimiter/);
  assert.match(route,/stripe\.subscriptions\.retrieve\(job\.stripe_subscription_id\)/);
  assert.match(route,/billing_release_requested_at=COALESCE\(billing_release_requested_at,NOW\(\)\)/);
  assert.match(route,/await releaseAssistedSetupBilling\(/);
  assert.ok(route.indexOf("await releaseAssistedSetupBilling(")<route.indexOf("status='ready'"));
  assert.match(route,/manualHandoverConfirmed:true/);
});

test('billing-hold is described consistently in purchase and owner handover UI',()=>{
  assert.match(app,/Tilauspaketin laskutus alkaa vasta/);
  assert.match(app,/3 päivän maksuton kokeilu/);
  assert.match(app,/Subscription billing is held until we deliver/);
  assert.match(traffic,/3 päivän kokeilu ja sitä seuraava laskutus alkavat vasta tämän vahvistuksen jälkeen/);
  assert.match(traffic,/result\.billingDeferredUntilHandover/);
});
