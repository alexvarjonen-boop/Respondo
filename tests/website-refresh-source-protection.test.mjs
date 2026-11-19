import test from 'node:test';
import assert from 'node:assert/strict';
import {stageWebsiteRefresh,websiteCandidateFingerprint,websiteRefreshReviewOverview} from '../website-refresh-review.mjs';

const tenant='13e9324d-67d5-4218-b777-a0f777d2f174';
const candidate={sourceUrl:'https://example.org/services',title:'Services',category:'Services',answer:'We clean windows professionally.'};

test('website refresh rejects invalid or credential-containing source URLs before storing facts',async()=>{
  const db={query:async()=>{throw Error('No database queries expected');}};
  for(const sourceUrl of ['javascript:alert(1)','https://user:pass@example.org/a',
    'https://','/relative']){
    await assert.rejects(stageWebsiteRefresh(db,tenant,{...candidate,sourceUrl}),/Verified website candidate required/);
  }
});

test('fragment links normalize to the same source page before review',async()=>{
  const seen=[];
  await stageWebsiteRefresh({query:async(sql,args)=>{
    seen.push([sql,args]);return sql.includes('SELECT id,answer')?{rows:[]}:{rows:[{status:'pending'}]};
  }},tenant,{...candidate,sourceUrl:'https://example.org/services#prices'});
  assert.equal(seen[0][1][1],'https://example.org/services');
});

test('a site that returns to the published answer retires only its own pending proposal',async()=>{
  const queries=[];
  const result=await stageWebsiteRefresh({query:async(sql,args)=>{
    queries.push([sql,args]);
    return {rows:sql.startsWith('SELECT id,answer')?
      [{id:'source',answer:candidate.answer,category:candidate.category,keywords:[]}]:[]};
  }},tenant,candidate);
  assert.deepEqual(result,{status:'unchanged'});
  assert.match(queries[1][0],/UPDATE knowledge SET verified_at=NOW\(\)/);
  assert.match(queries[1][0],/SET status='dismissed',reviewed_by=NULL,reviewed_at=NULL/);
  assert.match(queries[1][0],/WHERE tenant_id=\$1 AND fingerprint=\$3 AND status='pending'/);
  assert.deepEqual(queries[1][1],[tenant,'source',websiteCandidateFingerprint(candidate)]);
});

test('new proposal content renews the ID while an unchanged owner dismissal stays dismissed',async()=>{
  const queries=[];
  const result=await stageWebsiteRefresh({query:async(sql,args)=>{
    queries.push([sql,args]);
    return {rows:sql.startsWith('SELECT status')?[{status:'dismissed'}]:[]};
  }},tenant,candidate);
  assert.deepEqual(result,{status:'dismissed'});
  assert.match(queries[1][0],/id=EXCLUDED.id/);
  assert.match(queries[1][0],/status='dismissed' AND respondo_website_refresh_reviews.reviewed_at IS NULL/);
  assert.match(queries[1][0],/IS DISTINCT FROM \(EXCLUDED.answer,EXCLUDED.category,EXCLUDED.keywords\)/);
  assert.deepEqual(queries[2][1],[tenant,websiteCandidateFingerprint(candidate)]);
});

test('review compares only newest approved tenant source without duplicating reviews',async()=>{
  const queries=[];
  const result=await websiteRefreshReviewOverview({query:async(sql,args)=>{
    queries.push([sql,args]);return {rows:[]};
  }},tenant);
  assert.equal(result.requiresOwnerApproval,true);
  assert.equal(queries[0][1][0],tenant);
  assert.match(queries[0][0],/LEFT JOIN LATERAL/);
  assert.match(queries[0][0],/k\.approved=TRUE/);
  assert.match(queries[0][0],/ORDER BY k\.verified_at DESC NULLS LAST,k\.created_at DESC,k\.id DESC LIMIT 1/);
});
