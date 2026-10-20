import { createHmac, timingSafeEqual } from 'node:crypto';

// Sign server-to-server CRM webhook payloads. Never expose the secret to browsers.
export function signLeadPayload(payload, secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Webhook secret must contain at least 32 characters');
  const body = JSON.stringify(payload);
  const signature = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  return { body, signature };
}
export function verifyLeadPayload(body, signature, secret) {
  if (typeof body !== 'string' || typeof signature !== 'string' || typeof secret !== 'string' || secret.length < 32) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(signature), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function buildLeadEvent({ tenantId, leadId, lead, occurredAt = new Date().toISOString() }) {
  if (!tenantId || !leadId || !lead?.qualified || !lead?.contact) throw new Error('Only consented qualified leads may be exported');
  return { event: 'lead.qualified', version: 1, tenantId: String(tenantId), leadId: String(leadId), occurredAt, intent: lead.intent, score: lead.score, contact: lead.contact };
}
