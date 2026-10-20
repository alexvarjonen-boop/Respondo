// Server-side PostgreSQL repository. Only call after authenticating the owner
// and deriving tenantId from the session, never from public client input.
import { summarizeLeads } from './lead-analytics.mjs';

export async function ensureLeadTable(pool) {
  if (!pool?.query) throw new TypeError('Database pool required');
  await pool.query(`CREATE TABLE IF NOT EXISTS respondo_qualified_leads (
    tenant_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    intent TEXT NOT NULL CHECK (intent IN ('quote','booking','purchase','contact')),
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    contact JSONB NOT NULL,
    consented_at TIMESTAMPTZ NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, lead_id)
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS respondo_leads_tenant_date_idx ON respondo_qualified_leads (tenant_id, occurred_at DESC)');
  await pool.query('ALTER TABLE respondo_qualified_leads ENABLE ROW LEVEL SECURITY');
  // No browser or Supabase Data API access. Only the trusted server's
  // database role should perform tenant-filtered queries.
  await pool.query('REVOKE ALL PRIVILEGES ON TABLE respondo_qualified_leads FROM PUBLIC');
  for (const role of ['anon','authenticated','service_role']) {
    await pool.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE respondo_qualified_leads FROM ${role}'; END IF; END $$`);
  }
}
function tenant(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('Authenticated tenant ID required');
  return value.trim();
}
export async function saveQualifiedLead(pool, authenticatedTenantId, event) {
  const id = tenant(authenticatedTenantId);
  if (!pool?.query || event?.event !== 'lead.qualified' || event?.tenantId !== id ||
      typeof event.leadId !== 'string' || !event.leadId.trim() ||
      !['quote','booking','purchase','contact'].includes(event.intent) ||
      !Number.isInteger(event.score) || event.score < 0 || event.score > 100 ||
      !event.contact?.name || !(event.contact.email || event.contact.phone) ||
      !Number.isFinite(Date.parse(event.occurredAt))) {
    throw new TypeError('Invalid tenant-scoped qualified lead');
  }
  const result = await pool.query(
    `INSERT INTO respondo_qualified_leads
      (tenant_id,lead_id,intent,score,contact,consented_at,occurred_at)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$6)
      ON CONFLICT (tenant_id,lead_id) DO NOTHING
      RETURNING lead_id`,
    [id,event.leadId,event.intent,event.score,JSON.stringify(event.contact),event.occurredAt]
  );
  return { saved: result.rowCount === 1 };
}
export async function listQualifiedLeads(pool, authenticatedTenantId, limit = 50) {
  const id = tenant(authenticatedTenantId);
  if (!pool?.query) throw new TypeError('Database pool required');
  const take = Number.isInteger(limit) ? Math.max(1,Math.min(limit,100)) : 50;
  const result = await pool.query(
    `SELECT lead_id,intent,score,contact,occurred_at
       FROM respondo_qualified_leads WHERE tenant_id=$1
       ORDER BY occurred_at DESC LIMIT $2`, [id,take]);
  return result.rows;
}
export async function leadAnalyticsForTenant(pool, authenticatedTenantId) {
  const id = tenant(authenticatedTenantId);
  if (!pool?.query) throw new TypeError('Database pool required');
  const result = await pool.query(
    'SELECT intent,score,true AS qualified FROM respondo_qualified_leads WHERE tenant_id=$1',
    [id]);
  return summarizeLeads(result.rows);
}
