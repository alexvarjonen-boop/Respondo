import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../public/workspace-form-contrast-v54.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

function contrast(foreground,background) {
  function luminance(hex) {
    const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
      .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
    return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
  }
  const [a,b]=[luminance(foreground),luminance(background)];
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}

test('the screenshot ecommerce form and all enterprise integration fields are addressed',()=>{
  for(const section of ['commerce-integration','business-integrations','booking-calendar','stripe-connect']) {
    assert.ok(app.includes('id="'+section+'"'),'actual dashboard renders '+section);
    assert.ok(css.includes('#'+section),'contrast CSS includes '+section);
  }
  assert.ok(app.includes('id="commerceForm"'));
  for(const input of ['provider','shopifyShopDomain','shopifyAccessToken','wooBaseUrl','wooConsumerKey','wooConsumerSecret'])
    assert.ok(app.includes('name="'+input+'"'),'commerce field '+input);
  assert.match(css,/#respondoWorkspaceCardBody/);
  assert.match(css,/respondo-workspace-active/);
  assert.match(css,/-webkit-text-fill-color:#172638!important/);
  assert.match(css,/background-color:#f7f8fa!important/);
  assert.match(css,/color-scheme:light/);
});

test('visible values, select options, placeholders and read-only controls meet WCAG normal-text contrast',()=>{
  for(const [foreground,background] of [
    ['#172638','#f7f8fa'],
    ['#536379','#f7f8fa'],
    ['#172638','#ffffff'],
    ['#34485e','#e9edf4']
  ]) assert.ok(contrast(foreground,background)>=4.5,
    'too little contrast: '+foreground+' on '+background);
  assert.match(css,/:is\(input,textarea\)::placeholder/);
  assert.match(css,/select option/);
  assert.match(css,/:is\(:disabled,\[readonly\]\)/);
  assert.match(css,/input:-webkit-autofill/);
});

test('overrides exclude checkboxes, uploads, range and buttons without changing layout',()=>{
  for(const type of ['checkbox','radio','hidden','color','file','range','button','submit','reset'])
    assert.ok(css.includes(':not([type="'+type+'"])'),'excluded '+type);
  assert.doesNotMatch(css,/grid-template-columns|padding:|font-size:|width:|@keyframes|transform:/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('fix is loaded only once after all older dark workspace styles',()=>{
  const url='/workspace-form-contrast-v54.css?v=20261104-workspace-forms-v54';
  assert.equal(index.split(url).length,2);
  const before='/contrast-accessibility-v53.css?v=20261104-dark-text-contrast-v53';
  assert.ok(index.indexOf(url)>index.indexOf(before));
  assert.ok(index.indexOf(url)>index.indexOf('/workspace-continuation-v24.css'));
  assert.ok(index.indexOf(url)>index.indexOf('/styles.css'));
});
