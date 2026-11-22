# Respondo AI — Independent Sales Partner Program (DRAFT)

Status: **proposed; not active in production**. Owner: Tmi Movexa. Dated 2026-11-22.

## Business rules
- Independent B2B referral/sales contractors; real-world employment status must be reviewed by Finnish legal counsel.
- Commission proposed: EUR 50 excluding any applicable invoicing VAT per **new, attributable annual subscription**.
- No commission for free trials, monthly subscriptions, renewal orders, or duplicates.
- Commission becomes eligible only upon first successful **paid** Stripe invoice/payment after the trial and no refund.
- Refunds before approval make pending commissions ineligible. Never auto-claw back an earned paid commission without separate legally reviewed terms.
- Partner attribution must be stored server-side with explicit partner_id and timestamp at lead creation and checkout; no cookie-only attribution.
- Each partner can see only their own leads and commission events. Partner access cannot grant access to customer workspaces or other partners.
- Only owner/admin may approve payout. Invoices and bookkeeping remain outside automated payouts until reviewed.

## Proposed data objects
`sales_partners(id, status, display_name, contracting_entity, billing_service, consent_version, agreement_signed_at, created_at)`
`partner_leads(id, partner_id, business_name, contact_name, contact_role, business_email, source, marketing_opt_out, created_at, retention_until)`
`partner_attributions(id, partner_id, lead_id, customer_id, checkout_session_id, subscription_id, captured_at, confirmed_at)`
`commission_events(id, partner_id, subscription_id, stripe_invoice_id, amount_cents, currency, eligibility_status, confirmed_at, dispute_reason, created_at)`
`commission_payout_batches(id, partner_id, period_start, period_end, approved_by, approved_at, invoice_reference, paid_at)`

## Implementation safety requirements
1. Separate admin + partner roles with backend RLS/access checks; no dashboard-only authorization.
2. Partner referrals must use random non-sequential codes and preserve server-side attribution through login/signup/checkout.
3. Stripe webhook processing must verify signature and be idempotent using unique Stripe event IDs and invoice identifiers.
4. Confirm annual price and actual first successful charge after three-day free trial; do not treat checkout session created or trial start as paid conversion.
5. Do not pay provision for zero-euro discount codes or fully refunded first invoices without explicit revised policy.
6. Admin-controlled provisional and approved ledgers, immutable audit events, dispute handling, and exportable accounting data.
7. Partner CRM data minimization, compliant prospecting rules, opt-out flag, retention schedule, access logs, and possible GDPR Article 28 DPA as role analysis requires.
8. No automatic recruitment posting, mass calling, emails, partner activation, invoices, or money transfers through this PR.
9. Unit/integration tests: trial -> first annual invoice; refund; duplicate webhook; competing partner attribution; auth isolation; downgrade to monthly; re-subscription; fraudulent coupon; billing retry.
10. Feature flag OFF by default and separate rollout checklist. Existing product behavior, price IDs and billing must remain unchanged.

## Manual setup materials
Prepared outside repository as an editable partner contract draft, recruitment and onboarding copy, sales guide, privacy checklist, and a manual commission workbook.

## External dependencies before launch
- Confirm identity and billing details for Tmi Movexa.
- Review employment classification in actual working conditions, tax withholding/income-register obligations, GDPR and direct marketing legality with appropriate professionals.
- Validate existing production Stripe checkout and annual-price behavior.
- Confirm final commission and disputes policy in signed contracts.
