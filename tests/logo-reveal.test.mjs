import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async (file) => readFile(new URL('../public/' + file, import.meta.url), 'utf8');

test('logo reveal uses the actual approved white Respondo arrow', async () => {
  const [official, code] = await Promise.all([source('respondo-symbol.svg'), source('logo-reveal.js')]);
  const path = official.match(/<path d="([^"]+)"/)?.[1];
  assert.ok(path, 'approved logo path exists');
  assert.ok(code.includes(path), 'animation must use exactly the approved arrow geometry');
  assert.match(code, /viewBox="0 0 256 256"/);
  assert.doesNotThrow(() => new Function(code));
});

test('animation is isolated to homepage and supports accessible interruption', async () => {
  const [index, code, css] = await Promise.all([source('index.html'),source('logo-reveal.js'),source('logo-reveal.css')]);
  assert.match(index, /href="\/logo-reveal\.css\?v=/);
  assert.match(index, /src="\/logo-reveal\.js\?v=/);
  assert.match(code, /location\.pathname !== '\/'/);
  assert.match(code, /prefers-reduced-motion: reduce/);
  assert.match(code, /sessionStorage\.setItem/);
  assert.match(code, /aria-modal/);
  assert.match(code, /insertAdjacentElement\('afterend'/);
  assert.doesNotMatch(code, /rl-intro-skip|Ohita animaatio|Skip animation|Hoppa över/);
  assert.doesNotMatch(css, /\.rl-intro-skip/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /\.apple-home\.rl-logo-film-active/);
});
