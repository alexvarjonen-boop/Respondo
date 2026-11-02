import { brandedEmailHtml } from './email-branding.mjs';

const esc=(value)=>String(value??'')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export function validTrustpilotReviewUrl(raw) {
  try {
    const url=new URL(String(raw||'').trim());
    return url.protocol==='https:' && (url.hostname==='trustpilot.com'||url.hostname.endsWith('.trustpilot.com'))
      && !url.username && !url.password ? url.toString() : '';
  } catch { return ''; }
}

const COPY={
  fi:{
    eyebrow:'Viikko käyttöönotosta',
    title:'Miten ensimmäinen viikko on sujunut?',
    subject:'Respondo AI · Miten ensimmäinen viikko on sujunut?',
    hello:'Hei',
    intro:'Respondo AI:n käyttöönotosta on nyt viikko. Toivottavasti aloitus on sujunut hyvin ja botti on päässyt auttamaan asiakkaitasi.',
    followup:'Haluaisimme kuulla, miten palvelu on toiminut. Onko vastauksissa, asetuksissa tai verkkosivun asennuksessa jotain, missä voisimme auttaa?',
    help:'Tarvitsetko apua? Olemme tavoitettavissa sähköpostitse osoitteessa info@respondoai.fi.',
    dashboard:'Avaa hallintapaneeli',
    reviewTitle:'Jaa kokemuksesi Trustpilotissa',
    reviewText:'Voit halutessasi kertoa rehellisestä kokemuksestasi Trustpilotissa – olipa palaute myönteistä, kielteistä tai jotain siltä väliltä. Arvostelun jättäminen on vapaaehtoista.',
    reviewAction:'Kirjoita arvostelu Trustpilotissa',
    closing:'Kiitos, että valitsit Respondo AI:n.',
    signoff:'Ystävällisin terveisin,',
  },
  sv:{
    eyebrow:'En vecka efter starten',
    title:'Hur har din första vecka gått?',
    subject:'Respondo AI · Hur har din första vecka gått?',
    hello:'Hej',
    intro:'Det har gått en vecka sedan du tog Respondo AI i bruk. Vi hoppas att starten har gått bra och att botten har kunnat hjälpa dina kunder.',
    followup:'Vi vill gärna höra hur tjänsten fungerar. Behöver du hjälp med svar, inställningar eller installationen på webbplatsen?',
    help:'Behöver du hjälp? Kontakta oss på info@respondoai.fi.',
    dashboard:'Öppna kontrollpanelen',
    reviewTitle:'Dela din upplevelse på Trustpilot',
    reviewText:'Du får gärna berätta om din ärliga upplevelse på Trustpilot, oavsett om den varit positiv, negativ eller blandad. Det är helt frivilligt att lämna en recension.',
    reviewAction:'Skriv ett omdöme på Trustpilot',
    closing:'Tack för att du valde Respondo AI.',
    signoff:'Med vänliga hälsningar,',
  },
  en:{
    eyebrow:'One week after setup',
    title:'How has your first week been?',
    subject:'Respondo AI · How has your first week been?',
    hello:'Hello',
    intro:"It's been one week since you set up Respondo AI. We hope you've had a smooth start and that your bot is helping your customers.",
    followup:'We would like to hear how things are going. Do you need help with bot answers, settings or website installation?',
    help:'Need a hand? Reach us at info@respondoai.fi.',
    dashboard:'Open dashboard',
    reviewTitle:'Share your experience on Trustpilot',
    reviewText:'You are welcome to share your honest experience on Trustpilot, whether positive, negative or mixed. Leaving a review is entirely optional.',
    reviewAction:'Write a review on Trustpilot',
    closing:'Thank you for choosing Respondo AI.',
    signoff:'Kind regards,',
  },
};

export function buildOnboardingCheckupEmail({language='en',firstName='',trustpilotUrl}) {
  const url=validTrustpilotReviewUrl(trustpilotUrl);
  if(!url)throw new Error('TRUSTPILOT_REVIEW_URL must be a valid https://trustpilot.com link');
  const lang=['fi','sv','en'].includes(language)?language:'en';
  const c=COPY[lang];
  const recipientName=String(firstName||'').trim().split(/\s+/)[0].slice(0,80);
  const greeting=c.hello+(recipientName?', '+recipientName:'')+'!';
  const dashboardUrl='https://www.respondoai.fi/app';
  const html=brandedEmailHtml({
    language:lang,eyebrow:c.eyebrow,title:c.title,
    content:
      '<p style="margin:0 0 23px;color:#ffffff;font-size:16px;font-weight:700;line-height:1.6">'+esc(greeting)+'</p>'+
      '<p style="margin:0 0 18px;color:#d6d8de;font-size:15px;line-height:1.8">'+esc(c.intro)+'</p>'+
      '<p style="margin:0 0 24px;color:#d6d8de;font-size:15px;line-height:1.8">'+esc(c.followup)+'</p>'+
      '<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="border-spacing:0;margin:0 0 26px"><tr><td bgcolor="#3b64ed" style="background:#3b64ed;border-radius:11px">'+
        '<a href="'+esc(dashboardUrl)+'" style="display:inline-block;padding:14px 21px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">'+esc(c.dashboard)+' →</a>'+
      '</td></tr></table>'+
      '<div style="height:1px;background:#48484d;margin:0 0 27px"></div>'+
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-spacing:0;margin:0 0 27px"><tr><td bgcolor="#252c2b" style="background:#252c2b;border-radius:13px;border:1px solid #38584a;padding:22px">'+
        '<div style="font-size:14px;font-weight:800;line-height:1.5;color:#00d494;margin:0 0 10px">Trustpilot</div>'+
        '<div style="font-size:18px;line-height:1.4;font-weight:800;color:#fff;margin:0 0 12px">'+esc(c.reviewTitle)+'</div>'+
        '<p style="font-size:14px;line-height:1.75;color:#d1d9d6;margin:0 0 20px">'+esc(c.reviewText)+'</p>'+
        '<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#00b67a" style="background:#00b67a;border-radius:10px">'+
          '<a href="'+esc(url)+'" style="display:inline-block;padding:13px 19px;color:#071d14;text-decoration:none;font-size:14px;font-weight:800">'+esc(c.reviewAction)+' →</a>'+
        '</td></tr></table>'+
      '</td></tr></table>'+
      '<p style="margin:0 0 18px;color:#c5c9d0;font-size:13px;line-height:1.8">'+esc(c.help)+'</p>'+
      '<p style="margin:0;color:#d5d8df;font-size:13px;line-height:1.8">'+esc(c.closing)+'<br>'+esc(c.signoff)+'<br><strong style="color:#fff">Respondo AI</strong></p>',
  });
  const text=[
    greeting,'',c.intro,'',c.followup,'',c.dashboard+': '+dashboardUrl,'',
    c.reviewTitle,c.reviewText,c.reviewAction+': '+url,'',
    c.help,c.closing,c.signoff,'Respondo AI',
  ].join('\n');
  return {subject:c.subject,html,text};
}

// Every tenant gets at most one checkup, seven days after its first real handover.
export async function ensureOnboardingCheckupSchema(q) {
  await q("CREATE TABLE IF NOT EXISTS onboarding_checkups ("+
    "tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,"+
    "completed_at TIMESTAMPTZ NOT NULL,"+
    "due_at TIMESTAMPTZ NOT NULL,"+
    "next_attempt_at TIMESTAMPTZ NOT NULL,"+
    "status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','skipped')),"+
    "attempt_count INTEGER NOT NULL DEFAULT 0,"+
    "claimed_at TIMESTAMPTZ,"+
    "sent_at TIMESTAMPTZ,"+
    "provider_message_id TEXT,"+
    "last_error TEXT,"+
    "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await q("ALTER TABLE onboarding_checkups ENABLE ROW LEVEL SECURITY");
  await q("REVOKE ALL ON TABLE onboarding_checkups FROM PUBLIC, anon, authenticated, service_role");
  await q("CREATE INDEX IF NOT EXISTS idx_onboarding_checkups_due ON onboarding_checkups(next_attempt_at) WHERE status IN ('pending','sending')");
}

export async function enqueueOnboardingCheckup(client,tenantId) {
  if(!tenantId)return false;
  const inserted=await client.query(
    "INSERT INTO onboarding_checkups(tenant_id,completed_at,due_at,next_attempt_at) "+
    "VALUES ($1,NOW(),NOW()+INTERVAL '7 days',NOW()+INTERVAL '7 days') "+
    "ON CONFLICT(tenant_id) DO NOTHING RETURNING tenant_id",[tenantId]
  );
  return inserted.rowCount>0;
}

let processing=false;
export async function runDueOnboardingCheckups(pool,options={}) {
  const apiKey=String(options.apiKey||'').trim();
  const reviewUrl=validTrustpilotReviewUrl(options.trustpilotUrl);
  const from=String(options.from||'Respondo AI <info@respondoai.fi>').trim();
  if(!pool||!apiKey||!reviewUrl||processing)return {processed:0,skipped:true};
  processing=true;
  let processed=0;
  try {
    // Do not send review requests to canceled or disabled accounts.
    await pool.query(
      "UPDATE onboarding_checkups oc SET status='skipped',updated_at=NOW() "+
      "FROM tenants t JOIN users u ON u.id=t.owner_user_id "+
      "WHERE oc.tenant_id=t.id AND oc.status='pending' AND oc.due_at<=NOW() "+
      "AND (t.active IS NOT TRUE OR t.subscription_status NOT IN ('active','trialing') OR u.status<>'active')"
    );
    const claimed=await pool.query(
      "WITH due AS ("+
      " SELECT oc.tenant_id FROM onboarding_checkups oc "+
      " JOIN tenants t ON t.id=oc.tenant_id JOIN users u ON u.id=t.owner_user_id "+
      " WHERE oc.due_at<=NOW() AND oc.next_attempt_at<=NOW() "+
      " AND (oc.status='pending' OR (oc.status='sending' AND oc.claimed_at<NOW()-INTERVAL '15 minutes'))"+
      " AND t.active=TRUE AND t.subscription_status IN ('active','trialing') AND u.status='active' "+
      " ORDER BY oc.due_at FOR UPDATE OF oc SKIP LOCKED LIMIT 5"+
      ") UPDATE onboarding_checkups oc SET status='sending',claimed_at=NOW(),attempt_count=oc.attempt_count+1,updated_at=NOW() "+
      "FROM due WHERE oc.tenant_id=due.tenant_id RETURNING oc.tenant_id,oc.attempt_count"
    );
    for(const job of claimed.rows) {
      try {
        const target=await pool.query(
          "SELECT u.email,u.full_name,u.preferred_language "+
          "FROM onboarding_checkups oc JOIN tenants t ON t.id=oc.tenant_id "+
          "JOIN users u ON u.id=t.owner_user_id "+
          "WHERE oc.tenant_id=$1 AND oc.status='sending' AND t.active=TRUE "+
          "AND t.subscription_status IN ('active','trialing') AND u.status='active'",[job.tenant_id]
        );
        const user=target.rows[0];
        if(!user?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
          await pool.query("UPDATE onboarding_checkups SET status='skipped',claimed_at=NULL,updated_at=NOW() WHERE tenant_id=$1 AND status='sending'",[job.tenant_id]);
          continue;
        }
        const email=buildOnboardingCheckupEmail({
          language:user.preferred_language,firstName:user.full_name,trustpilotUrl:reviewUrl,
        });
        const response=await fetch('https://api.resend.com/emails',{
          method:'POST',
          headers:{
            Authorization:'Bearer '+apiKey,'Content-Type':'application/json',
            'Idempotency-Key':'respondo-week-one-'+job.tenant_id,
          },
          body:JSON.stringify({
            from,to:[user.email],reply_to:'info@respondoai.fi',
            subject:email.subject,html:email.html,text:email.text,
          }),
          signal:AbortSignal.timeout(12000),
        });
        if(!response.ok)throw new Error('Resend checkup HTTP '+response.status);
        const result=await response.json().catch(()=>({}));
        await pool.query(
          "UPDATE onboarding_checkups SET status='sent',sent_at=NOW(),claimed_at=NULL,provider_message_id=$2,last_error=NULL,updated_at=NOW() "+
          "WHERE tenant_id=$1 AND status='sending'",[job.tenant_id,result.id||null]
        );
        processed++;
      }catch(error) {
        // Retry failures with backoff; provider idempotency protects duplicate attempts.
        const minutes=[5,15,60,360,720,1440][Math.min(job.attempt_count-1,5)];
        await pool.query(
          "UPDATE onboarding_checkups SET "+
          "status=CASE WHEN attempt_count>=6 THEN 'failed' ELSE 'pending' END,"+
          "next_attempt_at=NOW()+($2::int * INTERVAL '1 minute'),"+
          "claimed_at=NULL,last_error=$3,updated_at=NOW() "+
          "WHERE tenant_id=$1 AND status='sending'",[
            job.tenant_id,minutes,String(error?.message||'Delivery failed').slice(0,200),
          ]
        );
        console.error('Week-one checkup delivery failed:',error?.message);
      }
    }
    return {processed,claimed:claimed.rowCount};
  }finally { processing=false; }
}
