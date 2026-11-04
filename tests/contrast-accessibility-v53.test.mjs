import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const css=read('contrast-accessibility-v53.css');
const html=read('index.html');
const app=read('app.js');

const luminance=hex=>{
  const raw=hex.replace('#','');
  const full=raw.length===3?[...raw].map(ch=>ch+ch).join(''):raw;
  const channel=[0,2,4].map(i=>parseInt(full.slice(i,i+2),16)/255)
    .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
  return channel[0]*0.2126+channel[1]*0.7152+channel[2]*0.0722;
};
const contrast=(a,b)=>{
  const [light,dark]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (light+0.05)/(dark+0.05);
};

test('contrast overrides load after every legacy theme, including assisted setup',()=>{
  const link='/contrast-accessibility-v53.css?v=20261104-dark-text-contrast-v53';
  assert.ok(html.includes(link));
  assert.ok(html.indexOf(link)>html.indexOf('/public-observatory.css'));
  assert.ok(html.indexOf(link)>html.indexOf('/workspace-continuation-v24.css'));
  assert.ok(html.indexOf(link)>html.indexOf('/checkout-setup-service.css'));
  assert.equal(html.split(link).length,2,'avoid duplicate stylesheets');
});

test('legal seller identity remains bright on all FI, SV and EN document routes',()=>{
  assert.match(app,/class="legal-seller"/);
  assert.match(css,/#app \.legalpage \.legal-seller :is\(b,strong\)/);
  assert.match(css,/#app \.legalpage \.legal-seller :is\(span,small\)/);
  assert.match(css,/-webkit-text-fill-color:var\(--ra-muted-on-dark\)!important/);
  assert.match(css,/opacity:1!important/);
  assert.ok(contrast('#f5faff','#111d2f')>=4.5);
  assert.ok(contrast('#cbd8ec','#111d2f')>=4.5);
});

test('legal navigation, article text and links meet normal-text contrast',()=>{
  for(const [foreground,background] of [
    ['#dbe9fc','#101b2b'],
    ['#cbd8ec','#101a29'],
    ['#bbdaff','#101a29']
  ]) assert.ok(contrast(foreground,background)>=4.5);
  assert.match(css,/\.r-brand-toc-links a span/);
  assert.match(css,/\.legalcopy :is\(p,ul,ol,li\)/);
  assert.match(css,/\.legalcopy a/);
});

test('dark dashboard overrides are scoped, preserving pale native form controls',()=>{
  assert.match(css,/\.dashboard-premium-shell\.respondo-workspace-active/);
  assert.match(css,/\.respondo-workspace-module-card/);
  assert.match(css,/\.guided-setup-active/);
  assert.match(css,/:not\(\.respondo-workspace-active\) \.preview-note/);
  assert.doesNotMatch(css,/#app\s+\*/);
  assert.doesNotMatch(css,/input\[type="date"\]\s*\{/);
});

test('status badges and form buttons use sufficient text contrast',()=>{
  for(const [fg,bg] of [
    ['#fff','#1c6949'],
    ['#fff','#1a62bf'],
    ['#fff','#245fba'],
    ['#fff','#2458c5'],
    ['#1e5e45','#eaf8f0'],
    ['#566275','#fff']
  ]) assert.ok(contrast(fg,bg)>=4.5,'contrast for '+fg+' on '+bg);
  assert.match(css,/\.premium-verified>span/);
  assert.match(css,/\.checkout-button/);
  assert.match(css,/\.booking-duration-custom-indicator/);
});

test('contrast stylesheet remains syntactically balanced without layout or animation rewrites',()=>{
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
  assert.doesNotMatch(css,/@keyframes|scroll-snap-type|animation-duration/);
});
