import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('Google OAuth uses the already-registered www callback URI in production', () => {
  const start = source.indexOf('function oauthConfig(provider)');
  const end = source.indexOf("if (provider === 'apple')", start);
  assert.ok(start >= 0 && end > start);
  const config = source.slice(start, end);
  assert.match(config, /process\\.env\\.NODE_ENV === 'production'/);
  assert.match(config, /https:\\/\\/www\\.respondoai\\.fi\\/api\\/auth\\/oauth\\/google\\/callback/);
});

test('Google OAuth starts on apex without redirecting apex to www', () => {
  const start = source.indexOf("app.get('/api/auth/oauth/:provider/start'");
  const end = source.indexOf("app.get('/api/auth/oauth/google/callback'", start);
  assert.ok(start >= 0 && end > start);
  const route = source.slice(start, end);
  const canonical = "String(req.hostname || '').toLowerCase() !== 'respondoai.fi'";
  assert.ok(route.includes(canonical));
  assert.ok(route.includes("'https://respondoai.fi' + req.originalUrl"));
  assert.doesNotMatch(route, /res\\.redirect\\(302, 'https:\\/\\/www\\.respondoai\\.fi'/);
  assert.ok(route.indexOf("return res.redirect(302, 'https://respondoai.fi' + req.originalUrl)") < route.indexOf('setOauthState(res, nonce, provider)'));
});

test('Google Calendar authorization uses the same apex host as the session', () => {
  const start = source.indexOf("app.get('/api/app/google-calendar/start'");
  const end = source.indexOf("app.post('/api/app/google-calendar/disconnect'", start);
  assert.ok(start >= 0 && end > start);
  const route = source.slice(start, end);
  const canonical = route.indexOf('https://respondoai.fi/kirjaudu?next=calendar');
  const cookie = route.indexOf("setOauthState(res,nonce,'google')");
  assert.ok(canonical >= 0 && cookie > canonical);
  assert.match(route, /req\\.hostname/);
});
