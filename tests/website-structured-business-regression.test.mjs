import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteCandidates, essentialWebsiteProfile, usableWebsiteRow } from '../website-knowledge.mjs';

const url='https://example.com/';
const json=value=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';
const company={'@type':'LocalBusiness',url,email:'info@example.com',telephone:'+358 40 123 4567',address:{streetAddress:'Testikatu 1',postalCode:'20100',addressLocality:'Turku'},openingHoursSpecification:[{dayOfWeek:['Monday','https://schema.org/Tuesday'],opens:'09:00',closes:'17:00'}],areaServed:[{name:'Turku'},'Raisio']};
const bundle=(...docs)=>({finalUrl:url,pageDocuments:docs.map(html=>extractBusinessDocument(html,url))});

test('first-party structured company details fill missing visible facts',()=>{
  const b=bundle(json(company));
  const p=essentialWebsiteProfile(b);
  assert.equal(p.email,'info@example.com');
  assert.equal(p.phone,'+358 40 123 4567');
  assert.equal(p.address,'Testikatu 1, 20100 Turku');
  assert.equal(p.hours,'Ma, Ti 09:00–17:00');
  assert.equal(p.serviceArea,'Turku, Raisio');
  assert.ok(essentialWebsiteCandidates(b).every(row=>usableWebsiteRow({...row,source_type:'website'})));
});

test('visible contacts win over metadata and third-party contacts are ignored',()=>{
  assert.equal(essentialWebsiteProfile(bundle(json(company)+'<p>Contact: hello@example.com</p>')).email,'hello@example.com');
  assert.equal(essentialWebsiteProfile(bundle(json({...company,url:'https://vendor.example.org/'}))).email,'');
});

test('conflicting branches and temporary opening hours are not guessed',()=>{
  assert.equal(essentialWebsiteProfile(bundle(json([company,{...company,address:{streetAddress:'Toinenkatu 2',addressLocality:'Helsinki'}}]))).address,'');
  assert.equal(essentialWebsiteProfile(bundle(json({...company,openingHoursSpecification:[{dayOfWeek:'Monday',opens:'09:00',closes:'17:00',validThrough:'2025-01-01'}]}))).hours,'');
});

test('different FAQ questions can share the same answer',()=>{
  const rows=essentialWebsiteCandidates(bundle('<details><summary>Can I order online?</summary><p>You can contact us for details.</p></details><details><summary>Can I customize my order?</summary><p>You can contact us for details.</p></details>'));
  assert.equal(rows.filter(row=>row.category==='Usein kysytyt').length,2);
});
