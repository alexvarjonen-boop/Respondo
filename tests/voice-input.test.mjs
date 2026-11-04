import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [widget, preview, index] = await Promise.all([
  read('../public/widget.js'),
  read('../public/voice-preview.js'),
  read('../public/index.html')
]);

test('widget voice input is optional and never requires a paid speech API', () => {
  assert.match(widget, /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/);
  assert.match(widget, /if \(BrowserSpeechRecognition && window\.isSecureContext\)/);
  assert.match(widget, /id="voiceBtn" class="voice-btn" hidden/);
  assert.match(widget, /recognition\.lang = \{fi:'fi-FI', sv:'sv-SE', en:'en-US'\}/);
  assert.doesNotMatch(widget, /MediaRecorder|\/api\/speech-to-text|\/api\/transcribe/);
});

test('visitor can review recognised text before sending and can stop recording', () => {
  assert.match(widget, /input\.value = \[voiceDraft, heardText\]/);
  assert.match(widget, /Tarkista teksti ja lähetä\./);
  assert.match(widget, /activeRecognition\.stop\(\)/);
  assert.match(widget, /recognition\.abort\(\)/);
  assert.match(widget, /if \(!open\) cancelVoiceInput\(\)/);
  assert.match(widget, /form\.addEventListener\('submit', async \(event\)/);
  assert.match(widget, /await sendMessage\(input\.value\)/);
});

test('microphone errors preserve the ordinary text composer', () => {
  assert.match(widget, /'not-allowed'/);
  assert.match(widget, /'audio-capture'/);
  assert.match(widget, /'no-speech'/);
  assert.match(widget, /'network'/);
  assert.match(widget, /input\.readOnly = false/);
  assert.match(widget, /voiceButton\.disabled = false/);
});

test('dashboard preview supports dictation without replacing the demo send flow', () => {
  assert.match(index, /<script defer src="\/voice-preview\.js\?v=20261104-voice-v1"><\/script>/);
  assert.match(preview, /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/);
  assert.match(preview, /document\.querySelector\('#previewForm'\)/);
  assert.match(preview, /form\.addEventListener\('submit'/);
  assert.match(preview, /input\.value = \[originalText, transcript\]/);
  assert.match(preview, /fi: 'fi-FI', sv: 'sv-SE', en: 'en-US'/);
  assert.match(preview, /new MutationObserver\(scan\)/);
});
