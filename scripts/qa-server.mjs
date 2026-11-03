// QA-only bootstrap. Never use this entrypoint for Respondo production.
import fs from 'node:fs/promises';
import pg from 'pg';

if(process.env.RESPONDO_QA_ENV !== '1' || process.env.NODE_ENV !== 'development') {
  throw new Error('QA bootstrap requires RESPONDO_QA_ENV=1 and NODE_ENV=development.');
}
const databaseUrl=String(process.env.DATABASE_URL||'');
let dbHost='';
try {dbHost=new URL(databaseUrl).hostname.toLowerCase();}catch{}
if(!dbHost.endsWith('.railway.internal')) {
  throw new Error('QA refuses any DB other than an isolated Railway private database.');
}
const stripeKey=String(process.env.STRIPE_SECRET_KEY||'').trim();
if(stripeKey && !/^(?:sk|rk)_test_/.test(stripeKey)) {
  throw new Error('QA refuses live or unrecognized Stripe API keys.');
}
const base=String(process.env.BASE_URL||'');
if(base && (!/^https:\/\/[a-z0-9.-]+\.up\.railway\.app\/?$/i.test(base))) {
  throw new Error('QA BASE_URL must use its own Railway-generated HTTPS domain.');
}
if(process.env.RESEND_API_KEY || process.env.OPENAI_API_KEY || process.env.FIRECRAWL_API_KEY) {
  throw new Error('QA forbids email, paid LLM and crawler credentials.');
}

const pool=new pg.Pool({connectionString:databaseUrl,connectionTimeoutMillis:15000});
const client=await pool.connect();
try {
  await client.query('BEGIN');
  // The main code targets Supabase grants, so supply inert NOLOGIN roles
  // for a *fresh, isolated* Railway PostgreSQL database.
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
    END $$;
  `);
  const schema=await fs.readFile(new URL('../db/schema.sql',import.meta.url),'utf8');
  await client.query(schema);
  await client.query('COMMIT');
  console.log('QA: fresh isolated database schema initialized.');
} catch(error) {
  await client.query('ROLLBACK').catch(()=>{});
  throw error;
} finally {
  client.release();
  await pool.end();
}
await import('../server.mjs');
