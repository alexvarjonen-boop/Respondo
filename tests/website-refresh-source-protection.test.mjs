import test from 'node:test';
import assert from 'node:assert/strict';
import {stageWebsiteRefresh,websiteRefreshReviewOverview} from '../website-refresh-review.mjs';

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

test('review compares only newest approved tenant source without duplicating reviews',async()=>{
  const queries=[];
  const result=await websiteRefreshReviewOverview({query:async(sql,args)=>{
    queries.push([sql,args]);return {rows:[]};
  }},tenant);
  assert.equal(result.requiresOwnerApproval,true);
  assert.equal(queries[0][1][0],tenant);
  assert.match(queries[0][0],/LEFT JOIN LATERAL/);
  assert.match(queries[0][0],/k\.approved=TRUE/);
  assert.match(queries[0][0],/ORDER BY k\.verified_at DESC NULLS LAST,k\.created_at DESC LIMIT 1/);
});
