import test from 'node:test';
import assert from 'node:assert/strict';
import {isMainioPublicDemoWebsite} from '../mainio-public-demo-identity.mjs';

test('Mainio demo accepts exact Mainio host from current website field or verified import ID',()=>{
 assert.equal(isMainioPublicDemoWebsite({
  isPublicDemo:true,enteredDemoHost:'mainiomuuttopalvelu.fi',importedDemoHost:''}),true);
 assert.equal(isMainioPublicDemoWebsite({
  isPublicDemo:true,enteredDemoHost:'',importedDemoHost:'mainiomuuttopalvelu.fi'}),true);
 assert.equal(isMainioPublicDemoWebsite({
  isPublicDemo:true,enteredDemoHost:'mainiomuuttopalvelu.fi',
  importedDemoHost:'mainiomuuttopalvelu.fi'}),true);
});
test('other sites, mismatched imports and non-public previews cannot claim Mainio identity',()=>{
 for(const input of [
  {isPublicDemo:false,enteredDemoHost:'mainiomuuttopalvelu.fi'},
  {isPublicDemo:true,enteredDemoHost:'othercompany.fi',importedDemoHost:'mainiomuuttopalvelu.fi'},
  {isPublicDemo:true,enteredDemoHost:'mainiomuuttopalvelu.fi',importedDemoHost:'othercompany.fi'},
  {isPublicDemo:true,enteredDemoHost:'mainiomuuttopalvelu.fi.evil.test'},
  {isPublicDemo:true,enteredDemoHost:'notmainiomuuttopalvelu.fi'},
  {isPublicDemo:true,enteredDemoHost:'',importedDemoHost:''},
  {isPublicDemo:true,enteredDemoHost:'Mainio Muuttopalvelu'},
 ])assert.equal(isMainioPublicDemoWebsite(input),false,JSON.stringify(input));
});
