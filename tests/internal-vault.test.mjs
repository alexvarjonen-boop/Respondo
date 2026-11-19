import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { installInternalVaultRoutes, vaultPermission, normalizeVaultName, safeVaultFilename, VAULT_CATEGORIES } from '../internal-vault.mjs';

test('only the owner role can access the internal vault', () => {
  for (const role of ['',null,'agent','customer','viewer','editor','admin']) {
    assert.equal(vaultPermission(role,'read'),false);
    assert.equal(vaultPermission(role,'write'),false);
  }
  assert.equal(vaultPermission('owner','read'),true);
  assert.equal(vaultPermission('owner','write'),true);
  assert.equal(vaultPermission('owner','admin'),true);
  assert.equal(vaultPermission('owner','read','restricted'),true);
  assert.equal(vaultPermission('owner','members'),false);
});

test('file uploads allow only known document extensions and sanitized names', () => {
  assert.ok(VAULT_CATEGORIES.includes('Sopimukset'));
  assert.equal(safeVaultFilename('contract.v1.pdf'),'contract.v1.pdf');
  assert.equal(safeVaultFilename('../../report.pdf'), 'report.pdf');
  assert.throws(()=>safeVaultFilename('malicious.html'),/Tiedostotyyppi/);
  assert.throws(()=>safeVaultFilename('app.exe'),/Tiedostotyyppi/);
  assert.throws(()=>normalizeVaultName(''),/Tarkista nimi/);
  assert.equal(normalizeVaultName('Valid\nName'),'Valid Name');
});

async function withServer(person, run, doc = null) {
  const app=express();app.use(express.json());
  const queries=[];
  const q=async(sql,params=[])=>{
    queries.push({sql,params});
    if(sql.startsWith('SELECT id,email,status FROM public.users')) return {rowCount:person?1:0,rows:person?[person]:[]};
    if(sql.startsWith('SELECT * FROM respondo_internal.vault_documents')) return {rowCount:doc?1:0,rows:doc?[doc]:[]};
    if(sql.includes('SELECT COUNT(*)::int AS documents')) return {rowCount:1,rows:[{documents:0,files:0,bytes:0}]};
    if(sql.includes('FROM respondo_internal.vault_documents d')) return {rowCount:0,rows:[]};
    if(sql.includes('FROM respondo_internal.vault_versions')) return {rowCount:0,rows:[]};
    if(sql.startsWith('INSERT INTO respondo_internal.vault_audit')) return {rowCount:1,rows:[]};
    return {rowCount:0,rows:[]};
  };
  installInternalVaultRoutes(app,{auth:(req,_res,next)=>{req.user={sub:'8f8f8f8f-3333-4333-8333-444444444444'};next();},q,pool:{connect:async()=>({query:q,release(){}})},ownerEmail:()=> 'owner@respondoai.fi',privateDir:'/nonexistent'});
  const srv=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});
  try {await run('http://127.0.0.1:'+srv.address().port,queries);} finally {await new Promise(resolve=>srv.close(resolve));}
}

test('unauthorized users cannot list records or fetch the private page',async()=>{
  const user={id:'8f8f8f8f-3333-4333-8333-444444444444',email:'customer@example.com',status:'active'};
  await withServer(user,async(base)=>{
    const list=await fetch(base+'/api/app/internal-vault/documents');
    assert.equal(list.status,403);
    const html=await fetch(base+'/arkisto');
    assert.equal(html.status,403);
  });
});

test('another active user cannot view even ordinary documents or change records',async()=>{
  const user={id:'8f8f8f8f-3333-4333-8333-444444444444',email:'staff@respondoai.fi',status:'active'};
  const doc={id:'9f8f8f8f-3333-4333-8333-444444444444',classification:'restricted',current_version:1};
  await withServer(user,async(base)=>{
    const root='/api/app/internal-vault';
    assert.equal((await fetch(base+root+'/documents/'+doc.id)).status,403);
    assert.equal((await fetch(base+root+'/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Forbidden'})})).status,403);
    assert.equal((await fetch(base+root+'/documents')).status,403);
    assert.equal((await fetch(base+root+'/companies')).status,403);
  },doc);
});

test('owner has access only when the account email matches configured owner',async()=>{
  const user={id:'8f8f8f8f-3333-4333-8333-444444444444',email:'owner@respondoai.fi',status:'active'};
  await withServer(user,async(base)=>{
    const session=await fetch(base+'/api/app/internal-vault/session');
    assert.equal(session.status,200);
    assert.equal((await session.json()).role,'owner');
    assert.equal((await fetch(base+'/api/app/internal-vault/members')).status,404);
  });
});

test('Visitors shows the archive card only after the owner traffic endpoint succeeds',async()=>{
  const html=await readFile(new URL('../public/traffic.html',import.meta.url),'utf8');
  assert.match(html,/fetch\('\/api\/owner\/traffic'/);
  const accessCheck=html.indexOf('if(!r.ok) throw new Error(d.error');
  const render=html.indexOf("root.innerHTML='<section class=\"traffic-view\" id=\"trafficStatsView\"");
  assert.ok(accessCheck>0 && render>accessCheck);
  assert.ok(html.slice(render,render+470).includes('vaultEntry()'));
  assert.match(html,/href=\"\/arkisto\"/);
  assert.doesNotMatch(html,/data-traffic-view=\"archive\"/);
});

test('private archive UI includes the polished layout and working category navigation',async()=>{
  const html=await readFile(new URL('../private/vault.html',import.meta.url),'utf8');
  const js=await readFile(new URL('../public/vault.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../public/vault-premium.css',import.meta.url),'utf8');
  assert.match(html,/href="\/vault-premium\.css\?v=/);
  assert.match(html,/id="categoryNav"/);
  assert.match(html,/id="categoryFilter"/);
  assert.match(html,/id="newButton"/);
  assert.match(js,/state\.categories=Array\.isArray\(session\.categories\)/);
  assert.match(js,/filter\.replaceChildren\(all,\.\.\.state\.categories\.map/);
  assert.match(css,/@media \(max-width: 600px\)/);
});
