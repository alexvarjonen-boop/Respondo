import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEGAL_20261008,LEGAL_UPDATE_DATE} from '../public/legal-content.js';
import {FEATURE_COUNT,FEATURE_GROUPS,FEATURE_HIGHLIGHTS} from '../public/features-data.js';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('all five public policy pages have complete human-written FI SV EN headings and bodies',()=>{
  assert.equal(LEGAL_UPDATE_DATE,'2026-10-29');
  const expected={kayttoehdot:14,tietosuoja:15,evasteet:6,dpa:9,tietoturva:7};
  for(const [page,count] of Object.entries(expected)){
    const document=LEGAL_20261008[page];
    assert.ok(document,'missing '+page);
    assert.equal(document.sections.length,count,page);
    for(const item of [document.label,document.title,document.intro]){
      assert.equal(item.length,3,page);
      item.forEach((value,i)=>assert.ok(value.trim().length>=5,page+' locale '+i));
    }
    for(const [i,section] of document.sections.entries()){
      assert.equal(section.heading.length,3,page+' section '+i);
      assert.equal(section.body.length,3,page+' section '+i);
      for(let lang=0;lang<3;lang++){
        assert.ok(section.heading[lang].trim().length>4,page+' heading '+i+' lang '+lang);
        assert.ok(section.body[lang].trim().length>40,page+' body '+i+' lang '+lang);
      }
    }
  }
  assert.match(app,/const revised=LEGAL_20261008\[type\]/);
  assert.match(app,/const updated=new Date\(LEGAL_UPDATE_DATE/);
  assert.match(app,/never send binding legal text through the automatic translator/i);
  assert.match(app,/select\(body\)/);
  assert.match(html,/app\.js\?v=[^"]+-legal-feature-sync-v1/);
});

test('privacy explains chat leads website import translation and controller roles across all locales',()=>{
  const privacy=LEGAL_20261008.tietosuoja.sections.map(x=>x.body);
  for(const lang of [0,1,2]){
    const text=privacy.map(x=>x[lang]).join('\n').toLowerCase();
    assert.match(text,/google/);
    assert.match(text,/stripe/);
    assert.match(text,/chat|chatt|keskustelu/);
    assert.match(text,/https|webbplats|verkkosiv|website/);
    assert.match(text,/controller|personuppgiftsansvarig|rekisterinpitäjä/);
    assert.match(text,/kontakt|contact|yhteys/);
  }
});

test('plans and features are synchronized to the server access gates',()=>{
  assert.equal(FEATURE_COUNT,145);
  assert.equal(FEATURE_HIGHLIGHTS.length,10);
  const allFeatures=FEATURE_GROUPS.flatMap(group=>group.items);
  assert.equal(allFeatures.length,FEATURE_COUNT);
  assert.ok(allFeatures.some(x=>/Botin värin/.test(x[0])));
  assert.ok(allFeatures.some(x=>/WC-asennus/.test(x[0])));
  assert.doesNotMatch(FEATURE_GROUPS.find(group=>group.key==='live').intro[2],/multiple channels|across multiple channels/);
  assert.match(app,/card\('Advanced',49,2/);
  assert.match(app,/card\('Premium',129,10/);
  assert.match(app,/card\('Enterprise',149,20/);
  for(const label of ['botin väriä','Google Calendar','20 asiakaspalvelijapaikkaa']){
    assert.ok((app+server+JSON.stringify(LEGAL_20261008)).includes(label),label);
  }
  const advanced=app.slice(app.indexOf("card('Premium'"),app.indexOf("card('Enterprise'"));
  assert.doesNotMatch(advanced,/Hae tiedot automaattisesti verkkosivulta/);
  assert.match(advanced,/Google Calendar -synkronointi/);
  assert.match(server,/basic_monthly:\{[^}]*agentSeats:2,websiteImport:true,googleCalendar:false/);
  assert.match(server,/advanced_monthly:\{[^}]*agentSeats:10,websiteImport:true,googleCalendar:true/);
  assert.match(server,/business_monthly:\{[^}]*agentSeats:20,websiteImport:true,googleCalendar:true/);
});

test('terms specify billing and avoid unsupported guarantees',()=>{
  const terms=LEGAL_20261008.kayttoehdot.sections.map(x=>x.body[0]).join(' ');
  for(const token of ['Advanced 49','Premium 129','Enterprise 149','arvonlisäveroa ei peritä','kolmen päivän','Stripe','Google Calendar']){
    assert.ok(terms.includes(token),'missing '+token);
  }
  assert.match(terms,/kaikkien tuotteiden|kaikkien.*tietojen/);
  assert.match(terms,/peruta|peruu|peruminen/);
  assert.ok(!/WhatsApp.*toimii|Instagram.*toimii/i.test(terms));
});

test('DPA page does not masquerade as an executed GDPR processing agreement',()=>{
  const dpa=LEGAL_20261008.dpa;
  assert.match(dpa.intro[0],/ei yksin korvaa/);
  assert.match(dpa.intro[1],/ersätter inte/);
  assert.match(dpa.intro[2],/does not replace/);
});


test('2026-10-29 legal update covers paid setup and deferred recurring billing in FI SV EN',()=>{
  const policy=LEGAL_20261008;
  for (const index of [0,1,2]){
    const terms=policy.kayttoehdot.sections.map(x=>x.body[index]).join(' ');
    const privacy=policy.tietosuoja.sections.map(x=>x.body[index]).join(' ');
    const cookies=policy.evasteet.sections.map(x=>x.body[index]).join(' ');
    const dpa=policy.dpa.sections.map(x=>x.body[index]).join(' ');
    const security=policy.tietoturva.sections.map(x=>x.body[index]).join(' ');
    assert.match(terms,/199/,'setup fee language '+index);
    assert.match(terms,/Stripe/,'Stripe processing language '+index);
    assert.match(terms,/365/,'technical Stripe hold language '+index);
    assert.match(terms,/info@respondoai\.fi/,'refund contact language '+index);
    assert.match(terms,/kolmen päivän|tredagars|tre dagar|three-day/,'trial after handover language '+index);
    assert.match(privacy,/kirjautumistunnuk|inloggnings-ID|login ID/,'manual credential processing language '+index);
    assert.match(privacy,/tiiviste|envägshash|one-way password hash/,'password handling language '+index);
    assert.match(cookies,/Käyttöönottopalvelun|installationstjänst|assisted setup/,'cookie settings language '+index);
    assert.match(dpa,/käyttöönottopalvelun|installation|assisted setup/,'processor roles language '+index);
    assert.match(security,/aloitussalasan|startlösenord|initial password/,'password delivery language '+index);
  }
  const fi=policy.kayttoehdot.sections.map(x=>x.heading[0]);
  assert.deepEqual(fi.map(x=>Number(x.match(/^\d+/)?.[0])).filter(Boolean),Array.from({length:14},(_,i)=>i+1));
  const privacy=policy.tietosuoja.sections.map(x=>x.heading[0]);
  assert.deepEqual(privacy.map(x=>Number(x.match(/^\d+/)?.[0])).filter(Boolean),Array.from({length:15},(_,i)=>i+1));
});
