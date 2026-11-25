# Cloudflare Free hybrid mode

The local rule engine remains first. Protected intents and confirmed local responses never require cloud inference. Unresolved non-sensitive questions from server-resolved tenants can use the Cloudflare GPT-OSS 120B planner and answer generator.

- Shared persistent cap: 100 reserved API calls per UTC day; 10 per tenant. Reserve two calls atomically per difficult turn. Unused reservations are not refunded. For ten tenants this allows up to five two-call turns per tenant per day, with other traffic handled locally. More than ten active tenants share the remaining first-come capacity. These are conservative request ceilings, not guarantees of the provider's neuron allowance.
- The Cloudflare Free plan's account-wide neuron quota is authoritative. A 429 stops cloud calls in the current process for the UTC day. No paid fallback. No automatic plan upgrade.
- Short-lived in-memory cache: at most 400 entries, ten minutes, exact standalone question, language, tenant ID and source revision. No cache reuse for context-dependent, price, booking or sensitive questions. Only public-source answers are cached. No cross-tenant cache. Restarts clear it.
- Database quota is fail-closed. Public demos without a server-resolved tenant do not use the shared quota.
- Cloudflare Free confirmed separately from privacy approval. Keep customer inference disabled until the controller's processor assessment and applicable DPA/notice and transfer review are completed. Regex PII screening is incomplete and does not replace privacy compliance.
- Live synthetic diagnostic on prior release: five of six cases passed (HTTP 200); mixed-language service case failed. Do not assert universal understanding or guaranteed accuracy. This diagnostic uses only fictional questions and evidence.
