// Tenant-isolated encrypted read-only cloud provider tokens.
export const cloudProvider=p=>['google_drive','sharepoint'].includes(p);
export const validSiteId=x=>/^[A-Za-z0-9.,_-]{3,180}$/.test(String(x||''))&&!String(x).includes('..');
export async function ensureNativeCloudSchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS respondo_native_cloud_credentials(
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('google_drive','sharepoint')),
  site_id TEXT,
  access_ciphertext TEXT NOT NULL,
  refresh_ciphertext TEXT,
  expires_at TIMESTAMPTZ,
  granted_scopes TEXT NOT NULL DEFAULT '',
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id,provider)
 )`);
 await db.query('ALTER TABLE respondo_native_cloud_credentials ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL PRIVILEGES ON TABLE respondo_native_cloud_credentials FROM PUBLIC');
 const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
 for(const row of roles.rows||[])if(['anon','authenticated','service_role'].includes(row.rolname))
  await db.query('REVOKE ALL PRIVILEGES ON TABLE respondo_native_cloud_credentials FROM '+row.rolname);
}
