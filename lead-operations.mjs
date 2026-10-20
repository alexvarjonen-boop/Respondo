import { randomUUID } from 'node:crypto';
import { beginLeadCapture, completeLeadCapture } from './lead-capture.mjs';
import { ensureLeadTable, saveQualifiedLead, listQualifiedLeads, leadAnalyticsForTenant } from './lead-repository.mjs';

// Framework-independent authenticated owner operations.
// resolveTenantId MUST validate the server session and ownership; never trust
// a tenant ID supplied in the request body or query string.
export function createLeadOperations({ pool, resolveTenantId }) {
  if (!pool?.query || typeof resolveTenantId !== 'function') throw new TypeError('Database and tenant authorization required');
  async function authorizedTenant(context) {
    const id = await resolveTenantId(context);
    if (typeof id !== 'string' || !id.trim()) throw new Error('Unauthorized tenant');
    return id.trim();
  }
  return {
    ensureSchema: () => ensureLeadTable(pool),
    beginCapture: ({ message, language }) => beginLeadCapture({ message, language }),
    async submitCapture(context, details) {
      const tenantId = await authorizedTenant(context);
      const leadId = randomUUID();
      const result = completeLeadCapture({
        session: details?.session, tenantId, leadId,
        name: details?.name, email: details?.email,
        phone: details?.phone, consent: details?.consent
      });
      if (!result.accepted) return { accepted: false, reason: result.reason };
      const saved = await saveQualifiedLead(pool, tenantId, result.event);
      return { accepted: saved.saved, reason: saved.saved ? null : 'duplicate', leadId: saved.saved ? leadId : null };
    },
    async list(context, limit) {
      const tenantId = await authorizedTenant(context);
      return listQualifiedLeads(pool, tenantId, limit);
    },
    async analytics(context) {
      const tenantId = await authorizedTenant(context);
      return leadAnalyticsForTenant(pool, tenantId);
    }
  };
}
