import { prepareLeadConversation, prepareQualifiedLead } from './lead-service.mjs';

// Pure state machine for chat lead capture. No database or network side effects.
// The host application must keep sessions tenant-scoped, obtain explicit consent
// with an unchecked checkbox, and validate all submitted values server-side.
const maxText = (value, limit) => String(value ?? '').trim().slice(0, limit);
export function beginLeadCapture({ message, language = 'fi' } = {}) {
  const request = prepareLeadConversation({ message, language });
  if (!request.requiresConsent) return null;
  return { stage: 'details', originalMessage: maxText(message, 4000), language,
    intent: request.intent, question: request.nextQuestion };
}
export function completeLeadCapture({ session, tenantId, leadId, name, email, phone, consent } = {}) {
  if (!session || session.stage !== 'details' || !session.originalMessage ||
      !['quote', 'booking', 'purchase', 'contact'].includes(session.intent)) {
    return { accepted: false, reason: 'invalid_session', event: null };
  }
  if (consent !== true) return { accepted: false, reason: 'consent_required', event: null };
  const result = prepareQualifiedLead({
    tenantId, leadId, message: session.originalMessage,
    name: maxText(name, 120), email: maxText(email, 254),
    phone: maxText(phone, 40), consent
  });
  return result.accepted
    ? { accepted: true, reason: null, event: result.event }
    : { accepted: false, reason: 'invalid_details', event: null };
}
