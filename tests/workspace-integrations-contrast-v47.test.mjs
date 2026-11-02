import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../public/workspace-continuation-v24.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const newRules=css.slice(css.indexOf('/* V47:'));
const contrast=(foreground,background)=>{
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const luminance=hex=>rgb(hex).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4)
    .reduce((sum,channel,i)=>sum+channel*[.2126,.7152,.0722][i],0);
  const a=luminance(foreground),b=luminance(background);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
};

test('Stripe country and calendar field labels are readable on the dark workspace',()=>{
  assert.ok(newRules.includes('#respondoWorkspaceCardBody'));
  assert.ok(newRules.includes('respondo-workspace-active'));
  for(const section of ['#booking-calendar','#stripe-connect','#business-integrations','#commerce-integration'])
    assert.ok(newRules.includes(section),'Scoping includes '+section);
  assert.match(newRules,/\.field > label/);
  assert.match(newRules,/color:#eef2f9!important/);
  assert.match(newRules,/-webkit-text-fill-color:#eef2f9!important/);
  assert.ok(contrast('#eef2f9','#1a1d23')>=4.5);
});

test('booking date/time and Stripe selected country are dark on light controls',()=>{
  assert.match(newRules,/#stripeConnectCountry/);
  assert.match(newRules,/input\[type="date"\]/);
  assert.match(newRules,/input\[type="time"\]/);
  assert.match(newRules,/input\[type="number"\]/);
  assert.match(newRules,/::-webkit-datetime-edit/);
  assert.match(newRules,/color-scheme:light/);
  assert.match(newRules,/-webkit-text-fill-color:#17202d!important/);
  assert.ok(contrast('#17202d','#f7f8fa')>=7);
});

test('Google Calendar connected and unconnected cards remain readable on dark',()=>{
  assert.match(newRules,/\.calendar-sync-card\.connected/);
  assert.match(newRules,/background:#262c35!important/);
  assert.match(newRules,/\.calendar-sync-card :is\(small,b\)/);
  assert.match(newRules,/\.calendar-sync-card p/);
  assert.match(newRules,/-webkit-text-fill-color:#c5cedd!important/);
  assert.ok(contrast('#c5cedd','#262c35')>=4.5);
  assert.match(newRules,/\.calendar-sync-actions :is\(a,button\)/);
});

test('contrast selectors do not apply to public marketing or checkout forms',()=>{
  const blocks=newRules.split('}').filter(part=>part.includes('{'));
  for(const part of blocks)
    assert.match(part,/#respondoWorkspaceCardBody/);
  assert.ok(app.includes('id="booking-calendar"'));
  assert.ok(app.includes('id="stripe-connect"'));
  assert.ok(app.includes('class="field stripe-country-field"'));
  assert.ok(app.includes('class="calendar-sync-card'));
});

test('HTML refreshes cached integration stylesheet without changing its path',()=>{
  assert.match(html,/workspace-continuation-v24\.css\?v=[^"]*calendar-stripe-legibility-v47/);
});
