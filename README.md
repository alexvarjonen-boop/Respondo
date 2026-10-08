# Respondo AI

Production-oriented B2B customer-service SaaS for Finnish, Swedish and English websites.

## Current product model

Respondo answers from the business's approved knowledge base and imported website facts. It does not use the OpenAI API in production. FI/SV/EN answer-language support may use Google's translation endpoint when a stored answer needs translation.

Current plans (including Finnish VAT 25.5%):

| Plan | Monthly | Annual billing without discounts | Support-agent seats | Website import | Google Calendar |
| --- | ---: | ---: | ---: | --- | --- |
| Starter | 29.90 €/month | 358.80 €/year | 2 | Yes | No |
| Advanced | 39.90 €/month | 478.80 €/year | 10 | Yes | Yes |
| Business | 49.90 €/month | 598.80 €/year | 20 | Yes | Yes |

Annual billing has no price discount; existing subscriptions are not automatically repriced.
All plans include a three-day trial.

## Stripe live price IDs

| Plan | Monthly price ID | Annual price ID |
| --- | --- | --- |
| Starter | `price_1UOLwuV05brJ7mTPUcIxZKE6` | `price_1UOLx1V05brJ7mTPETqeexmn` |
| Advanced | `price_1UOLx3V05brJ7mTPODsTKyC5` | `price_1UOLx6V05brJ7mTPIgyqDymD` |
| Business | `price_1UOLx8V05brJ7mTPDq47ha22` | `price_1UOLxBV05brJ7mTPSsDPLXTM` |

Historical Stripe prices remain recognized for existing subscribers.

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
