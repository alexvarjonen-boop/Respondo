import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPLIMENTARY_ENTERPRISE_PLAN, validateManagedAccountInput, createManagedCredentials, managedPlaceholderEmail } from '../managed-accounts.mjs';
import { customerPasswordValid } from '../public/customer-password-policy.mjs';

test('managed account needs only company name; no email or billing fields',()=>{
  const v=validateManagedAccountInput({name:' Mainio Muuttopalvelu ',website:'mainiomuuttopalvelu.fi',industry:'Muuttopalvelu'});
  assert.equal(v.name,'Mainio Muuttopalvelu');
  assert.equal(v.website,'https://mainiomuuttopalvelu.fi/');
  assert.equal(v.language,'fi');
  assert.equal(COMPLIMENTARY_ENTERPRISE_PLAN,'business_monthly');
  assert.equal('email' in v,false);
});
test('rejects local or unsafe sites and invalid names',()=>{
  for (const website of ['http://business.fi','localhost','127.0.0.1','https://test.local','https://abc.invalid','https://user:pw@business.fi']) {
    assert.ok(validateManagedAccountInput({name:'Company',website}).error, website);
  }
  assert.ok(validateManagedAccountInput({name:'<script>'}).error);
});
test('login identifiers are random, password is strong, and placeholder is not deliverable',()=>{
  const a=createManagedCredentials(),b=createManagedCredentials();
  assert.match(a.loginCode,/^RSP-[A-F0-9]{12}$/);
  assert.notEqual(a.loginCode,b.loginCode);
  assert.ok(customerPasswordValid(a.temporaryPassword));
  assert.equal(managedPlaceholderEmail('12345678-1234-1234-1234-123456789abc'),'managed-12345678123412341234123456789abc@accounts.respondoai.invalid');
});
