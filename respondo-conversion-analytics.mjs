// First-party, tenant-scoped operational conversions. No cookies, client
// fingerprints, personal contact details, guessed revenue or third-party APIs.
const boundedDays=value=>[7,30,90].includes(Number(value))?Number(value):30;
const asCount=value=>{const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:0;};
const cleanChannel=value=>String(value||'website').slice(0,40);
const kinds=['quote','booking','callback','order_status'];
export function summarizeConversionData(channels=[],requests=[],leads=[],crmStages=[]) {
  let visitors=0,converters=0,submissions=0,confirmedBookings=0,reportedPaidQuotes=0;
  const byChannel=(Array.isArray(channels)?channels:[]).map(row=>{
    const engaged=asCount(row.engaged),converted=Math.min(engaged,asCount(row.converted));
    visitors+=engaged;converters+=converted;
    return {channel:cleanChannel(row.channel),engagedVisitors:engaged,actionSubmittingVisitors:converted,
      actionRatePercent:engaged?Math.round(100*converted/engaged):null};
  });
  const byAction=Object.fromEntries(kinds.map(type=>[type,0]));
  for(const row of Array.isArray(requests)?requests:[]){
    const type=String(row.request_type||'');
    const total=asCount(row.submitted);
    if(kinds.includes(type))byAction[type]+=total;
    submissions+=total;
    confirmedBookings+=asCount(row.confirmed_bookings);
    // The action's result.paid flag is not a Stripe/payment-ledger receipt.
    reportedPaidQuotes+=asCount(row.paid_quotes);
  }
  const leadsReceived=(Array.isArray(leads)?leads:[]).reduce((n,row)=>n+asCount(row.total),0);
  // These are explicit CRM stage changes entered by the company, not payment
  // confirmations or independently verified sales revenue.
  const stages=Object.fromEntries(['new','contacted','qualified','won','lost'].map(stage=>[stage,0]));
  for(const row of Array.isArray(crmStages)?crmStages:[]){
    if(Object.hasOwn(stages,String(row.stage))) stages[row.stage]+=asCount(row.total);
  }
  return {
    engagedVisitors:visitors,
    actionSubmittingVisitors:converters,
    actionRatePercent:visitors?Math.round(100*converters/visitors):null,
    submittedRequests:submissions,
    confirmedBookings,verifiedPayments:0,reportedPaidQuotes,
    paymentsLedgerVerified:false,leadsReceived,crmWonContacts:stages.won,crmStages:stages,byAction,byChannel,
    attribution:'Only visitors with a recorded conversation and a submitted request sharing the same channel and visitor reference are included in the rate.',
    salesConversionVerified:false,revenueAttributed:false,
  };
}
export async function conversionOverview(db,tenantId,days=30) {
  if(!db?.query||typeof tenantId!=='string'||!tenantId?.trim())throw TypeError('Tenant-scoped connection required');
  const interval=boundedDays(days),params=[tenantId,interval];
  const [visitors,actions,leads,crmStages]=await Promise.all([
    db.query(`WITH engaged AS (
        SELECT DISTINCT visitor_ref,COALESCE(NULLIF(source_channel,''),'website') AS channel
          FROM conversations
         WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')
           AND visitor_ref IS NOT NULL AND BTRIM(visitor_ref)<>''
      ), converted AS (
        SELECT DISTINCT visitor_ref,COALESCE(NULLIF(source_channel,''),'website') AS channel
          FROM action_requests
         WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')
           AND request_type IN ('quote','booking','callback','order_status')
           AND visitor_ref IS NOT NULL AND BTRIM(visitor_ref)<>''
      )
      SELECT e.channel,COUNT(*)::int AS engaged,
             COUNT(c.visitor_ref)::int AS converted
        FROM engaged e LEFT JOIN converted c
          ON e.visitor_ref=c.visitor_ref AND e.channel=c.channel
       GROUP BY e.channel ORDER BY engaged DESC LIMIT 20`,params),
    db.query(`SELECT a.request_type,COUNT(*)::int AS submitted,
       COUNT(*) FILTER(
         WHERE a.request_type='booking' AND (
           a.result->'internalBooking'->>'decision'='confirmed'
           OR EXISTS (
             SELECT 1 FROM respondo_native_calendar_events e
             WHERE e.tenant_id=a.tenant_id AND e.action_request_id=a.id
               AND e.status='confirmed'
           )
           OR EXISTS (
             SELECT 1 FROM booking_slots s
             WHERE s.tenant_id=a.tenant_id AND s.status='booked'
               AND s.id::text=a.payload->'booking'->>'slotId'
           )
         )
       )::int AS confirmed_bookings,
       -- Self-reported paid status, never independent settlement proof.
       COUNT(*) FILTER(WHERE a.request_type='quote' AND a.result->>'paid'='true')::int AS paid_quotes
      FROM action_requests a
      WHERE a.tenant_id=$1 AND a.created_at >= NOW()-($2::int * INTERVAL '1 day')
        AND a.request_type IN ('quote','booking','callback','order_status')
      GROUP BY a.request_type`,params),
    db.query(`SELECT COUNT(*)::int AS total FROM leads
      WHERE tenant_id=$1 AND created_at >= NOW()-($2::int * INTERVAL '1 day')`,params),
    db.query(`SELECT stage,COUNT(*)::int AS total FROM respondo_native_contacts
      WHERE tenant_id=$1 AND updated_at >= NOW()-($2::int * INTERVAL '1 day')
      GROUP BY stage`,params)
  ]);
  return {days:interval,summary:summarizeConversionData(visitors.rows,actions.rows,leads.rows,crmStages.rows)};
}
