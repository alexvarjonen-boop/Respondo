import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const dashboard=fs.readFileSync(new URL('../public/traffic.html',import.meta.url),'utf8');
const endpoint=server.split("app.get('/api/owner/companies', auth, ownerTrafficOnly, async (req, res) => {")[1]?.split("app.get('/robots.txt'")[0]||'';

test('company registry API requires verified session and Respondo owner email',()=>{
  assert.ok(endpoint,'Owner company listing endpoint is present');
  assert.match(server,/function ownerTrafficOnly\(req, res, next\)/);
  assert.match(server,/const ownerEmail = cleanEmail\(process\.env\.OWNER_EMAIL \|\| process\.env\.SUPPORT_EMAIL\)/);
  assert.match(endpoint,/Cache-Control','private, no-store'/);
});
test('directory excludes incomplete signups and owner test subscriptions',()=>{
  assert.match(endpoint,/COALESCE\(t\.subscription_status,'pending'\)<>'pending'/);
  assert.match(endpoint,/COALESCE\(t\.subscription_plan,''\)<>'owner_test'/);
  assert.match(endpoint,/u\.status<>'pending'/);
});
test('directory returns stable paginated and searchable tenant list',()=>{
  assert.match(endpoint,/const pageSize=25/);
  assert.match(endpoint,/ILIKE '%' \|\| \$1 \|\| '%'/);
  assert.match(endpoint,/\(\$2='all' OR usage_status=\$2\)/);
  assert.match(endpoint,/ORDER BY created_at DESC,id DESC/);
  assert.match(endpoint,/LIMIT \$3 OFFSET \$4/);
  assert.match(endpoint,/\[search,status,pageSize,\(page-1\)\*pageSize\]/);
  assert.doesNotMatch(endpoint,/password_hash|contact_email|stripe_customer_id/);
});
test('private traffic UI offers company overview search filters and server pagination',()=>{
  for(const value of ['companiesShell()','bindCompanyControls()','loadCompanies()','/api/owner/companies','companySearch','companyFilter','data-page','companySummaryCards','companyRow','new URLSearchParams']) {
    assert.ok(dashboard.includes(value),value);
  }
  assert.match(dashboard,/fi:\{section:'Käyttöönotetut yritykset'/);
  assert.match(dashboard,/sv:\{section:'Företag som använder Respondo'/);
  assert.match(dashboard,/en:\{section:'Companies using Respondo'/);
  assert.match(dashboard,/const e=s=>String\(s\?\?''\)\.replace/);
  assert.match(dashboard,/e\(name\)/);
  assert.match(dashboard,/e\(meta\|\|ct\('noWebsite'\)\)/);
});
