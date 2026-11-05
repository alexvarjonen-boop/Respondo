// First-party provider adapters. External provider APIs are data transport only; no external AI.
const hosts=Object.freeze({
 gmail:'https://gmail.googleapis.com',
 outlook:'https://graph.microsoft.com',
 hubspot:'https://api.hubapi.com',
 pipedrive:'https://api.pipedrive.com',
 google_drive:'https://www.googleapis.com',
 sharepoint:'https://graph.microsoft.com',
 whatsapp:'https://graph.facebook.com',
 instagram:'https://graph.facebook.com',
 facebook:'https://graph.facebook.com',
 shopify:null,
 woocommerce:null,
 freshdesk:null,
 zendesk:null
});
const strictId=(value)=>/^[a-zA-Z0-9._-]{1,180}$/.test(String(value||''))?String(value):null;
export function providerOrigin(provider,subdomain){
 if(!(provider in hosts))throw Error('unsupported_provider');
 if(hosts[provider])return hosts[provider];
 const sub=String(subdomain||'').trim().toLowerCase();
 const patterns={
  freshdesk:/^[a-z0-9][a-z0-9-]{0,61}\.freshdesk\.com$/,
  zendesk:/^[a-z0-9][a-z0-9-]{0,61}\.zendesk\.com$/,
  shopify:/^[a-z0-9][a-z0-9-]{0,61}\.myshopify\.com$/,
  woocommerce:/^[a-z0-9][a-z0-9-]{0,61}\.[a-z0-9.-]+\.[a-z]{2,}$/
 };
 if(!patterns[provider]?.test(sub)||sub.includes('..'))throw Error('invalid_provider_domain');
 // WooCommerce custom domains require DNS/public IP verification by caller.
 return 'https://'+sub;
}
export function buildProviderRead({provider,token,subdomain,resourceId,limit=20}){
 if(typeof token!=='string'||token.length<10||token.length>8192)throw Error('missing_access_token');
 if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw Error('invalid_limit');
 const base=providerOrigin(provider,subdomain);
 const id=resourceId==null?null:strictId(resourceId);
 if(resourceId!=null&&!id)throw Error('invalid_resource');
 let url,auth='Bearer '+token;
 switch(provider){
  case 'gmail':url=new URL('/gmail/v1/users/me/messages',base);url.searchParams.set('maxResults',String(limit));url.searchParams.set('q','in:inbox -in:spam -in:trash');break;
  case 'outlook':url=new URL('/v1.0/me/mailFolders/inbox/messages',base);url.searchParams.set('$top',String(limit));url.searchParams.set('$select','id,subject,from,receivedDateTime,bodyPreview');break;
  case 'hubspot':url=new URL('/crm/v3/objects/contacts',base);url.searchParams.set('limit',String(limit));url.searchParams.set('properties','email,firstname,lastname');break;
  case 'pipedrive':url=new URL('/api/v2/persons',base);url.searchParams.set('limit',String(limit));break;
  case 'freshdesk':url=new URL('/api/v2/tickets',base);url.searchParams.set('per_page',String(limit));auth='Basic '+Buffer.from(token+':X').toString('base64');break;
  case 'zendesk':url=new URL('/api/v2/tickets.json',base);url.searchParams.set('per_page',String(limit));break;
  case 'google_drive':url=new URL('/drive/v3/files',base);url.searchParams.set('page_size',String(limit));url.searchParams.set('fields','nextPageToken,files(id,name,mimeType,modifiedTime)');break;
  case 'sharepoint':url=new URL('/v1.0/me/drive/root/children',base);url.searchParams.set('$top',String(limit));break;
  case 'shopify':url=new URL('/admin/api/2026-10/orders.json',base);url.searchParams.set('limit',String(limit));url.searchParams.set('status','any');break;
  case 'woocommerce':url=new URL('/wp-json/wc/v3/orders',base);url.searchParams.set('per_page',String(limit));break;
  case 'whatsapp':case 'instagram':case 'facebook':
    if(!id)throw Error('resource_id_required');
    url=new URL('/v24.0/'+encodeURIComponent(id),base);
    url.searchParams.set('fields',provider==='whatsapp'?'id,display_phone_number,verified_name':'id,name');
    break;
  default:throw Error('unsupported_provider');
 }
 const headers={Accept:'application/json'};
 if(provider==='shopify')headers['X-Shopify-Access-Token']=token;
 else headers.Authorization=auth;
 return {url:url.toString(),headers};
}
export async function readProvider({provider,token,subdomain,resourceId,limit=20,fetcher=fetch}){
 const request=buildProviderRead({provider,token,subdomain,resourceId,limit});
 const response=await fetcher(request.url,{method:'GET',headers:request.headers,redirect:'error',signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw Error('provider_http_'+response.status);
 const size=Number(response.headers?.get?.('content-length')||0);
 if(size>2_000_000)throw Error('provider_payload_too_large');
 const raw=await response.text();
 if(raw.length>2_000_000)throw Error('provider_payload_too_large');
 return JSON.parse(raw);
}
export function normalizeProviderItems(provider,data){
 const list=provider==='gmail'?data?.messages:
  provider==='outlook'||provider==='sharepoint'?data?.value:
  provider==='hubspot'?data?.results:
  provider==='pipedrive'?data?.data:
  provider==='google_drive'?data?.files:
  provider==='shopify'?data?.orders:data;
 return (Array.isArray(list)?list:[]).slice(0,100).map(item=>({
  externalId:String(item.id??'').slice(0,180),
  title:String(item.subject??item.name??item.title??item.properties?.email??'').slice(0,300),
  snippet:String(item.bodyPreview??item.description_text??item.snippet??'').slice(0,2000),
  email:String(item.from?.emailAddress?.address??item.properties?.email??'').slice(0,254)
 })).filter(x=>x.externalId);
}
