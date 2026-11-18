// Privacy-conscious, dependency-free lead qualification.
// The caller must obtain consent and enforce tenant isolation, retention,
// rate limits, and authentication before persisting or exporting any lead.
const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const patterns = Object.freeze({
  quote: /tarjouspyyn|tarjouksen|tarjousta|hinta[ -]?arvio|paljo(?:nko)?\s+maks|paljo(?:nko)?\b.{0,45}\bmaks|mit[aä]\s+maks|mit[aä]\s+hint|request (?:a )?quote|send me a quote|quotation|cost estimate|how much (?:does|would|will|is)|offert|prisf[oö]rslag|vad kostar|hur mycket kostar/,
  booking: /ajanvarau|varata ajan|varaisin ajan|oisko.{0,30}aika|olisiko.{0,30}aika|book(?:ing)? (?:an? )?appointment|schedule (?:an? )?(?:meeting|visit|appointment)|boka (?:en )?tid|tidsbokning|ledig tid/,
  purchase: /haluan ostaa|ostaisin|ostaa (?:t[aä]m[aä]n|tuon)|tilaisin|tilata tuot|(?:want to |i(?:'d| would) like to )?buy(?: this| one)?|place an order|purchase|kopa|bestalla|jag vill (?:kopa|bestalla)/,
  contact: /ottakaa yhteytt|soittakaa|voitteko soittaa|minuun yhteytt|contact me|call me|reach out|kontakta mig|ring mig|kan ni ringa/,
  support: /ei toimi|ongelma|reklamaatio|palautus|refund|broken|not working|complaint|problem|reklamation|fungerar inte/
});
export function classifyLeadIntent(message) {
  const text = fold(message).slice(0, 4000);
  if (!text.trim()) return { intent: 'unknown', confidence: 0 };
  // A negated sales request is not permission to create a sales opportunity.
  // Support signals still take precedence when a customer reports a problem.
  const deniesSales = /\b(?:en|emme|ei|ala|älä)\s+(?:nyt\s+)?(?:halua|tarvitse|tahdo)\b.{0,45}\b(?:ostaa|tila|tarjou|aika)|\b(?:i (?:do not|don't|dont)|not)\s+(?:want|need|looking for)\b.{0,45}\b(?:buy|book|quote|appointment)|\b(?:jag vill inte|behover ingen|inte intresserad av)\b.{0,45}\b(?:kopa|boka|offert)/.test(text);
  for (const intent of ['support', 'quote', 'booking', 'purchase', 'contact']) {
    if (patterns[intent].test(text)) {
      if (intent !== 'support' && deniesSales) return { intent:'unknown', confidence:0 };
      return { intent, confidence: 0.85 };
    }
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
  const allowed = consent === true;
  const salesIntent = intent !== 'unknown' && intent !== 'support';
  const qualified = Boolean(allowed && safeName && hasContact && salesIntent);
  const score = !allowed || !salesIntent ? 0 : Math.min(100, (intent === 'purchase' ? 45 : intent === 'quote' ? 40 : intent === 'booking' ? 35 : intent === 'contact' ? 20 : 0) + (safeName ? 15 : 0) + (hasContact ? 25 : 0) + (validEmail && validPhone ? 10 : 0));
  return { intent, confidence, qualified, score, contact: allowed ? { name: safeName, email: validEmail ? safeEmail : '', phone: validPhone ? safePhone : '' } : null };
}

// Suggested next question, never a substitute for explicit contact consent.
const prompts = Object.freeze({
  fi: { quote: 'Millaista palvelua tarvitset ja millä aikataululla?', booking: 'Minkä palvelun haluaisit varata ja milloin?', purchase: 'Mistä tuotteesta tai palvelusta olet kiinnostunut?', contact: 'Miten voimme auttaa sinua?' },
  sv: { quote: 'Vilken tjänst behöver du och när?', booking: 'Vilken tjänst vill du boka och när?', purchase: 'Vilken produkt eller tjänst är du intresserad av?', contact: 'Hur kan vi hjälpa dig?' },
  en: { quote: 'What service do you need, and by when?', booking: 'What service would you like to book, and when?', purchase: 'Which product or service are you interested in?', contact: 'How can we help you?' }
});
export function nextLeadQuestion(intent, language = 'fi') {
  const lang = Object.hasOwn(prompts, language) ? language : 'en';
  return prompts[lang][intent] || null;
}
