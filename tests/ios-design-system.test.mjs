import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const publicCss=readFileSync(new URL('../public/ios-public.css',import.meta.url),'utf8');
const workspaceCss=readFileSync(new URL('../public/ios-workspace.css',import.meta.url),'utf8');

test('public iOS theme is loaded after existing styles without replacing the home design',()=>{
  const home=index.indexOf('/apple-home.css?v=');
  const marketing=index.indexOf('/ios-public.css?v=20261008-ios-design-v1');
  const workspace=index.indexOf('/ios-workspace.css?v=20261008-ios-design-v1');
  assert.ok(home>=0 && marketing>home && workspace>marketing);
  assert.match(index,/app\.js\?v=[^"]+-ios-design-v1-legal-feature-sync-v1/);
  assert.doesNotMatch(publicCss,/#app\s+\.apple-home-page\s*\{/);
  assert.match(publicCss,/--ios-canvas:#f5f5f7/);
  assert.match(publicCss,/--ios-blue:#0071e3/);
});
test('secondary public pages all receive mobile responsive iOS treatment',()=>{
  for(const cls of ['.contact-page','.features-page','.seo-landing-page','.pricing-page','.legalpage','.formpage']){
    assert.ok(publicCss.includes(cls),'Missing CSS coverage: '+cls);
  }
  for(const cls of ['.contact-page main','.legalpage .legal-layout','.seo-landing-page .seo-landing-grid','.features-page .feature-category','.pricing-page .price-card','.formpage .formcard']){
    assert.ok(publicCss.includes(cls),'Missing iOS component coverage: '+cls);
  }
  assert.match(publicCss,/@media\(max-width:600px\)/);
  assert.match(publicCss,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(publicCss,/:focus-visible/);
});
test('logged-in dashboard offers exactly seven navigable iOS segments and keeps demo separate',()=>{
  const start=app.indexOf('class="ios-workspace-tabs"');
  const end=app.indexOf('</nav>',start);
  assert.ok(start>=0 && end>start);
  const tabs=[...app.slice(start,end).matchAll(/data-dashboard-nav="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(tabs,['overview','setup','answers','customers','automation','install','account']);
  assert.ok(app.includes('!isDemo ?'));
  assert.match(app,/document\.querySelectorAll\('\[data-dashboard-nav\]'\)\.forEach/);
  assert.match(workspaceCss,/\.ios-workspace-tabs button\.active/);
});
test('workspace styling applies to real dashboard and Try Bot without removing forms',()=>{
  assert.match(workspaceCss,/#app \.dashboard-simple-shell/);
  for(const cls of ['.panel','.onboarding-card','.stat','.knowledge-item','.dashboard-topbar','.workspace-modal-card','.demo-sticky-topbar']){
    assert.ok(workspaceCss.includes(cls),cls+' missing');
  }
  assert.match(workspaceCss,/@media\(max-width:760px\)/);
  assert.match(workspaceCss,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(workspaceCss,/\.dashboard-view-section\.dashboard-view-hidden/);
  assert.match(workspaceCss,/\.workspace-modal\[hidden\]/);
});
