// Optional, bounded Firecrawl renderer for JavaScript-heavy public websites.
// The default Respondo importer stays first-party and unchanged when disabled.
// IMPORTANT: callers must first pass the URL through fetchPublicHtml's DNS,
// public-IP, redirect, and SSRF validation. This module is not an SSRF validator.
import net from 'node:net';

export function firecrawlEnabled(env = process.env) {
  return env.FIRECRAWL_ENABLED === 'true' && Boolean(String(env.FIRECRAWL_API_KEY || '').trim());
}

export function firecrawlMaxPages(env = process.env) {
  const requested = Number(env.FIRECRAWL_MAX_PAGES || 2);
  return Number.isFinite(requested) ? Math.max(0, Math.min(3, Math.floor(requested))) : 2;
}

// Firecrawl v2 credits are team-wide. Conservatively reserve 50 credits so
// paid overage or an exhausted free allowance cannot silently become required.
// This guard never calls the paid scrape endpoint to check the balance.
export function firecrawlReserveCredits(env = process.env) {
  const value = Number(env.FIRECRAWL_RESERVE_CREDITS ?? 50);
  return Number.isFinite(value) ? Math.max(0, Math.min(10000, Math.floor(value))) : 50;
}

// No timers or database required: the next eligible website import checks again
// after the cooldown. This also resumes rendering after a quota renewal/top-up.
// Cache and local reservations limit excess calls on busy single-process servers.
// Several replicas or other Firecrawl clients still share the same team quota.
export function createFirecrawlCreditGuard({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  healthyCacheMs = 30_000,
  pausedRetryMs = 300_000,
  errorRetryMs = 60_000,
  timeoutMs = 4000,
} = {}) {
  let checkedKey = null;
  let remaining = null;
  let nextCheckAt = 0;
  let pending = null;

  async function refresh(key, reserve) {
    try {
      const response = await fetchImpl('https://api.firecrawl.dev/v2/team/credit-usage', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
        signal: AbortSignal.timeout(Math.max(1000, Math.min(8000, timeoutMs))),
      });
      if (!response.ok) throw new Error('Firecrawl quota check unavailable');
      const payload = await response.json();
      const value = payload?.data?.remainingCredits;
      if (payload?.success !== true || typeof value !== 'number' ||
          !Number.isFinite(value) || value < 0) {
        throw new Error('Invalid Firecrawl quota response');
      }
      remaining = Math.floor(value);
      nextCheckAt = now() + (remaining > reserve ? healthyCacheMs : pausedRetryMs);
    } catch {
      // Fail closed for this *optional* renderer. Native website imports work.
      remaining = null;
      nextCheckAt = now() + errorRetryMs;
    }
  }

  return async function maySpendOneFirecrawlCredit(env = process.env) {
    if (!firecrawlEnabled(env)) return false;
    const key = String(env.FIRECRAWL_API_KEY || '').trim();
    if (checkedKey !== key) {
      checkedKey = key;
      remaining = null;
      nextCheckAt = 0;
    }
    const reserve = firecrawlReserveCredits(env);
    if (!pending && now() >= nextCheckAt) {
      pending = refresh(key, reserve).finally(() => { pending = null; });
    }
    if (pending) await pending;
    if (remaining === null || remaining <= reserve) return false;
    // Reserve a credit locally before a scrape can start. Failed scrapes may
    // leave a conservative discrepancy until the next real balance refresh.
    remaining--;
    return true;
  };
}

export const maySpendOneFirecrawlCredit = createFirecrawlCreditGuard();

export function permittedFirecrawlTarget(value, verifiedHostname) {
  try {
    const url = new URL(String(value || ''));
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    const expected = String(verifiedHostname || '').toLowerCase().replace(/\.$/, '');
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    if (url.username || url.password || url.port && !['80', '443'].includes(url.port)) return false;
    if (!expected || hostname !== expected || !hostname.includes('.')) return false;
    if (net.isIP(hostname) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/i.test(hostname)) return false;
    if (url.href.length > 2500) return false;
    return true;
  } catch { return false; }
}

// Returns rendered, cleaned HTML, or null on failure. Never outputs raw
// third-party diagnostics or any API credential to users or application logs.
export async function fetchFirecrawlRenderedHtml(value, {
  verifiedHostname,
  apiKey = process.env.FIRECRAWL_API_KEY,
  fetchImpl = globalThis.fetch,
  timeoutMs = 9000,
} = {}) {
  if (!permittedFirecrawlTarget(value, verifiedHostname)) return null;
  if (!String(apiKey || '').trim()) return null;
  const deadline = Math.max(1500, Math.min(12000, Number(timeoutMs) || 9000));
  try {
    const response = await fetchImpl('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(deadline),
      body: JSON.stringify({
        url: String(value),
        formats: ['html'],
        onlyMainContent: false,
        timeout: deadline,
        waitFor: 500,
      }),
    });
    if (!response.ok) return null; // 402 means free credits are exhausted.
    if (Number(response.headers?.get?.('content-length') || 0) > 2_000_000) return null;
    const body = await response.text();
    if (body.length > 2_000_000) return null;
    const payload = JSON.parse(body);
    if (payload?.success !== true || typeof payload.data?.html !== 'string') return null;
    // Reject third-party redirects: don't mix a redirected site's data into
    // the selected company's knowledge, even when the requested URL was safe.
    for (const source of [payload.data?.metadata?.sourceURL, payload.data?.metadata?.url]) {
      if (source && !permittedFirecrawlTarget(source, verifiedHostname)) return null;
    }
    return payload.data.html.length <= 1_000_000 ? payload.data.html : null;
  } catch {
    // Failed render must never fail an otherwise successful website import.
    return null;
  }
}
