import test from 'node:test';
// Temporary PR-only real-site audit. Delete before merging.
test('live import audit verifies six real companies and restricted return policy',{timeout:500000},async()=>{
  await import('../scripts/importer-live-audit.mjs');
});
