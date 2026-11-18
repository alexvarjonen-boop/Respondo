import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import http from 'node:http';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import express from 'express';
import {createPublicAssetCompression,preferredAssetEncoding} from '../public-asset-compression.mjs';

const publicDir=fileURLToPath(new URL('../public/',import.meta.url));
test('negotiation honors disabled and preferred encodings',()=>{
  assert.equal(preferredAssetEncoding('br, gzip'), 'br');
  assert.equal(preferredAssetEncoding('br;q=0, gzip;q=0.7'),'gzip');
  assert.equal(preferredAssetEncoding('br;q=0, gzip;q=0'),null);
  assert.equal(preferredAssetEncoding('gzip;q=1, br;q=0.3'),'gzip');
  assert.equal(preferredAssetEncoding(''),null);
});

test('only public JS/CSS assets are compressed and conditional, HEAD and range requests work',async()=>{
  const app=express();
  app.use(createPublicAssetCompression(publicDir));
  app.use(express.static(publicDir));
  app.get('/api/account',(_req,res)=>res.json({private:'only when authenticated'}));
  const server=await new Promise(resolve=>{
    const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));
  });
  const port=server.address().port;
  async function request(route,headers={},method='GET'){
    return await new Promise((resolve,reject)=>{
      const req=http.request({hostname:'127.0.0.1',port,path:route,headers,method},res=>{
        const chunks=[];res.on('data',chunk=>chunks.push(chunk));
        res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
      });
      req.on('error',reject);req.end();
    });
  }
  try{
    for(const filename of ['app.js','styles.css','native-ai-operations.js','integration-onboarding.js']){
      const original=await readFile(path.join(publicDir,filename));
      const result=await request('/'+filename,{'accept-encoding':'br, gzip'});
      assert.equal(result.status,200);
      assert.equal(result.headers['content-encoding'],'br');
      assert.equal(result.headers.vary,'Accept-Encoding');
      assert.ok(result.body.length<original.length/2,filename+' must transfer less than half its raw bytes');
      assert.deepEqual(brotliDecompressSync(result.body),original);
      const cached=await request('/'+filename,{'accept-encoding':'br','if-none-match':result.headers.etag});
      assert.equal(cached.status,304);
      assert.equal(cached.body.length,0);
      const head=await request('/'+filename,{'accept-encoding':'gzip'},'HEAD');
      assert.equal(head.status,200);
      assert.equal(head.headers['content-encoding'],'gzip');
      assert.equal(head.body.length,0);
      const gzip=await request('/'+filename,{'accept-encoding':'br;q=0,gzip;q=1'});
      assert.equal(gzip.headers['content-encoding'],'gzip');
      assert.deepEqual(gunzipSync(gzip.body),original);
      const identity=await request('/'+filename,{'accept-encoding':'br;q=0,gzip;q=0'});
      assert.equal(identity.headers['content-encoding'],undefined);
      assert.deepEqual(identity.body,original);
    }
    const range=await request('/app.js',{'accept-encoding':'br','range':'bytes=0-15'});
    assert.equal(range.status,206);
    assert.equal(range.headers['content-encoding'],undefined);
    assert.equal(range.body.length,16);
    const api=await request('/api/account',{'accept-encoding':'br'});
    assert.equal(api.headers['content-encoding'],undefined);
    assert.deepEqual(JSON.parse(api.body.toString()),{private:'only when authenticated'});
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
