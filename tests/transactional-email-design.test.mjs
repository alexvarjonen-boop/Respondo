import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { brandedEmailHtml } from '../email-branding.mjs';

const server = fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('transactional email shell is dark and uses the current Respondo logo',()=>{
  const html=brandedEmailHtml({language:'fi',eyebrow:'Tilin turvallisuus',title:'Vahvista sähköpostiosoitteesi',content:'<p>OK</p>'});
  assert.match(html,/respondo-email-logo\.png/);
  assert.match(html,/background-color:#242426/);
  assert.match(html,/background-color:#303032/);
  assert.match(html,/Respondo AI/);
  assert.match(html,/<h1/);
  assert.match(html,/name="viewport"/);
  assert.match(html,/https:\/\/respondoai\.fi\/kayttoehdot/);
  assert.match(html,/https:\/\/respondoai\.fi\/tietosuoja/);
  assert.doesNotMatch(html,/#f3f6fb|background:#fff\b/);
});
test('transactional email shell localizes and escapes headings',()=>{
  const en=brandedEmailHtml({language:'en',title:'Hello <World> & team'});
  assert.match(en,/<html lang="en"/);
  assert.match(en,/Hello &lt;World&gt; &amp; team/);
  assert.match(en,/This is an automated service message/);
  const sv=brandedEmailHtml({language:'sv',title:'Välkommen'});
  assert.match(sv,/<html lang="sv"/);
  assert.match(sv,/Detta är ett automatiskt servicemeddelande/);
});
test('both live signup emails use the same email shell',()=>{
  assert.match(server,/import \{ brandedEmailHtml \} from '\.\/email-branding\.mjs'/);
  const verification=server.slice(server.indexOf('async function sendSignupVerificationEmail('),server.indexOf('async function sendWelcomeEmailOnce('));
  const welcome=server.slice(server.indexOf('async function sendWelcomeEmailOnce('),server.indexOf('async function sendHomepageContactEmail('));
  assert.match(verification,/brandedEmailHtml\(/);
  assert.match(welcome,/brandedEmailHtml\(/);
  assert.match(verification,/resend\.com\/emails/);
  assert.match(welcome,/resend\.com\/emails/);
  assert.match(verification,/codeLabel/);
  assert.match(welcome,/https:\/\/respondoai\.fi\/app/);
});
test('verification and welcome remain triggered in normal account flow',()=>{
  assert.match(server,/await sendSignupVerificationEmail\(\{/);
  assert.match(server,/await sendWelcomeEmailOnce\(userId\)/);
  assert.match(server,/await sendWelcomeEmailOnce\(id\)/);
});
