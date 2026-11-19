import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLOBAL_GUIDE_PATHS, globalGuideData, globalResourcesMarkup} from '../public/global-resources.mjs';
const route='/guides/dashboard-navigation-guide';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const workspace=read('public/workspace-continuation-v24.js');
const app=read('public/app.js');
const html=read('public/index.html');
const server=read('server.mjs');

test('dashboard guide route belongs to the existing Guides library in three languages',()=>{
  assert.ok(GLOBAL_GUIDE_PATHS.includes(route));
  for(const lang of ['fi','sv','en']){
    const g=globalGuideData(route,lang);
    assert.ok(g,lang);
    assert.ok(g.title.length>=30);
    assert.ok(g.subtitle.length>=70);
    assert.equal(g.sections.length,14,lang);
    assert.ok(g.faq.length>=4);
    for(const [heading,body] of g.sections){
      assert.ok(heading.trim().length>=8,lang);
      assert.ok(body.trim().length>=50,lang+' '+heading);
    }
    const index=globalResourcesMarkup('/guides',lang);
    assert.ok(index.includes(route),lang+' index link');
    const page=globalResourcesMarkup(route,lang);
    assert.ok(page.includes(g.title),lang+' guide content');
  }
  assert.ok(server.includes('...GLOBAL_GUIDE_PATHS'), 'SEO discovery');
});

test('the guide describes the owner navigation and localized group names',()=>{
  for(const [lang,labels] of [
    ['fi',['Botti','Asiakkaat','Myynti ja työt','Asetukset']],
    ['sv',['Botten','Kunder','Försäljning och jobb','Inställningar']],
    ['en',['Bot','Customers','Sales and work','Settings']]
  ]){
    const guide=globalGuideData(route,lang);
    for(const label of labels){
      assert.ok(guide.sections[0][1].includes(label),lang+' '+label);
      assert.ok(workspace.includes(label),lang+' '+label);
    }
  }
});

test('guide correctly distinguishes analytics, staff, billing and navigation behaviour',()=>{
  for(const lang of ['fi','sv','en']){
    const g=globalGuideData(route,lang);
    const content=g.sections.map(x=>x[1]).join(' ');
    assert.match(content,/Stripe/);
    assert.match(content,/account security|tietoturva|kontosäkerhet/i);
    assert.match(content,/chat|chatt|keskustel/i);
    assert.match(content,/calendar|kalenteri|kalender/i);
  }
  assert.match(app,/global-resources\.mjs\?v=[^']*navigation-v52/);
  assert.match(html,/app\.js\?v=[^"]*navigation-v52/);
});
