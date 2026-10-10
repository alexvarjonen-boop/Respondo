import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url),'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url),'utf8');
const css = readFileSync(new URL('../public/dashboard-answers-fix.css', import.meta.url),'utf8');

test('Answers section survives direct navigation via section query after login', () => {
  assert.match(app, /data-dashboard-view="answers" id="knowledge"/);
  assert.match(app, /data-dashboard-view="answers" id="unanswered"/);
  assert.match(app, /showDashboardView\(validDashboardViews\.has\(requestedView\) \? requestedView : 'overview'/);
  assert.match(css, /#knowledge:not\(\.dashboard-view-hidden\)/);
  assert.match(css, /#knowledge\.dashboard-view-hidden/);
  assert.match(css, /#unanswered\.dashboard-view-hidden/);
});

test('large answer libraries support search and progressive disclosure without losing item handlers', () => {
  for (const term of [
    'id="knowledgeSearch"',
    'id="knowledgeVisibleCount"',
    'id="knowledgeLoadMore"',
    'const knowledgePageSize = 24',
    'knowledgeSearch?.addEventListener',
    'knowledgeLoadMore?.addEventListener',
    'item.hidden = !visible',
    'knowledge-edit-btn',
    'knowledge-delete-btn',
    'knowledge-feature-btn',
    'api(\'/api/app/knowledge\'',
  ]) assert.ok(app.includes(term),'Missing Answers functionality: '+term);
  assert.match(css,/\.knowledge-item\[hidden\]/);
  assert.match(css,/#knowledgeLoadMore\[hidden\]/);
});

test('Answers form remains editable and uses readable language-aware labels', () => {
  for (const input of ['knowledgeCategory','knowledgeTitle','knowledgeAnswer','knowledgeKeywords']) {
    assert.ok(app.includes('id="'+input+'"'),'Missing field '+input);
  }
  assert.match(app,/Hae tallennetuista vastauksista/);
  assert.match(app,/Sök bland sparade svar/);
  assert.match(app,/Search saved answers/);
  assert.match(app,/Tallenna vastaus/);
  assert.match(app,/Hyväksytty vastaus/);
  assert.match(css,/#knowledge \u002eadd-knowledge \u003e \u002edashboard-action/);
  assert.match(css,/font-size:16px!important/);
});

test('small-screen Answers fixes load after other CSS layers', () => {
  const late = html.lastIndexOf('dashboard-answers-fix.css');
  const header = html.lastIndexOf('mobile-header-stability.css');
  assert.ok(header>=0 && late > header);
  assert.match(css,/@media \(max-width:1024px\)/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css,/#knowledge \u003e \u002eadd-knowledge/);
  assert.match(css,/#knowledge \u003e \u002eknowledge-panel/);
});
