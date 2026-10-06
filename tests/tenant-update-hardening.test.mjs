import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

test('tenant-scoped mutable records are updated with tenant_id defense in depth', () => {
  const required = [
    /UPDATE support_agents SET status='online',updated_at=NOW\(\) WHERE id=\$1 AND tenant_id=\$2/,
    /UPDATE chat_threads SET last_activity_at=NOW\(\),updated_at=NOW\(\) WHERE id=\$1 AND tenant_id=\$2/,
    /UPDATE knowledge SET category=\$1,answer=\$2,keywords=\$3,source_type='website',source_url=\$4,approved=true,verified_at=NOW\(\),updated_at=NOW\(\) WHERE id=\$5 AND tenant_id=\$6/,
    /SET status='done',[\s\S]{0,220}WHERE id=\$2 AND tenant_id=\$3/,
    /calendarSync[\s\S]{0,260}WHERE id=\$2 AND tenant_id=\$3/,
    /checkoutSessionId[\s\S]{0,260}WHERE id=\$2 AND tenant_id=\$3/,
    /UPDATE chat_threads SET mode='human',status='open',updated_at=NOW\(\) WHERE id=\$1 AND tenant_id=\$2/,
  ];
  for (const pattern of required) assert.match(server, pattern);
});
