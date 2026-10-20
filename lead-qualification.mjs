// Privacy-conscious, dependency-free lead qualification.
// The caller must obtain consent and enforce tenant isolation, retention,
// rate limits, and authentication before persisting or exporting any lead.
const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const patterns = Object.freeze({
  quote: /tarjouspyyn|tarjouksen|tarjousta|hinta-arvio|paljonko maks|request (?:a )?quote|quotation|cost estimate|offert|prisforslag/,
  booking: /ajanvarau|varata ajan|varaisin ajan|book(?:ing)? (?:an )?appointment|schedule (?:a )?meeting|boka tid|tidsbokning/,
  purchase: /haluan ostaa|ostaisin|tilaisin|tilata tuot|buy (?:this|one)|place an order|purchase|köpa|beställa/,
  contact: /ottakaa yhteytt|soittakaa|minuun yhteytt|contact me|call me|reach out|kontakta mig|ring mig/,
  support: /ei toimi|ongelma|reklamaatio|palautus|refund|broken|not working|complaint|problem|reklamation|fungerar inte/
});
export function classifyLeadIntent(message) {
  const text = fold(message).slice(0, 4000);
  if (!text.trim()) return { intent: 'unknown', confidence: 0 };
  for (const intent of ['quote', 'booking', 'purchase', 'contact', 'support']) {
    if (patterns[intent].test(text)) return { intent, confidence: 0.85 };
  }
  return { intent: 'unknown', confidence: 0 };
}
export function qualifyLead({ message = '', name = '', email = '', phone = '', consent = false } = {}) {
  const { intent, confidence } = classifyLeadIntent(message);
  const safeName = String(name).trim().slice(0, 120);
  const safeEmail = String(email).trim().slice(0, 254);
  const safePhone = String(phone).trim().slice(0, 40);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail);
  const validPhone = /^\+?[\d\s().-]{6,30}$/.test(safePhone);
  const hasContact = validEmail || validPhone;
  const qualified = Boolean(consent && safeName && hasContact && intent !== 'unknown' && intent !== 'support');
  const score = !consent ? 0 : Math.min(100, (intent === 'purchase' ? 45 : intent === 'quote' ? 40 : intent === 'booking' ? 35 : intent === 'contact' ? 20 : 0) + (safeName ? 15 : 0) + (hasContact ? 25 : 0) + (validEmail && validPhone ? 10 : 0));
  return { intent, confidence, qualified, score, contact: consent ? { name: safeName, email: validEmail ? safeEmail : '', phone: validPhone ? safePhone : '' } : null };
}
