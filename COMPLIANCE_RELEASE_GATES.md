# Respondo AI — legal, VAT and international-selling release gates
_Last reviewed: 2026-10-09. Operational checklist, not a substitute for legal or tax advice._

## Verified / implemented safeguards
- Finnish sole-trader seller is shown as **Alex Varjonen (Respondo AI service), business ID 3599437-5**. Respondo AI is a service/brand name, not a confirmed registered trade name.
- Starter EUR 29.90 / Advanced EUR 39.90 / Business EUR 49.90 monthly. No annual discount. Seller reports that they are not VAT-registered due to small-scale activity; Finnish prices therefore carry **no charged VAT** under those conditions.
- New subscription checkout requires FI billing country and explicit **business-use confirmation**. All countries other than FI are currently refused, not guessed as tax-free. Stripe Checkout re-checks the actual billing-country address; non-compliant trials are canceled.
- Stripe product tax code and default category: **txcd_10103001, hosted SaaS for business use**. Classification is configured for any future tax calculation; it does not itself turn on a paid tax product.
- Stripe Tax has no active registrations and no completed activation of automatic tax calculation in new Checkout code. Stripe country-threshold signals were empty as of the last check; this is not evidence that all liabilities are satisfied.
- Public legal pages provide Finnish/Swedish/English service terms, privacy notices, cookie information, and a processing summary.

## Release blockers and manual approvals (not automatically completed)
1. **Verify official entity and VAT status:** compare business ID, official seller name, tax registration, business activity and address in YTJ/MyTax. The contact name in a change filing does not register the brand as an official trade name.
2. **Domestic VAT threshold:** verify both current and previous calendar years' applicable turnover **across all economic activity under the same business ID**, not Respondo revenue alone. Re-check monthly and before the threshold is crossed.
3. **Reverse-charge VAT on purchases:** ask Finnish tax administration/accountant whether paid foreign hosting, Stripe/IT services, software subscriptions or other imports trigger a Finnish VAT registration/reporting requirement **even below the EUR 20,000 sales threshold**. Do not assume 'not VAT registered' settles tax on purchases.
4. **GDPR Article 28:** the public /dpa page explicitly identifies itself as an **information page, not a signed binding processing agreement**. Before handling customer-controlled personal data in production, execute a valid processor agreement identifying processing instructions, subprocessors, confidentiality, security, transfer safeguards, breach notifications, audit rights, and return/deletion. Obtain legal review; don't imply the current landing page is a signed DPA.
5. **Actual subprocessors / data transfers:** document verified processors, their purposes and geographic locations, any standard contractual clauses or adequacy decision, retention period, and data deletion mechanisms. Do not list unverified suppliers.
6. **Receipts and invoices:** verify Stripe merchant legal details and a sample invoice/receipt identify the sole-trader seller correctly, with business ID and **no VAT collected or presented as deductible** while not VAT-registered. Brand alone may be insufficient seller identification.
7. **Consumer sales:** current product is sold only B2B and all checkout flows require business-use confirmation. Before opening B2C sales, obtain a jurisdiction-specific review of consumer subscription, withdrawal and digital-services law.
8. **International sales:** remain closed until tax registration and applicable billing/invoicing obligations for the specific destination are verified. EU B2B service sales may require a special Finnish registration for EU-service sales and VAT summary reporting even when small domestic sales are exempt. Non-EU countries, including US states, have varying thresholds and rules. A correct Stripe Tax calculation does **not** register the seller, file tax returns, or discharge tax obligations.
9. **Ongoing reporting:** reconcile monthly Stripe gross sales, refunds, credits, fees and bookkeeping, plus non-Stripe business sales. Review Finnish income tax prepayments, statutory accounting and any regulatory requirements with an accountant.

## Change management
- **Never** enable automatic tax on existing subscriptions or create foreign tax registrations without verifying that the registration has actually been completed.
- **Never** label a sale 'VAT 0%' if the proper treatment is instead 'outside scope' or 'seller not registered'; keep legally distinct concepts separate.
- **Never** turn on fee-based Stripe Tax or other paid third-party providers without specific authorization. Tax codes and no-fee threshold monitoring do not constitute authorization for billable calculations.
- After tax status changes, inspect new and existing Stripe Prices' immutable `tax_behavior` and migrate invoicing/subscriptions deliberately, not silently.
- Keep checkout/server country allowlist, public copy, privacy/DPA, receipts and Stripe settings synchronized.

## Primary authorities
- Finnish Tax Administration: https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/rekisterointi/
- VAT registration exceptions for international service purchases and EU B2B sales: https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/rekisterointi/millaisesta-toiminnasta-pit%C3%A4%C3%A4-tai-voi-rekister%C3%B6ity%C3%A4-alv-rekisteriin/
- Cross-border services: https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/ulkomaankauppa/kansainvalinen-palvelukauppa/
- EDPB controller–processor agreements: https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en
- Stripe Tax calculations and fees: https://docs.stripe.com/tax/how-tax-works
