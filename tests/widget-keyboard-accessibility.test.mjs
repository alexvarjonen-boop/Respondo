import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('mobile widget avoids automatic keyboard reactivation and announces new messages',()=>{
  const code=readFileSync(new URL('../public/widget.js',import.meta.url),'utf8');
  assert.match(code,/role="log" aria-live="polite" aria-relevant="additions text"/);
  assert.match(code,/const restoreKeyboardFocus = \(\) => !window\.matchMedia\?/);
  assert.match(code,/if \(restoreKeyboardFocus\(\)\) setTimeout\(\(\) => input\.focus\(\{preventScroll:true\}\), 50\)/);
  assert.match(code,/if\(productSheet\.hidden && restoreKeyboardFocus\(\)\) input\.focus\(\{preventScroll:true\}\)/);
  assert.match(code,/font-size:16px!important/);
});
