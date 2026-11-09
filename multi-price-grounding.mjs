// Isolate a cited price fact only when the imported answer contains
// multiple independently stated prices and the question names one of them.
// Never use a fuzzy price amount or invent a service-to-price mapping.
const normalize = value => String(value ?? '')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const noise = /^(?:mita|mika|mitka|minkalainen|paljonko|paljoko|kuinka|paljon|maksaa|maksaako|hinta|hintaa|hinnat|hinnoittelu|hintainen|kustannus|kustannukset|eur|euro|euroa|teetteko|teette|tarjoatteko|tarjoatte|palvelu|palvelut|palvelun|palveluiden|ent[aä]|entas|entapa|mites|sitten|no|ja|onko|saisiko|saako|what|which|how|much|does|cost|price|prices|pricing|about|then|and|the|you|your|service|services|for|is|it|this|that|with|hur|vad|mycket|kostar|pris|priset|priser|tjanst|tjanster|och|det|den|ni|om|da|kan|jag|fa|also|please|could|tell|me)$/;

function subjectTokens(value, withAliases = false) {
  const normalized = normalize(value);
  const tokens = normalized.split(' ')
    .filter(word => word.length >= 5 && !noise.test(word)
      && !/^(?:maks|hinn|hint|palvel|kustann|tarjo|servic|pric|cost|kost|tjanst|euro|mycket)/.test(word)
      && !/^\d+$/.test(word));
  // Expand only well-identified service subjects across FI/SV/EN. These
  // aliases are search cues, never evidence that a service or price exists.
  if (withAliases) {
    if (/\b(?:ikkun\w*|windows?\b|fonster\w*)/.test(normalized) &&
        /(?:pes|puhdist|tvatt|puts|clean|wash)/.test(normalized)) tokens.push('ikkunanpesu');
    if (/\b(?:katon\w*|katto\w*|roof\w*|tak(?:tvatt|rengor|puts)\w*)/.test(normalized) &&
        /(?:pes|puhdist|tvatt|rengor|puts|clean|wash)/.test(normalized)) tokens.push('katonpesu');
    if (/(?:hair|hius|harklipp)/.test(normalized) &&
        /(?:cut|leikk|klipp)/.test(normalized)) tokens.push('hiustenleikkaus');
  }
  return [...new Set(tokens)];
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

  const subjects = subjectTokens(query, true);
  // "What are your prices?" requests a list. Leave it unchanged.
  if (!subjects.length) return { status: 'unchanged', answer: raw };
  const matches = priced.map(clause => {
    const words = subjectTokens(clause);
    return { clause, subjects:subjects.filter(subject =>
      words.some(word => subjectMatch(subject, word))) };
  });
  const strongest = Math.max(...matches.map(match => match.subjects.length));
  // With no matching priced clause, never return the first unrelated amount.
  if (!strongest) return { status: 'unmatched', answer: '' };

  const best = matches.filter(match => match.subjects.length === strongest);
  if (best.length === 1) return { status: 'focused', answer: best[0].clause };

  // Explicit requests for multiple distinct services may include their
  // matching price clauses together. A single service with separate weekday
  // and weekend prices remains ambiguous until a variant is specified.
  const covered = matches.filter(match => match.subjects.length > 0);
  const disjoint = covered.every((a, i) => covered.every((b, j) =>
    i === j || !a.subjects.some(subject => b.subjects.includes(subject))));
  if (covered.length <= 4 && disjoint &&
      subjects.every(subject => covered.some(match => match.subjects.includes(subject)))) {
    return { status: 'focused', answer: covered.map(match => match.clause).join(' ') };
  }
  return { status: 'ambiguous', answer: '' };
}
