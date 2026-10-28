# Free-tool implementation — Firecrawl, GitHub CI and B2B outreach

**Date:** 2026-10-28. **Status:** opt-in code proposed in a draft PR; production not changed.

## Firecrawl: optional website import enrichment

The Respondo native crawler remains the default. When native parsing yields under 650 characters for a successfully fetched and validated page, the importer may retry **up to two pages per import** through Firecrawl's rendered HTML scraper. The existing `extractBusinessDocument` and `essentialWebsiteCandidates` still decide what is real customer-facing knowledge; Firecrawl output is not directly trusted as an answer.

### Configure (only when the feature is deployed and externally reviewed)

Set **Railway service variables** for the existing Respondo web service:

- `FIRECRAWL_ENABLED=true` — set only after smoke tests and terms/privacy review.
- `FIRECRAWL_API_KEY` — **secret**, entered directly into Railway variable settings; never commit or paste it into chat.
- `FIRECRAWL_MAX_PAGES=2` — optional, 0–3, defaults to 2.

With no key or `FIRECRAWL_ENABLED` not equal to `true`, **zero Firecrawl API requests** will be made. Firecrawl's hosted ChatGPT plugin connection **does not** make an API key available to the Railway application. Never assume it does.

**Cost controls:** limited per import to 0–3 page scrapes, HTTP failures fall back to native extraction, API 402 disables external results for that request, and there is no automatic API top-up. The free Firecrawl plan is not suitable for unbounded customer crawling; monitor credit usage. Limitations: per-import bounds, not a global daily cap, and no shared counter across Railway replicas.

**Safety:** the first-party `fetchPublicHtml` validates the site/redirects using its existing SSRF protections before any external request. The external provider receives only a verified public same-host URL. No customer conversations, login cookies, database information, or secrets are submitted as page content. A returned off-site source URL is rejected. Backend rejects oversized output, non-HTML/missing results, failed HTTP status and timeouts. Avoid enabling for customer content without appropriate contractual disclosures.

**Verify:** `npm run check && npm test` locally/CI; importer regression suite and demo smoke tests; compare `nostokonepalvelu.fi` plus 4 different customer-business demo sites. Do not enable or merge if existing website-import regressions, billing, or auth tests fail.

## GitHub CI: already present

The project's existing `.github/workflows/ci.yml` runs `npm run check` and `npm test` for **every pull request**. The new `tests/firecrawl-fallback.test.mjs` runs automatically, covering disabled-by-default behavior, SSRF prevention, credit cap, rendered data extraction and API/offsite failure fallback. Existing `importer-live-audit.yml` can run the larger multi-site audit manually; a running integration must not be claimed healthy until CI results are green.

## Lead capture and scheduling: reuse the existing Respondo implementation

Respondo **already has** a multilingual public demo enquiry form at
`/yhteystiedot?intent=demo&lang=fi`, with site URL, privacy disclosure, and the existing contact form backend. It also already has tenant lead capture, qualified lead webhook signing, a CRM queue and retry support. Avoid adding duplicate third-party forms or collecting prospects' conversations through automation platforms.

**Calendly: CONNECTED and set up.** Active real 15-minute Google Meet booking event `Respondo AI – 15 min esittely`: https://calendly.com/alexvarjonen/respondo-ai-15-min-esittely. Native Calendly booking page uses English UI because the API does not offer Finnish locale, but title and description are Finnish. Booking link is included in the five draft emails. The public site still uses its existing demo enquiry form (not replaced); no bookings have been made.

**Apollo: CONNECTED.** Profile indicated 180 lead credits available. Free company discovery matched 4/5 public prospects by their domains: WashUp, Siivouspalvelu Kota, LVI Elo, Talotekniikka Forsblom. LVIS Turkutiimi was not returned. This is **not** contact enrichment; no credits were spent enriching people, no personal contacts were exported, and no messages were sent. Review prospects manually and respect opt-outs and relevant electronic marketing law.

**n8n / Make:** optional internal back-office automation after a workspace and signed destination webhook are ready. If configured, use the existing CRM event `lead.qualified`, verify HMAC at the trusted receiver, deduplicate by tenantId+leadId, and send only the minimum approved fields. Never expose secret keys in client-side JS or use an unauthenticated webhook endpoint. Do not add a permanent Railway n8n service just to reproduce Respondo's existing CRM queue.

## Verified sales-prep integrations (2026-10-28)

- **Apollo.io** connection confirmed. Five public-company prospects were added to the deduplicated accounts list **Respondo AI – prospektit, esittelyt 2026**, viewable at https://app.apollo.io/#/lists/6ae2463a0ace45000c9dff43. No outbound sequences or messages were activated.
- **Calendly** connection confirmed. Active 15-minute event: https://calendly.com/alexvarjonen/respondo-ai-15-min-esittely. Verified that the event has real booking availability. Public-site button change is proposed separately in PR #329.
- **Core test regressions** from the existing homepage/199 € checkout changes were addressed in merged PR #330 (tests only). Re-run this feature branch's CI against the updated production base before merging.

## No-surprise deployment gates

1. CI syntax and test suite pass on PR.
2. Smoke tests pass with `FIRECRAWL_ENABLED` unset.
3. A valid API key is provisioned in Railway secrets with account owner's permission; optional Firecrawl is tested against a known sparse website.
4. Product owner explicitly approves enabling external processing for customer website content and understands free-credit limits.
5. Deploy behind the flag, observe errors/credits and only then expand to live customer imports.

**Non-goals:** purchasing credits, creating paid subscriptions, scraping private pages, accessing login-only content, mass outreach or automatically booking sales meetings.
