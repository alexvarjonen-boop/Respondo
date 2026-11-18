import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('dashboard action queue is grounded in pending requests, verified handoff state, and gaps',()=>{
  const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(ui,/actionRequests\.filter\(x=>\['new','in_progress'\]\.includes\(x\.status\)\)\.length/);
  assert.match(ui,/liveThreads\.filter\(x=>x\.status==='open'&&x\.mode==='human'&&x\.brief\?\.waitingForReply\)\.length/);
  assert.match(ui,/!isDemo&&\(pendingCustomerActions\|\|pendingHumanReplies\|\|gaps\.length\)/);
  for(const view of ['actions','customers','answers'])assert.ok(ui.includes('data-dashboard-open="'+view+'"'));
  assert.match(ui,/uppskattat värde/);
  assert.match(ui,/customers left their contact details/);
});

test('important company profile inputs have FI SV EN labels and examples',()=>{
  const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(ui,/Your website address/);
  assert.match(ui,/Din webbplatsadress/);
  assert.match(ui,/https:\/\/company\.com/);
  assert.match(ui,/Response style/);
});
