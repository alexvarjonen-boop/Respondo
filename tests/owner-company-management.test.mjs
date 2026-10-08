import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/traffic.html',import.meta.url),'utf8');
const update=server.split("app.patch('/api/owner/companies/:tenantId', auth, ownerTrafficOnly, loginLimiter, async (req,res) => {")[1]?.split("app.delete('/api/owner/companies/:tenantId'")[0]||'';
const deletion=server.split("app.delete('/api/owner/companies/:tenantId', auth, ownerTrafficOnly, loginLimiter, async (req,res) => {")[1]?.split("app.get('/robots.txt'")[0]||'';

test('only owner sessions can edit/delete a company and mutation endpoints have rate limits',()=>{
  assert.ok(update && deletion);
  assert.match(server,/function ownerTrafficOnly\(req, res, next\)/);
  assert.match(update,/Cache-Control','private, no-store'/);
  assert.match(deletion,/Cache-Control','private, no-store'/);
});
test('editing company info is limited to basic fields; billing cannot be altered',()=>{
  assert.match(update,/UPDATE tenants SET name=\$1,business_id=\$2,website=\$3,updated_at=NOW\(\)/);
  assert.match(update,/normalizeWebUrl\(websiteRaw,true\)/);
  assert.match(update,/UPDATE users SET company_name=\$1,business_id=\$2/);
  assert.doesNotMatch(update,/SET subscription_plan|SET subscription_status|stripe.subscriptions.update/);
});
test('delete requires owner password and exact typed company name',()=>{
  assert.match(deletion,/bcrypt.compare\(password,admin.rows\[0\].password_hash\)/);
  assert.match(deletion,/if\(confirmation!==tenant.name\)/);
  assert.match(deletion,/SELECT password_hash FROM users WHERE id=\$1 FOR UPDATE/);
  assert.match(deletion,/await client.query\('BEGIN'\)/);
});
test('Stripe cancel is ownership verified, safeguards shared subscriptions and updates account before tenant deletion',()=>{
  assert.match(deletion,/SELECT 1 FROM tenants WHERE stripe_subscription_id=\$1 AND id<>\$2 LIMIT 1/);
  assert.match(deletion,/const canceledSubscriptions=await cancelOwnedSubscriptionsForDeletion\(\[subscriptionId\],tenant.stripe_customer_id\)/);
  assert.match(server,/ownerCustomer!==customerId/);
  assert.match(deletion,/await client.query\('ROLLBACK'\)/);
  const updatePos=deletion.indexOf('UPDATE users SET active_tenant_id=');
  const deletePos=deletion.indexOf("await client.query('DELETE FROM tenants WHERE id=$1',[id])");
  assert.ok(updatePos>-1 && deletePos>updatePos,'Account must be updated before deleting tenant');
  assert.match(deletion,/id<>\$2 AND active=true/);
});
test('UI exposes edit and irreversible delete as separate modal flows',()=>{
  for(const str of ['companyManageDialog','data-company-action="edit"','data-company-action="delete"','showCompanyManager','submitCompanyManagement','confirmName','password','DELETE','PATCH','confirmRemove','website','companyNotice']){
    assert.ok(ui.includes(str),str);
  }
  assert.match(ui,/fi:\{manage:'Hallinnoi'/);
  assert.match(ui,/sv:\{manage:'Hantera'/);
  assert.match(ui,/en:\{manage:'Manage'/);
  assert.match(ui,/dialog.showModal\(\)/);
  assert.match(ui,/body:JSON.stringify\(payload\)/);
});
