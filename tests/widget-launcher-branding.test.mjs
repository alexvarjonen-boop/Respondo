import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const widget=readFileSync(new URL('../public/widget.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('floating chat launcher uses the tenant avatar and name, not a generic text-only CTA',()=>{
  assert.match(widget,/class="launcher-avatar"/);
  assert.match(widget,/class="launcher-name"/);
  assert.match(widget,/class="launcher-subtitle"/);
  assert.match(widget,/launcherName\.textContent = botDisplayName/);
  assert.match(widget,/launcherAvatar\.innerHTML = botAvatar/);
  assert.match(widget,/name\.textContent = botDisplayName/);
  assert.match(widget,/mark\.innerHTML = botAvatar/);
  assert.doesNotMatch(widget,/class="launcher-label"/);
  assert.doesNotMatch(widget,/class="launcher-dot"/);
});

test('launcher branding comes from active tenant settings, not hardcoded Viheri metadata',()=>{
  assert.match(server,/name: tenant\.bot_name \|\| 'RESPONDO AI'/);
  assert.match(server,/avatar: tenant\.bot_avatar \|\| 'robot-1'/);
  assert.match(widget,/widgetAvatarMarkup\(data\.avatar \|\| 'robot-1'\)/);
  assert.match(widget,/data:image\\\/(?:png\|jpeg\|webp)/);
  assert.doesNotMatch(widget,/launcherName\.textContent = ['"]viheri/i);
});

test('launcher is accessible, keyboard operable, responsive and exposes open state',()=>{
  assert.match(widget,/aria-controls="respondo-chat-panel"/);
  assert.match(widget,/aria-expanded="false"/);
  assert.match(widget,/launcher\.setAttribute\('aria-expanded',String\(open\)\)/);
  assert.match(widget,/launcher:focus-visible/);
  assert.match(widget,/\.launcher-avatar svg,\.launcher-avatar img/);
  assert.match(widget,/max-width:min\(290px,calc\(100vw - 36px\)\)/);
  assert.match(widget,/prefers-reduced-motion/);
});

test('launcher status reflects active and inactive chat sessions',()=>{
  assert.match(widget,/launcher\.classList\.add\('ready'\)/);
  assert.match(widget,/launcher\.classList\.remove\('ready'\)/);
  assert.match(widget,/launcherSubtitle\.textContent = t\('Valmis auttamaan'/);
  assert.match(widget,/launcherSubtitle\.textContent = t\('Ei käytettävissä'/);
});
