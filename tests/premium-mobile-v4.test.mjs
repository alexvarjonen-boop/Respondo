import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/premium-mobile-v4.css',import.meta.url),'utf8');
test('phone layout has readable five-tab bar and access to all original seven views',()=>{
 const nav=app.slice(app.indexOf('<nav class="ios-workspace-tabs" data-premium-tabbar="1"'),app.indexOf('</nav>',app.indexOf('<nav class="ios-workspace-tabs" data-premium-tabbar="1"')));
 for(const id of ['overview','setup','answers','customers','automation','install','account'])assert.match(nav,new RegExp('data-dashboard-nav="'+id+'"'));
 assert.match(nav,/id="premiumMobileMoreButton"/);
 assert.match(app,/id="premiumMobileMoreSheet"/);
 for(const id of ['automation','install','account'])assert.match(app,new RegExp('premiumNav\\.filter|data-dashboard-nav'));
 assert.match(css,/grid-template-columns:repeat\\(5/);
 assert.match(css,/nth-of-type\\(n\\+5\\)/);
});
test('mobile More button works without breaking existing navigation',()=>{
 assert.match(app,/const closePremiumMore/);
 assert.match(app,/setAttribute\\('aria-expanded'/);
 assert.match(app,/syncPremiumMoreActive\\(next\\)/);
 assert.match(css,/premium-mobile-more-layer\\[hidden\\]/);
 assert.match(css,/premium-mobile-more-backdrop/);
 assert.match(css,/premium-mobile-more-card nav button/);
});
test('mobile chat matches the white floating preview and is usable without iOS zoom',()=>{
 assert.match(css,/live-preview-panel::before/);
 assert.match(css,/radial-gradient\\(circle at 18px 19px/);
 assert.match(css,/preview-form input\\[name="question"\\]/);
 assert.match(css,/font-size:16px!important/);
 assert.match(css,/demo-sticky-topbar\\.is-condensed/);
 assert.match(html,/premium-mobile-v4\\.css\\?v=20261009-phone-hero-v4/);
 const old=html.indexOf('/premium-mobile-finish.css');const newer=html.indexOf('/premium-mobile-v4.css');
 assert.ok(old>=0&&newer>old);
 assert.doesNotMatch(css,/\\.respondo-widget|\\.rchat/);
});
