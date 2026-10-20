import pg from 'pg';
import { ensureLeadTable } from '../lead-repository.mjs';
import { ensureCrmSchema } from '../lead-crm-queue.mjs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exitCode=1;
} else {
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false}});
  try {
    await ensureLeadTable(pool);
    await ensureCrmSchema(pool);
    console.log('Qualified lead schema migration completed');
  } catch(error) {
    console.error('Qualified lead schema migration failed:',error.message);
    process.exitCode=1;
  } finally {
    await pool.end();
  }
}
