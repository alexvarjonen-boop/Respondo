import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  FEATURE_COUNT, FEATURE_GROUPS, publicPlanFeatureCount,
  featureAvailableForPublicPlan,
} from '../public/features-data.js';

const app = readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css = readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('Advanced, Premium and Enterprise have strictly tier-scoped feature lists',()=>{
  const a=publicPlanFeatureCount('advanced');
  const p=publicPlanFeatureCount('premium');
  const e=publicPlanFeatureCount('enterprise');
  assert.ok(a>0 && a<p && p<e,'Plans must expand capabilities in order');
  assert.equal(e,FEATURE_COUNT,'Only Enterprise includes every currently documented feature');
  assert.ok(!featureAvailableForPublicPlan('advanced','booking',8),'Google Calendar is not Advanced');
  assert.ok(featureAvailableForPublicPlan('premium','booking',8),'Google Calendar is Premium');
  assert.ok(!featureAvailableForPublicPlan('premium','quotes',11),'Automatic quote calculation requires Enterprise');
  assert.ok(featureAvailableForPublicPlan('enterprise','quotes',11),'Enterprise includes quote calculations');
  assert.ok(!featureAvailableForPublicPlan('advanced','quotes',15),'Stripe quote payments are not Advanced');
  assert.ok(!featureAvailableForPublicPlan('premium','quotes',15),'Stripe quote payments are not Premium');
  assert.ok(featureAvailableForPublicPlan('enterprise','quotes',15),'Enterprise includes Stripe quote payments');
  assert.ok(featureAvailableForPublicPlan('advanced','booking',3),'Advanced keeps native booking');
  assert.ok(featureAvailableForPublicPlan('advanced','chat',0),'Advanced keeps website chat');
  assert.equal(FEATURE_GROUPS.reduce((n,g)=>n+g.items.filter((_,i)=>featureAvailableForPublicPlan('advanced',g.key,i)).length,0),a);
  assert.equal(featureAvailableForPublicPlan('unknown','chat',0),false);
});

test('pricing shows independent feature links for each tier and filters destination list',()=>{
  assert.match(app,/class="pricing-feature-link" href="\/ominaisuudet\?plan=\$\{tier\.toLowerCase\(\)\}/);
  assert.match(app,/Katso ominaisuudet','Se funktioner','See features'/);
  assert.match(app,/const plan = \['advanced','premium','enterprise'\]\.includes\(requestedPlan\)/);
  assert.match(app,/featureAvailableForPublicPlan\(plan,group\.key,index\)/);
  assert.match(app,/const displayCount = plan \? publicPlanFeatureCount\(plan\) : FEATURE_COUNT/);
  assert.match(app,/const signupTier = \{advanced:'basic',premium:'advanced',enterprise:'business'\}/);
  assert.match(app,/href="\$\{signupHref\}"/);
  assert.match(css,/pricing-feature-link:focus-visible/);
});
