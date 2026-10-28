// Paid assisted setup: charge the one-time 199 EUR fee at Checkout, but
// defer the recurring plan until Respondo's owner confirms handover.
// A finite trial is supplemented by an indefinite Stripe collection pause,
// because a trial alone would eventually generate an unattended invoice.
export const SETUP_BILLING_HOLD_DAYS = 365;

export function setupPlanTrialDays(selected) {
  return selected ? SETUP_BILLING_HOLD_DAYS : 3;
}

export async function ensureManualSetupBillingOnHold(stripe, subscriptionId) {
  if(!stripe || !String(subscriptionId || '').startsWith('sub_'))
    throw new Error('Setup subscription unavailable');
  const sub=await stripe.subscriptions.retrieve(subscriptionId);
  if(sub.metadata?.setup_billing_deferred!=='1') return {deferred:false};
  if(sub.metadata?.setup_billing_started==='1') return {deferred:true,alreadyStarted:true};
  if(sub.status!=='trialing') throw new Error('Deferred setup trial is no longer active');
  if(sub.pause_collection?.behavior==='void' && !sub.pause_collection?.resumes_at)
    return {deferred:true,alreadyHeld:true};
  await stripe.subscriptions.update(subscriptionId,{
    pause_collection:{behavior:'void'},
  },{idempotencyKey:'respondo-hold-'+subscriptionId});
  return {deferred:true,held:true};
}

export async function startManualSetupBilling(stripe, subscription, sessionId) {
  if(!stripe || !subscription?.id || !String(sessionId||'').startsWith('cs_'))
    throw new Error('Missing confirmed setup subscription');
  if(subscription.metadata?.setup_billing_deferred!=='1')
    return {deferred:false,startedNow:false};
  if(subscription.metadata?.setup_billing_started==='1')
    return {deferred:true,startedNow:false,alreadyStarted:true};
  if(subscription.status!=='trialing')
    throw new Error('Deferred setup subscription already left trialing state');

  // Atomic Stripe update clears indefinite collection pause AND ends the trial.
  // This starts the selected monthly/annual plan billing at the handover time.
  // An idempotency key prevents duplicate invoices for repeated confirmations.
  const active=await stripe.subscriptions.update(subscription.id,{
    trial_end:'now',
    pause_collection:'',
    proration_behavior:'none',
    metadata:{
      setup_billing_started:'1',
      setup_billing_handover_session:sessionId,
    },
  },{idempotencyKey:'respondo-handover-billing-'+sessionId});
  if(active.pause_collection || active.status==='trialing')
    throw new Error('Stripe did not release the manual setup billing hold');
  return {deferred:true,startedNow:true,status:active.status};
}
