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

test('plan entitlements enforce requested seat limits and Advanced website import',()=>{
  assert.match(server,/basic_monthly:\{[^}]*agentSeats:2,websiteImport:false,googleCalendar:false/);
  assert.match(server,/advanced_monthly:\{[^}]*agentSeats:10,websiteImport:true,googleCalendar:true/);
  assert.match(server,/business_monthly:\{[^}]*agentSeats:20,websiteImport:true,googleCalendar:true/);
  assert.match(server,/COUNT\(\*\)::int AS count FROM support_agents/);
  assert.match(server,/requirePlanCapability\(req,res,'websiteImport'\)/);
  assert.match(server,/requirePlanCapability\(req,res,'googleCalendar'\)/);
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
