import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../public/effects.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const repair=css.split('/* 2026-10-01 desktop scene layout repair.')[1]||'';

test('desktop cards are constrained to their container, not viewport-sized typography',()=>{
 assert.ok(repair,'The final CSS repair must be loaded after the earlier scene styles');
 assert.match(repair,/\.immersive-home \.story-track\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\) !important/s);
 assert.match(repair,/\.immersive-home \.story-track\s*\{[^}]*transform:none !important/s);
 assert.match(repair,/\.immersive-home \.story-panel-copy h2\s*\{[^}]*font-size:clamp\(27px,2\.35vw,39px\) !important/s);
 assert.match(repair,/\.immersive-home \.story-panel-copy h2\s*\{[^}]*overflow-wrap:anywhere !important/s);
 assert.match(repair,/\.immersive-home \.story-panel\s*\{[^}]*min-width:0 !important/s);
 assert.match(repair,/\.immersive-home \.story-panel\s*\{[^}]*overflow:hidden !important/s);
});

test('3D process is reset to centered, non-overlapping desktop flow',()=>{
 assert.match(repair,/\.immersive-home \.motion-depth-sticky\s*\{[^}]*width:min\(100%,1120px\) !important/s);
 assert.match(repair,/\.immersive-home \.depth-copy\s*\{[^}]*text-align:center !important/s);
 assert.match(repair,/\.immersive-home \.depth-copy h2\s*\{[^}]*font-size:clamp\(38px,3\.5vw,56px\) !important/s);
 assert.match(repair,/\.immersive-home \.depth-stage\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\) !important/s);
 assert.match(repair,/\.immersive-home \.depth-card\s*\{[^}]*transform:none !important/s);
 assert.match(repair,/\.immersive-home \.depth-core\s*\{[^}]*grid-column:1\/-1 !important/s);
 assert.match(repair,/\.immersive-home \.depth-progress,[\s\S]*?\.immersive-home \.depth-caption\s*\{[^}]*display:none !important/s);
});

test('tablet and phone layouts remain responsive',()=>{
 assert.match(repair,/@media \(min-width:901px\) and \(max-width:1199px\)/);
 assert.match(repair,/@media \(min-width:761px\) and \(max-width:900px\)/);
 assert.match(repair,/@media \(max-width:760px\)/);
 assert.match(repair, /\.immersive-home \.depth-stage\s*\{[^}]*grid-template-columns:1fr !important/s);
 assert.match(repair,/\.immersive-home \.story-panel-copy h2,[\s\S]*?\.immersive-home \.depth-copy h2\s*\{[^}]*overflow-wrap:anywhere !important/s);
});

test('a normal three-card grid never receives a legacy sideways scroll transform',()=>{
 assert.match(app,/getComputedStyle\(storyTrack\)\.display === 'flex'/);
 assert.match(app,/storyTrack\.style\.removeProperty\('transform'\)/);
 assert.match(html,/effects\.css\?v=20261005-plans-v2/);
 assert.match(html,/app\.js\?v=20261005-plans-v2/);
});
