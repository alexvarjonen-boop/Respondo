# Respondo AI — international B2B checkout compliance release gate
**Updated 2026-11-03. Status: US first-sale B2B checkout enabled subject to documented seller declarations; other foreign markets blocked. Legal compliance is not independently certified.**
This is a software and operational checklist, not a legal opinion.

## Verified starting state
- Finnish seller: Respondo AI (business ID 3599437-5), Finnish non-VAT-registered domestic sale flow.
- Stripe production account tax settings: **active**, but **zero Stripe Tax registrations** returned by `GET /v1/tax/registrations` on 2026-11-03.
- Both new-account and additional-workspace subscriptions permit **FI and US** in a server-side allowlist, with US EIN, state and Stripe Tax readiness required; completed Stripe Checkout billing-country mismatch cancels the subscription before activation.
- The UI shows the selected country and, for the US, an EIN and state field; other countries are directed to inquiry.
- Do not infer legal registration or sales permission from `Stripe Tax status: active` or a successful card charge.

## Human compliance work required before opening a country
1. **Finnish EU reporting registration:** ask Verohallinto / licensed accountant whether and how to enroll in the Finnish register for reporting EU general-rule B2B services. The requirement may apply even below the small-business turnover threshold. Obtain effective date and reporting intervals before first sale. See [Finnish Tax Administration — VAT registration](https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/rekisterointi/millaisesta-toiminnasta-pit%C3%A4%C3%A4-tai-voi-rekister%C3%B6ity%C3%A4-alv-rekisteriin/).
2. **Per-country classification:** confirm SaaS and the separate assisted setup service's place-of-supply treatment, B2B-only eligibility, local digital-service VAT/GST/sales-tax nexus, registration thresholds and local reporting obligations. EU and third countries are **not** a single tax jurisdiction. See [VAT on electronic services](https://www.vero.fi/yritykset-ja-yhteisot/yritystoiminta/uusi-yritys/kasvuyritykset/sahkoiset-palvelut-arvonlisaverotuksessa/) and [cross-border services](https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/ulkomaankauppa/kansainvalinen-palvelukauppa/).
3. **Buyer business proof:** for an EU cross-border B2B transaction, collect and verify the buyer's VAT number where appropriate; confirm the business establishment and billing address. For non-EU, retain suitable foreign business registration/tax number evidence. A user-entered ID alone is not verification.
4. **Invoices and evidence:** confirm the seller and buyer identifiers, customer jurisdiction, correct tax treatment, billing periods, discount, setup fee and required invoice language. Add reverse-charge wording where applicable and supported by a valid B2B determination. Do not apply reverse charge to an unverified buyer.
5. **Tax engine and account setup:** configure Stripe Tax product tax code for subscription and assisted setup, activate automatic calculation for eligible countries, and create each Stripe Tax registration only **after** registering with the relevant tax authority. Monitor threshold notices and reporting. Stripe Tax calculates but does not replace legal registration/filing.
6. **Reporting and record retention:** prepare monthly EU sales summary and VAT reports when legally required, non-EU sales records and local returns when relevant. Assign a responsible accountant; Stripe dashboard reports are not automatically tax filings.
7. **Consumer / corporate guard:** the checkout is business-only. Establish how unverified business buyers are handled, and ensure any consumer transactions are either prevented or supported under consumer and digital-services law.
8. **GDPR and data processing:** inspect controller/processor terms, DPA and subprocessors for international customer data, actual hosting region, cross-border transfer mechanisms and data subject rights. A country picker alone does not confer compliance.
9. **End-to-end test in Stripe sandbox:** FI and each newly approved country; correct tax and price incl. onboarding; valid/invalid VAT IDs; mismatch/cross-country billing address; trial conversion; refunds; invoice; webhook idempotency; declined cards; canceled checkouts.
10. **Explicit production activation:** independent accountant / legal sign-off, proof of seller registration as applicable, Stripe Tax registration(s), country-specific contract/invoice review, tested webhook enforcement and monitoring. **Only then** change the server-side country allowlist with versioned tests and rollout approval.

## Current fail-closed policy
All non-FI/non-US billing countries intentionally return 422 from both signup Checkout and new-workspace Checkout. A forged frontend request cannot bypass the backend country restriction. The completion webhook checks the declared and collected billing country and, for US orders, exact US state and Stripe Tax enablement, canceling an incompatible new subscription before account activation. Existing historical subscriptions are not retroactively reclassified.

## Useful references
- [Verohallinto — International services](https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/ulkomaankauppa/kansainvalinen-palvelukauppa/)
- [Verohallinto — Electronic services](https://www.vero.fi/yritykset-ja-yhteisot/yritystoiminta/uusi-yritys/kasvuyritykset/sahkoiset-palvelut-arvonlisaverotuksessa/)
- [Verohallinto — VAT registration](https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/rekisterointi/millaisesta-toiminnasta-pit%C3%A4%C3%A4-tai-voi-rekister%C3%B6ity%C3%A4-alv-rekisteriin/)
- [Verohallinto — VAT reporting](https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/ilmoitus-ja-maksuohjeet/)
- [Stripe Tax registration docs](https://docs.stripe.com/tax/set-up)

## US first-sales operational basis and stop triggers
- Seller declared no previous US sales, employees, offices or other activity in the US as of 2026-11-03. This declaration is not independent proof of lack of nexus.
- Stripe Tax production settings were observed active with default tax code `txcd_10103001` (B2B SaaS). Stripe threshold monitoring returned no locations on the last check, but it does not include sales outside Stripe or substitute for state-by-state review.
- The US Checkout requires buyer company name, EIN-shaped identifier, billing state and full Checkout billing address, and checks state/country matching on completion. A syntactically valid EIN is **not** proof of actual business status; undertake risk-based company verification and keep records before treating a sale as qualifying B2B.
- Review Stripe Tax thresholds and ALL off-Stripe US sales **monthly**, along with business physical nexus and SaaS taxability state-by-state. Immediately disable US checkout when nexus is established, registrations are required, tax settings cease to be active, or the seller's declared US activity changes; obtain required permits before collecting tax.
- Record the tax jurisdiction used and invoice tax amounts in Stripe and accounting. No-tax-collection is not a blanket legal exemption and Stripe Tax without US registrations returns zero.
- Verify legal counsel/accountant advice for any planned material US sales expansion and privacy obligations. State nexus and consumer laws cannot be guaranteed by application code.
- Review data processing and security contract requirements before exposing US customer data to support integrations.
