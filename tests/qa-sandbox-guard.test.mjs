import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const qa=fs.readFileSync(new URL('../scripts/qa-server.mjs',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8');

test('QA server explicitly requires opt-in and development environment',()=>{
 assert.match(qa,/RESPONDO_QA_ENV !== '1'/);
 assert.match(qa,/NODE_ENV !== 'development'/);
 assert.match(qa,/throw new Error\('QA bootstrap requires/);
});
test('QA database must be a private Railway host, not the production database',()=>{
 assert.match(qa,/dbHost\.endsWith\('\.railway\.internal'\)/);
 assert.match(qa,/QA refuses any DB other than an isolated Railway private database/);
 assert.match(qa,/new pg\.Pool\(\{connectionString:databaseUrl/);
});
test('QA only accepts Stripe test keys and Railway QA hostnames',()=>{
 assert.match(qa,/\^\(\?:sk\|rk\)_test_/);
 assert.match(qa,/QA refuses live or unrecognized Stripe API keys/);
 assert.match(qa,/QA BASE_URL must use its own Railway-generated HTTPS domain/);
});
test('QA disables paid external integrations and does not load production bootstrap',()=>{
 assert.match(qa,/process\.env\.RESEND_API_KEY/);
 assert.match(qa,/process\.env\.OPENAI_API_KEY/);
 assert.match(qa,/process\.env\.FIRECRAWL_API_KEY/);
 assert.match(qa,/await import\('\.\.\/server\.mjs'\)/);
 assert.doesNotMatch(qa,/server-entry\.mjs/);
});
test('QA initializes a new database from repository schema and inert NOLOGIN roles',()=>{
 assert.match(qa,/CREATE ROLE anon NOLOGIN/);
 assert.match(qa,/CREATE ROLE authenticated NOLOGIN/);
 assert.match(qa,/CREATE ROLE service_role NOLOGIN/);
 assert.match(qa,/readFile\(new URL\('\.\.\/db\/schema\.sql'/);
 assert.match(qa,/await client\.query\(schema\)/);
 assert.match(qa,/await client\.query\('COMMIT'\)/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS users/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS tenants/);
});
