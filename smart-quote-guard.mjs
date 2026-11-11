// Deterministic safeguards for a tenant-configured quote calculation.
// This module never confirms availability, accepts an order or collects payment.
const MAX_QUANTITY = 100_000;
const MAX_EUR = 10_000_000;
const money = amount => Math.round((amount + Number.EPSILON) * 100) / 100;

export function parseQuoteQuantity(input) {
  const value = input === undefined || input === null || input === '' ? 0 : input;
  if (typeof value === 'boolean' || (typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && !/^\s*\d+(?:\.\d+)?\s*$/.test(value))) {
    throw new RangeError('Invalid quote quantity');
  }
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
    throw new RangeError('Invalid quote quantity');
  }
  return quantity;
}

export function computeSafeQuote({ base = 0, unit = 0, minimum = 0, vatPercent = 0, quantity = 0 } = {}) {
  const values = [base, unit, minimum, vatPercent].map(Number);
  if (values.some(x => !Number.isFinite(x) || x < 0) || values[3] > 100 ||
      values.slice(0,3).some(x => x > MAX_EUR)) {
    throw new RangeError('Invalid quote pricing configuration');
  }
  const qty = parseQuoteQuantity(quantity);
  const [fixed, perUnit, floor, vatRate] = values;
  if (fixed === 0 && perUnit === 0 && floor === 0) return null;
  const rawNet = Math.max(floor, fixed + perUnit * qty);
  const rawVat = rawNet * vatRate / 100;
  if (!Number.isFinite(rawNet) || !Number.isFinite(rawVat) || rawNet + rawVat > MAX_EUR) {
    throw new RangeError('Quote estimate exceeds safe pricing limit');
  }
  const net = money(rawNet);
  const vat = money(rawVat);
  const total = money(net + vat);
  return Object.freeze({ net, vatPercent: vatRate, vat, total,
    totalCents: Math.round(total * 100), quantity: qty, currency: 'EUR' });
}
