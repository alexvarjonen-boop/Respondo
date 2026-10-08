import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const from=source.indexOf('function seoLandingPage(');
const to=source.indexOf('\nasync function home()',from);
const landing=source.slice(from,to);

test('SEO service landing pages end with a clean title and description, without stray links',()=>{
  assert.ok(from>0 && to>from);
  assert.match(landing, /seo-landing-closing-card/);
  assert.match(landing, /<h2>\$\{appText\('Sopiva vastaus oikeaan aikaan\.'/);
  assert.match(landing, /<p>\$\{p\.closing\}<\/p><\/div>/);
  assert.doesNotMatch(landing, /seo-answer-links/);
  assert.doesNotMatch(landing, /Katso kaikki ominaisuudet|Se alla funktioner|See all features/);
});
test('links elsewhere on the website remain unaffected',()=>{
  assert.match(source, /function footer\(\)/);
  assert.match(source, /<a href="\/ominaisuudet\?lang=\$\{currentLang\(\)\}"/);
});
