import { randomUUID } from 'node:crypto';
import { deliverQualifiedLead } from './lead-crm.mjs';
import { getCrmProvider, enqueueCrmLead } from './lead-crm-queue.mjs';
import { beginLeadCapture, completeLeadCapture } from './lead-capture.mjs';
import { ensureLeadTable, saveQualifiedLead, listQualifiedLeads, leadAnalyticsForTenant, deleteQualifiedLead } from './lead-repository.mjs';

// Framework-independent authenticated owner operations.
// resolveTenantId MUST validate the server session and ownership; never trust
// a tenant ID supplied in the request body or query string.
export function createLeadOperations({ pool, resolveTenantId, crm = {}, deliver = deliverQualifiedLead }) {
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
      if (!saved.saved) return { accepted: false, reason: 'duplicate', leadId: null };
      let crmStatus = 'disabled';
      try {
        const setting = await getCrmProvider(pool, tenantId);
        if (setting.enabled) {
          const queued = await enqueueCrmLead(pool,result.event);
          crmStatus = queued.queued ? 'queued' : 'already_queued';
        } else if (crm.url && crm.secret) {
          // Legacy global webhook remains supported until tenants migrate.
          crmStatus = (await deliver(result.event,crm)).status;
        }
      } catch(error) {
        console.error('CRM enqueue failed', {leadId,error:String(error)});
        crmStatus='failed';
      }
      return { accepted: true, reason: null, leadId, crmStatus };
    },
    async list(context, limit) {
      const tenantId = await authorizedTenant(context);
      return listQualifiedLeads(pool, tenantId, limit);
    },
    async delete(context, leadId) {
      const tenantId = await authorizedTenant(context);
      return deleteQualifiedLead(pool, tenantId, leadId);
    },
    async analytics(context) {
      const tenantId = await authorizedTenant(context);
      return leadAnalyticsForTenant(pool, tenantId);
    }
  };
}
