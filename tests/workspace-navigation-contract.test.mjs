import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const workspace=read('public/workspace-continuation-v24.js');
const orbit=read('public/workspace-orbit-v28.js');
const app=read('public/app.js');

function block(source,after,before){
 const start=source.indexOf(after);
 assert(start>=0,'expected source section '+after);
 const end=source.indexOf(before,start+after.length);
 assert(end>start,'expected closing section '+before);
 return source.slice(start+after.length,end);
}

test('all twelve orbit buttons have real workspace pages and click handlers',()=>{
 const orbitList=block(orbit,'  const sections=[','  ];');
 const pages=block(workspace,'  const pages={','  const tabs={');
 const ids=[...orbitList.matchAll(/\{id:'([^']+)'/g)].map(x=>x[1]);
 const pageIds=new Set([...pages.matchAll(/^\s+([a-z]+):translate\(/gm)].map(x=>x[1]));
 assert.equal(ids.length,12);
 assert.equal(new Set(ids).size,12);
 for(const id of ids)assert(pageIds.has(id),'missing page '+id);
 assert.match(orbit,/data-workspace-target/);
 assert.match(workspace,/selectView\(button\.dataset\.workspaceNav\)/);
 assert.match(workspace,/orbit=createWorkspaceOrbit\(\{workspace,navigate:selectView,translate\}\)/);
});

test('every workspace tab points to a server-rendered or first-party native module',()=>{
 const tabBlock=block(workspace,'  const tabs={','  const primary={');
 const primaryBlock=block(workspace,'  const primary={','  // Do not show connector tabs');
 const tabIds=[...tabBlock.matchAll(/\['([^']+)',translate\(/g)].map(x=>x[1]);
 const primaryIds=[...primaryBlock.matchAll(/[a-z]+:'([^']+)'/g)].map(x=>x[1]);
 assert(tabIds.length>=17,'should cover primary account modules and integrations');
 for(const id of new Set([...tabIds,...primaryIds])){
   assert(app.includes('id="'+id+'"')||workspace.includes('id="'+id+'"'),
     'Workspace button points to missing module '+id);
 }
 assert.match(workspace,/showModuleTab\(tab\.dataset\.workspaceTab\)/);
 assert.match(workspace,/if\(!showPanel\(id\)\)/);
});

test('deep link to integrations cannot be swallowed by the initial bot preview',()=>{
 assert.match(app,/const view=legacySectionAliases\[section\]\|\|section\|\|'bot'/);
 assert.match(app,/activateRespondoWorkspace\(\{view\}\)/);
 assert.match(workspace,/if\(!demo && initialSection==='integrations' && workspace\.dataset\.currentView==='integrations'\)/);
 assert.match(workspace,/target\.scrollIntoView\(\{behavior:'auto',block:'start'\}\)/);
 assert.match(workspace,/orbit\?\.sync\('integrations'\)/);
});

test('a displayed external provider tab needs positive readiness, while local Respondo tools remain available',()=>{
 assert.match(workspace,/const moduleTabAvailable=id=>/);
 assert.match(workspace,/return target\.dataset\.respondoConnectorAvailable==='yes'/);
 assert.match(workspace,/tabs\[selected\]\?\.filter\(\(\[id\]\)=>moduleTabAvailable\(id\)\)/);
 assert.match(workspace,/workspace\.addEventListener\('respondo:provider-availability',refreshProviderTabs\)/);
 assert.match(workspace,/showModuleTab\('native-operations'\)/);
});
