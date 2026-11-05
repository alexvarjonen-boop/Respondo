// Respondo-owned cloud document adapters, no external AI.
// Read-only, bounded, approved text exports. No arbitrary URL fetching.
const id=/^[A-Za-z0-9._-]{1,180}$/;
const siteId=/^[A-Za-z0-9.,_-]{3,180}$/;
const allowedTypes=new Set(['text/plain','text/markdown','text/csv','application/vnd.google-apps.document']);
export function safeCloudDocumentDescriptor(provider,item){
 if(!['google_drive','sharepoint'].includes(provider)||!item||typeof item!=='object')return null;
 const fileId=String(item.id||'');
 const name=String(item.name||'').trim().slice(0,160);
 const mime=String(item.mimeType||item.file?.mimeType||'').toLowerCase();
 const size=Number(item.size??item.file?.size??0);
 if(!id.test(fileId)||!name||!allowedTypes.has(mime)||size>30000||
  (item.folder&&provider==='sharepoint')||item.trashed===true)return null;
 return {id:fileId,name,mimeType:mime,size:Number.isFinite(size)&&size>=0?size:null};
}
export function normalizeCloudFileList(provider,data){
 const items=provider==='google_drive'?data?.files:data?.value;
 if(!Array.isArray(items))throw Error('Invalid cloud list response');
 return items.slice(0,100).map(x=>safeCloudDocumentDescriptor(provider,x)).filter(Boolean);
}
function urlForDocument(provider,{fileId,site,exportType}){
 if(!id.test(fileId))throw TypeError('Invalid cloud file reference');
 if(provider==='google_drive'){
  const url=new URL('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+
    (exportType?'/export':''));
  if(exportType)url.searchParams.set('mimeType','text/plain');
  else url.searchParams.set('alt','media');
  return url.toString();
 }
 if(provider==='sharepoint'){
  if(!siteId.test(String(site||''))||String(site).includes('..'))throw TypeError('Invalid SharePoint site');
  return 'https://graph.microsoft.com/v1.0/sites/'+encodeURIComponent(site)+
   '/drive/items/'+encodeURIComponent(fileId);
 }
 throw TypeError('Unsupported cloud provider');
}
function safeDownloadHost(url){
 try{
  const u=new URL(url);
  const host=u.hostname.toLowerCase();
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.port&&
   (host.endsWith('.sharepoint.com')||host.endsWith('.sharepoint-df.com')||
    host.endsWith('.1drv.com'))&&u.toString().length<=5000;
 }catch{return false;}
}
async function boundedText(response){
 if(!response.ok)throw Error('Cloud document read denied');
 const length=Number(response.headers?.get?.('content-length')||0);
 if(length>30000)throw Error('Cloud document too large');
 const raw=await response.text();
 if(Buffer.byteLength(raw,'utf8')>30000)throw Error('Cloud document too large');
 if(/[\x00]/.test(raw))throw Error('Binary document rejected');
 return raw.replace(/\r\n/g,'\n').trim().slice(0,20000);
}
export async function readApprovedCloudText(provider,token,document,{site,fetcher=fetch}={}){
 if(typeof token!=='string'||token.length<10||!document||
  !safeCloudDocumentDescriptor(provider,document))throw TypeError('Invalid cloud document');
 const auth={Authorization:'Bearer '+token,Accept:'text/plain'};
 if(provider==='google_drive'){
  const url=urlForDocument(provider,{fileId:document.id,
   exportType:document.mimeType==='application/vnd.google-apps.document'});
  return boundedText(await fetcher(url,{method:'GET',headers:auth,redirect:'error',
   signal:AbortSignal.timeout(12000)}));
 }
 const meta=await fetcher(urlForDocument(provider,{fileId:document.id,site}),{
  method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!meta.ok)throw Error('SharePoint file metadata denied');
 const raw=await meta.text();
 if(raw.length>20000)throw Error('Cloud metadata too large');
 const details=JSON.parse(raw);
 const remote=safeCloudDocumentDescriptor(provider,details);
 if(!remote||remote.id!==document.id)throw Error('SharePoint file changed');
 const download=details['@microsoft.graph.downloadUrl'];
 if(!safeDownloadHost(download))throw Error('Unsafe SharePoint download URL');
 // Graph pre-authorized download URLs must not receive OAuth credentials.
 return boundedText(await fetcher(download,{method:'GET',redirect:'error',
  headers:{Accept:'text/plain'},signal:AbortSignal.timeout(12000)}));
}
