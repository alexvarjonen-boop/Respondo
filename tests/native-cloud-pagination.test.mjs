import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProviderRead} from '../native-provider-adapters.mjs';
const token='fake-test-cloud-oauth-token';
test('Google Drive list uses valid API query and safe provider pagination',()=>{
 const first=buildProviderRead({provider:'google_drive',token,limit:40});
 const u=new URL(first.url);
 assert.equal(u.hostname,'www.googleapis.com');
 assert.equal(u.searchParams.get('pageSize'),'40');
 assert.match(u.searchParams.get('fields'),/mimeType,size,trashed/);
 assert.equal(u.searchParams.get('q'),'trashed = false');
 const next=buildProviderRead({provider:'google_drive',token,limit:40,cursor:'page_2='});
 assert.equal(new URL(next.url).searchParams.get('pageToken'),'page_2=');
 assert.throws(()=>buildProviderRead({provider:'google_drive',token,cursor:'https://evil.example'}),/invalid_cloud_cursor/);
});
test('SharePoint continuation stays bound to the selected site and Microsoft Graph',()=>{
 const site='example.sharepoint.com,abc,def';
 const first=buildProviderRead({provider:'sharepoint',token,resourceId:site,limit:40});
 const url=new URL(first.url);
 const next=new URL(first.url);
 next.searchParams.set('$skiptoken','ABC==');
 const accepted=buildProviderRead({provider:'sharepoint',token,resourceId:site,cursor:next.toString()});
 assert.equal(accepted.url,next.toString());
 for(const cursor of [
  'https://evil.example/v1.0/sites/'+encodeURIComponent(site)+'/drive/root/children',
  'https://graph.microsoft.com/v1.0/sites/other-site/drive/root/children',
  'http://graph.microsoft.com'+url.pathname,
  'https://graph.microsoft.com'+url.pathname+'#fragment'
 ])assert.throws(()=>buildProviderRead({provider:'sharepoint',token,resourceId:site,cursor}),/invalid_cloud_cursor/);
});
