import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');

test('Google sign-in always uses the official www callback in production', () => {
  const start = source.indexOf("function oauthConfig(provider)");
  const end = source.indexOf("if (provider === 'apple')",start);
  assert.ok(start>=0 && end>start);
  const config=source.slice(start,end);
  assert.match(config,/process\.env\.NODE_ENV === 'production'/);
  assert.match(config,/https:\/\/www\.respondoai\.fi\/api\/auth\/oauth\/google\/callback/);
  assert.match(config,/BASE \+ '\/api\/auth\/oauth\/google\/callback'/);
});

test('Google sign-in started from old Railway alias moves to www before creating the CSRF cookie',()=>{
  const start=source.indexOf("app.get('/api/auth/oauth/:provider/start'");
  const end=source.indexOf("app.get('/api/auth/oauth/google/callback'",start);
  assert.ok(start>=0 && end>start);
  const route=source.slice(start,end);
  const redirect=route.indexOf("return res.redirect(302, 'https://www.respondoai.fi' + req.originalUrl)");
  const cookie=route.indexOf("setOauthState(res, nonce, provider)");
  assert.ok(redirect>=0 && cookie>redirect);
  assert.match(route,/req\.hostname/);
  assert.match(route,/provider === 'google'/);
});

test('Google Calendar authorization never creates a state cookie on a host other than www',()=>{
  const start=source.indexOf("app.get('/api/app/google-calendar/start'");
  const end=source.indexOf("app.post('/api/app/google-calendar/disconnect'",start);
  const route=source.slice(start,end);
  const canonical=route.indexOf('https://www.respondoai.fi/kirjaudu?next=calendar');
  const cookie=route.indexOf("setOauthState(res,nonce,'google')");
  assert.ok(canonical>=0 && cookie>canonical);
});
