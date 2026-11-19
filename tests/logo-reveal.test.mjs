import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = file => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');

test('the inline homepage reveal uses the approved white Respondo arrow', () => {
  const path = source('respondo-symbol.svg').match(/<path d="([^"]+)"/)?.[1];
  assert.ok(path && source('spiral-hero.js').includes(path));
  assert.match(source('index.html'), /src="\/logo-reveal\.js\?v=20261119-inline-orbit-v1"/);
});

test('the arrow animates on entry and history restore, without blocking the hero', () => {
  for (const reduced of [false, true]) {
    const calls = [];
    let changed;
    let restore;
    const arrow = {animate: (...args) => calls.push(args)};
    vm.runInNewContext(source('logo-reveal.js'), {
      document: {getElementById: () => ({querySelector: () => arrow})},
      location: {pathname:'/'},
      matchMedia: () => ({matches:reduced}),
      MutationObserver: class {
        constructor(callback) { changed = callback; }
        observe() {}
      },
      addEventListener: (_, listener) => { restore = listener; }
    });
    changed();
    restore({persisted:false});
    assert.equal(calls.length, reduced ? 0 : 1);
    restore({persisted:true});
    assert.equal(calls.length, reduced ? 0 : 2);
  }
});
