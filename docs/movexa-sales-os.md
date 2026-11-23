# Movexa Sales OS — v1 (owner-only)
 
Entry: Visitors (/traffic.html) → Sales Operating System → /movexa-sales.
Uses existing session authentication and database-backed platform owner check. A new PostgreSQL table is initialized lazily. No new dependency or paid service is required. No external calls, scraping, automatic mail or background tasks are enabled.
 
Workflow: manually verify the public source, role, business relevance and contact details; add prospect; review; explicitly approve; copy FI/SV/EN template; send manually only if appropriate; mark contacted; review follow-up after seven days. Mark objections as blocked (the domain cannot be registered again). Score is a heuristic from operator inputs, not AI or a probability.
 
Before deployment: run node --test tests/movexa-sales-os.test.mjs, npm run check, existing regression tests; verify owner/non-owner and agent access, session expiry, browser CSRF guard, DB persistence, duplicate/race handling, mobile layout and suppression in a staging database. Verify data retention/deletion and direct marketing requirements before real outreach. Test actual sending independently; no sending integration exists in v1.
 
Next phases: evidence-backed lead discovery, AI draft generation with verified source snippets, approval and suppression enforcement in mail integration, real response ingestion, retention/export/delete controls, automated jobs with budget caps and audit trails. Executive/marketing/finance/etc. are not implemented here. Do not expose this workspace to customer tenants.

## Verification additions
- Dedicated GitHub Actions workflow: .github/workflows/movexa-sales.yml, Node 24 and isolated PostgreSQL 16.
- HTTP integration suite: MOVEXA_TEST_DATABASE_URL must point to a disposable test database, never production. It creates and drops an isolated schema. Tests exercise authorization middleware wiring (mock identity, not the production login), cross-site rejection, rendered script syntax, duplicate handling, approval, draft, follow-up and suppression.
- Suppression clears email, role, and evidence and replaces source URL with the company website; retains domain to prevent re-registration. This does not replace a full retention and data-subject request policy.
- URL checks are syntactic; no DNS verification or scraping occurs. Never treat an entered source as independently verified by the system.
- No deployment until CI results and a staging smoke test of actual platform-owner login are available.
