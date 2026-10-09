import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('signed-in and public demo share same premium dashboard with seven working sections',()=>{
 assert.match(app,/dashboard-simple-shell dashboard-premium-shell/);
 assert.match(app,/dashboard-premium-sidebar/);
 assert.match(app,/premium-sidebar-nav/);
 assert.match(app,/data-dashboard-nav/);
 assert.match(app,/languageSwitch\(\)/);
 assert.match(app,/overviewPreviewHost/);
 assert.match(app,/positionPremiumPreview\(next\)/);
 assert.equal((app.match(/id="previewForm"/g)||[]).length,1);
 assert.equal((app.match(/id="previewChat"/g)||[]).length,1);
 assert.equal((app.match(/id="live-preview"/g)||[]).length,1);
});
test('overview cards use live backend data, not mock promotional dashboard numbers',()=>{
 for(const item of ['s.conversations','s.last7','s.answeredRate','s.leads','knowledge.length'])assert.ok(app.includes(item),item);
 assert.match(app,/data-dashboard-open="setup"/);
 assert.match(app,/data-dashboard-open="answers"/);
 assert.match(app,/data-dashboard-open="install"/);
});
test('premium CSS scoped, responsive and cached for real release',()=>{
 assert.match(css,/RESPONDO PREMIUM WORKSPACE OCTOBER 2026/);
 assert.match(css,/#app \.dashboard-premium-shell/);
 assert.match(css,/@media\(max-width:1030px\)/);
 assert.match(css,/dashboard-view-hidden\{display:none!important\}/);
 assert.match(html,/20261009-premium-app-v1/);
});

test('premium mobile layout keeps a real clickable FI/SV/EN language selector',()=>{
 assert.match(app,/class="premium-language-picker">\$\{languageSwitch\(\)\}/);
 assert.match(css,/#app \.dashboard-premium-shell \.premium-language-picker/);
 assert.match(css,/grid-row:2!important;justify-content:center!important/);
 assert.match(css,/demo-sticky-topbar \.demo-section-strip[\s\S]{0,90}grid-column:1\/-1!important;grid-row:3!important/);
 assert.match(app,/premiumNavIcons/);
 assert.match(app,/premiumIcon\(id\)/);
 assert.match(html,/premium-app-v2/);
});
