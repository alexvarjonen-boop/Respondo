import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('public demo website import uses a bounded crawl budget', () => {
  assert.match(
    server,
    /fetchWebsiteBundle\(\s*website,\s*90,\s*24000,\s*null,\s*\{\s*storefrontLimit:300,\s*storefrontBudgetMs:6000,\s*sitemapLimit:1600\s*\}/,
  );
});

test('paid importer keeps the wider production crawl', () => {
  assert.match(server, /fetchWebsiteBundle\(website,600,4\*60\*1000/);
});


test('storefront catalog still keeps a bounded sample of product pages for policy extraction', () => {
  assert.match(server,/representativeProductUrls=new Set\(\[\.\.\.catalogUrls\]\.slice\(0,4\)\)/);
  assert.match(server,/!catalogUrls\.has\(key\) \|\| representativeProductUrls\.has\(key\)/);
});


test('crawler allows About pages even when a CMS stores them under blog paths', () => {
  assert.match(server,/const companyInfo=\/about\|about-us\|meista\|meistä\|yritys\|company\|who-we-are\|our-story\//);
  assert.match(server,/if \(companyInfo\) return !\/privacy\|terms/);
});


test('slow or blocked external storefronts are handled without leaking raw errors',()=>{
  assert.match(server,/async function fetchPublicHtml\(value, timeoutMs = 8000, maxBytes = 2_000_000\)/);
  assert.match(server,/fetchPublicHtml\(value,Math\.min\(18000,Math\.max\(14000,timeBudgetMs\)\),4_000_000\)/);
  assert.match(server,/controller\.signal\.aborted \|\| error\?\.name === 'AbortError'/);
  assert.match(server,/status === 401 \|\| status === 403 \|\| status === 429/);
  assert.match(server,/code:invalid\?'INVALID_WEBSITE':blocked\?'WEBSITE_BLOCKED':timedOut\?'WEBSITE_TIMEOUT'/);
  assert.doesNotMatch(server,/res\.status\(400\)\.json\(\{error:e\?\.message/);
});
