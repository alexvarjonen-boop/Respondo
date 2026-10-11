import test from 'node:test';
import assert from 'node:assert/strict';
import {isGoogleSitesWebsite,googleSitesIframeHost,widgetOriginAllowed} from '../server.mjs';

const website='https://sites.google.com/view/viheri';
const origin='https://1457130292-atari-embeds.googleusercontent.com';
const tenant={website,slug:'viheri',google_sites_embed_host:'1457130292-atari-embeds.googleusercontent.com'};
const req=(value)=>({headers:{origin:value}});

test('recognizes published Google Sites URLs',()=>{
  assert.equal(isGoogleSitesWebsite(website),true);
  assert.equal(isGoogleSitesWebsite('https://sites.google.com/'),false);
  assert.equal(isGoogleSitesWebsite('https://example.org/viheri'),false);
});
test('recognizes Google Sites embedded content address',()=>{
  assert.equal(googleSitesIframeHost(origin),tenant.google_sites_embed_host);
  assert.equal(googleSitesIframeHost('https://googleusercontent.com'),'');
});
test('approves only the specific owner-selected embedded content address',()=>{
  assert.equal(widgetOriginAllowed(req(origin),tenant),true);
  assert.equal(widgetOriginAllowed(req('https://other-atari-embeds.googleusercontent.com'),tenant),false);
  assert.equal(widgetOriginAllowed(req(origin),{...tenant,google_sites_embed_host:''}),false);
  assert.equal(widgetOriginAllowed(req(origin),{...tenant,website:'https://store.example.fi'}),false);
});
test('existing ordinary website embedding remains supported',()=>{
  const shop={slug:'shop',website:'https://store.example.fi'};
  assert.equal(widgetOriginAllowed(req('https://store.example.fi'),shop),true);
  assert.equal(widgetOriginAllowed(req(origin),shop),false);
});
test('Google Sites dashboard generates and embeds a tenant-specific installation key',async()=>{
  const {readFile}=await import('node:fs/promises');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const widget=await readFile(new URL('../public/widget.js',import.meta.url),'utf8');
  assert.match(app,/createGoogleSitesKey/);
  assert.match(app,/google_sites_install_key/);
  assert.match(app,/data-sites-key/);
  assert.match(widget,/googleSitesKey/);
  assert.match(widget,/sitesKey=/);
  assert.match(widget,/googleFrame=/);
});
