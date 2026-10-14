# Respondo AI

Production-oriented B2B customer-service SaaS for Finnish, Swedish and English websites.

## Current product model

Respondo answers from each business's approved knowledge base and imported website facts. It does not use the OpenAI API in production.

## Subscription prices for new customers — October 14, 2026

| Public plan | Internal entitlement tier | Monthly subscription | Annual monthly equivalent | Charged once per year | Support-agent seats |
| --- | --- | ---: | ---: | ---: | ---: |
| Advanced | `basic` | 49 €/month | 39 €/month | 468 €/year | 2 |
| Premium | `advanced` | 129 €/month | 119 €/month | 1,428 €/year | 10 |
| Enterprise | `business` | 149 €/month | 139 €/month | 1,668 €/year | 20 |

Annual billing saves **10 €/month (120 €/year)** on all plans. The complete annual fee is charged at once after the 3-day free trial. The same features and agent-seat limits apply for monthly and annual billing.

## Live Stripe catalog

| Plan | Product | Monthly Stripe Price | Annual Stripe Price |
| --- | --- | --- | --- |
| Advanced | `prod_VRMDqWr2kAow8M` | `price_1UQTV0V05brJ7mTPFjnH0Q09` | `price_1UQTVtV05brJ7mTP4R2G5N1R` |
| Premium | `prod_VRMEf8AWTzx8eu` | `price_1UQTVcV05brJ7mTP328BFuzx` | `price_1UQTVwV05brJ7mTPktIr0kJT` |
| Enterprise | `prod_VRMEB6TmV771gr` | `price_1UQTVfV05brJ7mTP4cZof42w` | `price_1UQTVzV05brJ7mTPtgBczsCv` |

The Railway environment variables `STRIPE_{BASIC,ADVANCED,BUSINESS}_{MONTHLY,YEARLY}_PRICE_ID` point to the six Prices. Checkout validates the active Price, EUR amount, monthly or yearly interval, and Product name. Historical Price IDs remain accepted for existing subscribers' entitlements, and no existing subscription is automatically repriced or migrated.

**Tax:** Review tax registrations and Stripe Tax obligations before selling outside Finland or when the seller's VAT liability changes. This change does not activate taxes or alter existing billing contracts.

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
