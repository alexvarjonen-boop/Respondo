import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEGAL_20261008, LEGAL_UPDATE_DATE} from '../public/legal-content.js';
import {GLOBAL_GUIDE_PATHS, globalGuideData, globalResourcesMarkup} from '../public/global-resources.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('public/app.js'),html=read('public/index.html'),server=read('server.mjs');
const locales=['fi','sv','en'], legalPaths=['kayttoehdot','tietosuoja','evasteet','dpa','tietoturva'];
const guidePaths=['/guides/chatbot-question-testing','/guides/respondo-setup-integrations-privacy'];

test('every footer legal document has three complete languages and current date',()=>{
  assert.equal(LEGAL_UPDATE_DATE,'2026-11-03');
  for(const path of legalPaths){
    const page=LEGAL_20261008[path];
    assert.ok(page,'Missing '+path);
    for(const field of ['label','title','intro']){
      assert.equal(page[field].length,3,path+' '+field);
      page[field].forEach((value,i)=>assert.ok(String(value).trim().length>5,path+' '+field+' '+locales[i]));
    }
    assert.ok(page.sections.length>=6,path);
    for(const section of page.sections)
      for(const field of ['heading','body']){
        assert.equal(section[field].length,3,path+' '+field);
        section[field].forEach((value,i)=>assert.ok(String(value).trim().length>=12,
          path+' '+field+' '+locales[i]));
      }
  }
});

test('recent chatbot, deletion, integration and DPA disclosures appear in all languages',()=>{
  const words={
    kayttoehdot:['integraatio','anslutning','integration'],
    tietosuoja:['ulkopuolis','extern','external'],
    evasteet:['Botit','Botar','Chat widgets'],
    dpa:['GDPR','GDPR','GDPR'],
    tietoturva:['käyttöoikeudet','åtkomst','access']
  };
  for(const [path,variants] of Object.entries(words))
    for(let i=0;i<3;i++)
      assert.ok(LEGAL_20261008[path].sections.some(s=>String(s.heading[i]+' '+s.body[i]).toLowerCase()
        .includes(variants[i].toLowerCase())),path+' '+locales[i]);
  for(let i=0;i<3;i++){
    const dpa=LEGAL_20261008.dpa.sections.map(s=>s.body[i]).join(' ');
    assert.match(dpa,/28/,locales[i]);
    const terms=LEGAL_20261008.kayttoehdot.sections.map(s=>s.body[i]).join(' ');
    assert.match(terms,/199/,locales[i]);
  }
});

test('new test and setup guides exist with full FI SV EN and SEO paths',()=>{
  for(const path of guidePaths){
    assert.ok(GLOBAL_GUIDE_PATHS.includes(path),path);
    for(const lang of locales){
      const item=globalGuideData(path,lang);
      assert.ok(item,lang+' '+path);
      assert.ok(item.title.length>12);
      assert.ok(item.subtitle.length>30);
      assert.ok(item.sections.length>=5);
      assert.ok(item.faq.length>=2);
      for(const section of item.sections)
        assert.ok(section[0].length>=6&&section[1].length>70,lang+' '+path);
    }
  }
  assert.ok(globalResourcesMarkup('/guides','fi').includes('/guides/chatbot-question-testing'));
  assert.ok(globalResourcesMarkup('/guides','en').includes('/guides/respondo-setup-integrations-privacy'));
  assert.ok(server.includes('...GLOBAL_GUIDE_PATHS'));
});

test('existing pricing guide documents optional 199 euro assisted setup in every language',()=>{
  for(const lang of locales){
    const item=globalGuideData('/guides/ai-chatbot-pricing',lang);
    assert.ok(item);
    assert.ok(item.sections.some(([,body])=>/199\s*€|€199/.test(body)),lang);
  }
});

test('homepage footer has Guides and legal links and refreshed assets',()=>{
  assert.ok(app.includes('location.pathname === \'/\' ? '));
  assert.ok(app.includes('href="/guides?lang='));
  assert.ok(app.includes('href="/yhteystiedot?lang='));
  for(const path of ['/kayttoehdot','/tietosuoja','/evasteet','/dpa'])
    assert.ok(app.includes('href="'+path+'?lang='),path);
  assert.match(app,/legal-content\.js\?v=[^']*refresh-20261103-v51/);
  assert.match(app,/global-resources\.mjs\?v=[^']*refresh-20261103-v51/);
  assert.match(html,/app\.js\?v=[^"]*legal-guides-v51/);
});
