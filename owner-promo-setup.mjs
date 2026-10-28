// The owner's complimentary-code plan stays free for its entire lifetime.
// A separately selected paid installation is still a €199 one-time purchase.
// Stripe creates a real zero-priced recurring subscription so the existing
// assisted-setup review, handover and email workflow can be reused safely.
const PAID_PLAN = /^(basic|advanced|business)_(monthly|yearly)$/;

export function ownerFreeCodeRequiresCheckout(freeCode, setupService) {
  return Boolean(freeCode && setupService);
}

export function ownerFreeCodeInstantActivation(freeCode, setupService) {
  return Boolean(freeCode && !setupService);
}

export function ownerFreeSetupRecurringLineItem(plan, productName) {
  const code = String(plan || '').trim();
  if (!PAID_PLAN.test(code)) {
    throw Object.assign(new Error('Valitse normaali maksullinen tilauspaketti.'), { publicStatus:400 });
  }
  return {
    price_data: {
      currency:'eur',
      unit_amount:0,
      recurring:{ interval:code.endsWith('_yearly') ? 'year':'month', interval_count:1 },
      product_data:{
        name:String(productName || code).slice(0,100)+' · maksuton promokoodilla',
        description:'Recurring plan complimentary with a personal owner code; separate setup billed once.',
      },
    },
    quantity:1,
  };
}
