import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {avatarContainRect} from '../public/avatar-contain.js';

const projectFile=(name)=>readFile(new URL('../public/'+name,import.meta.url),'utf8');
const [app,widget,styles,wcss,guided,html]=await Promise.all([
 projectFile('app.js'),projectFile('widget.js'),projectFile('styles.css'),
 projectFile('workspace-continuation-v24.css'),projectFile('guided-setup-v22.css'),projectFile('index.html')
]);
const fits=(rect,size=256,padding=12)=>{
 assert.ok(rect.x>=padding-0.00001);
 assert.ok(rect.y>=padding-0.00001);
 assert.ok(rect.x+rect.width<=size-padding+0.00001);
 assert.ok(rect.y+rect.height<=size-padding+0.00001);
};
test('landscape moving-company logo stays completely visible with original aspect ratio',()=>{
 const rect=avatarContainRect(1920,480);
 fits(rect);
 assert.equal(rect.width,232);
 assert.equal(rect.height,58);
 assert.equal(rect.x,12);
 assert.equal(rect.y,99);
});
test('portrait logo and square icons remain centered and completely visible',()=>{
 const portrait=avatarContainRect(360,1440);
 fits(portrait);
 assert.equal(portrait.width,58);
 assert.equal(portrait.height,232);
 assert.equal(portrait.x,99);
 assert.equal(portrait.y,12);
 const square=avatarContainRect(500,500);
 fits(square);
 assert.deepEqual(square,{x:12,y:12,width:232,height:232});
});
test('extreme wide/narrow logos never crop for any side length',()=>{
 for(const [w,h] of [[16000,100],[100,16000],[4000,900],[900,4000],[4096,4096],[1,10000]]){
  const rect=avatarContainRect(w,h,256,10);
  fits(rect,256,10);
  assert.ok(Math.abs(rect.width/rect.height-w/h)<0.000001,JSON.stringify({w,h,rect}));
 }
});
test('invalid image geometry is rejected rather than giving corrupted coordinates',()=>{
 for(const pair of [[0,40],[-5,300],[200,0],[NaN,500],[Infinity,42]]){
  assert.throws(()=>avatarContainRect(...pair));
 }
 assert.throws(()=>avatarContainRect(120,80,256,150));
});
test('existing uploader preserves the entire source image, not middle-crop square',()=>{
 assert.match(app,/avatarContainRect\(img\.naturalWidth,img\.naturalHeight,256,10\)/);
 assert.match(app,/ctx\.drawImage\(img,fitted\.x,fitted\.y,fitted\.width,fitted\.height\)/);
 assert.match(app,/ctx\.clearRect\(0,0,256,256\)/);
 assert.match(app,/canvas\.toDataURL\('image\/webp'/);
 assert.match(app,/canvas\.toDataURL\('image\/png'\)/);
 assert.doesNotMatch(app,/const side = Math\.min\(img\.naturalWidth,img\.naturalHeight\)/);
 assert.doesNotMatch(app,/ctx\.drawImage\(img,sx,sy,side,side/);
});
test('public customer widget always uses contain for header avatar and launcher',()=>{
 assert.match(widget,/\.mark svg,\.mark img\{[^}]*object-fit:contain\}/);
 assert.match(widget,/\.launcher-avatar svg,\.launcher-avatar img\{[^}]*object-fit:contain\}/);
});
test('dashboard avatars, setup preview and after-setup avatar picker use contain',()=>{
 for(const selector of ['.bot-current-avatar svg,.bot-current-avatar img',
  '.bot-avatar-option svg,.bot-avatar-option img',
  '.preview-avatar svg,.preview-avatar img']){
  assert.match(styles,new RegExp(selector.replaceAll('.','\\.').replaceAll(',','\\,')+'\\{[^}]*object-fit:contain\\}'));
 }
 assert.match(guided,/\.guided-avatar-option svg,\.guided-avatar-option img\{[^}]*object-fit:contain\}/);
 assert.match(guided,/\.guided-bot-preview svg,\.guided-bot-preview img\{[^}]*object-fit:contain\}/);
 assert.match(wcss,/\.rs-avatar-preview img,[\s\S]*?object-fit:contain/);
 assert.match(wcss,/\.rs-avatar-thumbnail img,[\s\S]*?object-fit:contain/);
 assert.match(html,/avatar-logo-fit-v42/);
});
