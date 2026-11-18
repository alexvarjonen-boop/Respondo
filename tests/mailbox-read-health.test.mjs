import test from 'node:test';
import assert from 'node:assert/strict';
import {mailboxReadHealth} from '../mailbox-read-health.mjs';
const now=Date.parse('2026-11-18T09:00:00Z');
test('a saved OAuth token does not prove a mailbox read',()=>{
  assert.equal(mailboxReadHealth({},now).readCheck,'not_tested');
});
test('a recent successful incoming-mail sync is verified only for a limited window',()=>{
  const when=new Date(now-5*60000).toISOString();
  assert.deepEqual(mailboxReadHealth({lastSyncedAt:when},now),{readCheck:'verified_recently',readVerifiedAt:when});
  assert.equal(mailboxReadHealth({lastSyncedAt:when},now+35*60000).readCheck,'stale');
});
test('failure takes precedence over an earlier successful sync',()=>{
  assert.equal(mailboxReadHealth({lastSyncedAt:new Date(now).toISOString(),lastSyncError:'manual_sync_failed'},now).readCheck,'failed');
  assert.equal(mailboxReadHealth({lastSyncedAt:'invalid'},now).readCheck,'not_tested');
  assert.equal(mailboxReadHealth({lastSyncedAt:new Date(now+300000).toISOString()},now).readCheck,'not_tested');
});
