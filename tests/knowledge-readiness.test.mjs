import test from 'node:test';
import assert from 'node:assert/strict';
import {auditImportedKnowledge} from '../knowledge-readiness.mjs';

const row=(category,title,answer,extra={})=>({category,title,answer,approved:true,...extra});

test('service onboarding lists fact gaps and generates Finnish Swedish English cases',()=>{
  const report=auditImportedKnowledge([
    row('Palvelut','Ikkunanpesu','Teemme ikkunanpesuja.'),
    row('Hinnat','Ikkunanpesun hinta','Ikkunanpesu 49 €/h'),
    row('Yhteystiedot','Puhelin','040 123 4567'),
  ]);
  assert.equal(report.type,'services');
  assert.equal(report.coveragePercent,50);
  assert.deepEqual(report.missing,['hours','location','quote']);
  assert.equal(report.scenarios.length,18);
  assert.equal(report.testsExecuted,false);
  assert.deepEqual(report.scenarios.filter(x=>x.topic==='services').map(x=>x.language),['fi','sv','en']);
  assert.equal(report.scenarios.find(x=>x.topic==='hours').expectedBehavior,'do_not_invent');
});

test('ecommerce audits delivery, returns, warranty and payments without inventing rules',()=>{
  const report=auditImportedKnowledge([
    row('Tuotteet','Putter','Putter 150 €'),
    row('Toimitus ja seuranta','Toimitus','Toimitus kestää 2–4 päivää'),
    row('Palautukset ja vaihdot','Palautus','30 päivän palautus'),
  ]);
  assert.equal(report.type,'ecommerce');
  assert.equal(report.coverage.find(x=>x.topic==='delivery').available,true);
  assert.ok(report.missing.includes('warranty'));
  assert.equal(report.scenarios.find(x=>x.topic==='warranty' && x.language==='en').expectedBehavior,'do_not_invent');
});

test('tenant rows are isolated and unapproved or polluted records do not count as coverage',()=>{
  const first=auditImportedKnowledge([row('Palvelut','Ikkunanpesu','Teemme ikkunanpesuja.')]);
  const second=auditImportedKnowledge([
    row('Palvelut','Keksitty','Ei vahvistettu',{approved:false}),
    row('Hinnat','Evästeet','Cookie policy accept all'),
  ]);
  assert.equal(first.coverage.find(x=>x.topic==='services').available,true);
  assert.equal(second.coverage.find(x=>x.topic==='services').available,false);
  assert.equal(second.warnings[0].type,'suspected_noise');
});

test('conflicting same-title answers are flagged without deciding which one is true',()=>{
  const report=auditImportedKnowledge([
    row('Hinnat','Ikkunanpesu','49 €/h'),
    row('Hinnat','Ikkunanpesu','59 €/h'),
  ]);
  assert.deepEqual(report.warnings[0].titles,['Ikkunanpesu']);
});

test('audit caps its work and never turns a generated test into a passing answer',()=>{
  const report=auditImportedKnowledge(Array.from({length:10100},(_,i)=>row('Palvelut','Palvelu '+i,'Teemme töitä.')));
  assert.equal(report.totalRows,10000);
  assert.equal(report.testsExecuted,false);
});
