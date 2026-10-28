# Respondo AI — paid assisted setup billing after manual handover (2026-10-28)

## Customer billing contract
- This applies **only to new purchases** where the customer explicitly selects the optional **199 €** assisted-setup service. The setup fee is **charged immediately** via the existing Stripe subscription Checkout, as its own one-time line item.
- The selected Advanced / Premium / Enterprise monthly or yearly plan is shown separately in Checkout. Its **recurring payment collection is held** until the Respondo owner confirms that login credentials have personally been delivered via the private `/trafic` setup work queue.
- The paid plan's **three-day free trial begins at that confirmed handover**. The first recurring charge can be attempted only after that trial expires. Subsequently monthly/yearly billing follows the plan; a declined payment is handled by the existing Stripe webhook subscription lifecycle.
- Purchases **without** assisted setup retain their original three-day free trial starting at checkout. Historical subscriptions (including historical assisted-setup orders) are not silently rebilled or retroactively rescheduled.

## Implementation
- For assisted setup only, Stripe Checkout initially uses a long safety-buffer trial (365 days) and metadata `setup_billing_mode=after_handover`. This buffer may appear in Stripe Checkout as a long trial; the custom Checkout copy explicitly explains that it represents a hold until handover, **not** a 365-day entitlement.
- Once the **199 € setup invoice has been paid** and Checkout is complete, `holdAssistedSetupBilling()` sets Stripe `pause_collection={behavior:'void'}`, without a resume date. This is an indefinite collection hold even if the safety-buffer trial would expire. Never pause on `customer.subscription.created` or before initial payment, since that could void the one-time setup invoice.
- Owner-only `POST /api/app/internal/setup-service-requests/:id/handover` verifies the active paid subscription and credentials-ready or existing-workspace status, holds an advisory lock to prevent concurrent releases, stores `billing_release_requested_at` once, then calls `releaseAssistedSetupBilling()`: Stripe `trial_end = approvedAt + 3 days`, clear `pause_collection`, `proration_behavior:'none'`, and set `setup_billing_released=1`.
- Stripe update is idempotent by Checkout session ID; the approval timestamp remains stable on retries after a Stripe or database failure. Only **after Stripe confirms** the release does the order become `ready` in the database.
- Customer's initial acknowledgement email still states setup will be delivered within seven days; no password is automatically emailed. Owner personally sends credentials and marks delivered.
- If Stripe's hold or release fails, automatic emails and/or handover are retried safely, and the recurring subscription remains in its free-trial buffer or paused state.

## Important operational limitations and checks
- Stripe Checkout may show a 365-day provisional trial while the 199 € is charged up front. The added explanatory copy is essential; **review the exact Stripe-hosted payment page in Stripe test mode before accepting live assisted-setup payments**.
- The Stripe hold is set **after** successful Checkout payment. Webhook/redirect processing must be operational. Stripe and Respondo logs should be monitored for failures; do not assume a failed Stripe API call established a hold.
- Stripe is an external billing system. A rare Stripe outage or payment-method issue may delay the first invoice after the three-day post-handover trial. Financial statements should be reconciled against actual paid invoices, not local activation flags alone.
- A new setup service purchase with delayed collection is not a 365-day promotional trial. Existing plan subscriptions are never changed by this feature.
- Never trigger the owner handover endpoint until the customer has really received their login credentials. Owner access is guarded by `auth` + `ownerTrafficOnly` + the existing login rate limit.
