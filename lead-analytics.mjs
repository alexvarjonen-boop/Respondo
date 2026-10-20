// Aggregate qualified lead metrics without storing or exposing contact details.
// Feed this only authenticated, tenant-scoped lead records from the database.
const intents = ['quote', 'booking', 'purchase', 'contact'];
export function summarizeLeads(records = []) {
  if (!Array.isArray(records)) throw new TypeError('Expected an array of tenant-scoped leads');
  const byIntent = Object.fromEntries(intents.map(intent => [intent, 0]));
  let qualified = 0, totalScore = 0, scored = 0;
  for (const lead of records) {
    if (!lead || typeof lead !== 'object') continue;
    if (lead.qualified !== true || !intents.includes(lead.intent)) continue;
    qualified++;
    byIntent[lead.intent]++;
    if (Number.isFinite(lead.score)) {
      totalScore += Math.max(0, Math.min(100, lead.score));
      scored++;
    }
  }
  return {
    qualified,
    byIntent,
    averageScore: scored ? Math.round(totalScore / scored) : null
  };
}
