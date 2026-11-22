// Independent B2B sales-partner program. Feature flag OFF unless explicitly enabled.
// No partner can access customer tenants. All money transfers require owner approval.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';

const CONTRACT = process.env.SALES_PARTNER_CONTRACT_VERSION || '2026-11-22-draft-v1';
// Prevent accidental activation on the draft contract or without both rollout approvals.
const ACTIVE = process.env.SALES_PARTNER_PROGRAM_ENABLED === '1' &&
  process.env.SALES_PARTNER_LEGAL_APPROVED === '1' &&
  CONTRACT !== '2026-11-22-draft-v1';
const PREPARATION = ACTIVE || process.env.SALES_PARTNER_PREP_ENABLED === '1';
export function salesPartnerProgramActive(){return ACTIVE;}
const COOKIE = 'rsp_sales_partner';
const SESSION_COOKIE = 'rsp_sales_session';
const PARTNER_PRICE_CENTS = 5000;
const newId = () => crypto.randomUUID();
const email = v => String(v || '').trim().toLowerCase().slice(0,254);
const clean = (v, n=160) => String(v || '').trim().slice(0,n).replace(/[\u0000-\u001f]/g,'');
const getCookie = (req,name) => {
  const raw = String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
  try { return raw ? decodeURIComponent(raw.slice(name.length+1)) : ''; } catch { return ''; }
};
const cookieOptions = {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'};
const digest = s => crypto.createHash('sha256').update(s).digest('hex');
const hmac = (secret,msg) => crypto.createHmac('sha256',secret).update(msg).digest('hex');
const isCode = value => /^SP-[A-Z0-9]{10}$/.test(String(value||''));
const validPassword = s => typeof s==='string' && s.length>=12 && s.length<=128 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s) && /[^a-zA-Z0-9]/.test(s);
const unavailable = (req,res,next) => ACTIVE ? next() : res.status(404).json({error:'Ohjelma ei ole käytössä.'});
const prepUnavailable = (req,res,next) => PREPARATION ? next() : res.status(404).json({error:'Ohjelma ei ole käytössä.'});
const guarded = handler => async (req,res) => {try{await handler(req,res);}catch(error){console.error('Sales partner action failed',error?.name||'error');if(!res.headersSent)res.status(503).json({error:'Toiminto ei ole saatavilla.'});}};
const limiter=rateLimit({windowMs:15*60*1000,limit:15,standardHeaders:true,legacyHeaders:false});

function originGuard(req,res,next){
  if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return next();
  const site=String(req.headers['sec-fetch-site']||'').toLowerCase();
  if(site==='cross-site')return res.status(403).json({error:'Virheellinen pyyntö.'});
  const origin=String(req.headers.origin||'');
  if(origin){
    try{
      if(new URL(origin).host.toLowerCase()!==String(req.get('host')||'').toLowerCase())
        return res.status(403).json({error:'Virheellinen pyyntö.'});
    }catch{return res.status(403).json({error:'Virheellinen pyyntö.'});}
  }
  return next();
}

export async function salesPartnerForCheckout(db,req,secret,plan){
  if(!ACTIVE || !String(plan||'').endsWith('_yearly'))return null;
  const token=getCookie(req,COOKIE);
  const [code,issued,signature]=token.split('.');
  if(!isCode(code)||!/^[0-9]{10}$/.test(issued||'')||!/^[0-9a-f]{64}$/.test(signature||''))return null;
  const age=Math.floor(Date.now()/1000)-Number(issued);
  if(age<0||age>30*86400)return null;
  const expected=hmac(secret,code+'.'+issued);
  if(!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
  const found=await db.query("SELECT id,code FROM respondo_sales.partners WHERE code=$1 AND status='active' AND agreement_accepted_at IS NOT NULL",[code]);
  return found.rows[0]||null;
}
export async function savePartnerCheckout(db,{partner,sessionId,userId,tenantId}){
  if(!ACTIVE||!partner)return;
  await db.query("INSERT INTO respondo_sales.attributions(id,partner_id,checkout_session_id,user_id,tenant_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(checkout_session_id) DO NOTHING",
    [newId(),partner.id,sessionId,userId,tenantId]);
}
export async function partnerCheckoutCompleted(db,session){
  if(!ACTIVE)return;
  const sub=typeof session.subscription==='string'?session.subscription:session.subscription?.id;
  if(!sub||!session.id)return;
  await db.query("UPDATE respondo_sales.attributions SET subscription_id=$2 WHERE checkout_session_id=$1 AND (subscription_id IS NULL OR subscription_id=$2)",[session.id,sub]);
}
export function qualifyingAnnualInvoice(invoice, subscription, lines){
  if(!ACTIVE || !invoice?.id || Number(invoice.amount_paid||0)<=0 || String(invoice.status||'')!=='paid')return false;
  if(!subscription?.id || !subscription?.items?.data?.some(i=>i.price?.recurring?.interval==='year'))return false;
  // Avoid crediting next year's renewal if there was never an eligible first payment.
  // The 350-day window allows extended assisted onboarding but excludes annual renewals.
  const subscriptionCreated=Number(subscription.created||0), invoiceCreated=Number(invoice.created||0);
  if(subscriptionCreated>0 && invoiceCreated>0 &&
     (invoiceCreated < subscriptionCreated-3600 || invoiceCreated-subscriptionCreated > 350*86400))return false;
  // A paid one-time setup invoice does not count. The annual recurring line
  // must itself have a positive price after discount.
  const annualPriceIds=new Set(subscription.items.data.filter(i=>i.price?.recurring?.interval==='year').map(i=>i.price.id));
  return (lines||[]).some(line=>{
    const priceId=line.price?.id || line.pricing?.price_details?.price;
    return annualPriceIds.has(priceId) && Number(line.amount||0)>0 &&
      String(line.type||'subscription')!=='invoiceitem';
  });
}
export async function partnerInvoicePaid(db,stripe,invoice,subscription){
  if(!ACTIVE || !db || !stripe || !subscription?.id)return;
  let rows=await db.query("SELECT a.id,a.partner_id FROM respondo_sales.attributions a JOIN respondo_sales.partners p ON p.id=a.partner_id WHERE a.subscription_id=$1 AND p.status='active' LIMIT 1",[subscription.id]);
  // Stripe can deliver invoice.paid before checkout.session.completed.
  // Attribution metadata was written to the subscription by our server at checkout,
  // and is cross-checked against a persisted checkout attribution before linking.
  if(!rows.rowCount){
    const metadata=subscription.metadata||{};
    if(metadata.sales_partner_id && metadata.user_id && metadata.tenant_id){
      rows=await db.query("UPDATE respondo_sales.attributions a SET subscription_id=$1 FROM respondo_sales.partners p WHERE a.partner_id=p.id AND a.partner_id=$2::uuid AND a.user_id=$3::uuid AND a.tenant_id=$4::uuid AND a.subscription_id IS NULL AND a.created_at>NOW()-INTERVAL '350 days' AND p.status='active' RETURNING a.id,a.partner_id",[subscription.id,metadata.sales_partner_id,metadata.user_id,metadata.tenant_id]);
    }
  }
  if(!rows.rowCount)return;
  const lines=await stripe.invoices.listLineItems(invoice.id,{limit:100});
  if(!qualifyingAnnualInvoice(invoice,subscription,lines.data))return;
  await db.query("INSERT INTO respondo_sales.commissions(id,partner_id,attribution_id,subscription_id,stripe_invoice_id,amount_cents,status,paid_invoice_at) VALUES($1,$2,$3,$4,$5,$6,'pending_review',NOW()) ON CONFLICT(subscription_id) DO NOTHING",
    [newId(),rows.rows[0].partner_id,rows.rows[0].id,subscription.id,invoice.id,PARTNER_PRICE_CENTS]);
}
export async function verifyCommissionBeforeApproval(stripe,invoiceId,subscriptionId){
  if(!stripe || !invoiceId || !subscriptionId)return {ok:false,reason:'Stripe ei ole saatavilla.'};
  const [invoice,subscription,lines,notes]=await Promise.all([
    stripe.invoices.retrieve(invoiceId),
    stripe.subscriptions.retrieve(subscriptionId),
    stripe.invoices.listLineItems(invoiceId,{limit:100}),
    stripe.creditNotes.list({invoice:invoiceId,limit:100}),
  ]);
  if(!qualifyingAnnualInvoice(invoice,subscription,lines.data))
    return {ok:false,reason:'Stripe ei vahvista kelvollista maksettua vuositilausta.'};
  const credited=(notes?.data||[]).some(note=>note.status!=='void' && Number(note.amount||0)>0);
  if(credited)return {ok:false,reason:'Laskulla on hyvityslasku. Selvitä provisio manuaalisesti ennen hyväksyntää.'};
  // Card refunds outside Stripe credit notes may still need a manual check.
  return {ok:true};
}
export async function ensureSalesPartnerSchema(db){
  if(!PREPARATION||!db)return;
  await db.query('CREATE SCHEMA IF NOT EXISTS respondo_sales');
  await db.query("CREATE TABLE IF NOT EXISTS respondo_sales.partners(id UUID PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL, code TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','suspended')), password_hash TEXT, invite_digest TEXT, invite_expires TIMESTAMPTZ, agreement_accepted_at TIMESTAMPTZ, agreement_version TEXT, session_version INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_partner_email ON respondo_sales.partners(lower(email))');
  await db.query("CREATE TABLE IF NOT EXISTS respondo_sales.attributions(id UUID PRIMARY KEY, partner_id UUID NOT NULL REFERENCES respondo_sales.partners(id), checkout_session_id TEXT NOT NULL UNIQUE, user_id UUID NOT NULL, tenant_id UUID NOT NULL, subscription_id TEXT UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await db.query("CREATE TABLE IF NOT EXISTS respondo_sales.commissions(id UUID PRIMARY KEY, partner_id UUID NOT NULL REFERENCES respondo_sales.partners(id), attribution_id UUID NOT NULL REFERENCES respondo_sales.attributions(id), subscription_id TEXT NOT NULL UNIQUE, stripe_invoice_id TEXT NOT NULL UNIQUE, amount_cents INTEGER NOT NULL DEFAULT 5000 CHECK(amount_cents=5000), status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','approved','rejected','paid')), paid_invoice_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, paid_at TIMESTAMPTZ, reviewed_by TEXT, invoice_reference TEXT, review_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await db.query("CREATE TABLE IF NOT EXISTS respondo_sales.leads(id UUID PRIMARY KEY, partner_id UUID NOT NULL REFERENCES respondo_sales.partners(id), company TEXT NOT NULL, website TEXT, stage TEXT NOT NULL DEFAULT 'prospect' CHECK(stage IN ('prospect','contacted','interested','declined')), opt_out BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '180 days'))");
  await db.query("CREATE TABLE IF NOT EXISTS respondo_sales.audit(id UUID PRIMARY KEY, partner_id UUID REFERENCES respondo_sales.partners(id), actor TEXT NOT NULL, action TEXT NOT NULL, details TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  for(const t of ['partners','attributions','commissions','leads','audit']){
    await db.query('ALTER TABLE respondo_sales.'+t+' ENABLE ROW LEVEL SECURITY');
  }
  // The private schema is not exposed by the Supabase Data API. Only the
  // backend PostgreSQL connection accesses it; do not add public policies.
  await db.query('REVOKE ALL ON SCHEMA respondo_sales FROM PUBLIC');
  for(const t of ['partners','attributions','commissions','leads','audit']){
    await db.query('REVOKE ALL ON TABLE respondo_sales.'+t+' FROM PUBLIC');
  }
  await db.query('CREATE INDEX IF NOT EXISTS ix_sales_attribution_partner ON respondo_sales.attributions(partner_id,created_at DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS ix_sales_commission_partner ON respondo_sales.commissions(partner_id,created_at DESC)');
  await db.query('DELETE FROM respondo_sales.leads WHERE expires_at<NOW()');
}
export function installSalesPartnerRoutes(app,{db,customerAuth,ownerOnly,secret,base,stripe}){
  app.get('/api/sales/program-status',(req,res)=>res.set('Cache-Control','no-store').json({open:Boolean(db)&&ACTIVE,agreementVersion:CONTRACT}));
  if(!db)return;
  // No referral-tracking cookie is set on page views. The customer must opt in.
  app.post('/api/sales/consent',unavailable,originGuard,limiter,guarded(async(req,res)=>{
    const code=String(req.body?.partner||'').trim().toUpperCase();
    if(!isCode(code) || req.body?.consent!==true)
      return res.status(422).json({error:'Virheellinen linkki tai suostumus puuttuu.'});
    const result=await db.query("SELECT id FROM respondo_sales.partners WHERE code=$1 AND status='active' AND agreement_accepted_at IS NOT NULL LIMIT 1",[code]);
    if(!result.rowCount)return res.status(404).json({error:'Kumppanilinkki ei ole enää voimassa.'});
    const issued=String(Math.floor(Date.now()/1000));
    const proof=code+'.'+issued+'.'+hmac(secret,code+'.'+issued);
    res.cookie(COOKIE,proof,{...cookieOptions,maxAge:30*24*60*60*1000});
    res.set('Cache-Control','no-store').json({ok:true,expiresDays:30});
  }));
  const admin=[prepUnavailable,customerAuth,ownerOnly,originGuard];
  const activeAdmin=[unavailable,customerAuth,ownerOnly,originGuard];
  // Wrapper permits the same partner verification to protect all read/write routes.
  const withPartner=(fn)=>[unavailable,originGuard,async(req,res,next)=>{
    const token=getCookie(req,SESSION_COOKIE);
    let payload;
    try{payload=jwt.verify(token,secret,{algorithms:['HS256']});}catch{return res.status(401).json({error:'Kirjaudu kumppanitilille.'});}
    if(payload?.type!=='sales-partner')return res.status(401).json({error:'Kirjaudu kumppanitilille.'});
    try{
      const rr=await db.query("SELECT id,full_name,email,code,status,session_version,agreement_accepted_at FROM respondo_sales.partners WHERE id=$1",[payload.sub]);
      const p=rr.rows[0];
      if(!p||p.status!=='active'||!p.agreement_accepted_at||Number(p.session_version)!==Number(payload.sv))return res.status(401).json({error:'Istunto on vanhentunut.'});
      req.salesPartner=p;next();
    }catch{return res.status(503).json({error:'Kumppanitili ei ole saatavilla.'});}
  },guarded(fn)];
  app.post('/api/sales/activate',unavailable,originGuard,limiter,guarded(async(req,res)=>{
    const token=String(req.body?.token||''), personEmail=email(req.body?.email),password=req.body?.password;
    if(!/^[a-f0-9]{64}$/.test(token)||!validPassword(password)||!personEmail)
      return res.status(422).json({error:'Tarkista kutsu, sähköposti ja vahva salasana.'});
    if(req.body?.acceptAgreement!==true||req.body?.agreementVersion!==CONTRACT)
      return res.status(422).json({error:'Hyväksy voimassa olevat sopimusehdot.'});
    const found=await db.query("SELECT id FROM respondo_sales.partners WHERE lower(email)=$1 AND invite_digest=$2 AND invite_expires>NOW() AND status='invited'",[personEmail,digest(token)]);
    if(!found.rowCount)return res.status(403).json({error:'Kutsu ei ole voimassa.'});
    const hash=await bcrypt.hash(password,12);
    const updated=await db.query("UPDATE respondo_sales.partners SET password_hash=$2, status='active', invite_digest=NULL, invite_expires=NULL, agreement_accepted_at=NOW(), agreement_version=$3, session_version=session_version+1 WHERE id=$1 AND invite_digest=$4 AND status='invited' RETURNING id",[found.rows[0].id,hash,CONTRACT,digest(token)]);
    if(!updated.rowCount)return res.status(409).json({error:'Kutsu ei ole enää voimassa.'});
    res.json({ok:true});
  }));
  app.post('/api/sales/login',unavailable,originGuard,limiter,guarded(async(req,res)=>{
    const suppliedPassword=String(req.body?.password||'');
    if(suppliedPassword.length>128)return res.status(401).json({error:'Virheellinen kirjautuminen.'});
    const rr=await db.query("SELECT id,full_name,email,password_hash,status,session_version,agreement_accepted_at FROM respondo_sales.partners WHERE lower(email)=$1",[email(req.body?.email)]);
    const p=rr.rows[0];
    // Constant-work fallback to reduce timing leakage when account doesn't exist.
    const ok=await bcrypt.compare(suppliedPassword,p?.password_hash||'$2b$12$QYLsI5Ce2SVR7hK03iQ6DO/9YB3qayI8Kofn8qF.22rT7I0jPf6da');
    if(!p||!ok||p.status!=='active'||!p.agreement_accepted_at)return res.status(401).json({error:'Virheellinen kirjautuminen.'});
    res.cookie(SESSION_COOKIE,jwt.sign({type:'sales-partner',sub:p.id,sv:p.session_version},secret,{algorithm:'HS256',expiresIn:'7d'}),{...cookieOptions,maxAge:7*86400*1000});
    res.json({ok:true});
  }));
  app.post('/api/sales/logout',unavailable,originGuard,(req,res)=>{res.clearCookie(SESSION_COOKIE,cookieOptions);res.json({ok:true});});
  app.get('/api/sales/me',...withPartner(async(req,res)=>{
    const p=req.salesPartner;
    const totals=await db.query("SELECT status,COUNT(*)::integer AS count,COALESCE(SUM(amount_cents),0)::integer AS cents FROM respondo_sales.commissions WHERE partner_id=$1 GROUP BY status",[p.id]);
    res.set('Cache-Control','private,no-store');
    res.json({name:p.full_name,code:p.code,link:base+'/sales-referral.html?partner='+encodeURIComponent(p.code),commissions:totals.rows});
  }));
  app.get('/api/sales/leads',...withPartner(async(req,res)=>{
    const r=await db.query("SELECT id,company,website,stage,opt_out,created_at FROM respondo_sales.leads WHERE partner_id=$1 AND expires_at>NOW() ORDER BY created_at DESC LIMIT 200",[req.salesPartner.id]);
    res.set('Cache-Control','private,no-store');res.json({items:r.rows});
  }));
  app.post('/api/sales/leads',limiter,...withPartner(async(req,res)=>{
    const company=clean(req.body?.company,120), website=clean(req.body?.website,300);
    if(company.length<2|| (website&&!/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(website)))return res.status(422).json({error:'Tarkista yritys ja HTTPS-verkkosivu.'});
    const r=await db.query("INSERT INTO respondo_sales.leads(id,partner_id,company,website) VALUES($1,$2,$3,$4) RETURNING id",[newId(),req.salesPartner.id,company,website||null]);
    res.status(201).json({id:r.rows[0].id});
  }));
  app.patch('/api/sales/leads/:id',...withPartner(async(req,res)=>{
    const stage=clean(req.body?.stage,30);
    if(!['prospect','contacted','interested','declined'].includes(stage))return res.status(422).json({error:'Virheellinen tila.'});
    const rr=await db.query("UPDATE respondo_sales.leads SET stage=$3,opt_out=CASE WHEN $3='declined' THEN TRUE ELSE opt_out END WHERE id=$1 AND partner_id=$2 AND opt_out=FALSE RETURNING id",[req.params.id,req.salesPartner.id,stage]);
    return rr.rowCount?res.json({ok:true}):res.status(404).json({error:'Ei löydy.'});
  }));
  app.delete('/api/sales/leads/:id',...withPartner(async(req,res)=>{
    await db.query('DELETE FROM respondo_sales.leads WHERE id=$1 AND partner_id=$2',[req.params.id,req.salesPartner.id]);
    res.json({ok:true});
  }));
  app.get('/api/sales/commissions',...withPartner(async(req,res)=>{
    const r=await db.query("SELECT status,amount_cents,created_at,paid_at,review_note FROM respondo_sales.commissions WHERE partner_id=$1 ORDER BY created_at DESC LIMIT 100",[req.salesPartner.id]);
    res.set('Cache-Control','private,no-store');res.json({items:r.rows});
  }));
  app.get('/api/app/sales-partners',...admin,guarded(async(req,res)=>{
    const p=await db.query("SELECT p.id,p.full_name,p.email,p.code,p.status,p.agreement_accepted_at,COUNT(c.id)::integer AS sales,COALESCE(SUM(c.amount_cents),0)::integer AS total_cents FROM respondo_sales.partners p LEFT JOIN respondo_sales.commissions c ON c.partner_id=p.id GROUP BY p.id ORDER BY p.created_at DESC LIMIT 200");
    const c=await db.query("SELECT c.id,c.status,c.amount_cents,c.stripe_invoice_id,c.subscription_id,c.invoice_reference,c.created_at,p.full_name FROM respondo_sales.commissions c JOIN respondo_sales.partners p ON p.id=c.partner_id ORDER BY c.created_at DESC LIMIT 200");
    res.set('Cache-Control','private,no-store');res.json({partners:p.rows,commissions:c.rows});
  }));
  app.post('/api/app/sales-partners',limiter,...activeAdmin,guarded(async(req,res)=>{
    const name=clean(req.body?.name,120),mail=email(req.body?.email);
    if(name.length<2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail))return res.status(422).json({error:'Tarkista nimi ja sähköposti.'});
    const code='SP-'+crypto.randomBytes(5).toString('hex').toUpperCase();
    const token=crypto.randomBytes(32).toString('hex');
    const id=newId();
    const result=await db.query("INSERT INTO respondo_sales.partners(id,full_name,email,code,invite_digest,invite_expires) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '7 days') RETURNING id",
      [id,name,mail,code,digest(token)]);
    res.status(201).set('Cache-Control','no-store').json({id:result.rows[0].id,code,inviteLink:base+'/sales-partner.html#invite='+token,inviteEmail:mail,agreementVersion:CONTRACT});
  }));
  app.post('/api/app/sales-partners/:id/status',...activeAdmin,guarded(async(req,res)=>{
    const status=req.body?.status;
    if(status!=='suspended')return res.status(422).json({error:'Vain keskeyttäminen on sallittu.'});
    const rr=await db.query("UPDATE respondo_sales.partners SET status='suspended',session_version=session_version+1 WHERE id=$1 AND status<>'suspended' RETURNING id",[req.params.id]);
    return rr.rowCount?res.json({ok:true}):res.status(404).json({error:'Ei löydy.'});
  }));
  app.post('/api/app/sales-partners/commissions/:id/review',...activeAdmin,guarded(async(req,res)=>{
    const action=req.body?.action,note=clean(req.body?.note,400);
    if(!['approve','reject','paid'].includes(action))return res.status(422).json({error:'Virheellinen toiminto.'});
    if(action==='approve'&&req.body?.refundChecked!==true)return res.status(422).json({error:'Vahvista, että maksu ja hyvitykset on tarkistettu Stripestä.'});
    if(action==='reject'&&note.length<5)return res.status(422).json({error:'Kirjaa hylkäyksen syy.'});
    const reference=clean(req.body?.invoiceReference,120);
    if(action==='paid' && reference.length<3)return res.status(422).json({error:'Kirjaa maksettu lasku.'});
    if(action==='approve'){
      const current=await db.query("SELECT stripe_invoice_id,subscription_id,status FROM respondo_sales.commissions WHERE id=$1 LIMIT 1",[req.params.id]);
      if(!current.rowCount||current.rows[0].status!=='pending_review')
        return res.status(409).json({error:'Provisio ei ole tarkistettavissa.'});
      const check=await verifyCommissionBeforeApproval(stripe,current.rows[0].stripe_invoice_id,current.rows[0].subscription_id);
      if(!check.ok)return res.status(409).json({error:check.reason});
    }
    const before=action==='paid'?'approved':'pending_review',after=action==='approve'?'approved':action==='reject'?'rejected':'paid';
    const client=await db.connect();
    try{
      await client.query('BEGIN');
      const actor=email(req.user?.email||process.env.OWNER_EMAIL);
      const rr=await client.query("UPDATE respondo_sales.commissions SET status=$2,reviewed_at=NOW(),reviewed_by=$3,review_note=$4,invoice_reference=CASE WHEN $2='paid' THEN $5 ELSE invoice_reference END,paid_at=CASE WHEN $2='paid' THEN NOW() ELSE paid_at END WHERE id=$1 AND status=$6 RETURNING id,partner_id",
        [req.params.id,after,actor,note||null,reference||null,before]);
      if(!rr.rowCount){
        await client.query('ROLLBACK');
        return res.status(409).json({error:'Tila muuttui tai provisiota ei löytynyt.'});
      }
      await client.query("INSERT INTO respondo_sales.audit(id,partner_id,actor,action,details) VALUES($1,$2,$3,$4,$5)",
        [newId(),rr.rows[0].partner_id,actor,'commission_'+after,'commission:'+rr.rows[0].id+';invoice:'+reference]);
      await client.query('COMMIT');
      return res.json({ok:true,status:after});
    }catch(error){
      try{await client.query('ROLLBACK');}catch{}
      throw error;
    }finally{client.release();}
  }));
}
