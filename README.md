# Respondo AI

Production-oriented B2B customer-service SaaS for Finnish, Swedish and English websites.

## Current product model

Respondo answers from the business's approved knowledge base and imported website facts. It does not use the OpenAI API in production. FI/SV/EN answer-language support may use Google's translation endpoint when a stored answer needs translation.

Pricing for **new subscriptions** (October 14, 2026; monthly billing):

| Public plan | Internal entitlement tier | Monthly | Support-agent seats | Website import | Google Calendar |
| --- | --- | ---: | ---: | --- | --- |
| Advanced | `basic` | 49 €/month | 2 | Yes | No |
| Premium | `advanced` | 129 €/month | 10 | Yes | Yes |
| Enterprise | `business` | 149 €/month | 20 | Yes | Yes |

All new plans have a 3-day free trial. Enterprise also has advanced automations and integrations (configured per workspace). **Annual billing saves 10 EUR/month per plan (120 EUR/year) and the full year is charged upfront**: Advanced 39 EUR/month equivalent (468 EUR/year), Premium 119 EUR/month equivalent (1428 EUR/year), Enterprise 139 EUR/month equivalent (1668 EUR/year). Existing subscriptions retain their original billing prices unless explicitly changed.

## Stripe live pricing (2026-10-14)

New Stripe Products with correct monthly and annual recurring Prices were created in live mode:

- Respondo Advanced — **49.00 EUR every month**, internal tier `basic`.
- Respondo Premium — **129.00 EUR every month**, internal tier `advanced`.
- Respondo Enterprise — **149.00 EUR every month**, internal tier `business`.

Each Price must be active, denominated in EUR, and have an interval of one month. Update the existing Railway environment variables to the **new Price IDs** in this order:

- `STRIPE_BASIC_MONTHLY_PRICE_ID` → new Respondo Advanced / 49 EUR price
- `STRIPE_ADVANCED_MONTHLY_PRICE_ID` → new Respondo Premium / 129 EUR price
- `STRIPE_BUSINESS_MONTHLY_PRICE_ID` → new Respondo Enterprise / 149 EUR price

Configure all six Railway monthly/yearly Price ID variables for the new products. Old monthly/annual Stripe IDs are retained in `planFromStripePriceId` so legacy subscriptions continue to map to the right entitlements. The server verifies each new Price's amount, currency and monthly recurrence **and** the matching active Product name before proceeding with Checkout. It returns an error instead of charging a legacy amount.

This change does not modify, cancel, or automatically migrate existing subscriptions. Review tax obligations and Stripe Tax registrations as appropriate: the current domestic non-VAT-registered treatment cannot be assumed to apply to all cross-border sales.

## Production services

- Railway: Node/Express application hosting
- Supabase: PostgreSQL database
- Stripe: Billing, Checkout, Customer Portal and Connect where enabled
- Google OAuth / Google Calendar: optional account and booking integration
- Google translation endpoint: language translation fallback when needed

Removed production integrations: Twilio voice/SMS, WhatsApp/Instagram Meta messaging, and direct OpenAI API calls.

## Deployment safety

Railway runs:

```
npm run check && npm test
```

before deployment and checks `/api/health` before the new deployment becomes live.

The application must keep server-side subscription entitlement checks. Frontend-only feature hiding is not sufficient.

## Database security

The public Supabase schema uses Row Level Security as a deny-by-default boundary for Data API access. The application itself connects to PostgreSQL server-side.

In particular, `demo_website_imports` must keep RLS enabled and must not grant `anon` or `authenticated` direct table access. `active_tenant_for_user` must keep an explicit `search_path`.

## Secrets

Do not commit credentials. Production secrets belong in Railway environment variables. Sensitive Railway variables should be sealed in the Railway dashboard where supported.

Important secrets include at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_SECRET`

The application must refuse production startup without a persistent JWT secret.

## Domain

The Railway-generated production URL remains a valid fallback. The branded production domain is intended to be `https://www.respondoai.fi`; only change `BASE_URL`, OAuth callbacks and Stripe portal/legal URLs to the branded domain after Railway has verified its DNS and TLS certificate.
