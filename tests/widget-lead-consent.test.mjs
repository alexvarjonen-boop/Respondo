import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const widget=readFileSync(new URL('../public/widget.js',import.meta.url),'utf8');

test('public widget requires explicit unchecked contact consent',()=>{
  assert.match(widget,/type=\\"checkbox\\" name=\\"consent\\" required/);
  assert.match(widget,/box\.elements\.consent\.checked/);
  assert.match(widget,/consent: box\.elements\.consent\.checked/);
});
test('public lead endpoint rejects missing consent',()=>{
  const route=server.slice(server.indexOf("app.post('/api/public/:slug/lead'"),server.indexOf("app.get('/api/public/:slug/live'"));
  assert.match(route,/body\.consent !== true/);
  assert.match(route,/INSERT INTO leads/);
});
