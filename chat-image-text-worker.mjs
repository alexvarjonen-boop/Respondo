import { parentPort, workerData } from 'node:worker_threads';
import { createWorker } from 'tesseract.js';

const { bytes, langPath, languages } = workerData;
const worker = await createWorker(languages, 1, {
  langPath,
  gzip: false,
  cacheMethod: 'none',
  errorHandler: () => {},
});
try {
  const { data } = await worker.recognize(Buffer.from(bytes));
  parentPort.postMessage({text: data.text.slice(0, 8_192), moreText: data.text.length > 8_192, confidence: data.confidence});
} finally {
  await worker.terminate();
}
