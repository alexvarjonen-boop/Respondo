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

test('www public pages redirect to apex while OAuth callback APIs keep their host', () => {
  assert.match(server, /inboundHost !== 'www\.respondoai\.fi'/);
  assert.match(server, /req\.path\.startsWith\('\/api\/'\)/);
  assert.match(server, /res\.redirect\(301, SEO_CANONICAL_ORIGIN \+ req\.originalUrl\)/);
});

test('industry landing pages stay discoverable and indexable in both renderers', () => {
  const pagePaths = ['/autokorjaamo-chatbot', '/lvi-chatbot'];
  const clientIndexable = client.match(/const indexable = new Set\(\[([^\]]+)\]\)/)?.[1] || '';
  const serverIndexable = server.match(/const SEO_INDEXABLE_PATHS = new Set\(\[([\s\S]+?)\]\)/)?.[1] || '';
  for (const path of pagePaths) {
    assert.ok(clientIndexable.includes("'"+path+"'"), 'client noindex risk for ' + path);
    assert.ok(serverIndexable.includes("'"+path+"'"), 'server noindex risk for ' + path);
    assert.ok(server.includes("'"+path+"'"), 'no server route '+path);
    assert.ok(client.includes("pages['"+path+"']"), 'missing browser page '+path);
  }
  assert.ok(server.includes("'"+pagePaths[0]+"', '"+pagePaths[1]+"'"), 'industry pages missing from sitemap');
  assert.ok(client.includes("'/autokorjaamo-chatbot','01'"), 'auto repair is reachable from audience hub');
  assert.ok(client.includes("'/lvi-chatbot','02'"), 'HVAC is reachable from audience hub');
  assert.match(client, /Chatbot for Auto Repair Shops/);
  assert.match(client, /Chatbot for Plumbing and HVAC Companies/);
  assert.match(server, /<h1>Chatbot autokorjaamolle<\/h1>/);
  assert.match(server, /<h1>Chatbot LVI-yritykselle<\/h1>/);
});

test('industry hub is a single footer link and has five crawlable destinations', () => {
  const markup = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../public/industry-directory.css', import.meta.url), 'utf8');
  const footer = client.slice(client.indexOf('function footer() {'), client.indexOf('function footer() {')+2500);
  const clientIndexable = client.match(/const indexable = new Set\(\[([^\]]+)\]\)/)?.[1] || '';
  const serverIndexable = server.match(/const SEO_INDEXABLE_PATHS = new Set\(\[([\s\S]+?)\]\)/)?.[1] || '';
  assert.ok(clientIndexable.includes("'/kenelle-sopii'"));
  assert.ok(serverIndexable.includes("'/kenelle-sopii'"));
  assert.match(server, /basePaths = \[[^\n]*'\/kenelle-sopii'/);
  assert.ok(footer.includes('href="/kenelle-sopii?lang='));
  assert.match(client, /path === '\/kenelle-sopii'\) html = audienceHubPage\(\)/);
  for (const path of ['/autokorjaamo-chatbot','/lvi-chatbot','/verkkokauppa-chatbot','/asiakaspalvelubotti','/ajanvaraus-chatbot']) {
    assert.ok(client.includes("'"+path+"'"), 'missing hub link '+path);
    assert.ok(!footer.includes('href="'+path+'?lang='), 'footer still has destination '+path);
  }
  assert.match(server, /rawPath === '\/kenelle-sopii'/);
  assert.match(client, /Who is Respondo AI for\?/);
  assert.match(client, /Vem passar Respondo AI för/);
  assert.match(markup, /industry-directory\.css/);
  assert.match(markup, /app\.js\?v=[^\"]+-audience-hub-route-v3/, 'stale mobile JS bundle can show 404 on newly added paths');
  assert.match(styles, /@media\(max-width:760px\)/);
});
