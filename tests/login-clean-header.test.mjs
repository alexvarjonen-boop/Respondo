import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('login and signup pages hide redundant header trial CTAs', () => {
  const start = app.indexOf('function nav() {');
  const end = app.indexOf('function bindHomeHeroActions()', start);
  const nav = app.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(nav, /const isLoginPage = \['\/kirjaudu','\/login'\]\.includes\(location\.pathname\)/);
  assert.match(nav, /const isSignupPage = location\.pathname === '\/tilaus'/);
  assert.match(nav, /!isHomePage && !isLoginPage && !isSignupPage \? `<a class="btn ink" href="\/tilaus">/);
  assert.match(nav, /<a class="btn ghost nav-login-btn"/);
  assert.match(nav, /: isLoginPage \? '' : `<a class="btn ghost nav-login-btn"/);
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

test('employee login card has its own column and bounded readable headings', () => {
  const css = readFileSync(new URL('../public/login-page-refinement.css', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /login-page-refinement\.css\?v=20261011-login-card-layout-v1/);
  assert.match(css, /\.login-layout > \.agent-login-card\s*\{[^}]*grid-column:\s*2/s);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /\.agent-login-card \.form-head\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(css, /\.agent-login-card \.form-head > b\s*\{[^}]*overflow-wrap:\s*break-word/s);
  assert.match(css, /\.agent-login-card \.agent-login-fields \.checkout-button\s*\{[^}]*white-space:\s*normal/s);
});
