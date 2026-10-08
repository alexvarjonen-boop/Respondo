import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEGAL_20261008,LEGAL_UPDATE_DATE} from '../public/legal-content.js';
import {FEATURE_COUNT,FEATURE_GROUPS,FEATURE_HIGHLIGHTS} from '../public/features-data.js';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('all five public policy pages have complete human-written FI SV EN headings and bodies',()=>{
  assert.equal(LEGAL_UPDATE_DATE,'2026-10-08');
  const expected={kayttoehdot:12,tietosuoja:14,evasteet:5,dpa:8,tietoturva:6};
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
  assert.match(app,/Basic',49\.99,44\.99,539\.88,2/);
  assert.match(app,/Advanced',64\.99,59\.99,719\.88,10/);
  assert.match(app,/Business',79\.99,74\.99,899\.88,20/);
  for(const label of ['Botin värin','Google Calendar','20 asiakaspalvelijapaikkaa']){
    assert.ok((app+server+JSON.stringify(LEGAL_20261008)).includes(label),label);
  }
  const advanced=app.slice(app.indexOf("card('Advanced'"),app.indexOf("card('Business'"));
  assert.doesNotMatch(advanced,/Hae tiedot automaattisesti verkkosivulta/);
  assert.match(advanced,/Google Calendar -synkronointi/);
  assert.match(server,/basic_monthly:\{[^}]*agentSeats:2,websiteImport:true,googleCalendar:false/);
  assert.match(server,/advanced_monthly:\{[^}]*agentSeats:10,websiteImport:true,googleCalendar:true/);
  assert.match(server,/business_monthly:\{[^}]*agentSeats:20,websiteImport:true,googleCalendar:true/);
});

test('terms specify billing and avoid unsupported guarantees',()=>{
  const terms=LEGAL_20261008.kayttoehdot.sections.map(x=>x.body[0]).join(' ');
  for(const token of ['49,99','64,99','79,99','539,88','719,88','899,88','25,5','3 päivän','Stripe','Google Calendar']){
    assert.ok(terms.includes(token),'missing '+token);
  }
  assert.match(terms,/kaikkien tuotteiden|kaikkien.*tietojen/);
  assert.match(terms,/perua|peruminen/);
  assert.ok(!/WhatsApp.*toimii|Instagram.*toimii/i.test(terms));
});

test('DPA page does not masquerade as an executed GDPR processing agreement',()=>{
  const dpa=LEGAL_20261008.dpa;
  assert.match(dpa.intro[0],/ei yksin korvaa/);
  assert.match(dpa.intro[1],/ersätter inte/);
  assert.match(dpa.intro[2],/does not replace/);
});
