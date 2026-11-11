import crypto from 'node:crypto';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HOUR=3600000;
const mac=(data,secret)=>crypto.createHmac('sha256',secret).update('respondo-request-portal-v1.').update(data).digest('base64url');

// A 30-day bearer token grants access to request status only, never bookings, prices or payments.
export function createRequestTrackingToken({tenantId,requestId,secret,now=Date.now()}={}){
  if(!UUID.test(String(tenantId||''))||!UUID.test(String(requestId||''))||String(secret||'').length<32)
    throw new TypeError('Valid tenant, request and secret required');
  if(!Number.isSafeInteger(now)||now<0)throw new RangeError('Invalid timestamp');
  const data=Buffer.from(JSON.stringify({v:1,t:tenantId,r:requestId,e:now+30*24*HOUR,n:crypto.randomBytes(12).toString('base64url')})).toString('base64url');
  return data+'.'+mac(data,secret);
}
export function verifyRequestTrackingToken(token,secret,{now=Date.now()}={}){
  if(typeof token!=='string'||token.length>600||String(secret||'').length<32||!Number.isSafeInteger(now))return null;
  const parts=token.split('.');
  if(parts.length!==2||!parts.every(x=>/^[A-Za-z0-9_-]+$/.test(x)))return null;
  const [body,signature]=parts;
  const expected=Buffer.from(mac(body,secret));
  const supplied=Buffer.from(signature);
  if(expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied))return null;
  let payload;try{payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));}catch{return null;}
  if(payload?.v!==1||!UUID.test(String(payload.t||''))||!UUID.test(String(payload.r||''))||
    !Number.isSafeInteger(payload.e)||payload.e<now||payload.e>now+30*24*HOUR||
    typeof payload.n!=='string'||payload.n.length<12)return null;
  return {tenantId:payload.t,requestId:payload.r};
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderRequestStatusPage({token='',lang='en',type='quote',status='new',updated=false}={}){
  const L=['fi','sv','en'].includes(lang)?lang:'en',i=L==='fi'?0:L==='sv'?1:2;
  const txt=(fi,sv,en)=>[fi,sv,en][i];
  const label=type==='booking'?txt('Aikapyyntö','Tidsförfrågan','Appointment request'):type==='callback'?txt('Yhteydenotto','Kontaktförfrågan','Contact request'):txt('Tarjouspyyntö','Offertförfrågan','Quote request');
  const state=status==='done'?txt('Käsitelty','Behandlad','Processed'):status==='in_progress'?txt('Käsittelyssä','Under behandling','In progress'):txt('Vastaanotettu','Mottagen','Received');
  const open=status==='new'||status==='in_progress';
  const action='/request-status/'+encodeURIComponent(token)+'?lang='+L;
  const note=txt('Tämä näyttää vain pyynnön käsittelytilan. Käsitelty ei tarkoita vahvistettua hintaa, varausta tai maksua.',
    'Detta visar bara ärendets status. Behandlad betyder inte bekräftat pris, bokning eller betalning.',
    'This only shows request handling status. Processed does not mean a confirmed price, booking or payment.');
  const form=open?'<form method="post" action="'+escape(action)+'"><label for="note">'+txt('Lisätiedot','Tilläggsinformation','Additional information')+'</label><textarea name="note" id="note" minlength="2" maxlength="700" required></textarea><button type="submit">'+txt('Lähetä','Skicka','Submit')+'</button></form>':'';
  const update=updated?'<p class="success">'+txt('Lisätiedot vastaanotettu.','Tilläggsinformation mottagen.','Additional information received.')+'</p>':'';
  return '<!doctype html><html lang="'+L+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="robots" content="noindex,nofollow,noarchive"><title>'+escape(label)+' | Respondo AI</title>'+
    '<style>*{box-sizing:border-box}body{margin:0;background:#0b0d12;color:#f3f5fa;font:16px system-ui,-apple-system,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}main{width:min(100%,520px);padding:30px;border-radius:20px;background:#151922;border:1px solid #323b49}h1{font-size:30px;letter-spacing:-.04em}.brand{font-size:12px;letter-spacing:.13em;font-weight:800;color:#bbc4d3}p{color:#c7ccd5;line-height:1.6}.state{display:inline-block;background:#203d30;color:#b9f4d2;border-radius:30px;padding:8px 13px;font-weight:750}label{display:block;font-weight:700;margin-top:22px}textarea{width:100%;min-height:110px;margin-top:8px;border:1px solid #586173;border-radius:10px;background:#0b0d12;color:white;padding:12px;font:inherit;resize:vertical}button{margin-top:10px;background:#f2f4f8;border:0;border-radius:9px;color:#10141c;padding:12px 18px;font:inherit;font-weight:750;cursor:pointer}.success{color:#b9f4d2}.small{font-size:13px}</style></head>'+
    '<body><main><div class="brand">RESPONDO AI</div><h1>'+escape(label)+'</h1><div class="state">'+escape(state)+'</div><p>'+escape(note)+'</p>'+update+form+'<p class="small">'+escape(txt('Pidä tämä 30 päivää voimassa oleva linkki yksityisenä.','Håll denna länk, som gäller i högst 30 dagar, privat.','Keep this private link, valid for up to 30 days, secure.'))+'</p></main></body></html>';
}
