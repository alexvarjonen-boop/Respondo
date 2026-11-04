import pg from 'pg';
import { processCrmOutbox } from '../lead-crm-queue.mjs';
import { deliverCrmProvider } from '../lead-crm-providers.mjs';

// Run from an external scheduler every minute; no permanent process needed.
// The Railway production service processes encrypted customer connectors.
// This optional GitHub worker only runs when it also has the encryption key.
if(!process.env.DATABASE_URL || !process.env.DATA_ENCRYPTION_KEY) {
  console.log('CRM worker skipped: Railway handles delivery unless both worker secrets are configured.');
} else {
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  try {
    const result=await processCrmOutbox(pool,(tenantId,event)=>
      deliverCrmProvider(tenantId,event,{pool}));
    console.log(JSON.stringify(result));
  } catch(error) {
    console.error('CRM worker failed:',error.message);
    process.exitCode=1;
  } finally { await pool.end(); }
}
