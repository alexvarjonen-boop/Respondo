import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('public demo website import uses a bounded crawl budget', () => {
  assert.match(
    server,
    /fetchWebsiteBundle\(\s*website,\s*40,\s*12000,\s*null,\s*\{\s*storefrontLimit:300,\s*storefrontBudgetMs:4500,\s*sitemapLimit:800\s*\}/,
  );
});

test('paid importer keeps the wider production crawl', () => {
  assert.match(server, /fetchWebsiteBundle\(website,600,4\*60\*1000/);
});


test('storefront catalog still keeps a bounded sample of product pages for policy extraction', () => {
  assert.match(server,/representativeProductUrls=new Set\(\[\.\.\.catalogUrls\]\.slice\(0,4\)\)/);
  assert.match(server,/!catalogUrls\.has\(key\) \|\| representativeProductUrls\.has\(key\)/);
});
