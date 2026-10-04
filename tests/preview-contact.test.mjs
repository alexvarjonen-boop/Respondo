import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

test('unanswered preview chats offer and save customer contact details',()=>{
  const start=server.indexOf("app.post('/api/public/demo-chat'");
  const end=server.indexOf("app.post('/api/public/demo-lead'",start);
  const demoBlock=server.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(demoBlock,/Jätä alle nimesi ja puhelinnumerosi tai sähköpostisi/);
  assert.match(demoBlock,/canLeaveContact:\s*Boolean\(handoff\)/);
  assert.doesNotMatch(demoBlock,/Lisää oikea vastaus kerran/);

  assert.match(server,/app\.post\('\/api\/public\/demo-lead'/);
  assert.match(server,/INSERT INTO leads\(id,tenant_id,visitor_ref,name,email,phone,message,status\)/);

  assert.match(app,/function showPreviewLeadForm\(chat, question\)/);
  const calls=app.match(/showPreviewLeadForm\(chat,\s*question\)/g)||[];
  assert.ok(calls.length>=3,'helper plus both preview call sites must exist');
  assert.match(app,/\/api\/public\/demo-lead/);
  assert.match(styles,/\.preview-leadbox\{/);
});
