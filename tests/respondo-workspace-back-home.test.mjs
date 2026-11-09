import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const js=await readFile(new URL('../public/workspace-continuation-v24.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/workspace-continuation-v24.css',import.meta.url),'utf8');

test('real Respondo OS Try Bot exposes an actual link back to site homepage',()=>{
  const start=js.indexOf('<div data-workspace-page="bot">');
  const end=js.indexOf('<div data-workspace-page="overview"',start);
  assert.ok(start>=0 && end>start,'Try Bot page must exist');
  const page=js.slice(start,end);
  assert.match(page,/<a class="respondo-workspace-bot-home" href="\/"/);
  assert.match(page,/<\/a>/);
  assert.doesNotMatch(page,/href="\/assistant"/);
  assert.doesNotMatch(page,/href="javascript:/);
  assert.match(page,/Try your bot\./);
  assert.match(page,/respondoWorkspaceChatHost/);
});

test('return link is accessible and localized in Finnish, Swedish and English',()=>{
  const link=js.match(/<a class="respondo-workspace-bot-home"[^\n]+/);
  assert.ok(link);
  assert.match(link[0],/aria-label="\$\{choose\(/);
  assert.match(link[0],/Takaisin etusivulle/);
  assert.match(link[0],/Tillbaka till startsidan/);
  assert.match(link[0],/Back to homepage/);
  assert.match(link[0],/aria-hidden="true"/);
});

test('back link has readable dark-mode text and a keyboard focus treatment on mobile',()=>{
  assert.match(css,/#app \.dashboard-premium-shell\.respondo-workspace-active \.respondo-workspace-bot-home\{/);
  assert.match(css,/color:#f6f7f9!important/);
  assert.match(css,/-webkit-text-fill-color:#f6f7f9!important/);
  assert.match(css,/\.respondo-workspace-bot-home:focus-visible\{/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/min-height:42px/);
});

test('navigation belongs to the real workspace and preserves existing chat and orbit',()=>{
  assert.match(js,/const workspace=ensureWorkspace\(demo\)/);
  assert.match(js,/chatHost\.appendChild\(preview\)/);
  assert.match(js,/createWorkspaceOrbit/);
  assert.equal((js.match(/class="respondo-workspace-bot-home"/g)||[]).length,1);
});
