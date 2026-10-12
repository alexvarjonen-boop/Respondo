import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('pricing and contact pages remain indexable after browser-side SEO hydration', () => {
  const clientIndexable = client.match(/const indexable = new Set\(\[([^\]]+)\]\)/)?.[1] || '';
  const serverIndexable = server.match(/const SEO_INDEXABLE_PATHS = new Set\(\[([\s\S]+?)\]\)/)?.[1] || '';
  for (const page of ['/hinnat', '/yhteystiedot']) {
    assert.ok(clientIndexable.includes("'"+page+"'"), 'client must index ' + page);
    assert.ok(serverIndexable.includes("'"+page+"'"), 'server must index ' + page);
  }
  assert.match(client, /upsertMeta\('name','robots',robots\)/);
});

test('pricing and contact metadata exists in all three languages', () => {
  const clientMeta = client.slice(client.indexOf('  const metaByPath = {'), client.indexOf('  const indexable = new Set('));
  for (const [page, titles] of [
    ['/hinnat', ['Hinnat | Respondo AI', 'Priser | Respondo AI', 'Pricing | Respondo AI']],
    ['/yhteystiedot', ['Yhteystiedot | Respondo AI', 'Kontakt | Respondo AI', 'Contact Respondo AI | Support and Sales']],
  ]) {
    const start = clientMeta.indexOf("    '"+page+"': {");
    assert.ok(start >= 0, 'missing metadata for ' + page);
    const block = clientMeta.slice(start, clientMeta.indexOf('\n    },', start)+7);
    for (const title of titles) assert.ok(block.includes(title), 'missing localized title: ' + title);
    assert.ok(server.includes("'"+page+"'"), 'server must know page ' + page);
  }
});

test('sitemap continues to expose pricing and contact for discovery', () => {
  assert.match(server, /basePaths = \[[^\n]*'\/hinnat'[^\n]*'\/yhteystiedot'/);
});
