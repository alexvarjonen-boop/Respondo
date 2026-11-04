import { checkCitedNumericalClaims } from './answer-fact-consistency.mjs';

// The existing import QA checks numbers after a test run. This guard runs on
// the actual customer-facing answer, just before it leaves the bot engine.
// It does not infer prices, rewrite claims, browse or change any tenant data.
const CHECKED_TOPICS = Object.freeze([
  'pricing', 'hours', 'delivery', 'returns', 'warranty', 'payment'
]);

export function guardCitedNumericFacts(result, rows = []) {
  if (!result || result.handoff || !String(result.answer || '').trim()) return result;
  const citedIds = new Set(
    (Array.isArray(result.sourceIds) ? result.sourceIds : [])
      .filter(id => id !== null && id !== undefined && String(id).trim())
      .map(String)
  );
  // Conversations and generic greetings can legitimately have no citations.
  // This guard only checks factual answers that cite approved tenant sources.
  if (!citedIds.size) return result;
  const citedRows = (Array.isArray(rows) ? rows : [])
    .filter(row => row && row.approved !== false && citedIds.has(String(row.id)));
  if (!citedRows.length) return result;

  for (const topic of CHECKED_TOPICS) {
    const check = checkCitedNumericalClaims({
      answer: result.answer,
      sourceRows: citedRows,
      topic
    });
    if (check.status === 'review') {
      // Fail closed instead of sending a fabricated or stale numerical value.
      // The calling widget already handles a handoff with no answer.
      return {
        ...result,
        answer: '',
        handoff: true,
        confidence: 0.1,
        sourceIds: [],
        selected: [],
        qualityFlag: 'numeric_evidence_conflict'
      };
    }
  }
  return result;
}
