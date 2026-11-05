import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const backend=read('server.mjs');
const ui=read('public/integration-onboarding.js');

test('provider readiness is owner-only, no-store and never claims a tenant connected',()=>{
 const route=backend.indexOf("app.get('/api/app/integrations/readiness'");
 const next=backend.indexOf("app.get('/api/app/native/mail/status'",route);
 assert.ok(route>0&&next>route);
 const body=backend.slice(route,next);
 assert.match(body,/auth,ownerOnly,subscribed/);
 assert.match(body,/Cache-Control','private, no-store'/);
 assert.match(body,/MICROSOFT_CLIENT_ID/);
 assert.match(body,/META_APP_SECRET/);
 assert.match(body,/zendeskConfig\(process\.env,SEO_CANONICAL_ORIGIN\)/);
 assert.match(body,/prerequisites:/);
 assert.doesNotMatch(body,/clientSecret:|access_token:|refresh_token:|secretKey:/);
 assert.match(body,/meaning:'Provider configuration only/);
});

test('missing prerequisites block OAuth and report truthful reasons',()=>{
 assert.match(ui,/readiness:'\/api\/app\/integrations\/readiness'/);
 assert.match(ui,/prerequisites\.get\(item\.id\)===false/);
 assert.match(ui,/status\(item\)==='notConfigured'/);
 assert.match(ui,/\['gmail','outlook'\]\.includes\(item\.id\)/);
 assert.match(ui,/Respondo-ylläpidon täytyy määrittää/);
 assert.match(ui,/const link=el\('a','rs-integration-primary rs-integration-authorize'/);
});

test('saved credentials are not reported as proven working connections',()=>{
 for(const provider of ["'freshdesk'","'zendesk'"])assert.ok(ui.includes("next.set("+provider+",'partial')"));
 assert.match(ui,/next\.set\(account\.provider,'partial'\)/);
 assert.match(ui,/next\.set\(channel\.provider,'partial'\)/);
 assert.match(ui,/next\.set\(cloud\.provider,'partial'\)/);
 assert.match(ui,/next\.set\(result\.crm\.provider,'partial'\)/);
 assert.doesNotMatch(ui,/channel\.deliveryEnabled\?'connected'/);
});

test('connection actions fail closed while readiness endpoint is pending or unavailable',()=>{
 assert.match(ui,/let readinessLoaded=false/);
 assert.match(ui,/if\(!readinessLoaded \|\| !prerequisites\.has\(item\.id\)\)return 'unverified'/);
 assert.match(ui,/readinessLoaded=Boolean\(result\.readiness\?\.prerequisites/);
 assert.match(ui,/if\(\['restricted','notConfigured','unverified'\]\.includes\(status\(item\)\)\)/);
 assert.match(ui,/item && !\['restricted','notConfigured','unverified'\]\.includes\(status\(item\)\)/);
 assert.match(ui,/if\(s==='unverified'\)/);
});
test('saved browser connection hints are not proof of successful external operations',()=>{
 assert.match(ui,/calendar-sync-card\.connected[^\n]*return 'partial'/);
 assert.match(ui,/badge\.textContent\)\)return 'partial'/);
 assert.doesNotMatch(ui,/badge\.textContent\)\)return 'connected'/);
});
