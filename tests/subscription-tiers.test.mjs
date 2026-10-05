import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const effects=fs.readFileSync(new URL('../public/effects.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('server exposes six Basic Advanced Business subscription plans',()=>{
  for(const plan of [
    'basic_monthly','basic_yearly',
    'advanced_monthly','advanced_yearly',
    'business_monthly','business_yearly'
  ]) assert.match(server,new RegExp(plan));
  assert.match(server,/basic_monthly:\{tier:'basic'.*agentSeats:2/);
  assert.match(server,/advanced_monthly:\{tier:'advanced'.*agentSeats:10.*websiteImport:true/);
  assert.match(server,/business_monthly:\{tier:'business'.*agentSeats:20/);
});

test('checkout uses dedicated Stripe prices for all six plans',()=>{
  for(const env of [
    'STRIPE_BASIC_MONTHLY_PRICE_ID','STRIPE_BASIC_YEARLY_PRICE_ID',
    'STRIPE_ADVANCED_MONTHLY_PRICE_ID','STRIPE_ADVANCED_YEARLY_PRICE_ID',
    'STRIPE_BUSINESS_MONTHLY_PRICE_ID','STRIPE_BUSINESS_YEARLY_PRICE_ID'
  ]) assert.match(server,new RegExp(env));
  assert.match(server,/stripePriceForPlan\(normalizedPlan\)/);
  assert.match(server,/stripePriceForPlan\(plan\)/);
});

test('plan limits are enforced for seats and website import',()=>{
  assert.match(server,/access\.agentSeats/);
  assert.match(server,/Tilaus sisältää enintään/);
  assert.match(server,/requirePlanCapability\(req,res,'websiteImport'\)/);
});

test('homepage and signup show all tiers and annual discount',()=>{
  assert.match(app,/Basic',49\.99,44\.99,539\.88,2/);
  assert.match(app,/Advanced',64\.99,59\.99,719\.88,10/);
  assert.match(app,/Business',79\.99,74\.99,899\.88,20/);
  for(const plan of [
    'basic_monthly','basic_yearly',
    'advanced_monthly','advanced_yearly',
    'business_monthly','business_yearly'
  ]) assert.match(app,new RegExp(plan));
});

test('Try Bot order section offers all three tiers',()=>{
  assert.match(effects,/BASIC/);
  assert.match(effects,/ADVANCED/);
  assert.match(effects,/BUSINESS/);
  assert.match(effects,/basic_monthly/);
  assert.match(effects,/advanced_yearly/);
  assert.match(effects,/business_yearly/);
});

test('structured data publishes all six offers',()=>{
  assert.match(index,/Respondo Basic Monthly/);
  assert.match(index,/Respondo Advanced Annual/);
  assert.match(index,/Respondo Business Annual/);
  assert.match(index,/"price":"899\.88"/);
});
