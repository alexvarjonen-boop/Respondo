import test from 'node:test';
import assert from 'node:assert/strict';
import {importedContactEmails,chooseImportedContactEmail} from '../public/import-email.mjs';

const contact=(email,sourceUrl='https://example.fi/')=>({
 title:'Sähköposti',category:'Yhteystiedot',answer:email,sourceUrl
});

test('a uniquely discovered company email pre-fills an empty field without saving',()=>{
 const candidates=[contact('  Info@Example.fi '),contact('info@example.fi','https://example.fi/yhteystiedot')];
 const result=chooseImportedContactEmail(candidates,'');
 assert.equal(result.autoFill,'info@example.fi');
 assert.equal(result.foundCount,1);
 assert.deepEqual(result.suggestions,[]);
});

test('an existing manually set email is never overwritten by a site scan',()=>{
 const result=chooseImportedContactEmail([contact('scanned@example.fi')],'owner@example.fi');
 assert.equal(result.autoFill,'');
 assert.deepEqual(result.suggestions.map(x=>x.email),['scanned@example.fi']);
 assert.deepEqual(chooseImportedContactEmail([contact('owner@example.fi')],'owner@example.fi').suggestions,[]);
});

test('multiple different company email addresses require explicit selection',()=>{
 const result=chooseImportedContactEmail([
  contact('office@example.fi'),contact('billing@example.fi')
 ],'');
 assert.equal(result.autoFill,'');
 assert.equal(result.foundCount,2);
 assert.deepEqual(result.suggestions.map(x=>x.email),['office@example.fi','billing@example.fi']);
});

test('marketing paragraphs, malformed values and non-contact email claims cannot auto-fill',()=>{
 const result=chooseImportedContactEmail([
  {title:'Palvelut',category:'Palvelut',answer:'Sähköposti: sales@example.fi'},
  {title:'Sähköposti',category:'Yhteystiedot',answer:'email us at support@example.fi'},
  {title:'Sähköposti',category:'Palvelut',answer:'other@example.fi'},
  contact('bad@'),
 ],'');
 assert.equal(result.autoFill,'');
 assert.deepEqual(importedContactEmails([]),[]);
 assert.equal(result.foundCount,0);
});

test('the dashboard website-import screen stages the discovered email, but never auto-persists it',async()=>{
 const {readFileSync}=await import('node:fs');
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/chooseImportedContactEmail\(candidates,emailInput\?\.value\|\|''\)/);
 assert.match(app,/if\(emailChoice\.autoFill && emailInput && !emailInput\.value\.trim\(\)\)/);
 assert.match(app,/stageImportedEmail\(emailChoice\.autoFill\)/);
 assert.match(app,/id="importEmailSuggestions"/);
 assert.match(app,/paina Tallenna sähköpostiosoite/);
 // No automatic POST or profile save is performed when the import completes.
 const stage=app.split("const emailChoice=chooseImportedContactEmail")[1].split("const review = document.getElementById('websiteImportReview')")[0];
 assert.doesNotMatch(stage,/api\/app\/business-email|api\/app\/business-profile/);
});
