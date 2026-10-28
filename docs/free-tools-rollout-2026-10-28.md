# Respondo AI — free-tool rollout (2026-10-28)

## Shipped in this branch

- The built-in verified-domain website importer remains the default, with existing same-host/public-IP/redirect restrictions and structured ecommerce imports intact.
- Optional Firecrawl v2 scraping augments **sparse pages only** after the normal protected fetch has successfully retrieved them. This helps JavaScript-heavy sites expose their rendered customer-facing text.
- Processed HTML is fed to the **existing** business-document extraction and grounded-answer pipeline. Results are accepted only if the extracted text is meaningfully richer than the original.
- No new npm dependencies, recurring jobs, accounts or purchases.
- Request caps: maximum 3 pages per website import, default 2; 9 s per page; max 2 MB API response; no third-party site redirects. Malformed/failed/402 responses never interrupt the native import.
- GitHub CI already runs `npm run check` and `npm test` on all PRs. The new mock-based tests are automatically included.

### Production activation (not yet enabled)

1. Register a free Firecrawl account and obtain a private API key. The key is **not** included in Git.
2. Verify Firecrawl data processing terms, the seller's privacy notice/DPA and whether customer website data may be processed by this provider before enabling.
3. In Railway service **respondo-web-hotfix**, set `FIRECRAWL_API_KEY`, `FIRECRAWL_ENABLED=true` and optionally `FIRECRAWL_MAX_PAGES=1` for conservative rollout. These values must be configured by the account owner. Do **not** change `OPENAI_API_KEY` or turn on paid APIs.
4. Test on a known JS-rendered public website, then compare imported facts and sampled questions across FI/SV/EN against the native importer.
5. Monitor Firecrawl credits and disable `FIRECRAWL_ENABLED` when approaching the free-tier limit. The Firecrawl service enforces its plan quota; there is no cross-replica persistent credit ledger here.
6. Keep the flag disabled on unexpected costs, privacy concerns, or mismatched facts.

The fallback does not guarantee every website, answer or language is supported. Site authentication, robots restrictions, redirects, website behavior and first-party validation can still prevent import.

## Other tools: prefer existing Respondo functionality

| Goal | Choice | Current state |
| --- | --- | --- |
| Source control, regression tests, deployments | GitHub Actions + Railway | Already implemented. No need for Vercel/Netlify/Cursor subscriptions. |
| Qualified website leads, CRM delivery, retries | Existing `lead-*.mjs` modules and CRM worker | Already implemented; review enabled tenant settings before external routing. |
| Workflow automations | Existing CRM outbox; optional self-hosted n8n or Make | No paid n8n instance or Make scenario deployed. Avoid duplicate automations and check n8n licensing for SaaS uses. |
| Targeted outbound prospecting | Apollo free plan | Connect account; use public B2B relevance signals and review each contact before sending. |
| Booking 15-minute sales demos | Calendly free plan | Connect account, create event type, and provide actual booking URL before placing link on site. Current website-specific demo request form continues working in the meantime. |
| Meeting notes | Fathom free plan | Optional for consented video calls, not necessary for initial customer outreach. |
| Organic content | CapCut + Instagram | Publish only reviewed, factual before/after clips. No auto-posting without review. |
| Knowledge and checklist | Repository documentation or free Notion | Avoid duplicating customer personal data. |
| Billing | Existing Stripe integration | No change; don't change prices or run paid campaigns. |

### Sales qualification workflow (once Apollo + Calendly accounts are connected)

1. Select Finnish service businesses or ecommerce websites. Check public services and whether they expose FAQ, pricing, delivery, booking or contact flows.
2. Add **only verified, relevant company records** to the existing CRM/prospect list. Do not scrape private contact data or bypass platform limits.
3. Offer a tailored 15-minute Respondo AI demo using the company's **public** website. Avoid promising the bot already knows the entire website.
4. Send no more than one initial, personalized message until sender domain verification and legal targeting/opt-out requirements have been checked. Respect opt-outs, track campaign-source attribution and do not claim a recipient is a customer.
5. During the call, demonstrate grounded FI/SV/EN questions with evidence. Log outcomes in the existing CRM.
6. For interested prospects, schedule setup and use the existing Stripe Checkout; do not invent discounts or guaranteed conversion.

### Verification before merging

- GitHub check/test jobs green, including the new Firecrawl security and extraction tests.
- Existing importer audits pass without a Firecrawl key (feature disabled).
- With a real free-plan key **in an isolated test environment**: results scoped to the same approved domain, credits within quota, no third-party contact leakage.
- Railway production remains unchanged until the changes are explicitly reviewed and deployed.
