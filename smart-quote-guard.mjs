// Deterministic safeguards for a tenant-configured quote calculation.
// This module never confirms availability, accepts an order or collects payment.
const MAX_QUANTITY = 100_000;
const MAX_EUR = 10_000_000;
const PERCENT_SCALE = 10_000n;

function decimalAmount(input, max, errorMessage) {
  if (typeof input !== 'number' &&
      (typeof input !== 'string' || !/^\s*(?:\d+(?:\.\d+)?|\.\d+)\s*$/.test(input))) {
    throw new RangeError(errorMessage);
  }
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount < 0 || amount > max) throw new RangeError(errorMessage);
  return amount;
}

export function parseQuoteQuantity(input) {
  return decimalAmount(input === undefined || input === null || input === '' ? 0 : input,
    MAX_QUANTITY, 'Invalid quote quantity');
}

function fixedPrecision(input, max, scale) {
  const message = 'Invalid quote pricing configuration';
  const value = decimalAmount(input, max, message);
  if (Math.round(value * scale) / scale !== value) throw new RangeError(message);
  return value;
}

export function validateQuotePricing({
  base = 0,
  unit = 0,
  distancePrice = 0,
  minimum = 0,
  vatPercent = 0,
  discountOverQuantity = null,
  discountPercent = 0
} = {}) {
  const threshold = discountOverQuantity === null || discountOverQuantity === ''
    ? null
    : fixedPrecision(discountOverQuantity, MAX_QUANTITY, 1000);
  const rate = fixedPrecision(discountPercent, 100, 100);
  if (rate > 0 && threshold === null) throw new RangeError('Quantity discount requires a threshold');
  return {
    base:fixedPrecision(base, MAX_EUR, 100),
    unit:fixedPrecision(unit, MAX_EUR, 100),
    distancePrice:fixedPrecision(distancePrice, MAX_EUR, 100),
    minimum:fixedPrecision(minimum, MAX_EUR, 100),
    vatPercent:fixedPrecision(vatPercent, 100, 100),
    discountOverQuantity:threshold,
    discountPercent:rate
  };
}

// Use exact decimal ratios for fractional quantities. Prices are stored in
// cents and tax/discount rates in hundredths of a percentage point.
function quantityFraction(quantity) {
  const [number, exponent = '0'] = String(quantity).split('e');
  const [whole, fraction = ''] = number.split('.');
  const places = fraction.length - Number(exponent);
  const digits = BigInt(whole + fraction);
  return places > 0 ? [digits, 10n ** BigInt(places)] : [digits * 10n ** BigInt(-places), 1n];
}

const hundredths = value => BigInt(Math.round(value * 100));
const roundRatio = (numerator, denominator) => (numerator + denominator / 2n) / denominator;

export function computeSafeQuote({ quantity = 0, distanceKm, ...configuration } = {}) {
  const pricing = validateQuotePricing(configuration);
  const qty = parseQuoteQuantity(quantity);
  const distance = pricing.distancePrice > 0
    ? decimalAmount(distanceKm, MAX_QUANTITY, 'Invalid or missing trip distance')
    : 0;
  if (Math.round(distance*1000)/1000 !== distance) throw new RangeError('Invalid trip distance precision');
  if (pricing.base === 0 && pricing.unit === 0 && pricing.minimum === 0 && pricing.distancePrice === 0) return null;

  const discountApplies = pricing.discountPercent > 0 && pricing.unit > 0 &&
    qty > pricing.discountOverQuantity;
  const discountRate = discountApplies ? hundredths(pricing.discountPercent) : 0n;
  const [qtyNumerator, qtyDenominator] = quantityFraction(qty);
  const [distanceNumerator,distanceDenominator] = quantityFraction(distance);
  const scale = qtyDenominator * distanceDenominator * PERCENT_SCALE;
  const work = hundredths(pricing.unit) * qtyNumerator;
  const travel = hundredths(pricing.distancePrice) * distanceNumerator * qtyDenominator * PERCENT_SCALE;
  const subtotal = hundredths(pricing.base) * scale + work * (PERCENT_SCALE - discountRate) * distanceDenominator + travel;
  const minimum = hundredths(pricing.minimum) * scale;
  const minimumApplied = subtotal < minimum;
  const netCents = roundRatio(minimumApplied ? minimum : subtotal, scale);
  const vatCents = roundRatio(netCents * hundredths(pricing.vatPercent), PERCENT_SCALE);
  const totalCents = netCents + vatCents;

  if (totalCents > hundredths(MAX_EUR)) throw new RangeError('Quote estimate exceeds safe pricing limit');
  return Object.freeze({
    net:Number(netCents) / 100,
    vatPercent:pricing.vatPercent,
    vat:Number(vatCents) / 100,
    total:Number(totalCents) / 100,
    totalCents:Number(totalCents),
    quantity:qty,
    currency:'EUR',
    ...(pricing.distancePrice > 0 ? {distanceKm:distance,travel:Number(roundRatio(travel,scale))/100} : {}),
    ...(minimumApplied ? {minimumApplied:true} : {}),
    ...(discountApplies ? {
      workDiscountPercent:pricing.discountPercent,
      workDiscount:Number(roundRatio(work * discountRate, qtyDenominator * PERCENT_SCALE)) / 100
    } : {})
  });
}

export function tenantQuotePricing(tenant) {
  return {
    base:tenant.quote_base_price ?? 0,
    unit:tenant.quote_unit_price ?? 0,
    distancePrice:tenant.quote_distance_price ?? 0,
    minimum:tenant.quote_min_price ?? 0,
    vatPercent:tenant.quote_vat_percent ?? 0,
    discountOverQuantity:tenant.quote_discount_over_quantity ?? null,
    discountPercent:tenant.quote_discount_percent ?? 0
  };
}
