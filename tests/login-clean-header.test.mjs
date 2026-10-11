import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('only login page hides the public header trial CTA', () => {
  const start = app.indexOf('function nav() {');
  const end = app.indexOf('function bindHomeHeroActions()', start);
  const nav = app.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(nav, /const isLoginPage = \['\/kirjaudu','\/login'\]\.includes\(location\.pathname\)/);
  assert.match(nav, /!isHomePage && !isLoginPage \? `<a class="btn ink" href="\/tilaus">/);
  assert.match(nav, /<a class="btn ghost nav-login-btn"/);
  assert.match(nav, /nav-home-scroll-trial/);
});

test('login card has no repeated welcome heading and keeps all sign-in methods', () => {
  const start = app.indexOf('function login() {');
  const end = app.indexOf('function agentLoginDialog()', start);
  const login = app.slice(start, end);
  assert.ok(start >= 0 && end > start);
  const cardStart = login.indexOf('<form class="formcard premium-form login-card"');
  const cardEnd = login.indexOf('<section class="formcard premium-form agent-login-card">', cardStart);
  const card = login.slice(cardStart,cardEnd);
  assert.match(card, /<div class="form-head"><span>\$\{appText\('KIRJAUDU','LOGGA IN','LOG IN'\)\}<\/span><\/div>/);
  assert.doesNotMatch(card, /Tervetuloa takaisin|Välkommen tillbaka|Welcome back/);
  assert.match(card, /socialAuthButtons\('login'\)/);
  assert.match(card, /name="email"/);
  assert.match(card, /name="password"/);
  assert.match(card, /type="submit"/);
});
