import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appleHomeMarkup } from '../public/apple-home.js';

const publicFile = (file) => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');

test('cinematic Respondo story is localized and original conversion links still work', () => {
  const languageFields = [
    ['fi', 0, 'Yrityksesi tiedot.', 'Älykkäämpää'],
    ['sv', 1, 'Företagets information.', 'Smartare'],
    ['en', 2, 'Your business knowledge.', 'Smarter']
  ];
  for (const [lang, index, chapter, headline] of languageFields) {
    const text = (fi, sv, en) => [fi, sv, en][index];
    const markup = appleHomeMarkup(text, lang, 142);
    assert.ok(markup.includes(headline));
    assert.ok(markup.includes(chapter));
    assert.ok(markup.includes('class="cinematic-finale"'));
    assert.ok(markup.includes('class="cinematic-rail-controls"'));
    assert.ok(!markup.includes('class="cinematic-scrolly"'), 'Single product story only');
    assert.ok(markup.includes('data-respondo-hero-cta="signup"'));
    assert.ok(markup.includes('/tilaus?lang=' + lang));
    assert.ok(markup.includes('/assistant?lang=' + lang));
    assert.ok(markup.includes('/ominaisuudet?lang=' + lang));
    assert.ok(markup.includes('/respondo-approved-arrow-20261012.png'));
    assert.ok(!markup.includes('$' + '{t('), 'Localized expressions must render');
    for (const id of ['control', 'features', 'calculator']) {
      assert.equal((markup.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
    }
  }
});

test('cinematic assets load and honor motion preferences without changing product state', () => {
  const entry = publicFile('index.html');
  const style = publicFile('cinematic-home.css');
  const behavior = publicFile('cinematic-home.js');
  const legacyStory = publicFile('cinematic-marketing.js');
  assert.ok(legacyStory.includes('class="cinema-story"'));
  assert.match(entry, /\/cinematic-home\.css\?v=/);
  assert.match(entry, /\/cinematic-home\.js\?v=/);
  assert.ok(entry.indexOf('/cinematic-home.css') > entry.indexOf('/apple-home.css'));
  assert.ok(entry.indexOf('/cinematic-home.css') > entry.indexOf('/cinematic-marketing.css'));
  assert.match(entry, /<script[^>]+src="\/cinematic-marketing\.js/);
  assert.match(entry, /<script[^>]+src="\/cinematic-product-scenes\.js/);
  assert.equal((entry.match(/<script[^>]+src="\/cinematic-home\.js/g) || []).length, 1);
  assert.match(style, /prefers-reduced-motion:reduce/);
  assert.match(style, /@media\(max-width:520px\)/);
  assert.match(style, /scroll-snap-type:x mandatory/);
  assert.match(behavior, /IntersectionObserver/);
  assert.match(behavior, /dataset\.cinematicBound/);
  assert.doesNotMatch(behavior, /addEventListener\(['"]wheel/);
  assert.doesNotMatch(behavior, /\/api\//);
});
