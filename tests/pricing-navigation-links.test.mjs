import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

// The homepage no longer renders #pricing: both visible navigation links
// must use the dedicated pricing page rather than the old homepage anchor.
test('footer and desktop header pricing links open the actual pricing page for each language', () => {
  const nav = app.split('function nav() {')[1]?.split('// The homepage CTA')[0];
  const footer = app.split('function footer() {')[1]?.split('function ')[0];
  assert.ok(nav, 'main navigation exists');
  assert.ok(footer, 'footer exists');
  const expected = 'href="/hinnat?lang=\u0024{currentLang()}"';
  assert.ok(nav.includes(expected), 'desktop pricing link must go to /hinnat');
  assert.ok(footer.includes(expected), 'footer pricing link must go to /hinnat');
  assert.doesNotMatch(nav + footer, /href="\/#pricing"/);
  assert.match(app, /path === '\/hinnat'\) html =/);
});
