import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('public/app.js');
const widget = read('public/widget.js');
const css = read('public/styles.css');
const server = read('server.mjs');

test('bot color picker is available in demo and customer dashboard below avatar controls', () => {
  assert.match(app, /class="bot-color-picker field"/);
  assert.match(app, /id="botColorInput" name="botColor" type="color"/);
  assert.match(app, /BOT_COLOR_PRESETS\.map/);
  assert.ok(app.indexOf('id="botColorInput"') > app.indexOf('id="botAvatarUpload"'));
  assert.ok(app.indexOf('id="botColorInput"') < app.indexOf('class="field website-import-field profile-wide"'));
  assert.match(app, /bindBotColorPicker\(demoProfile\)/);
  assert.match(app, /bindBotColorPicker\(\$\('#businessProfileForm'\)\)/);
  assert.match(app, /botColor: form\.get\('botColor'\)/);
});

test('picker normalizes hex codes and maintains readable contrast', () => {
  const start = app.indexOf('function botColorSafe(value) {');
  const end = app.indexOf('function refreshBotColorPreview(value) {', start);
  assert.ok(start >= 0 && end > start);
  const sandbox = {};
  vm.runInNewContext(app.slice(start, end), sandbox);
  assert.equal(sandbox.botColorSafe('#fefefe'), '#FEFEFE');
  assert.equal(sandbox.botColorSafe('red;'), '#111113');
  assert.equal(sandbox.botColorSafe('var(--x)'), '#111113');
  assert.equal(sandbox.botColorInk('#ffffff'), '#111113');
  assert.equal(sandbox.botColorInk('#000000'), '#FFFFFF');
});

test('theme color is saved per tenant and served to embedded widget', () => {
  assert.match(server, /function cleanBotAccent\(value\)/);
  assert.match(server, /accent=COALESCE\(\$8,accent\)/);
  assert.match(server, /cleanBotAccent\(req\.body\.botColor\)/);
  assert.match(server, /accent: tenant\.accent/);
  assert.match(widget, /setAccent\(data\.accent \|\| fallbackAccent\)/);
  assert.match(widget, /root\.style\.setProperty\('--bot-accent',accent\)/);
  assert.match(widget, /--bot-accent-ink/);
  assert.match(widget, /\.user\{align-self:flex-end;background:var\(--bot-accent/);
  assert.match(css, /\.live-preview-panel \.preview-device \.preview-bubble\.user/);
});
