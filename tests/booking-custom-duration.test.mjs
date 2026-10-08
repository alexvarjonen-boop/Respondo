import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

test('booking duration menu includes a localized Custom option after presets', () => {
  const select = app.match(/<select id="bookingDuration" name="duration">([^\n]+)<\/select>/)?.[1];
  assert.ok(select, 'Booking duration select should exist');
  assert.match(select, /<option value="120">120 min<\/option><option value="custom">\$\{appText\('Oma kesto','Egen längd','Custom'\)\}<\/option>/);
  assert.match(app, /id="bookingCustomDuration" class="booking-custom-duration" hidden/);
  assert.match(app, /id="bookingCustomHours" name="customHours" type="number" min="0" max="24"/);
  assert.match(app, /id="bookingCustomMinutes" name="customMinutes" type="number" min="0" max="59"/);
});

test('custom duration fields only submit when Custom is selected', () => {
  assert.match(app, /durationSelect\?\.addEventListener\('change', syncCustomDurationFields\)/);
  assert.match(app, /customDurationFields\.hidden = !enabled/);
  assert.match(app, /input\.disabled = !enabled/);
  assert.match(css, /\.booking-custom-duration\[hidden\]\s*\{\s*display:none!important;/);
});

test('slot generation uses exact hours and minutes, validates positive lengths and retains presets', () => {
  assert.match(app, /const durationChoice = String\(form\.get\('duration'\) \|\| '60'\)/);
  assert.match(app, /\? customHours \* 60 \+ customMinutes/);
  assert.match(app, /Number\.isInteger\(customHours\) && customHours >= 0 && customHours <= 24/);
  assert.match(app, /Number\.isInteger\(customMinutes\) && customMinutes >= 0 && customMinutes <= 59/);
  assert.match(app, /duration >= 1 && duration <= 1440/);
  assert.match(app, /\[30,45,60,90,120\]\.includes\(duration\)/);
  assert.match(app, /slotStart\.getTime\(\) \+ duration \* 60000/);
  assert.doesNotMatch(app, /Math\.max\(15, Number\(form\.get\('duration'\)/);
});
