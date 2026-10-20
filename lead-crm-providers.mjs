import { deliverQualifiedLead } from './lead-crm.mjs';

// Provider tokens are server-only. Configure each tenant using the deployment
// secret store, not a browser-supplied token or URL.
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
  const token=config.token||process.env['RESPONDO_CRM_'+key+'_TOKEN'];
  if(!token)throw Error('CRM provider token missing');
  const contact=event.contact||{};
  let url,payload;
  if(provider==='hubspot'){
    if(!contact.email)throw Error('HubSpot requires a valid email for idempotent upsert');
    url='https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert';
    payload={properties:{email:contact.email||'',firstname:contact.name||'',phone:contact.phone||'',
      respondo_lead_id:event.leadId}};
    // HubSpot custom properties must be created separately; use standard
    // fields only until the customer's schema is provisioned.
    delete payload.properties.respondo_lead_id;
    payload={inputs:[{id:contact.email,idProperty:'email',properties:payload.properties}]};
  } else if(provider==='pipedrive'){
    const personPayload={name:contact.name||'Respondo contact'};
    if(contact.email)personPayload.email=contact.email;
    if(contact.phone)personPayload.phone=contact.phone;
    const personResponse=await fetchImpl('https://api.pipedrive.com/v1/persons',{
      method:'POST',redirect:'error',headers:{'content-type':'application/json',authorization:'Bearer '+token},
      body:JSON.stringify(personPayload),signal:AbortSignal.timeout(8000)
    });
    if(!personResponse.ok)throw Error('Pipedrive person API HTTP '+personResponse.status);
    const person=await personResponse.json();
    const personId=person?.data?.id;
    if(!personId)throw Error('Pipedrive did not return a person ID');
    url='https://api.pipedrive.com/v1/leads';
    payload={title:'Respondo lead '+event.leadId,person_id:personId};
  } else throw Error('Unsupported CRM provider');
  const response=await fetchImpl(url,{
    method:'POST',redirect:'error',headers:{'content-type':'application/json',authorization:'Bearer '+token},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error(provider+' API HTTP '+response.status);
  return {status:'delivered'};
}
