import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLOBAL_GUIDE_PATHS, globalGuideData, globalResourcesMarkup} from '../public/global-resources.mjs';
const route='/guides/dashboard-navigation-guide';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const orbit=read('public/workspace-orbit-v28.js');
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

test('exactly 12 guide chapters follow the real sphere section order',()=>{
  const idLabels=[
    ['overview','Yleiskatsaus','Översikt','Overview'],
    ['customers','Asiakkaat ja liidit','Kunder och leads','Customers & leads'],
    ['conversations','Keskustelut','Konversationer','Conversations'],
    ['team','Henkilökunta','Personal','Team'],
    ['setup','Yritys ja botti','Företag och bot','Business & bot'],
    ['answers','Vastaukset','Svar','Answers'],
    ['automation','Toiminnot','Funktioner','Actions'],
    ['install','Asennus','Installation','Installation'],
    ['integrations','Integraatiot','Integrationer','Integrations'],
    ['billing','Laskutus','Fakturering','Billing'],
    ['settings','Asetukset','Inställningar','Settings'],
    ['profile','Profiili','Profil','Profile'],
  ];
  const s=orbit.slice(orbit.indexOf('  const sections=['),orbit.indexOf('  const orb=',orbit.indexOf('  const sections=[')));
  for(const [i,[id,fi,sv,en]] of idLabels.entries()){
    assert.ok(s.includes("id:'"+id+"'"),id);
    for(const [lang,label] of [['fi',fi],['sv',sv],['en',en]]){
      const item=globalGuideData(route,lang);
      const title=item.sections[i+1][0];
      const expected=lang==='fi'?label:lang==='sv'?sv:en;
      assert.ok(title.toLowerCase().includes(expected.toLowerCase()),lang+' '+title+' missing '+expected);
    }
  }
  const ids=[...s.matchAll(/\{id:'([^']+)'/g)].map(x=>x[1]);
  assert.deepEqual(ids,idLabels.map(([id])=>id));
});

test('guide correctly distinguishes analytics, staff, billing and navigation behaviour',()=>{
  for(const lang of ['fi','sv','en']){
    const g=globalGuideData(route,lang);
    const content=g.sections.map(x=>x[1]).join(' ');
    assert.match(content,/12/);
    assert.match(content,/Stripe/);
    assert.match(content,/profile|Profiilin|Profil|Profile/i);
    assert.match(content,/chat|chatt|keskustel/i);
    assert.match(content,/calendar|kalenteri|kalender/i);
  }
  assert.match(orbit,/current\+1\)%count/);
  assert.match(orbit,/orb\.querySelector\('#rsOrbitName'\)/);
  assert.match(orbit,/data-rs-workspace-icon/);
  assert.match(app,/global-resources\.mjs\?v=[^']*navigation-v52/);
  assert.match(html,/app\.js\?v=[^"]*navigation-v52/);
});
