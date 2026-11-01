import crypto from 'node:crypto';

// Owner-issued customer workspaces are complimentary until a separate paid
// subscription is explicitly arranged. No Stripe customer or subscription.
export const COMPLIMENTARY_ENTERPRISE_PLAN = 'business_monthly';

export function validateManagedAccountInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error:'Virheelliset yritystiedot.' };
  const name=String(input.name||'').trim().replace(/\s+/g,' ');
  const businessId=String(input.businessId||'').trim();
  const industry=String(input.industry||'Palveluyritys').trim();
  const language=String(input.language||'fi').trim().toLowerCase();
  if(name.length<2||name.length>120||/[<>\x00-\x1f]/.test(name))
    return { error:'Anna yrityksen nimi (2–120 merkkiä).' };
  if(businessId.length>40||/[<>\x00-\x1f]/.test(businessId))
    return { error:'Tarkista Y-tunnus.' };
  if(!industry||industry.length>80||/[<>\x00-\x1f]/.test(industry))
    return { error:'Tarkista toimiala.' };
  if(!['fi','sv','en'].includes(language)) return { error:'Virheellinen kielivalinta.' };
  const inputUrl=String(input.website||'').trim();
  let website=null;
  if(inputUrl) {
    try {
      const u=new URL(/^https?:\/\//i.test(inputUrl)?inputUrl:'https://'+inputUrl);
      const host=u.hostname.toLowerCase();
      if(u.protocol!=='https:'||u.username||u.password||u.port||
        !host.includes('.')||host.endsWith('.')||
        /(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/.test(host)||
        /^\d+\.\d+\.\d+\.\d+$/.test(host)||
        !/^[a-z0-9.-]+$/i.test(host)) throw new Error('invalid website');
      u.hash='';u.search='';
      website=u.toString();
    } catch {
      return { error:'Anna julkinen HTTPS-verkkosivusto (esimerkiksi yritys.fi).' };
    }
    if(website.length>500) return { error:'Verkkosivuston osoite on liian pitkä.' };
  }
  return { name,businessId:businessId||null,industry,language,website };
}

export function createManagedCredentials() {
  return {
    loginCode:'RSP-'+crypto.randomBytes(6).toString('hex').toUpperCase(),
    // Include each password-policy character class explicitly.
    temporaryPassword:'Ma9!'+crypto.randomBytes(20).toString('base64url'),
  };
}

export function managedPlaceholderEmail(userId) {
  if(!/^[a-f0-9-]{36}$/i.test(String(userId||''))) throw new Error('Invalid user id');
  // Application schema requires an email, but customers are NOT asked for one.
  // .invalid never receives mail and the customer can add a real email later.
  return 'managed-'+userId.replaceAll('-','')+'@accounts.respondoai.invalid';
}
