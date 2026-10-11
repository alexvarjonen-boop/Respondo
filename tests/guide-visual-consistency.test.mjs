import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('editorial guides share the responsive public layout and full branded footer',()=>{
for(const slug of ['asiakaspalvelun-automatisointi','chatbot-verkkokauppaan','chatbot-yritykselle-testikysymykset']){
const html=read('public/opas/'+slug+'.html');
for(const feature of ['id="main-content"','class="site-header"','class="guide-hero"','class="guide-layout"','class="cta-actions"','class="footer-grid"','Älykkäämpää asiakaspalvelua','id="guide-menu" hidden','href="/tilaus"','<link rel="canonical"'])assert.ok(html.includes(feature),slug+' missing '+feature);
assert.ok(html.includes('/opas/guide.js'));
}
const css=read('public/opas/guide.css');assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/\.header-links,\.header-actions\{display:none\}/);
const js=read('public/opas/guide.js');assert.match(js,/aria-expanded/);assert.match(js,/Escape/);
});
