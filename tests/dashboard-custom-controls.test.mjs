import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {parseBookingDurationMinutes} from '../public/booking-duration.mjs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/workspace-controls.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('booking predefined durations are unchanged',()=>{
  for(const m of [30,45,60,90,120]){
    assert.equal(parseBookingDurationMinutes(String(m),null,null),m);
  }
  assert.equal(parseBookingDurationMinutes('unexpected','0','0'),null);
});
test('custom hours and minutes convert to real slot minutes',()=>{
  assert.equal(parseBookingDurationMinutes('custom','1','30'),90);
  assert.equal(parseBookingDurationMinutes('custom','2','0'),120);
  assert.equal(parseBookingDurationMinutes('custom','0','1'),1);
  assert.equal(parseBookingDurationMinutes('custom','23','59'),1439);
});
test('invalid custom durations cannot generate slots',()=>{
  for(const [h,m] of [['0','0'],['24','0'],['1','60'],['-1','30'],['1.5','0'],['','30'],['0',''],['foo','bar']]){
    assert.equal(parseBookingDurationMinutes('custom',h,m),null);
  }
});
test('duration editor is conditional, native inputs are validated, and backend slot creation still receives ISO start/end',()=>{
  assert.match(app,/id="bookingDurationSelect"/);
  assert.match(app,/<option value="custom">Custom<\/option>/);
  assert.match(app,/id="bookingDurationCustom" hidden/);
  assert.match(app,/name="durationHours" type="number" inputmode="numeric" min="0" max="23" step="1" value="1" disabled/);
  assert.match(app,/name="durationMinutes" type="number" inputmode="numeric" min="0" max="59" step="1" value="0" disabled/);
  assert.match(app,/bookingDurationCustom\.hidden=!isCustom/);
  assert.match(app,/input\.required=isCustom/);
  assert.match(app,/parseBookingDurationMinutes\(form\.get\('duration'\),form\.get\('durationHours'\),form\.get\('durationMinutes'\)\)/);
  assert.match(app,/slotEnd\.toISOString\(\)/);
  assert.match(css,/\.booking-duration-custom\[hidden\]/);
});
test('three compact language choices retain checkbox array submission',()=>{
  assert.match(app,/class="support-agent-language-options"/);
  assert.match(app,/name="languages" value="\$\{value\}"/);
  assert.match(app,/\['fi','🇫🇮','Suomi'\]/);
  assert.match(app,/\['sv','🇸🇪','Svenska'\]/);
  assert.match(app,/\['en','🇬🇧','English'\]/);
  assert.match(app,/languages:fd\.getAll\('languages'\)/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(css,/input:checked \+ \.support-agent-language-pill/);
  assert.match(html,/workspace-controls\.css\?v=20261009-v1/);
});
