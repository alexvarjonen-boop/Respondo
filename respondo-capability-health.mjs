// Tenant-scoped operational checks; a configured connector is not proof of
// working OAuth, live payment delivery or authenticated browser navigation.
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
export function capabilityHealthSummary({tenant={},flows=0,approvals=0,lastQuality=null,latestRequest=null}={}){
 const refresh=tenant.auto_refresh_enabled===true;
 const refreshFailed=refresh&&tenant.last_refresh_status==='failed';
 const checks=[
  {key:'knowledge_refresh',status:refreshFailed?'attention':refresh?'configured':'off',
   reason:refreshFailed?'last_refresh_failed':refresh?'owner_opted_in':'owner_has_not_opted_in',
   lastCheckedAt:tenant.last_refresh_attempt_at||null},
  {key:'answer_quality',status:lastQuality?.status==='complete'?'checked':
    lastQuality?.status==='failed'?'attention':'unverified',
   reason:lastQuality?.status||'no_synthetic_run',
   lastCheckedAt:lastQuality?.finished_at||null},
  {key:'workflow_builder',status:Number(flows)>0?'configured':'unverified',
   reason:'owner_configured_rules_only',configuredRules:Number(flows)||0,
   pendingApprovals:Number(approvals)||0},
  {key:'conversion_tracking',status:latestRequest?'recording':'unverified',
   reason:latestRequest?'request_recorded':'no_recent_request',
   lastCheckedAt:latestRequest||null},
  {key:'authenticated_button_navigation',status:'unverified',
   reason:'requires_browser_session'},
  {key:'external_integrations',status:'unverified',
   reason:'requires_provider_specific_live_test'}
 ];
 return {checks,checkedUsing:'owner_scoped_database_state',
  browserFlowsVerified:false,externalProviderConnectionsVerified:false,
  paymentProviderReconciliationVerified:false,
  allCustomerFeaturesProven:false};
}
export async function capabilityHealthOverview(db,tenantId){
 if(!uuid(tenantId))throw new TypeError('Invalid workspace');
 const [t,f,a,q,r]=await Promise.all([
  db.query(`SELECT auto_refresh_enabled,last_refresh_status,last_refresh_attempt_at
   FROM tenants WHERE id=$1`,[tenantId]),
  db.query('SELECT COUNT(*)::int AS n FROM respondo_free_workflows WHERE tenant_id=$1 AND enabled=TRUE',[tenantId]),
  db.query("SELECT COUNT(*)::int AS n FROM respondo_free_workflow_approvals WHERE tenant_id=$1 AND status='pending'",[tenantId]),
  db.query('SELECT status,finished_at FROM respondo_scheduled_quality_runs WHERE tenant_id=$1 ORDER BY period_day DESC LIMIT 1',[tenantId]),
  db.query('SELECT created_at FROM action_requests WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1',[tenantId])
 ]);
 if(!t.rows?.length)return null;
 return capabilityHealthSummary({tenant:t.rows[0],flows:f.rows?.[0]?.n||0,
  approvals:a.rows?.[0]?.n||0,lastQuality:q.rows?.[0],
  latestRequest:r.rows?.[0]?.created_at||null});
}
