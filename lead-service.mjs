import { classifyLeadIntent, nextLeadQuestion, qualifyLead } from './lead-qualification.mjs';
import { summarizeLeads } from './lead-analytics.mjs';
import { buildLeadEvent, signLeadPayload } from './lead-webhook.mjs';

// Stateless application boundary. Tenant-specific authentication and persistence
// must be supplied by the calling server; this module does not expose public routes.
export function prepareLeadConversation({ message, language = 'fi' } = {}) {
  const result = classifyLeadIntent(message);
  return {
    intent: result.intent,
    confidence: result.confidence,
    nextQuestion: nextLeadQuestion(result.intent, language),
    requiresConsent: ['quote', 'booking', 'purchase', 'contact'].includes(result.intent)
  };
}
export function prepareQualifiedLead({ tenantId, leadId, message, name, email, phone, consent, occurredAt } = {}) {
  if (typeof tenantId !== 'string' || !tenantId.trim() || typeof leadId !== 'string' || !leadId.trim()) {
    throw new TypeError('Authenticated tenant ID and unique lead ID are required');
  }
  const lead = qualifyLead({ message, name, email, phone, consent });
  if (!lead.qualified) return { accepted: false, lead, event: null };
  return { accepted: true, lead, event: buildLeadEvent({ tenantId, leadId, lead, occurredAt }) };
}
export function prepareCrmDelivery(event, secret) {
  if (event?.event !== 'lead.qualified' || !event?.tenantId || !event?.leadId || !event?.contact) {
    throw new TypeError('Qualified lead event required');
  }
  const { body, signature } = signLeadPayload(event, secret);
  return { body, headers: { 'content-type': 'application/json', 'x-respondo-signature': signature } };
}
export { summarizeLeads };
