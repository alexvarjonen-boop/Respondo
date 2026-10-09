import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/premium-mobile-finish.css',import.meta.url),'utf8');
test('all seven actual workspace destinations remain present in mobile tab bar with localized accessible names',()=>{
 const nav=app.slice(app.indexOf('<nav class="ios-workspace-tabs premium-mobile-tabbar"'),app.indexOf('</nav>',app.indexOf('<nav class="ios-workspace-tabs premium-mobile-tabbar"')));
 for(const id of ['overview','setup','answers','customers','automation','install','account']){
   assert.match(nav,new RegExp('data-dashboard-nav="'+id+'"'));
   assert.match(nav,new RegExp("premiumIcon\\('"+id+"'\\)"));
 }
 assert.match(nav,/premium-mobile-nav-icon/);
 assert.match(nav,/premium-mobile-nav-label/);
 assert.match(nav,/aria-label=/);
});
test('mobile navigation uses real buttons and does not obscure chat input',()=>{
 assert.match(css,/max-width:760px/);
 assert.match(css,/position:fixed!important/);
 assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)!important/);
 assert.match(css,/padding-bottom:calc\(96px \+ env\(safe-area-inset-bottom\)\)!important/);
 assert.match(css,/dashboard-premium-experience/);
 assert.match(css,/premium-chat-host/);
 assert.match(css,/preview-form input:focus/);
});
test('mobile finish loads after previous mobile design without changing sitewide assets',()=>{
 const old=html.indexOf('/premium-mobile.css?');
 const newer=html.indexOf('/premium-mobile-finish.css?');
 assert.ok(old>=0 && newer>old);
 assert.match(html,/20261009-mobile-rebuild-v1/);
 assert.match(html,/20261009-native-tabs-v1/);
 assert.doesNotMatch(css,/\.respondo-widget|\.rchat/);
});
