import test from 'node:test';
// Temporary PR-only end-to-end regression gate. Remove after verified.
test('full five-company importer live audit before release',{timeout:500000},async()=>{
  await import('../scripts/importer-live-audit.mjs');
});
