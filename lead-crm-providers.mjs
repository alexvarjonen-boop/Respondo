import { deliverQualifiedLead } from './lead-crm.mjs';
import { readCrmCredential } from './crm-connectors.mjs';

// Tokens come from verified tenant-scoped, encrypted credentials. Legacy
// server-configured credentials remain as a fallback for existing accounts.
export async function deliverCrmProvider(tenantId,event,{pool,credentials,fetchImpl=fetch}={}) {
  const {getCrmProvider}=await import('./lead-crm-queue.mjs');
  const setting=await getCrmProvider(pool,tenantId);
  if(!setting.enabled)throw Error('CRM integration disabled');
  const key=String(tenantId).replace(/-/g,'_').toUpperCase();
  const config=credentials?.[tenantId]||{};
  const provider=setting.provider;
  if(provider==='webhook'){
    const url=config.url||process.env['RESPONDO_CRM_'+key+'_URL'];
    const secret=config.secret||process.env['RESPONDO_CRM_'+key+'_SECRET'];
    if(!url||!secret)throw Error('CRM webhook credentials missing');
    return deliverQualifiedLead(event,{url,secret,fetchImpl});
  }
  const tenantCredential=config.token?null:await readCrmCredential(pool,tenantId);
  const token=config.token||
    (tenantCredential?.provider===provider?tenantCredential.token:'')||
    process.env['RESPONDO_CRM_'+key+'_TOKEN'];
  if(!token)throw Error('CRM provider token missing');
  const contact=event.contact||{};
  let url,payload;
  if(provider==='hubspot'){
    url='https://api.hubapi.com/crm/v3/objects/contacts';
    payload={properties:{email:contact.email||'',firstname:contact.name||'',phone:contact.phone||'',
      respondo_lead_id:event.leadId}};
    // HubSpot custom properties must be created separately; use standard
    // fields only until the customer's schema is provisioned.
    delete payload.properties.respondo_lead_id;
  } else if(provider==='pipedrive'){
    const personPayload={name:contact.name||'Respondo contact'};
    if(contact.email)personPayload.emails=[{value:contact.email}];
    if(contact.phone)personPayload.phones=[{value:contact.phone}];
    const personResponse=await fetchImpl('https://api.pipedrive.com/api/v2/persons',{
      method:'POST',redirect:'error',headers:{'content-type':'application/json','x-api-token':token},
      body:JSON.stringify(personPayload),signal:AbortSignal.timeout(8000)
    });
    if(!personResponse.ok)throw Error('Pipedrive person API HTTP '+personResponse.status);
    const person=await personResponse.json();
    const personId=person?.data?.id;
    if(!personId)throw Error('Pipedrive did not return a person ID');
    url='https://api.pipedrive.com/api/v1/leads';
    payload={title:'Respondo lead '+event.leadId,person_id:personId};
  } else throw Error('Unsupported CRM provider');
  const sendHeaders={'content-type':'application/json'};
  if(provider==='hubspot')sendHeaders.authorization='Bearer '+token;
  else sendHeaders['x-api-token']=token;
  const response=await fetchImpl(url,{
    method:'POST',redirect:'error',headers:sendHeaders,
    body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error(provider+' API HTTP '+response.status);
  if(provider==='pipedrive') {
    const data=await response.json().catch(()=>null);
    if(!data?.success || !data?.data?.id) throw Error('Pipedrive lead creation not confirmed');
  }
  return {status:'delivered'};
}
