# Respondo AI

Production-oriented B2B customer-service SaaS for Finnish, Swedish and English websites.

## Current product model

Respondo answers from the business's approved knowledge base and imported website facts. It does not use the OpenAI API in production. FI/SV/EN answer-language support may use Google's translation endpoint when a stored answer needs translation.

Current subscription prices (October 2026; no VAT charged because the seller is not VAT registered):

| Plan | Monthly | Annual billing (save 60 €/year) | Support-agent seats | Website import | Google Calendar |
| --- | ---: | ---: | ---: | --- | --- |
| Starter | 34.90 €/mo | 358.80 €/yr (29.90 €/mo) | 2 | Yes | No |
| Advanced | 44.90 €/mo | 478.80 €/yr (39.90 €/mo) | 10 | Yes | Yes |
| Business | 54.90 €/mo | 598.80 €/yr (49.90 €/mo) | 20 | Yes | Yes |

Annual billing saves **5 €/month (60 €/year)** compared with monthly billing. Annual fees are charged upfront. Existing subscriptions are not automatically repriced.
Business also unlocks current premium automations and integrations, including automatic quote calculation, Stripe Connect payment automation, commerce integrations, webhooks and Channels API.

Trial: 3 days.

## Live Stripe products and current prices

- Starter: `prod_VO2qWi6HFkLrqj`
  - Monthly: `price_1UP2DWV05brJ7mTP6sjumnIt`
  - Annual (save 60 €/yr): `price_1UONnxV05brJ7mTPMVHkrpf5`
- Advanced: `prod_VO2qKqvwOQtz2m`
  - Monthly: `price_1UP2DfV05brJ7mTPuSuwvuxm`
  - Annual (save 60 €/yr): `price_1UONrlV05brJ7mTPsUqKaQIB`
- Business: `prod_VO2q7QXcuFoW9R`
  - Monthly: `price_1UP2DhV05brJ7mTP2pSDX8aV`
  - Annual (save 60 €/yr): `price_1UONrqV05brJ7mTPWmGhW2lP`

Historical Stripe price IDs remain available for recognizing existing subscriptions; they must not be offered for new checkouts. The three new monthly and three unchanged annual checkout prices have tax_behavior=exclusive, and both subscription checkouts explicitly disable automatic tax and attach no tax rates. This domestic small-business tax treatment must be re-evaluated before EU cross-border sales or exceeding Finland's registration threshold.

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
