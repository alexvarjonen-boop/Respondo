import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

test('recruitment advertisement is not published as a public asset',()=>{
  assert.equal(existsSync(new URL('../public/myyntikumppaniksi.html',import.meta.url)),false);
});
test('private owner page is protected by authenticated owner gate',()=>{
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  assert.match(server,/app\.get\('\/sales-admin\.html',auth,ownerTrafficOnly,/);
  assert.ok(server.indexOf("app.get('/sales-admin.html'") < server.indexOf("app.use(express.static("));
});
test('partner attribution requires opt-in POST and time-limited signature, not automatic GET cookie',()=>{
  const src=readFileSync(new URL('../sales-partners.mjs',import.meta.url),'utf8');
  assert.match(src,/app\.post\('\/api\/sales\/consent',unavailable,originGuard,limiter/);
  assert.match(src,/req\.body\?\.consent!==true/);
  assert.match(src,/age>30\*86400/);
  assert.doesNotMatch(src,/captureSalesPartnerReferral/);
});
test('runtime ignores partner activation unless approved and contract is non-draft',async()=>{
  process.env.SALES_PARTNER_PROGRAM_ENABLED='1';
  process.env.SALES_PARTNER_LEGAL_APPROVED='0';
  process.env.SALES_PARTNER_CONTRACT_VERSION='2026-11-22-draft-v1';
  const {salesPartnerProgramActive}=await import('../sales-partners.mjs?release-gate-test');
  assert.equal(salesPartnerProgramActive(),false);
});
test('without preparation flag, startup never changes private partner database schema',async()=>{
  process.env.SALES_PARTNER_PROGRAM_ENABLED='0';
  process.env.SALES_PARTNER_PREP_ENABLED='0';
  process.env.SALES_PARTNER_LEGAL_APPROVED='0';
  const {ensureSalesPartnerSchema}=await import('../sales-partners.mjs?no-schema-test');
  let queried=false;
  await ensureSalesPartnerSchema({query:async()=>{queried=true;}});
  assert.equal(queried,false);
});
