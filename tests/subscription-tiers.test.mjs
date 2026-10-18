import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');

test('six Starter Advanced Business plan codes and Stripe price envs are wired',()=>{
  for(const plan of [
    'basic_monthly','basic_yearly','advanced_monthly','advanced_yearly','business_monthly','business_yearly'
  ]) assert.match(server,new RegExp(plan.replace('_','_')));
  for(const env of [
    'STRIPE_BASIC_MONTHLY_PRICE_ID','STRIPE_BASIC_YEARLY_PRICE_ID',
    'STRIPE_ADVANCED_MONTHLY_PRICE_ID','STRIPE_ADVANCED_YEARLY_PRICE_ID',
    'STRIPE_BUSINESS_MONTHLY_PRICE_ID','STRIPE_BUSINESS_YEARLY_PRICE_ID'
  ]) assert.match(server,new RegExp(env));
});

test('annual billing is exactly 10 euros per month cheaper and retains the tier entitlements',()=>{
  for(const [code,monthly,annual,yearly,seats] of [
    ['basic',49,39,468,2],['advanced',129,119,1428,10],['business',149,139,1668,20]
  ]){
    assert.equal(monthly-annual,10);
    assert.equal(annual*12,yearly);
    assert.ok(server.includes(code+'_yearly:{tier:'),'missing annual plan');
    assert.ok(server.includes('monthlyPrice:'+annual+',annualTotal:'+yearly));
    assert.ok(app.includes('value="'+code+'_yearly"'));
    assert.ok(app.includes('value="'+code+'_monthly"'));
  }
  assert.match(server,/NEW_YEARLY_PRICE_CENTS/);
  assert.doesNotMatch(server,/Uusille tilauksille on saatavilla vain kuukausilaskutus/);
});

test('approved new monthly prices are server-enforced and historical Stripe subscriptions recognized',()=>{
  for(const [code,amount] of [['basic',49],['advanced',129],['business',149]]) {
    assert.match(server,new RegExp(code+'_monthly:\\{[^}]*monthlyPrice:'+amount+'(?![0-9])'));
  }
  assert.match(server,/basic_monthly:4900, advanced_monthly:12900, business_monthly:14900/);
  assert.match(server,/stripe\.prices\.retrieve\(priceId\)/);
  assert.match(server,/price\.currency !== 'eur'/);
  for(const price of ['price_1UP2DWV05brJ7mTP6sjumnIt','price_1UP2DfV05brJ7mTPuSuwvuxm','price_1UP2DhV05brJ7mTP2pSDX8aV']) assert.ok(server.includes(price),'lost grandfathered price '+price);
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

test('Enterprise-only automations remain server-side gated and hidden from lower tiers',()=>{
  assert.match(server,/capability==='allCurrentFeatures' \? 'Enterprise-tilaus'/);
  assert.ok((server.match(/requirePlanCapability\(req,res,'allCurrentFeatures'\)/g)||[]).length>=6);
  assert.match(server,/actionAccess\.allCurrentFeatures/);
  assert.match(server,/actionAccess\.googleCalendar/);
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

test('Advanced keeps native booking while Enterprise automation controls are gated',()=>{
  assert.match(server,/app\.post\('\/api\/app\/booking-slots\/generate', auth, ownerOnly, subscribed/);
  assert.doesNotMatch(server,/app\.post\('\/api\/app\/booking-slots\/generate'[\s\S]{0,180}requirePlanCapability\(req,res,'allCurrentFeatures'\)/);
  assert.match(app,/Respondo booking works on this plan\. Google Calendar sync is included in Premium and Enterprise\./);
  assert.match(app,/Quote requests work on every plan\. Automatic quote calculation is included in Enterprise\./);
});

test('legacy subscribers keep the full old feature set',()=>{
  assert.match(server,/\['monthly','yearly','owner_test'\]\.includes\(raw\)/);
  assert.match(server,/tier:'business'[\s\S]*agentSeats:20[\s\S]*allCurrentFeatures:true/);
});

test('homepage signup workspaces and Try Bot offer monthly and annual tiers',()=>{
  for(const plan of ['basic_monthly','advanced_monthly','business_monthly']) {
    assert.ok(app.includes('value="'+plan+'"'),plan+' missing from signup/workspace');
    assert.match(effects,new RegExp('plan='+plan));
  }
  assert.match(app,/Hae tiedot automaattisesti verkkosivulta/);
  assert.ok(app.includes("card('Advanced',49,2"));
  assert.ok(app.includes("card('Premium',129,10"));
  assert.ok(app.includes("card('Enterprise',149,20"));
  assert.match(app,/asiakaspalvelijapaikkaa/);
  assert.match(app,/plan:card\.dataset\.planCode \+ \(yearly \? '_yearly' : '_monthly'\)/);
});

test('homepage structured data publishes six approved monthly and annual subscription prices',()=>{
  for(const price of ['49.00','129.00','149.00','468.00','1428.00','1668.00']) assert.ok(html.includes('"price":"'+price+'"'));
  for(const price of ['34.90','44.90','54.90']) assert.ok(!html.includes('"price":"'+price+'"'));
  assert.equal((html.match(/"@type":"Offer"/g)||[]).length,6);
});

test('workspace list correctly labels new commercial tiers while preserving old annual billing',()=>{
  assert.match(app,/planCode\.startsWith\('basic_'\)[\s\S]{0,50}\? 'Advanced'/);
  assert.match(app,/planCode\.startsWith\('advanced_'\)[\s\S]{0,50}\? 'Premium'/);
  assert.match(app,/planCode\.startsWith\('business_'\)[\s\S]{0,150}\? 'Enterprise'/);
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

test('Advanced Premium Enterprise all include automatic website import',()=>{
  const lowerStart=app.indexOf("card('Advanced'");
  const middleStart=app.indexOf("card('Premium'");
  const upperStart=app.indexOf("card('Enterprise'");
  assert.ok(lowerStart>0&&middleStart>lowerStart&&upperStart>middleStart);
  const lowerBlock=app.slice(lowerStart,middleStart);
  const middleBlock=app.slice(middleStart,upperStart);
  assert.match(lowerBlock,/Hae tiedot automaattisesti verkkosivulta/);
  assert.match(middleBlock,/Kaikki Advanced-ominaisuudet/);
  assert.doesNotMatch(middleBlock,/Hae tiedot automaattisesti verkkosivulta/);
  assert.match(app,/planAccess\.websiteImport/);
  assert.match(server,/basic_monthly:\{[^}]*websiteImport:true/);
  assert.match(server,/basic_yearly:\{[^}]*websiteImport:true/);
});

test('pricing does not duplicate seat counts or advertise an unenforced analytics tier',()=>{
  const middleStart=app.indexOf("card('Premium'");
  const upperStart=app.indexOf("card('Enterprise'");
  const middleBlock=app.slice(middleStart,upperStart);
  assert.doesNotMatch(middleBlock,/10 asiakaspalvelijapaikkaa/);
  assert.doesNotMatch(app,/Laajempi keskustelu- ja asiakasanalytiikka|Expanded conversation and customer analytics|Utökad konversations- och kundanalys/);
});

