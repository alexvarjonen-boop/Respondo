import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const [i18n,app,server,index]=await Promise.all(['public/i18n.js','public/app.js','server.mjs','public/index.html'].map(path=>readFile(new URL(path,root),'utf8')));
function newVisitor(storage=new Map()){
  const document={documentElement:{lang:'en'},addEventListener(){},querySelectorAll(){return []}};
  const window={dispatchEvent(){}};
  vm.runInNewContext(i18n,{document,window,navigator:{language:'fi-FI'},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},CustomEvent:class {constructor(type,opts){this.type=type;this.detail=opts?.detail;}}});
  return {i18n:window.RespondoI18n,storage};
}
test('English is the default for a new visitor regardless of Finnish browser locale',()=>{
  const visitor=newVisitor();
  assert.equal(visitor.i18n.language,'en');
  assert.equal(visitor.storage.has('respondo_lang'),false);
});
test('Language switches to Finnish and Swedish remain persistent and reversible',()=>{
  const visitor=newVisitor();
  for(const lang of ['fi','sv','en']){
    visitor.i18n.setLanguage(lang);
    assert.equal(newVisitor(visitor.storage).i18n.language,lang);
  }
  for(const code of ['en','fi','sv']) assert.ok(app.includes("['"+code+"', '"));
});
test('SSR and cookie consent use the same default language as the client',()=>{
  assert.match(index,/<html lang="en">/);
  assert.ok(server.includes("return ['fi','sv','en'].includes(value) ? value : 'en';"));
  assert.ok(app.includes("return ['fi','sv','en'].includes(saved) ? saved : 'en';"));
  assert.ok(index.includes('localizeCookieUi(layer);'));
  assert.ok(server.includes('escapeHtml(seo.alternates.en)'));
});
