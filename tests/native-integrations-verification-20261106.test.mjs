import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../public/integration-onboarding.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('unverified native tools cannot open a live workspace view',()=>{
  assert.match(ui,/const toolState=ownToolStatus\(item\)/);
  assert.match(ui,/if\(toolState!=='local'\)\{/);
  assert.match(ui,/toolState==='restricted'\?t\.restricted:t\.nativeUnavailable/);
  assert.match(ui,/notice\.setAttribute\('role','alert'\)/);
  assert.match(ui,/else\{\s*focusExisting\(\{tab:'native-operations',nativeTab:item\.nativeTab,nativeInternal:true\}\)/);
});

test('Respondo calendar uses the verified first-party calendar, never external booking setup',()=>{
  assert.match(ui,/id:'native_calendar',group:'calendar',name:'Respondo Calendar',tab:'native-operations',nativeTab:'calendar',nativeInternal:true/);
  const matches=ui.match(/if\(item\.id==='native_calendar'\)return ownStatus\.get\('rs_calendar'\)===true\?'local':'unverified'/g)||[];
  assert.equal(matches.length,2,'both DOM and computed statuses must require the successful database probe');
});

test('unknown Gmail or Microsoft readiness cannot expose OAuth start links',()=>{
  assert.match(ui,/if\(oauthAvailable\.get\(item\.id\)===false\)return 'notConfigured'/);
  assert.match(ui,/if\(oauthAvailable\.get\(item\.id\)!==true\)return 'unverified'/);
  assert.match(ui,/if\(\['restricted','notConfigured','unverified'\]\.includes\(availability\)\)/);
  assert.match(ui,/if\(item && providerVisible\(item\) && !\['restricted','notConfigured','unverified'\]\.includes\(status\(item\)\)\)focusExisting\(item\)/);
});

test('readiness probes have deadlines, ignore stale responses and clear old status flags',()=>{
  assert.match(ui,/const controller=new AbortController\(\)/);
  assert.match(ui,/setTimeout\(\(\)=>controller\.abort\(\),9000\)/);
  assert.match(ui,/signal:controller\.signal/);
  assert.match(ui,/\.finally\(\(\)=>clearTimeout\(timer\)\)/);
  assert.match(ui,/const serial=\+\+reloadSerial/);
  assert.match(ui,/if\(serial!==reloadSerial\)return/);
  assert.match(ui,/ownStatus=new Map\(\);prerequisites=new Map\(\);oauthAvailable=new Map\(\)/);
});

test('updated guide URL invalidates old browser cache after the fixes',()=>{
  assert.match(html,/integration-onboarding\.js\?v=20261106-verified-native-gates-v8/);
  assert.doesNotMatch(html,/integration-onboarding\.js\?v=20261105-guided-setup-v7-native-private/);
});
