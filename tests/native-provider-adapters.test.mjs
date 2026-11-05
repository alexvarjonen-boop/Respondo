import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProviderRead,providerOrigin,normalizeProviderItems,readProvider} from '../native-provider-adapters.mjs';
const token='test-access-token-not-real';
test('Gmail uses inbox API and bearer token',()=>{
 const r=buildProviderRead({provider:'gmail',token});
 assert.match(r.url,/gmail\/v1\/users\/me\/messages/);assert.match(r.headers.Authorization,/^Bearer /);
});
test('Outlook reads limited fields from Graph',()=>{
 const r=buildProviderRead({provider:'outlook',token});
 assert.match(r.url,/graph.microsoft.com\/v1.0\/me\/mailFolders\/inbox\/messages/);
 assert.match(r.url,/bodyPreview/);
});
test('Pipedrive and HubSpot use fixed provider domains',()=>{
 assert.equal(new URL(buildProviderRead({provider:'pipedrive',token}).url).hostname,'api.pipedrive.com');
 assert.equal(new URL(buildProviderRead({provider:'hubspot',token}).url).hostname,'api.hubapi.com');
});
test('Freshdesk requires canonical subdomain and uses basic auth',()=>{
 assert.throws(()=>providerOrigin('freshdesk','localhost'),/invalid_provider_domain/);
 assert.throws(()=>providerOrigin('freshdesk','example.com'),/invalid_provider_domain/);
 const x=buildProviderRead({provider:'freshdesk',token,subdomain:'support.freshdesk.com'});
 assert.match(x.headers.Authorization,/^Basic /);
});
test('Shopify requires myshopify domain',()=>{
 assert.throws(()=>providerOrigin('shopify','127.0.0.1'),/invalid_provider_domain/);
 assert.equal(new URL(buildProviderRead({provider:'shopify',token,subdomain:'test.myshopify.com'}).url).hostname,'test.myshopify.com');
});
test('Meta requires explicit resource identifier',()=>{
 assert.throws(()=>buildProviderRead({provider:'whatsapp',token}),/resource_id_required/);
 assert.match(buildProviderRead({provider:'whatsapp',token,resourceId:'12345'}).url,/graph.facebook.com/);
});
test('WooCommerce needs validated HTTPS DNS domain',()=>{
 assert.throws(()=>providerOrigin('woocommerce','localhost'),/invalid_provider_domain/);
});
test('external provider redirects are forbidden and failures are fail-closed',async()=>{
 const fetcher=async (url,opts)=>{
  assert.equal(opts.redirect,'error');
  return {ok:false,status:403,headers:{get:()=>null},text:async()=>''};
 };
 await assert.rejects(readProvider({provider:'gmail',token,fetcher}),/provider_http_403/);
});
test('CRM contacts are normalized without exposing raw provider response',()=>{
 const out=normalizeProviderItems('hubspot',{results:[{id:'12',properties:{email:'person@example.com'}}]});
 assert.equal(out[0].email,'person@example.com');
 assert.equal(out[0].externalId,'12');
});
