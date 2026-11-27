import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { decodeWebsiteResponse } from '../website-response.mjs';

test('compressed HTTP response and gzip sitemap',async()=>{
  const text='<urlset><url><loc>https://example.com/</loc></url></urlset>';
  const gzip=gzipSync(text);
  assert.equal(await decodeWebsiteResponse(gzip,{contentEncoding:'gzip'}),text);
  assert.equal(await decodeWebsiteResponse(gzip,{gzipFile:true}),text);
  assert.equal(await decodeWebsiteResponse(brotliCompressSync(text),{contentEncoding:'br'}),text);
});
test('legacy Finnish and Swedish character encodings',async()=>{
  const text='<meta charset="windows-1252">Ääkköset och öppettider';
  assert.equal(await decodeWebsiteResponse(Buffer.from(text,'latin1')),text);
  assert.equal(await decodeWebsiteResponse(Buffer.from('Hinta 20 €'.replace('€','\x80'),'latin1'),{contentType:'text/html; charset=windows-1252'}),'Hinta 20 €');
});
test('compressed and expanded size caps',async()=>{
  await assert.rejects(decodeWebsiteResponse(Buffer.alloc(100),{maxBytes:50}));
  await assert.rejects(decodeWebsiteResponse(gzipSync('x'.repeat(10000)),{contentEncoding:'gzip',maxBytes:100}));
  await assert.rejects(decodeWebsiteResponse(gzipSync('x'.repeat(10000)),{gzipFile:true,maxBytes:100}));
});
test('unrecognized transfer encoding rejected',async()=>{
  await assert.rejects(decodeWebsiteResponse(Buffer.from('text'),{contentEncoding:'constructor'}));
});
