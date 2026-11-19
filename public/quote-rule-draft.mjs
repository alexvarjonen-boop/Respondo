// Convert only supported one-unit pricing clauses. An unrecognized clause
// invalidates the whole draft so it cannot silently drop a fee or condition.
const number = '(\\d{1,6}(?:[,.]\\d{1,3})?)';
const money = '(?:€\\s*' + number + '|' + number + '\\s*€)';
const pricePerUnit = new RegExp('^(?:veloitamme\\s+|vi tar\\s+|we charge\\s+)?' +
  money + '\\s*(?:/|per\\s+)\\s*([\\p{L}²³]+)$', 'iu');
const baseFee = new RegExp('^(?:perusmaksu|matkakulu|startavgift|reseavgift|base fee|fixed fee|travel fee)\\s+' + money + '$', 'i');
const minimumFee = new RegExp('^(?:minimihinta|minimiveloitus|minimiavgift|minimum charge|minimum price)\\s+' + money + '$', 'i');
const discount = new RegExp('^(?:yli|över|over)\\s+' + number +
  '\\s+[\\p{L}²³]+\\s+' + number +
  '\\s*%\\s+(?:alennus(?: pesutyöhön)?|rabatt|discount)$', 'iu');

function asNumber(value) {
  return Number(value.replace(',', '.'));
}

function hasPrecision(value, digits) {
  return (value.split(/[,.]/)[1]?.length || 0) <= digits;
}

export function parseQuoteRuleDraft(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > 420) return null;
  const clauses = text.replace(/\.$/, '').split(/[;\n]|,\s+(?!\d)/).map(clause => clause.trim());
  const draft = {};
  for (const clause of clauses) {
    const pricing = pricePerUnit.exec(clause);
    if (pricing && draft.unitPrice === undefined) {
      const amount = pricing[1] || pricing[2];
      if (!hasPrecision(amount, 2) || pricing[3].length > 20) return null;
      draft.unitPrice = asNumber(amount);
      draft.unitLabel = pricing[3];
      continue;
    }

    const base = baseFee.exec(clause);
    const minimum = minimumFee.exec(clause);
    const fee = base || minimum;
    if (fee) {
      const key = base ? 'basePrice' : 'minPrice';
      const amount = fee[1] || fee[2];
      if (draft[key] !== undefined || !hasPrecision(amount, 2)) return null;
      draft[key] = asNumber(amount);
      continue;
    }

    const reduction = discount.exec(clause);
    if (!reduction || draft.discountOverQuantity !== undefined) return null;
    const threshold = asNumber(reduction[1]);
    const percent = asNumber(reduction[2]);
    if (threshold > 100000 || percent <= 0 || percent > 100 || !hasPrecision(reduction[2], 2)) return null;
    draft.discountOverQuantity = threshold;
    draft.discountPercent = percent;
  }
  return draft.unitPrice === undefined ? null : draft;
}
