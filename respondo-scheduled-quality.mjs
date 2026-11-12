// Real, tenant-isolated synthetic bot executions against the production answer
// engine. No messages are sent to visitors. Citations are not accuracy proof.
import {auditImportedKnowledge} from './knowledge-readiness.mjs';
import {runImportedAnswerSmokeTests} from './answer-smoke-tests.mjs';

const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));

export async function ensureScheduledQualitySchema(db){
 await db.query(`CREATE TABLE IF NOT EXISTS public.respondo_scheduled_quality_runs(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_day DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','complete','failed')),
  executed INTEGER NOT NULL DEFAULT 0,
  grounded_candidates INTEGER NOT NULL DEFAULT 0,
  safe_handoffs INTEGER NOT NULL DEFAULT 0,
  reviews_required INTEGER NOT NULL DEFAULT 0,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE(tenant_id,period_day))`);
 await db.query('CREATE INDEX IF NOT EXISTS idx_quality_runs_tenant ON public.respondo_scheduled_quality_runs(tenant_id,period_day DESC)');
 await db.query('ALTER TABLE public.respondo_scheduled_quality_runs ENABLE ROW LEVEL SECURITY');
 await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_scheduled_quality_runs FROM PUBLIC');
 const roles=await db.query("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",[['anon','authenticated','service_role']]);
 for(const role of roles.rows||[])if(['anon','authenticated','service_role'].includes(role.rolname))
  await db.query('REVOKE ALL PRIVILEGES ON TABLE public.respondo_scheduled_quality_runs FROM '+role.rolname);
}

export async function claimScheduledQualityRun(db){
 const res=await db.query(`WITH next_company AS (
   SELECT t.id,t.name FROM public.tenants t
   WHERE t.active=TRUE AND t.subscription_status IN ('active','trialing')
   AND EXISTS(SELECT 1 FROM public.knowledge k WHERE k.tenant_id=t.id AND k.approved=TRUE)
   AND NOT EXISTS(SELECT 1 FROM public.respondo_scheduled_quality_runs r
      WHERE r.tenant_id=t.id AND r.period_day=CURRENT_DATE)
   ORDER BY t.created_at ASC LIMIT 1
  )
  INSERT INTO public.respondo_scheduled_quality_runs(tenant_id,period_day)
  SELECT id,CURRENT_DATE FROM next_company
  ON CONFLICT(tenant_id,period_day) DO NOTHING
  RETURNING id,tenant_id`);
 return res.rows?.[0]||null;
}

export async function executeScheduledQualityRun(db,run,answerQuestion){
 if(!uuid(run?.id)||!uuid(run?.tenant_id)||typeof answerQuestion!=='function')
  throw new TypeError('Valid claimed quality run and reply engine required');
 try{
  const [tenant,knowledge]=await Promise.all([
   db.query('SELECT name FROM tenants WHERE id=$1 AND active=TRUE',[run.tenant_id]),
   db.query(`SELECT id,category,title,answer,keywords,source_type,source_url,
    approved,verified_at FROM knowledge WHERE tenant_id=$1 AND approved=TRUE
    ORDER BY updated_at DESC LIMIT 2000`,[run.tenant_id])
  ]);
  if(!tenant.rows?.length)throw new Error('inactive_workspace');
  const rows=knowledge.rows||[];
  const readiness=auditImportedKnowledge(rows);
  const result=await runImportedAnswerSmokeTests({
   readiness,rows,limit:18,
   answerQuestion:(message,lang)=>answerQuestion({
    companyName:tenant.rows[0].name,rows,message,lang,history:[]
   })
  });
  const report={
   scenariosExecuted:result.executed,counts:result.counts,
   // Prompts are public synthetic fixtures, not visitor transcripts.
   results:result.results.map(x=>({
    topic:x.topic,language:x.language,status:x.status,
    reason:x.reason,handoff:x.handoff,sourceCount:x.sourceCount
   })),
   sampleTruncated:rows.length>=2000,
   actualBotExecutions:true,factualAccuracyVerified:false,
   outboundCustomerMessages:0,externalPaidAiCallsRequested:0,
   engine:'production_answer_pipeline'
  };
  await db.query(`UPDATE public.respondo_scheduled_quality_runs
   SET status='complete',executed=$3,grounded_candidates=$4,
     safe_handoffs=$5,reviews_required=$6,report=$7::jsonb,finished_at=NOW()
   WHERE id=$1 AND tenant_id=$2 AND status='running'`,[
    run.id,run.tenant_id,result.executed,
    result.counts.grounded_candidate,result.counts.safe,result.counts.review,
    JSON.stringify(report)
   ]);
  return {id:run.id,tenantId:run.tenant_id,executed:result.executed,
   reviewsRequired:result.counts.review,accuracyVerified:false};
 }catch(error){
  // No customer answers or sensitive knowledge appear in error diagnostics.
  await db.query(`UPDATE public.respondo_scheduled_quality_runs
   SET status='failed',report='{"error":"quality_run_failed"}'::jsonb,finished_at=NOW()
   WHERE id=$1 AND tenant_id=$2 AND status='running'`,[run.id,run.tenant_id]).catch(()=>{});
  throw error;
 }
}

export async function scheduledQualityOverview(db,tenantId){
 if(!uuid(tenantId))throw new TypeError('Invalid company');
 const r=await db.query(`SELECT id,period_day::text AS day,status,executed,
  grounded_candidates,safe_handoffs,reviews_required,report,started_at,finished_at
  FROM public.respondo_scheduled_quality_runs WHERE tenant_id=$1
  ORDER BY period_day DESC LIMIT 14`,[tenantId]);
 return {runs:r.rows||[],schedule:'once_per_day_per_active_company',
  botEngineExecuted:(r.rows||[]).some(x=>x.status==='complete'&&x.executed>0),accuracyVerified:false,
  automatedFactCorrections:false,customerMessagesSent:false};
}
