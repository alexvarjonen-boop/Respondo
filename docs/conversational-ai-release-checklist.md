# Respondo AI — controlled release checklist (25 November 2026)

This is an internal operational checklist, **not an approval to process personal data** and not a substitute for legal review. The current production feature flag `RESPONDO_CONVERSATIONAL_AI_ENABLED` has not been configured, so external conversational inference is off.

## Before enabling OpenAI inference

1. **Billing owner action:** In the correct OpenAI API organization/project, confirm available API credit, the permitted model (`gpt-5-mini` by default), and a project **enforced hard monthly spend limit**. A soft budget alert alone does not stop spending. Do not authorize automatic recharges without an explicit agreed budget. Do not confuse a ChatGPT subscription with API credit. Official: https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform
2. **Contracting & lawful data flow:** Review and accept applicable OpenAI Services Agreement / Data Processing Addendum under the correct legal entity, and document subprocessor obligations, processing locations, transfers and customer-facing transparency. Official: https://openai.com/policies/data-processing-addendum/ and https://developers.openai.com/api/docs/guides/your-data
3. **Tenant roles:** Determine whether each customer is controller and Respondo is processor; update the customer DPA / subprocessor list, customer privacy notice and visitor chat notice where required. Update FI/SV/EN public policies only after approved facts are known.
4. **Data minimization:** Source code currently sends sanitized recent **customer questions** and filtered public HTTPS business facts, but simple regex screening does **not** guarantee that questions lack a person's name, address, health detail, ID or another identifier. Treat inference input as potentially personal data. Maintain the default `RESPONDO_CONVERSATIONAL_AI_INCLUDE_MANUAL` unset; never transmit private staff, leads, manual knowledge, calendar, order or booking data without a separate data-flow design and approval.
5. **Processing location:** The integration currently calls `https://api.openai.com/v1/responses`. It does **not** claim EU regional processing. Verify eligibility and any necessary endpoint, account features and contractual details rather than assuming EU residency from the company location.
6. **Usage & fail-safes:** `RESPONDO_CONVERSATIONAL_AI_MAX_DAILY` defaults to 30 with a hard per-process cap of 100. This counter resets per Node process/replica: **it is not a global bill ceiling**. Set a provider-side hard limit and alert before activation. An upstream failure must use the legacy fallback; monitored error and cost metrics should be available to the owner.
7. **Security:** Do not print API keys or raw customer prompts in logs. Do not let knowledge text issue commands. Never allow a language model alone to confirm payment, refund, booking, cancellation, stock, price changes or external actions.

## Release verification

- Confirm latest GitHub CI: `npm run check && npm test`, including the answer-quality benchmark.
- Confirm Railway build and healthcheck both succeed and the served commit is the intended GitHub commit. A merged PR does not imply deployed code.
- Leave the external AI feature flag **off** for the first code deploy.
- Verify FI, SV and EN variants for typos, inflections and code-switching on non-sensitive synthetic tenant data.
- Verify long/multi-turn follow-ups, synonyms, refusals on missing price, bookings, refunds, contradictory policies and cross-tenant isolation.
- Use test provider credentials with a small authorized spending limit before considering a canary. The current test suite uses mocked provider responses and cannot establish real-model accuracy.
- Rollback: set `RESPONDO_CONVERSATIONAL_AI_ENABLED=0`, redeploy/restart under controlled change management, verify fallback and monitor. Do not remove the `OPENAI_API_KEY` as an improvised way to fix another environment that might depend on it.

## Current status at authoring

- The new guarded inference module exists in `production-respondo-fi`, but its enable flag has not been provisioned.
- 25 November Railway build failed against 22 legacy billing/signup tests after single-plan pricing changed to **€350 per month**, with optional **€200 one-time setup**. A test-only PR updates those checks while preserving the runtime prices and historical subscriptions.
- The previous live Railway deployment remains online. Production is not guaranteed to match the newest repository commit.
- OpenAI API balance, account permissions, billing enrollment, DPA acceptance and live model responses have **not** been verified.

**Never advertise 100% certainty.** The answer engine may still misinterpret a question or omit a fact; sensitive changes remain deterministic and require explicit verification.
