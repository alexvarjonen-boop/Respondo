import { randomUUID } from 'node:crypto';

// Per-tenant CRM configuration and durable delivery queue. Credentials are
// supplied by the operator environment, never returned by public endpoints.
export async function ensureCrmSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS respondo_crm_settings (
    tenant_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('webhook','hubspot','pipedrive')),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS respondo_crm_outbox (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, lead_id TEXT NOT NULL,
    payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id,lead_id)
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS respondo_crm_outbox_due_idx ON respondo_crm_outbox (next_attempt_at) WHERE status IN (\'pending\',\'retry\')');
  for(const table of ['respondo_crm_settings','respondo_crm_outbox']){
    await pool.query('ALTER TABLE '+table+' ENABLE ROW LEVEL SECURITY');
    await pool.query('REVOKE ALL ON '+table+' FROM PUBLIC');
  }
}
export async function setCrmProvider(pool,tenantId,provider,enabled) {
  if(!tenantId || !['webhook','hubspot','pipedrive'].includes(provider) || typeof enabled!=='boolean')throw TypeError('Invalid CRM configuration');
  await pool.query(`INSERT INTO respondo_crm_settings (tenant_id,provider,enabled)
    VALUES ($1,$2,$3) ON CONFLICT (tenant_id) DO UPDATE
    SET provider=EXCLUDED.provider,enabled=EXCLUDED.enabled,updated_at=NOW()`,[tenantId,provider,enabled]);
}
export async function getCrmProvider(pool,tenantId) {
  const r=await pool.query('SELECT provider,enabled FROM respondo_crm_settings WHERE tenant_id=$1',[tenantId]);
  return r.rows[0]||{provider:null,enabled:false};
}
export async function enqueueCrmLead(pool,event) {
  if(event?.event!=='lead.qualified'||!event.tenantId||!event.leadId)throw TypeError('Qualified event required');
  const r=await pool.query(`INSERT INTO respondo_crm_outbox(id,tenant_id,lead_id,payload)
    VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(tenant_id,lead_id) DO NOTHING RETURNING id`,
    [randomUUID(),event.tenantId,event.leadId,JSON.stringify(event)]);
  return {queued:r.rowCount===1};
}
export async function processCrmOutbox(pool,deliver,{limit=20,maxAttempts=8}={}) {
  const jobs=await pool.query(`UPDATE respondo_crm_outbox SET status='processing',next_attempt_at=NOW()+INTERVAL '2 minutes'
    WHERE id IN (SELECT id FROM respondo_crm_outbox
      WHERE (status IN ('pending','retry') AND next_attempt_at<=NOW()) OR (status='processing' AND next_attempt_at<=NOW())
      ORDER BY next_attempt_at LIMIT $1 FOR UPDATE SKIP LOCKED)
    RETURNING id,tenant_id,payload,attempts`,[Math.min(Math.max(1,limit),100)]);
  const summary={processed:0,delivered:0,retried:0,failed:0};
  for(const job of jobs.rows){
    summary.processed++;
    try {
      await deliver(job.tenant_id,job.payload);
      await pool.query("UPDATE respondo_crm_outbox SET status='delivered',last_error=NULL WHERE id=$1",[job.id]);
      summary.delivered++;
    } catch(error) {
      const attempts=job.attempts+1;
      const final=attempts>=maxAttempts;
      const delay=Math.min(86400,60*2**Math.min(attempts-1,10));
      await pool.query(`UPDATE respondo_crm_outbox SET status=$2,attempts=$3,
        next_attempt_at=NOW()+($4::integer*INTERVAL '1 second'),last_error=$5 WHERE id=$1`,
        [job.id,final?'failed':'retry',attempts,delay,String(error?.message||error).slice(0,400)]);
      summary[final?'failed':'retried']++;
    }
  }
  return summary;
}
