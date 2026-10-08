import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');

test('six Basic Advanced Business plan codes and Stripe price envs are wired',()=>{
  for(const plan of [
    'basic_monthly','basic_yearly','advanced_monthly','advanced_yearly','business_monthly','business_yearly'
  ]) assert.match(server,new RegExp(plan.replace('_','_')));
  for(const env of [
    'STRIPE_BASIC_MONTHLY_PRICE_ID','STRIPE_BASIC_YEARLY_PRICE_ID',
    'STRIPE_ADVANCED_MONTHLY_PRICE_ID','STRIPE_ADVANCED_YEARLY_PRICE_ID',
    'STRIPE_BUSINESS_MONTHLY_PRICE_ID','STRIPE_BUSINESS_YEARLY_PRICE_ID'
  ]) assert.match(server,new RegExp(env));
});

test('annual billing is exactly five euros per month cheaper and sixty euros per year',()=>{
  assert.match(server,/basic_yearly:\{tier:'basic',billing:'yearly',monthlyPrice:44\.99,annualTotal:539\.88/);
  assert.match(server,/advanced_yearly:\{tier:'advanced',billing:'yearly',monthlyPrice:59\.99,annualTotal:719\.88/);
  assert.match(server,/business_yearly:\{tier:'business',billing:'yearly',monthlyPrice:74\.99,annualTotal:899\.88/);
  assert.match(app,/Basic',49\.99,44\.99,539\.88,2/);
  assert.match(app,/Advanced',64\.99,59\.99,719\.88,10/);
  assert.match(app,/Business',79\.99,74\.99,899\.88,20/);
});

test('all paid tiers include website import while calendar remains Advanced or Business',()=>{
  assert.match(server,/basic_monthly:\{[^}]*agentSeats:2,websiteImport:true,googleCalendar:false/);
  assert.match(server,/basic_yearly:\{[^}]*agentSeats:2,websiteImport:true,googleCalendar:false/);
  assert.match(server,/advanced_monthly:\{[^}]*agentSeats:10,websiteImport:true,googleCalendar:true/);
  assert.match(server,/business_monthly:\{[^}]*agentSeats:20,websiteImport:true,googleCalendar:true/);
  assert.match(server,/COUNT\(\*\)::int AS count FROM support_agents/);
  assert.match(server,/requirePlanCapability\(req,res,'websiteImport'\)/);
  assert.match(server,/requirePlanCapability\(req,res,'googleCalendar'\)/);
});

test('Business-only automations are enforced server-side and hidden on lower tiers',()=>{
  assert.match(server,/capability==='allCurrentFeatures' \? 'Business-tilaus'/);
  assert.ok((server.match(/requirePlanCapability\(req,res,'allCurrentFeatures'\)/g)||[]).length>=6);
  assert.match(server,/actionAccess\.allCurrentFeatures/);
  assert.match(server,/actionAccess\.googleCalendar/);
  assert.match(server,/Channels API vaatii Business-tilauksen/);
  assert.match(server,/stripeConnect:\s*planAccess\.allCurrentFeatures/);
  assert.match(app,/const planAccess = data\.planAccess/);
  assert.match(app,/id="importWebsite"/);
  assert.match(app,/planAccess\.websiteImport/);
  assert.match(app,/planAccess\.googleCalendar/);
  assert.match(app,/planAccess\.allCurrentFeatures/);
});

test('bot branding stays available without a premium capability gate',()=>{
  assert.match(server,/app\.post\('\/api\/app\/business-profile', auth, ownerOnly, subscribed/);
  assert.match(server,/UPDATE tenants SET[^\n]*bot_name=\$6, bot_avatar=\$7/);
  assert.match(app,/name="botName"/);
  assert.match(app,/name="botAvatar"/);
});

test('Basic keeps native booking while premium automation controls are gated',()=>{
  assert.match(server,/app\.post\('\/api\/app\/booking-slots\/generate', auth, ownerOnly, subscribed/);
  assert.doesNotMatch(server,/app\.post\('\/api\/app\/booking-slots\/generate'[\s\S]{0,180}requirePlanCapability\(req,res,'allCurrentFeatures'\)/);
  assert.match(app,/Respondo booking works on this plan\. Google Calendar sync is included in Advanced and Business\./);
  assert.match(app,/Quote requests work on every plan\. Automatic quote calculation is included in Business\./);
});

test('legacy subscribers keep the full old feature set',()=>{
  assert.match(server,/\['monthly','yearly','owner_test'\]\.includes\(raw\)/);
  assert.match(server,/tier:'business'[\s\S]*agentSeats:20[\s\S]*allCurrentFeatures:true/);
});

test('homepage signup workspace and Try Bot expose all six choices',()=>{
  for(const plan of [
    'basic_monthly','basic_yearly','advanced_monthly','advanced_yearly','business_monthly','business_yearly'
  ]){
    assert.match(app,new RegExp(plan));
    assert.match(effects,new RegExp(plan));
  }
  assert.match(app,/Hae tiedot automaattisesti verkkosivulta/);
  assert.match(app,/Basic',49\.99,44\.99,539\.88,2/);
  assert.match(app,/Advanced',64\.99,59\.99,719\.88,10/);
  assert.match(app,/Business',79\.99,74\.99,899\.88,20/);
  assert.match(app,/asiakaspalvelijapaikkaa/);
});

test('structured data publishes all six live plan prices',()=>{
  for(const price of ['49.99','539.88','64.99','719.88','79.99','899.88']){
    assert.match(html,new RegExp('"price":"'+price.replace('.','\\.')+'"'));
  }
});

test('workspace list labels tier and yearly billing correctly',()=>{
  assert.match(app,/planCode\.startsWith\('basic_'\)[\s\S]*'Basic'/);
  assert.match(app,/planCode\.startsWith\('advanced_'\)[\s\S]*'Advanced'/);
  assert.match(app,/planCode\.startsWith\('business_'\)[\s\S]*'Business'/);
  assert.match(app,/planCode==='yearly' \|\| planCode\.endsWith\('_yearly'\)/);
});


test('Business integration controls are available in the dashboard',()=>{
  assert.match(app,/id="business-integrations"/);
  assert.match(app,/id="integrationsForm"/);
  assert.match(app,/id="commerceForm"/);
  assert.match(app,/id="testCommerce"/);
  assert.match(app,/api\/app\/commerce/);
  assert.match(app,/api\/app\/commerce\/test/);
  assert.match(app,/Shopify- ja WooCommerce-tilaushaku/);
  assert.match(app,/Webhook- ja API-integraatiot/);
});

test('pricing copy does not promise undefined analytics tiers',()=>{
  assert.doesNotMatch(app,/Laajempi analytiikka|Täysi analytiikka/);
  assert.match(app,/Automaattinen hintalaskuri ja Stripe-maksulinkit/);
  assert.match(app,/Shopify- ja WooCommerce-tilaushaku/);
});

test('Basic Advanced and Business all include automatic website import',()=>{
  const basicStart=app.indexOf("card('Basic'");
  const advancedStart=app.indexOf("card('Advanced'");
  const businessStart=app.indexOf("card('Business'");
  const basicBlock=app.slice(basicStart,advancedStart);
  const advancedBlock=app.slice(advancedStart,businessStart);
  assert.match(basicBlock,/Hae tiedot automaattisesti verkkosivulta/);
  assert.match(advancedBlock,/Kaikki Basic-ominaisuudet/);
  assert.doesNotMatch(advancedBlock,/Hae tiedot automaattisesti verkkosivulta/);
  assert.match(app,/planAccess\.websiteImport/);
  assert.match(server,/basic_monthly:\{[^}]*websiteImport:true/);
  assert.match(server,/basic_yearly:\{[^}]*websiteImport:true/);
});

test('pricing does not duplicate seat counts or advertise an unenforced analytics tier',()=>{
  const advancedStart=app.indexOf("card('Advanced'");
  const businessStart=app.indexOf("card('Business'");
  const advancedBlock=app.slice(advancedStart,businessStart);
  assert.doesNotMatch(advancedBlock,/10 asiakaspalvelijapaikkaa/);
  assert.doesNotMatch(app,/Laajempi keskustelu- ja asiakasanalytiikka|Expanded conversation and customer analytics|Utökad konversations- och kundanalys/);
});
