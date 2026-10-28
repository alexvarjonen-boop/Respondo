import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/traffic.html',import.meta.url),'utf8');
const begin=source.indexOf('const SL='),end=source.indexOf('const sl=',begin);
const templates=new Function('return '+source.slice(begin+9,end).trim().replace(/;$/,''))();

test('manual credential email templates contain real paragraphs, not visible escape codes',()=>{
 for(const lang of ['fi','sv','en']){
   const body=templates[lang].mail('customer@example.fi','strong temporary password');
   assert.ok(body.includes('\n\n'),lang+' must contain blank lines');
   assert.ok(!body.includes('\\n'),lang+' must not display literal backslash-n');
   assert.ok(body.includes('https://respondoai.fi/kirjaudu'));
   assert.ok(body.includes('customer@example.fi'));
 }
});
