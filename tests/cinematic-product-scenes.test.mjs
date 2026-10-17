import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { appleHomeMarkup } from '../public/apple-home.js';

const publicFile = (file) => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
const html = publicFile('index.html');
const homeCSS = publicFile('cinematic-home.css');
const homeJS = publicFile('cinematic-home.js');
const innerCSS = publicFile('cinematic-inner-pages.css');

test('one cinematic homepage renderer is installed with no competing scroll engines', () => {
  assert.equal((html.match(/\/cinematic-home\.css\?/g) || []).length, 1);
  assert.equal((html.match(/\/cinematic-home\.js\?/g) || []).length, 1);
  assert.equal((html.match(/\/cinematic-inner-pages\.css\?/g) || []).length, 1);
  assert.doesNotMatch(html, /\/cinematic-marketing\.(?:css|js)/);
  assert.doesNotMatch(html, /\/cinematic-product-scenes\.(?:css|js)/);
  assert.ok(html.indexOf('/cinematic-inner-pages.css') > html.indexOf('/cinematic-home.css'));
});

test('single homepage has three accessible scroll chapters, a hero and working routes', () => {
  for (const [index, lang] of ['fi','sv','en'].entries()) {
    const text = (fi,sv,en) => [fi,sv,en][index];
    const markup = appleHomeMarkup(text,lang,142);
    assert.equal((markup.match(/data-cinematic-step=/g)||[]).length,3);
    assert.equal((markup.match(/data-cinematic-scene=/g)||[]).length,3);
    assert.ok(markup.includes('/tilaus?lang='+lang));
    assert.ok(markup.includes('/assistant?lang='+lang));
    assert.ok(markup.includes('/respondo-approved-arrow-20261012.png'));
    for (const id of ['how','control','features','calculator']) {
      assert.equal((markup.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
    }
  }
});

test('motion is optional, translations remain and there are no extra network calls', () => {
  assert.doesNotThrow(() => new Script(homeJS));
  assert.match(homeJS,/IntersectionObserver/);
  assert.match(homeJS,/prefers-reduced-motion/);
  assert.match(homeCSS,/scroll-snap-type:x mandatory/);
  assert.match(homeCSS,/prefers-reduced-motion:reduce/);
  assert.match(innerCSS,/prefers-reduced-motion:reduce/);
  assert.match(innerCSS,/#app \.r-brand-hero/);
  assert.doesNotMatch(innerCSS,/\.apple-hero|\.apple-highlights|\.cinematic-scrolly/);
  assert.doesNotMatch(homeJS,/\bfetch\s*\(|\bXMLHttpRequest\b/);
});
