import { spawn } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./chat-image-objects.py', import.meta.url));
const WINDOWS_SCRIPT = fileURLToPath(new URL('./chat-image-windows.py', import.meta.url));
const MAX_MODEL_BYTES = 150_000_000;
const MODEL_FILES = ['detector.cfg', 'detector.weights', ...['fi', 'sv', 'en'].map(lang => 'detector.' + lang + '.names')];

function localModelAvailable(python, modelDir) {
  if (!python || !modelDir || !isAbsolute(python) || !isAbsolute(modelDir)) return false;
  try {
    accessSync(python, constants.X_OK);
    return MODEL_FILES.every(name => {
      const model = join(modelDir, name);
      accessSync(model, constants.R_OK);
      const info = statSync(model);
      const maxBytes = name.endsWith('.weights') ? MAX_MODEL_BYTES : 80_000;
      return info.isFile() && info.size > 0 && info.size <= maxBytes;
    });
  } catch {
    return false;
  }
}

function runDetector(python, script, model, mode, bytes, timeoutMs) {
  const child = spawn(python, ['-I', script, model, mode], {
    stdio: ['pipe', 'pipe', 'ignore'],
    // Child does not receive database/API credentials or proxy configuration.
    env: {LANG: 'C.UTF-8', OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1'},
  });
  return new Promise((resolve, reject) => {
    let payload = '';
    let exceeded = false;
    const timer = setTimeout(() => {
      exceeded = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.stdout.on('data', chunk => {
      if (exceeded) return;
      payload += chunk.toString('utf8');
      if (payload.length > 8192) {
        exceeded = true;
        child.kill('SIGKILL');
      }
    });
    child.once('close', code => {
      clearTimeout(timer);
      if (code !== 0 || exceeded) return reject(new Error('Local object detection failed'));
      try { resolve(JSON.parse(payload)); }
      catch { reject(new Error('Local object detector returned malformed data')); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(bytes);
  });
}

export function createChatImageObjectDetector({
  python = process.env.RESPONDO_CHAT_IMAGE_OBJECT_PYTHON,
  modelDir = process.env.RESPONDO_CHAT_IMAGE_OBJECT_MODEL_DIR,
  windowPython = process.env.RESPONDO_CHAT_IMAGE_WINDOW_PYTHON,
  windowModel = process.env.RESPONDO_CHAT_IMAGE_WINDOW_MODEL,
} = {}) {
  let ready = false;
  const probe = localModelAvailable(python, modelDir)
    ? runDetector(python, SCRIPT, modelDir, 'probe', undefined, 8_000)
      .then(result => { ready = result?.ready === true; })
      .catch(() => {})
    : Promise.resolve();

  let windowsReady = false;
  const windowProbe = windowPython && windowModel && isAbsolute(windowPython) && isAbsolute(windowModel)
    ? runDetector(windowPython, WINDOWS_SCRIPT, windowModel, 'probe', undefined, 12_000)
      .then(result => { windowsReady = result?.ready === true; })
      .catch(() => {})
    : Promise.resolve();
  return {
    get windowsEnabled() { return windowsReady; },
    get enabled() { return ready; },
    async start() { await Promise.all([probe, windowProbe]); },
    async detectWindows(bytes, timeoutMs) {
      const result = await runDetector(windowPython, WINDOWS_SCRIPT, windowModel, 'detect', bytes, timeoutMs);
      return result?.count;
    },
    async detect(bytes, language, timeoutMs) {
      const lang = ['fi', 'sv', 'en'].includes(language) ? language : 'fi';
      const result = await runDetector(python, SCRIPT, modelDir, lang, bytes, timeoutMs);
      return Array.isArray(result?.objects) ? result.objects : [];
    },
  };
}
