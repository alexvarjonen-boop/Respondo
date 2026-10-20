import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { prepareCrmDelivery } from './lead-service.mjs';

// Optional server-side CRM delivery, disabled until an operator configures both
// an HTTPS endpoint and a 32+ character signing secret.
function privateIp(ip) {
  if (ip.includes(':')) {
    const x=ip.toLowerCase();
    return x==='::1' || x==='::' || x.startsWith('fc') || x.startsWith('fd') ||
      x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb') ||
      x.startsWith('::ffff:');
  }
  const parts=ip.split('.').map(Number);
  if(parts.length!==4 || parts.some(n=>!Number.isInteger(n)||n<0||n>255))return true;
  const [a,b]=parts;
  return a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) ||
    (a===172&&b>=16&&b<=31) || (a===192&&b===168) ||
    (a===100&&b>=64&&b<=127) || (a===192&&b===0) ||
    (a===198&&(b===18||b===19)) || (a===198&&b===51) ||
    (a===203&&b===0);
}
export async function validateCrmEndpoint(value, resolve=lookup) {
  let url;
  try { url=new URL(value); } catch { throw new TypeError('Invalid CRM endpoint URL'); }
  if(url.protocol!=='https:' || url.port || url.username || url.password ||
      url.hash || isIP(url.hostname) || !url.hostname.includes('.') ||
      url.hostname.endsWith('.local') || url.hostname.endsWith('.internal')) {
    throw new TypeError('CRM endpoint must be a public HTTPS hostname');
  }
  const addresses=await resolve(url.hostname,{all:true,verbatim:true});
  if(!Array.isArray(addresses)||!addresses.length||addresses.some(x=>privateIp(x.address)))
    throw new TypeError('CRM endpoint resolves to a non-public address');
  return url.toString();
}
export async function deliverQualifiedLead(event, {url,secret,fetchImpl=fetch,resolve=lookup}={}) {
  if(!url || !secret) return {status:'disabled'};
  const endpoint=await validateCrmEndpoint(url,resolve);
  const delivery=prepareCrmDelivery(event,secret);
  const response=await fetchImpl(endpoint,{
    method:'POST',redirect:'error',
    headers:{...delivery.headers,'x-respondo-event-id':event.leadId},
    body:delivery.body,signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw new Error('CRM delivery failed with HTTP '+response.status);
  return {status:'delivered'};
}
