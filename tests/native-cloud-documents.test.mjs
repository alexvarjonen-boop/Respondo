import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCloudFileList,readApprovedCloudText,safeCloudDocumentDescriptor}
 from '../native-cloud-documents.mjs';

const token='fake-oauth-token-for-tests';
const file={id:'doc123',name:'Service prices.txt',mimeType:'text/plain',size:128};
const reply=(body,contentType='text/plain')=>({
 ok:true,status:200,headers:{get:x=>x==='content-length'?String(Buffer.byteLength(body)):contentType},
 text:async()=>body
});
test('Google Drive only previews bounded approved types, never folders or PDFs',()=>{
 const data={files:[file,{id:'folder',name:'Folder',mimeType:'application/vnd.google-apps.folder'},
  {id:'pdf1',name:'Private.pdf',mimeType:'application/pdf'},
  {id:'large',name:'Large.txt',mimeType:'text/plain',size:999999},
  {id:'trash',name:'Deleted.txt',mimeType:'text/plain',trashed:true}]};
 assert.deepEqual(normalizeCloudFileList('google_drive',data),[file]);
});
test('Google Drive text and native Docs export use only Google HTTPS endpoints',async()=>{
 const urls=[];
 const fetcher=async(url,opts)=>{
  urls.push(url);
  assert.equal(new URL(url).host,'www.googleapis.com');
  assert.equal(opts.redirect,'error');
  return reply('Window cleaning 30 euros per large window.');
 };
 assert.match(await readApprovedCloudText('google_drive',token,file,{fetcher}),/Window cleaning/);
 await readApprovedCloudText('google_drive',token,{id:'gdoc1',name:'Policy',
   mimeType:'application/vnd.google-apps.document'},{fetcher});
 assert.match(urls[0],/alt=media/);
 assert.match(urls[1],/\/export\?mimeType=text%2Fplain/);
});
test('SharePoint does not transmit bearer tokens to the preauthorized download host',async()=>{
 const calls=[];
 const fetcher=async(url,opts)=>{
  calls.push({url,opts});
  if(calls.length===1)return reply(JSON.stringify({
   ...file,file:{mimeType:'text/plain'},
   '@microsoft.graph.downloadUrl':'https://contoso.sharepoint.com/sites/site/_layouts/15/download.aspx?x=1'
  }),'application/json');
  return reply('Verified company information with enough text.');
 };
 const result=await readApprovedCloudText('sharepoint',token,file,{site:'contoso.sharepoint.com,123,456',fetcher});
 assert.match(result,/Verified company/);
 assert.equal(new URL(calls[0].url).hostname,'graph.microsoft.com');
 assert.match(calls[0].opts.headers.Authorization,/Bearer/);
 assert.equal(calls[1].opts.headers.Authorization,undefined);
});
test('unsafe SharePoint redirect host and huge file are refused',async()=>{
 const bad=async()=>reply(JSON.stringify({
  ...file,file:{mimeType:'text/plain'},
  '@microsoft.graph.downloadUrl':'https://evil.example/steal'
 }));
 await assert.rejects(readApprovedCloudText('sharepoint',token,file,{site:'site123',fetcher:bad}),/Unsafe SharePoint/);
 await assert.rejects(readApprovedCloudText('google_drive',token,file,{
  fetcher:async()=>reply('a'.repeat(30001))}),/too large/);
});
test('rejects invalid document IDs, binary types and arbitrary domains',async()=>{
 assert.equal(safeCloudDocumentDescriptor('google_drive',{id:'../x',name:'text',mimeType:'text/plain'}),null);
 await assert.rejects(readApprovedCloudText('google_drive',token,{id:'pdf',name:'PDF',mimeType:'application/pdf'}),/Invalid cloud document/);
});
