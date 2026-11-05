import crypto from 'node:crypto';
const s=v=>String(v??'');
const safeEventTime=(value,now=Date.now())=>{
 const raw=Number(value);if(!Number.isFinite(raw))return null;
 const ms=raw<1e11?raw*1000:raw;
 return Number.isSafeInteger(ms)&&ms>=1577836800000&&ms<=now+60000?ms:null;
};
export function verifyMetaSignature(rawBody,header,appSecret){
 if(!Buffer.isBuffer(rawBody)||rawBody.length>1024*1024||rawBody.length===0||
   typeof appSecret!=='string'||appSecret.length<16||typeof header!=='string')return false;
 if(!/^sha256=[a-f0-9]{64}$/i.test(header))return false;
 const provided=Buffer.from(header.slice(7),'hex');
 const expected=crypto.createHmac('sha256',appSecret).update(rawBody).digest();
 return provided.length===expected.length&&crypto.timingSafeEqual(provided,expected);
}
export function extractMetaInbound(payload){
 const object=s(payload?.object);
 if(!['whatsapp_business_account','instagram','page'].includes(object))return [];
 const result=[];
 const entries=Array.isArray(payload?.entry)?payload.entry.slice(0,30):[];
 for(const entry of entries){
  if(object==='whatsapp_business_account'){
   for(const change of Array.isArray(entry?.changes)?entry.changes.slice(0,30):[]){
    const data=change?.value;
    const resourceId=s(data?.metadata?.phone_number_id);
    if(!/^[0-9]{5,25}$/.test(resourceId))continue;
    for(const message of Array.isArray(data?.messages)?data.messages.slice(0,40):[]){
     const id=s(message?.id),sender=s(message?.from),body=s(message?.text?.body).trim();
     if(message?.type!=='text'||!body||!id||!sender)continue;
     result.push({provider:'whatsapp',resourceId,externalMessageId:id,from:sender,
       body:body.slice(0,4000),providerTimestampMs:safeEventTime(message.timestamp)});
    }
   }
  }else{
   const provider=object==='instagram'?'instagram':'facebook';
   for(const event of Array.isArray(entry?.messaging)?entry.messaging.slice(0,40):[]){
    if(event?.message?.is_echo||!event?.message?.text)continue;
    const resourceId=s(event?.recipient?.id||entry.id);
    const sender=s(event?.sender?.id),id=s(event?.message?.mid),body=s(event?.message?.text).trim();
    if(!/^[0-9]{5,30}$/.test(resourceId)||!id||!sender||!body)continue;
    result.push({provider,resourceId,externalMessageId:id,from:sender,
      body:body.slice(0,4000),providerTimestampMs:safeEventTime(event.timestamp)});
   }
  }
  if(result.length>=150)break;
 }
 return result.slice(0,150);
}
