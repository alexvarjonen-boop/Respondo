import { accessSync, constants, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { Worker } from 'node:worker_threads';

export const CHAT_IMAGE_MAX_BYTES = 2_000_000;
const MAX_ENCODED_BYTES = Math.ceil(CHAT_IMAGE_MAX_BYTES / 3) * 4;
export const CHAT_IMAGE_BODY_LIMIT = MAX_ENCODED_BYTES + 4096;
const MAX_SIDE = 4096;
const MAX_PIXELS = 8_000_000;
const LANGUAGES = ['fin', 'swe', 'eng'];
const OCR_LANGUAGE = new Map([['fi', 'fin'], ['sv', 'swe'], ['en', 'eng']]);
const PNG_HEADER = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_IMAGE_CHUNKS = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
const JPEG_FRAME = new Set([0xc0, 0xc1, 0xc2]);

function pngSize(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_HEADER) ||
      bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') return null;
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function jpegSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return null;
  let dimensions = null;
  for (let offset = 2; offset + 4 <= bytes.length;) {
    if (bytes[offset++] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (offset + 2 > bytes.length) return null;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if (JPEG_FRAME.has(marker)) {
      if (length < 11 || dimensions) return null;
      dimensions = [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    } else if (marker === 0xda) {
      return dimensions;
    } else if (marker < 0xe0 && ![0xc4, 0xdb, 0xdd].includes(marker)) {
      return null;
    }
    offset += length;
  }
  return null;
}

function pngImageBytes(bytes) {
  // Only pass the pixel data and its palette/transparency to the decoder.
  // In particular, avoid decompressing arbitrary metadata and animation frames.
  const chunks = [PNG_HEADER];
  let hasImageData = false;
  for (let offset = 8, count = 0; offset + 12 <= bytes.length && count < 4096; count++) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + length + 12;
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (end > bytes.length || (type === 'IHDR' && offset !== 8)) return null;
    if (PNG_IMAGE_CHUNKS.has(type)) chunks.push(bytes.subarray(offset, end));
    else if (/^[A-Z]/.test(type)) return null;
    if (type === 'IDAT') hasImageData = true;
    if (type === 'IEND') {
      return hasImageData && length === 0 && end === bytes.length ? Buffer.concat(chunks) : null;
    }
    offset = end;
  }
  return null;
}

function safeImageBytes(encoded, mimeType) {
  if (!['image/png', 'image/jpeg'].includes(mimeType) || typeof encoded !== 'string' ||
      !encoded || encoded.length > MAX_ENCODED_BYTES || encoded.length % 4) return null;

  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length > CHAT_IMAGE_MAX_BYTES || bytes.toString('base64') !== encoded) return null;
  const size = mimeType === 'image/png' ? pngSize(bytes) : jpegSize(bytes);
  if (!size) return null;
  const [width, height] = size;
  if (width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) return null;
  return mimeType === 'image/png' ? pngImageBytes(bytes) : bytes;
}

function availableLanguages(dir) {
  if (typeof dir !== 'string' || !isAbsolute(dir)) return false;
  try {
    return LANGUAGES.every(lang => {
      const file = join(dir, lang + '.traineddata');
      const data = statSync(file);
      accessSync(file, constants.R_OK);
      return data.isFile() && data.size > 0;
    });
  } catch {
    return false;
  }
}

function recognizeInWorker(bytes, langPath, timeoutMs, languages) {
  const worker = new Worker(new URL('./chat-image-text-worker.mjs', import.meta.url), {
    workerData: { bytes, langPath, languages },
    resourceLimits: {maxOldGenerationSizeMb: 64},
  });
  return new Promise((resolve, reject) => {
    let settled = false;
    async function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // The concurrency slot is held until the OCR worker has stopped, including
      // when Tesseract is still starting or fails to decode the image.
      await worker.terminate().catch(() => {});
      if (error) reject(error);
      else resolve(result);
    }
    const timer = setTimeout(() => void finish(new Error('Image text recognition timed out')), timeoutMs);
    worker.once('message', result => void finish(null, result));
    worker.once('error', error => void finish(error));
    worker.once('exit', () => void finish(new Error('Image text recognition stopped')));
  });
}

export function createChatImageTextReader({
  langPath = process.env.RESPONDO_CHAT_IMAGE_OCR_DIR,
  recognize = recognizeInWorker,
  objectDetector = null,
} = {}) {
  const enabled = availableLanguages(langPath);
  let running = false;

  async function read(image, type, language, mode = 'text') {
    const available = {windows:objectDetector?.windowsEnabled, objects:objectDetector?.enabled, text:enabled};
    if (!available[mode]) return {status: 'unavailable'};
    if (running) return {status: 'busy'};

    const bytes = safeImageBytes(image, type);
    if (!bytes) return {status: 'invalid'};

    running = true;
    try {
      if (mode === 'windows') {
        const count = await objectDetector.detectWindows(bytes, 35_000);
        return Number.isSafeInteger(count) && count > 0 && count <= 60
          ? {status:'read', count}
          : {status:'unreadable'};
      }
      if (mode === 'objects') {
        const estimated = await objectDetector.detect(bytes, language, 12_000);
        const objects = estimated
          .filter(item => typeof item?.label === 'string' && item.label.trim() &&
            item.label.length <= 70 && Number.isSafeInteger(item.count) && item.count > 0 && item.count <= 250)
          .slice(0, 8);
        return objects.length ? {status: 'read', objects} : {status: 'unreadable'};
      }
      const preferred = OCR_LANGUAGE.get(language);
      const languages = preferred ? [preferred, ...LANGUAGES.filter(lang => lang !== preferred)] : LANGUAGES;
      const result = await recognize(bytes, langPath, 12_000, languages);
      const text = String(result?.text || '')
        .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
        .replace(/\s+/g, ' ').trim();
      if (!text || !Number.isFinite(result?.confidence) || result.confidence < 65) {
        return {status: 'unreadable'};
      }
      return {status: 'read', text: text.slice(0, 900), truncated: text.length > 900 || result.moreText === true};
    } catch {
      return {status: 'unavailable'};
    } finally {
      running = false;
    }
  }

  return {enabled, get objectsEnabled() { return objectDetector?.enabled === true; },
    get windowsEnabled() { return objectDetector?.windowsEnabled === true; }, read};
}
