import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CHAT_IMAGE_MAX_BYTES, createChatImageTextReader } from '../chat-image-text.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM9sAAAAASUVORK5CYII=', 'base64');
const image = png.toString('base64');

function languageDirectory(t, languages = ['fin', 'swe', 'eng']) {
  const path = mkdtempSync(join(tmpdir(), 'respondo-image-text-test-'));
  t.after(() => rmSync(path, {recursive:true, force:true}));
  for (const lang of languages) writeFileSync(join(path, lang + '.traineddata'), 'fixture');
  return path;
}

test('widget OCR requires all three configured local language files', async t => {
  const langPath = languageDirectory(t, ['fin', 'eng']);
  const reader = createChatImageTextReader({langPath, recognize() { assert.fail('OCR should stay disabled'); }});
  assert.equal(reader.enabled, false);
  assert.deepEqual(await reader.read(image, 'image/png'), {status:'unavailable'});
});

test('widget OCR validates encoded size, PNG dimensions, and actual file type before decoding', async t => {
  const reader = createChatImageTextReader({
    langPath: languageDirectory(t),
    recognize() { assert.fail('An invalid input reached the decoder'); },
  });
  const oversized = Buffer.alloc(CHAT_IMAGE_MAX_BYTES + 1).toString('base64');
  const largePixels = Buffer.from(png);
  largePixels.writeUInt32BE(4096, 16);
  largePixels.writeUInt32BE(4096, 20);
  for (const [input, type] of [
    [image, 'image/jpeg'], [image, 'image/webp'], [image.replace('A','@'), 'image/png'],
    [largePixels.toString('base64'), 'image/png'], [oversized, 'image/png'],
    [png.subarray(0, 34).toString('base64'), 'image/png'],
  ]) {
    assert.deepEqual(await reader.read(input, type), {status:'invalid'});
  }
});

test('widget OCR skips image metadata, returns readable text and discloses truncation', async t => {
  const p = Buffer.alloc(16);
  p.writeUInt32BE(4);
  p.write('iCCP', 4);
  const withMetadata = Buffer.concat([png.subarray(0, 33), p, png.subarray(33)]);
  const reader = createChatImageTextReader({
    langPath: languageDirectory(t),
    recognize(bytes, _dir, timeoutMs, languages) {
      assert.deepEqual(bytes, png);
      assert.equal(timeoutMs, 12_000);
      assert.deepEqual(languages, ['swe', 'fin', 'eng']);
      return {confidence:91, text:'Ikkunat\nFönster\u0000Windows\u202e ' + 'a'.repeat(910)};
    },
  });
  const result = await reader.read(withMetadata.toString('base64'), 'image/png', 'sv');
  assert.equal(result.status, 'read');
  assert.equal(result.truncated, true);
  assert.equal(result.text.length, 900);
  assert.match(result.text, /^Ikkunat Fönster Windows a+$/);
});

test('widget OCR limits concurrent work and recovers after unreadable or failed recognition', async t => {
  let finish;
  let attempts = 0;
  const reader = createChatImageTextReader({
    langPath: languageDirectory(t),
    recognize() {
      attempts++;
      if (attempts === 1) return new Promise(resolve => { finish = resolve; });
      if (attempts === 2) throw new Error('fixture outage');
      return {confidence:96, text:'Palveluhinta'};
    },
  });
  const first = reader.read(image, 'image/png');
  assert.deepEqual(await reader.read(image, 'image/png'), {status:'busy'});
  finish({confidence:50, text:'Unclear'});
  assert.deepEqual(await first, {status:'unreadable'});
  assert.deepEqual(await reader.read(image, 'image/png'), {status:'unavailable'});
  assert.deepEqual(await reader.read(image, 'image/png'), {status:'read', text:'Palveluhinta', truncated:false});
});
