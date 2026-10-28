// Billing is deferred only for new, paid assisted setup purchases.
// The setup fee is collected at Stripe Checkout; recurring charges cannot start
// until the Respondo owner confirms personal credential handover.
// Long trial is a safety buffer while checkout webhooks apply an indefinite
// Stripe payment-collection hold. The 3-day customer trial starts at handover.
export const ASSISTED_SETUP_HOLD_TRIAL_DAYS = 365;
export const ASSISTED_SETUP_CUSTOMER_TRIAL_DAYS = 3;
export const ASSISTED_SETUP_BILLING_MODE = 'after_handover';

export function assistedSetupCheckoutTrial(setupService) {
  return setupService
    ? { trial_period_days: ASSISTED_SETUP_HOLD_TRIAL_DAYS }
    : { trial_period_days: ASSISTED_SETUP_CUSTOMER_TRIAL_DAYS };
}

export function assistedSetupBillingMode(subscription) {
  return subscription?.metadata?.setup_billing_mode === ASSISTED_SETUP_BILLING_MODE;
}

export async function holdAssistedSetupBilling(stripe, subscriptionId) {
  if (!stripe || !String(subscriptionId || '').startsWith('sub_')) return { held:false, skip:true };
  const subscription=await stripe.subscriptions.retrieve(subscriptionId);
  if (!assistedSetupBillingMode(subscription)) return { held:false, legacy:true };
  if (subscription.metadata?.setup_billing_released === '1') return { held:false, released:true };
  if (subscription.pause_collection?.behavior === 'void') return { held:true, alreadyHeld:true };
  if (subscription.status !== 'trialing' ||
      !Number.isFinite(Number(subscription.trial_end)) ||
      subscription.trial_end <= Math.floor(Date.now()/1000) + 60) {
    throw new Error('Assisted setup subscription not safely trialing');
  }
  const updated=await stripe.subscriptions.update(
    subscriptionId,
    {pause_collection:{behavior:'void'},metadata:{setup_billing_held:'1'}},
    {idempotencyKey:'respondo-assisted-setup-hold-'+subscriptionId},
  );
  if(updated.pause_collection?.behavior !== 'void')
    throw new Error('Stripe did not confirm assisted setup billing hold');
  return {held:true};
}

export function assistedSetupTrialEndUnix(approvedAt) {
  const value=Math.floor(new Date(approvedAt).getTime()/1000);
  if(!Number.isFinite(value) || value<1) throw new Error('Invalid handover timestamp');
  return value+ASSISTED_SETUP_CUSTOMER_TRIAL_DAYS*86400;
}

export async function releaseAssistedSetupBilling(stripe, subscriptionId, sessionId, approvedAt) {
  if(!stripe || !String(subscriptionId||'').startsWith('sub_') ||
      !/^cs_[A-Za-z0-9_]{10,120}$/.test(String(sessionId||''))) {
    throw new Error('Invalid assisted setup billing release target');
  }
  const trialEnd=assistedSetupTrialEndUnix(approvedAt);
  const subscription=await stripe.subscriptions.retrieve(subscriptionId);
  if(!assistedSetupBillingMode(subscription)) return {legacy:true};
  if(subscription.metadata?.setup_billing_released === '1') {
    if(subscription.pause_collection) throw new Error('Released subscription is still paused');
    return {released:true,alreadyReleased:true,trialEnd:subscription.trial_end};
  }
  // Checkout has already charged the one-time 199 EUR setup fee, but not a
  // subscription period. Don't release a subscription in an unsafe state.
  if(subscription.status !== 'trialing' || subscription.pause_collection?.behavior!=='void')
    throw new Error('Assisted setup subscription must be held and trialing before release');
  if(trialEnd<=Math.floor(Date.now()/1000)+30)
    throw new Error('Assisted setup trial timestamp has expired');
  const updated=await stripe.subscriptions.update(subscriptionId,{
    trial_end:trialEnd,
    pause_collection:'',
    proration_behavior:'none',
    metadata:{setup_billing_released:'1'},
  },{idempotencyKey:'respondo-assisted-setup-release-'+sessionId});
  if(updated.pause_collection || updated.metadata?.setup_billing_released!=='1')
    throw new Error('Stripe did not confirm assisted setup release');
  return {released:true,trialEnd};
}
