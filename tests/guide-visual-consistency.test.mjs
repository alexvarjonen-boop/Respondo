import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('guides use exact public marketing header/footer classes and shared CSS assets',()=>{
for(const slug of ['asiakaspalvelun-automatisointi','chatbot-verkkokauppaan','chatbot-yritykselle-testikysymykset']){
const html=read('public/opas/'+slug+'.html');
for(const marker of ['id="main-content"','class="nav"','class="container navin"','class="apple-menu-toggle"','id="apple-nav-overlay"','class="footer"','class="foot-top"','class="brand-slogan"','class="guide-hero"','class="guide-article"','class="guide-cta"','class="guide-related"','Älykkäämpää asiakaspalvelua','href="/tilaus"','<link rel="canonical"','/styles.css','/apple-home.css','/mobile-public-header.css','/opas/guide.js']){
assert.ok(html.includes(marker),slug+' missing '+marker);
}
assert.ok(!html.includes('class="site-header"'));
assert.ok(!html.includes('class="site-footer"'));
assert.equal((html.match(/<h1>/g)||[]).length,1);
}
const css=read('public/opas/guide.css');
assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/\.guide-page \.guide-cta-actions a\{width:100%/);
const js=read('public/opas/guide.js');
assert.match(js,/bindPublicMenu/);
assert.match(js,/data-guide-lang/);
});
