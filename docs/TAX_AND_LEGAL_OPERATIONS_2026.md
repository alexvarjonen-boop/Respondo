# Respondo AI — tax and legal operations (2026-10-09)

**Seller:** Alex Varjonen, individual Finnish business operator (business ID 3599437-5). "Respondo AI" is the service brand and is not represented as a Trade Register–protected company name. Verify seller details in YTJ and the Stripe receipt / invoice before launch.

**Current permitted paid market:** Finland-based **business purchasers only**, with an explicit checkbox declaring business use and a billing-country check. Paid checkouts outside Finland are deliberately rejected until a market has been reviewed; no worldwide legal/tax certification is implied.

**Finnish VAT:** The seller currently reports not being VAT registered. Domestic listed prices (Starter 29.90 EUR/month; Advanced 39.90; Business 49.90, and the full yearly equivalents) therefore do not charge Finnish VAT **only while the statutory conditions remain met**. "No VAT charged due to small-scale business" must never be confused with a zero-rated VAT supply. Stripe Checkout automatic_tax stays disabled and no manual 25.5% rate is attached. No VAT ID should be claimed when not issued.

## Required operational checks (human owner/accountant)

1. **Before accepting ordinary paid customers:** Reconcile *all* turnover under the business ID (not just Respondo/Stripe) for both the current and previous calendar years. Finnish 20,000 EUR small-business threshold is assessed by the Finnish VAT turnover calculation, not simply gross Stripe payments. If approaching threshold, notify tax adviser and register in time. Check whether other activities, purchases or sales create independent VAT obligations.
2. **Foreign purchases even when selling only in Finland:** Cloud hosting, APIs, advertisements and SaaS bought from suppliers abroad may trigger VAT reverse-charge registration/payment obligations even for a small domestic operator. Inspect invoices for Railway, hosting, advertising, Stripe and all other foreign vendors.
3. **Finland income tax:** Keep bookkeeping and receipts, check advance income tax, and assess YEL insurance requirements if work/income meet the rules. No change to product code replaces personal tax filings.
4. **Stripe seller profile is NOT fully corrected:** A reviewed live Stripe invoice currently identifies the account as **\"Respondo\"** (brand name), and the Stripe account business-profile website still points to a Railway deployment URL rather than `https://www.respondoai.fi`. Before accepting real paid customers, change Stripe Dashboard public/business profile, invoice template and customer-facing merchant details so that the legally responsible individual operator and Y-tunnus are unambiguous. Check one new invoice/receipt after updating. The app's legal pages alone do not correct Stripe-generated invoices. Do not silently change the account's verified legal entity identity or publish a private home address without confirmation.
5. **Customers and sales:** Preserve customer legal entity, country, billing address, tax identification (if supplied), purchase confirmation and invoice IDs. Check invoicing requirements including legal seller details and small-business non-VAT explanation. Export Stripe data to accounting regularly. The application stores B2B declaration in Checkout and subscription metadata, but Stripe remains a *payment processor*, not a law firm or automatic tax filer.
6. **EU cross-border B2B service sales:** Do not open based merely on receiving an EU VAT number. Determine whether special EU service-sale notification registration, VAT statements/recapitulative statement, and reverse-charge invoice text are required. The Finland-specific 20,000 EUR exemption does not alone decide EU service-sale compliance.
7. **EU consumer sales and other countries:** Check OSS/SME schemes, customer's status and location evidence, national VAT/GST/sales-tax obligations, and US state nexus/merchant obligations. Register with local tax authorities *before* adding Stripe Tax registrations; enable foreign sales one jurisdiction at a time after review. Stripe monitors are indicators only and may be incomplete.
8. **Stripe Tax paid service:** Not enabled. No automatic_tax calculation calls for chargeable international sales; Stripe Tax product category is **Software as a service (SaaS) — Business Use**, `txcd_10103001`, set on the active Respondo products and default. Product classification should be reconfirmed if the service delivery changes. Do not change the setting to the incorrect downloadable-business-software code.
9. **Contracts and privacy:** Confirm the displayed terms, data-processing information, actual subprocessors, lawful transfers, retention and incident response correspond to operations. Naming Alex Varjonen as operator on legal pages does not itself confer a protected Respondo AI trade name.
10. **Legacy customer/checkout:** Older subscriptions and sessions may predate country/B2B flags; verify individually. A negative tax or country assumption must not be made from missing metadata.
11. **Changing tax status:** Revisit tax rates, displayed prices, recurring Stripe Prices (tax_behavior is immutable when set), invoice details, customer notifications, billing migration, and the VAT rule *before* registering for VAT or expanding territories. Do not silently enable charging tax on all countries.

## Sources for accountant / owner
- https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/rekisterointi/
- https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/rekisterointi/millaisesta-toiminnasta-pit%C3%A4%C3%A4-tai-voi-rekister%C3%B6ity%C3%A4-alv-rekisteriin/
- https://www.vero.fi/yritykset-ja-yhteisot/yritystoiminta/uusi-yritys/kasvuyritykset/sahkoiset-palvelut-arvonlisaverotuksessa/
- https://www.vero.fi/yritykset-ja-yhteisot/verot-ja-maksut/arvonlisaverotus/ulkomaankauppa/yhteisokauppa/yhteenvetoilmoitus-ilmoitusohjeet/
- https://docs.stripe.com/tax/how-tax-works
- https://docs.stripe.com/tax/digital-products

**This operational checklist is not legal or tax advice.** The owner or qualified accountant must confirm status with the authorities where necessary.
