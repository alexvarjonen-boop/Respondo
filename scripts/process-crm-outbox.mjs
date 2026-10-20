import pg from 'pg';
import { processCrmOutbox } from '../lead-crm-queue.mjs';
import { deliverCrmProvider } from '../lead-crm-providers.mjs';

// Run from an external scheduler every minute; no permanent process needed.
// Configure DATABASE_URL and tenant-specific CRM credentials in the server environment.
if(!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exitCode=1;
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
