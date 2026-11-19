import test from 'node:test';
import assert from 'node:assert/strict';
import {measuredWindows} from '../public/window-measure.mjs';
const points = (x1,y1,x2,y2) => [{x:x1,y:y1},{x:x2,y:y2}];

test('calibrated opposing corners return rounded widths and heights',()=>{
  const markings=[points(100,110,20,30),points(50,50,230,130)];
  assert.deepEqual(measuredWindows(markings,{points:points(10,20,110,20),centimetres:75}),
    [{width:60,height:60},{width:135,height:60}]);
});

test('missing or zero-length reference never invents dimensions',()=>{
  const markings=[points(30,50,40,80)];
  assert.deepEqual(measuredWindows(markings),[null]);
  assert.deepEqual(measuredWindows(markings,{points:points(0,0,0,0),centimetres:120}),[null]);
});
