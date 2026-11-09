// Isolate a cited price fact only when the imported answer contains
// multiple independently stated prices and the question names one of them.
// Never use a fuzzy price amount or invent a service-to-price mapping.
const normalize = value => String(value ?? '')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const noise = /^(?:mita|mika|mitka|minkalainen|paljonko|paljoko|kuinka|paljon|maksaa|maksaako|hinta|hintaa|hinnat|hinnoittelu|hintainen|kustannus|kustannukset|eur|euro|euroa|teetteko|teette|tarjoatteko|tarjoatte|palvelu|palvelut|palvelun|palveluiden|ent[aä]|entas|entapa|mites|sitten|no|ja|onko|saisiko|saako|what|which|how|much|does|cost|price|prices|pricing|about|then|and|the|you|your|service|services|for|is|it|this|that|with|hur|vad|mycket|kostar|pris|priset|priser|tjanst|tjanster|och|det|den|ni|om|da|kan|jag|fa|also|please|could|tell|me)$/;

function subjectTokens(value) {
  return [...new Set(normalize(value).split(' ')
    .filter(word => word.length >= 5 && !noise.test(word)
      && !/^(?:maks|hinn|hint|palvel|kustann|tarjo|servic|pric|cost|kost|tjanst|euro|mycket)/.test(word)
      && !/^\d+$/.test(word)))];
}

const money = /(?:[€$]\s*\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\s*(?:€|\$|eur(?:oa|on|o)?\b|usd\b|sek\b|kr\b))/i;

function subjectMatch(questionToken, phraseToken) {
  if (questionToken === phraseToken) return true;
  // Allows Finnish inflections and small compound spelling differences,
  // but refuses short generic overlaps such as "pesu".
  return questionToken.length >= 6 && phraseToken.length >= 6
    && questionToken.slice(0, 6) === phraseToken.slice(0, 6);
}

export function focusMultiPriceAnswer(answer, query) {
  const raw = String(answer ?? '').trim();
  if (!raw) return { status: 'unchanged', answer: raw };
  const clauses = raw.split(/(?<=[.!?])\s+|[;\n]+/)
    .map(part => part.trim()).filter(Boolean);
  const priced = clauses.filter(clause => money.test(clause));
  if (priced.length < 2) return { status: 'unchanged', answer: raw };

  const subjects = subjectTokens(query);
  // "What are your prices?" requests a list. Leave it unchanged.
  if (!subjects.length) return { status: 'unchanged', answer: raw };
  const matched = priced.filter(clause => {
    const words = subjectTokens(clause);
    return subjects.some(subject => words.some(word => subjectMatch(subject, word)));
  });
  if (matched.length === 1) return { status: 'focused', answer: matched[0] };
  // With no matching priced clause, never return the first unrelated amount.
  if (matched.length === 0) return { status: 'unmatched', answer: '' };
  // Multiple matching facts may be a list or distinct variants; do not guess
  // which value the customer intended.
  return { status: 'ambiguous', answer: '' };
}
