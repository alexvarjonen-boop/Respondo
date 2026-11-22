# Respondo AI

Production-oriented B2B customer-service SaaS for Finnish, Swedish and English websites.

## Current product model

Respondo's deterministic production bot answers from each business's approved knowledge base and imported website facts. Optional model-based conversational reasoning is available in code but **disabled by default** until billing, data processing/privacy, and testing are approved. It uses OpenAI Responses API only when explicitly enabled.

### Optional multilingual conversational reasoning

`RESPONDO_CONVERSATIONAL_AI_ENABLED=1` plus an existing `OPENAI_API_KEY` enables a tenant-scoped, evidence-checked AI interpretation layer. `RESPONDO_CONVERSATIONAL_AI_MODEL` (default `gpt-5-mini`), and `RESPONDO_CONVERSATIONAL_AI_MAX_DAILY` (default 30 requests/process/day, hard cap 100) limit costs. This daily counter is **per process**, not a centralized production spend limit: set a provider billing budget and monitor costs separately.

Only filtered, approved, HTTPS-sourced website snippets are transmitted by default. Include approved manually entered company knowledge only after a processor/privacy review by explicitly setting `RESPONDO_CONVERSATIONAL_AI_INCLUDE_MANUAL=1`. Requests containing obvious personal identifiers or secrets fail closed to the existing on-server handler. No chat transcripts or assistant responses are transmitted; only up to four sanitized previous customer questions aid follow-ups. `store:false` is sent to the provider. Verify the privacy notice, external processor terms, regional processing and lawful basis before turning this on.

The model sees only a bounded set of current-tenant facts and must cite literal evidence quotes. Answers pass the numeric and retail-integrity guards and model errors fall back to the deterministic engine. It cannot confirm payments, bookings or external actions. Not every question can be answered, and **zero hallucinations or a 100% error-free rate are not guaranteed**. Test tenant-specific multilingual paraphrases and refusal cases before deployment; keep the feature flag off when unsure.

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

## Optional website-chat image text

Set `RESPONDO_CHAT_IMAGE_OCR_DIR` to an absolute directory on the app server with readable, uncompressed `fin.traineddata`, `swe.traineddata` and `eng.traineddata` files. The upload control appears only when the app starts with all three files. The server reads text from PNG and JPEG images locally. The customer can review and edit the text before sending it as a chat message.

### Optional image analysis in the website chat

Image analysis is off unless the deployment supplies the matching local resources:

- Set `RESPONDO_CHAT_IMAGE_OCR_DIR` to an absolute directory containing readable `fin.traineddata`, `swe.traineddata` and `eng.traineddata` files for Tesseract. The OCR worker loads these files locally.
- For object estimates, set `RESPONDO_CHAT_IMAGE_OBJECT_PYTHON` to an absolute Python executable with NumPy and headless OpenCV, and `RESPONDO_CHAT_IMAGE_OBJECT_MODEL_DIR` to an absolute directory with a trusted Darknet YOLO `detector.cfg`, `detector.weights`, and the three `detector.fi.names`, `detector.sv.names` and `detector.en.names` files. Each names file lists one class per line in model class order. The server exposes object estimation after a startup inference validates the model and class count. Choose a model trained on the objects offered to your customers. For example, a standard COCO model can estimate buses and people.

The widget accepts JPEG and PNG images up to 2 MB and 8 million pixels, with each side capped at 4096 pixels. The server processes at most one customer image at a time per process. Inference stops after 12 seconds. The image stays in memory during analysis. The widget adds the read text or estimated visible counts to an editable draft, and the customer decides whether to send it as a regular chat message.

Railway includes the three text language packs and installs OpenCV for the optional object detector. The build provisions the [official YOLOv4-tiny weights](https://github.com/AlexeyAB/darknet/releases/tag/yolov4) and verifies the pinned SHA-256 before using them. The bundled COCO labels cover common visible classes. Windows and precise measurements are outside that model’s label set.

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


## Week-one onboarding check-up

- Self-service: first successful approval of imported website knowledge starts the seven-day timer.
- Assisted setup: the owner-confirmed **handover** starts the timer, not the order/Stripe checkout or credential creation.
- An internal `onboarding_checkups` outbox stores the exact due timestamp, processing status, delivery attempt count and Resend message ID. One message is queued per workspace, with no historical backfill.
- A production worker checks due messages every minute, performs retries with backoff and uses the same Resend `Idempotency-Key` for repeat attempts. Canceled subscriptions remain eligible for impartial feedback requests; deactivated user accounts are excluded.
- The HTML uses the common dark `brandedEmailHtml` layout, approved email-arrow logo, and the account's FI/SV/EN preferred language. It includes both a support check-up and a neutral, optional Trustpilot review link.
- **Required Railway setting:** `TRUSTPILOT_REVIEW_URL` must contain the actual verified `https://www.trustpilot.com/...` review URL copied from the business account. Until it is set, the worker sends nothing.
- Reuses existing `RESEND_API_KEY`. Optional `CHECKUP_EMAIL_FROM` overrides the default sender `Respondo AI <info@respondoai.fi>` only if that sender is verified with the email provider.
- No duplicate review invitation should be configured in Trustpilot's Automatic Feedback Service for the same onboarding event, otherwise customers may receive two review requests.
