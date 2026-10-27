import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDemoWebsite,buildDemoRequestMessage,marketingLeadVisitorRef,marketingAttributionQuery} from '../public/marketing-lead.mjs';

test('valid buyer websites are normalized without external fetches or URL tracking parameters',()=>{
 assert.equal(normalizeDemoWebsite('yritys.fi'),'https://yritys.fi/');
 assert.equal(normalizeDemoWebsite('https://www.example.fi/shop'),'https://www.example.fi/shop');
 assert.equal(normalizeDemoWebsite('http://www.example.fi'),'http://www.example.fi/');
});
test('unsafe and invalid website inputs are refused, never fetched',()=>{
 for(const input of ['','http://localhost','http://127.0.0.1','http://192.168.1.1','ftp://example.com','file:///etc/passwd','https://user:secret@example.com','example.local','evil .fi','https://example.com:8080']){
  assert.equal(normalizeDemoWebsite(input),'',input);
 }
});
test('tailored sales request contains actual customer website, optional needs and right language',()=>{
 for(const [lang,expected] of [['fi','Pyydän Respondo'],['sv','Jag vill ha en'],['en','I would like a']]){
  const msg=buildDemoRequestMessage(lang,'yritys.fi','Hinnat ja palvelut');
  assert.match(msg,new RegExp(expected));
  assert.match(msg,/https:\/\/yritys\.fi\//);
  assert.match(msg,/Hinnat ja palvelut/);
 }
 assert.equal(buildDemoRequestMessage('en','localhost',''), '');
});
test('marketing attribution retains only bounded, non-identifying campaign codes',()=>{
 assert.equal(marketingLeadVisitorRef('?intent=demo&utm_source=TikTok&utm_campaign=Salon-2026',true),
  'public-demo-request|source=tiktok|medium=|campaign=salon-2026');
 assert.equal(marketingLeadVisitorRef('',false),'homepage-contact');
 assert.equal(marketingAttributionQuery('?utm_source=TikTok&utm_medium=Social&utm_campaign=Salon-2026'),
  'utm_source=tiktok&amp;utm_medium=social&amp;utm_campaign=salon-2026');
 const unsafe=marketingLeadVisitorRef('?utm_source=%3Cscript%3E&utm_campaign='+('x'.repeat(900)),true);
 assert.ok(unsafe.length<=160);
 assert.doesNotMatch(unsafe,/[<>%&@/]/);
});
