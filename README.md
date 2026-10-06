# Respondo AI

Production-oriented B2B customer-service SaaS for Finnish, Swedish and English websites.

## Current product model

Respondo answers from the business's approved knowledge base and imported website facts. It does not use the OpenAI API in production. FI/SV/EN answer-language support may use Google's translation endpoint when a stored answer needs translation.

Current plans, including Finnish VAT 25.5%:

| Plan | Monthly | Annual billing | Support-agent seats | Website import | Google Calendar |
| --- | ---: | ---: | ---: | --- | --- |
| Basic | 49.99 €/mo | 539.88 €/yr (44.99 €/mo) | 2 | No | No |
| Advanced | 64.99 €/mo | 719.88 €/yr (59.99 €/mo) | 10 | Yes | Yes |
| Business | 79.99 €/mo | 899.88 €/yr (74.99 €/mo) | 20 | Yes | Yes |

Business also unlocks the current premium automations and integrations, including automatic quote calculation, Stripe Connect payment automation, commerce integrations, webhooks and Channels API.

Trial: 3 days.

## Live Stripe products and prices

- Basic product: `prod_VO2qWi6HFkLrqj`
  - Monthly: `price_1UNGlQV05brJ7mTPOsgm1BPT`
  - Annual: `price_1UNGlSV05brJ7mTPtQR50utm`
- Advanced product: `prod_VO2qKqvwOQtz2m`
  - Monthly: `price_1UNGlVV05brJ7mTPOuMPEquL`
  - Annual: `price_1UNGlXV05brJ7mTPyxDcmE3Y`
- Business product: `prod_VO2q7QXcuFoW9R`
  - Monthly: `price_1UNGlaV05brJ7mTP8byQ8XQq`
  - Annual: `price_1UNGlgV05brJ7mTPpC6jkGRD`

Obsolete legacy prices are inactive and must not be reused for new subscriptions.

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
