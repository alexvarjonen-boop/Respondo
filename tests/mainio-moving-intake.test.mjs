import test from 'node:test';
import assert from 'node:assert/strict';
import {isMainioMovingTenant,mainioMoveActions,validateMainioMove,mainioMoveDetails,mainioBoxEstimate,MAINIO_TENANT_ID,MAINIO_QUOTE_URL} from '../mainio-moving-intake.mjs';
const good={
 consent:true,name:'Maija Muuttaja',contact:'040 123 4567',serviceType:'home',
 desiredDate:'2026-12-04',originAddress:'Turun katu 1',originCity:'Turku',
 originHousing:'apartment',originFloor:'4',originElevator:'no',originParking:'no',
 destinationAddress:'Kaarinan katu 2',destinationCity:'Kaarina',
 destinationHousing:'apartment',destinationFloor:'2',destinationElevator:'yes',destinationParking:'unknown',
 areaSqm:'58',ownBoxes:'no',boxCount:'55',carryingHelp:'yes',
 packingHelp:'no',storageNeeded:'unknown',specialItems:'Pesukone ja piano',notes:'Porraskäytävä kapea'
};
test('tenant-gated: no other company can receive Mainio-specific actions',()=>{
 assert.equal(isMainioMovingTenant({id:MAINIO_TENANT_ID,website:'https://mainiomuuttopalvelu.fi'}),true);
 assert.equal(isMainioMovingTenant({id:MAINIO_TENANT_ID,website:'https://example.fi'}),false);
 assert.equal(isMainioMovingTenant({id:'other',website:'https://mainiomuuttopalvelu.fi'}),false);
 assert.equal(mainioMoveActions('fi')[1].url,MAINIO_QUOTE_URL);
});
test('moving enquiry captures both addresses and both access conditions without inventing a price',()=>{
 const result=validateMainioMove(good,{today:'2026-11-01'});
 assert.ok(result.data, result.error);
 const summary=mainioMoveDetails(result.data);
 assert.match(summary,/Turun katu 1/);
 assert.match(summary,/Kaarinan katu 2/);
 assert.match(summary,/Lähtökerros: 4/);
 assert.match(summary,/Kohdekerros: 2/);
 assert.match(summary,/Toivotut vuokralaatikot \(kpl\): 55/);
 assert.match(summary,/ihmisen hyväksyntään/i);
 assert.doesNotMatch(summary,/vahvistettu tilaus|varattu aika|kiinteä hinta/i);
});
test('consent, contact, addresses, past date, size, floor and malformed dates are rejected',()=>{
 const cases=[
   {consent:false},{contact:'bad'}, {originAddress:''},{destinationCity:''},
   {desiredDate:'2026-02-30'},{desiredDate:'2026-01-01'},
   {areaSqm:'abc'}, {originFloor:''},{destinationFloor:''},
   {originHousing:'anything'}, {name:''},
 ];
 for(const update of cases)assert.ok(validateMainioMove({...good,...update},{today:'2026-11-01'}).error,JSON.stringify(update));
});
test('optional choices allow unknown and user details cannot escape bounded fields',()=>{
 const result=validateMainioMove({...good,originHousing:'detached',originFloor:'',destinationHousing:'detached',destinationFloor:'',notes:'a'.repeat(4000)},{today:'2026-11-01'});
 assert.ok(result.data);
 assert.equal(result.data.notes.length,850);
});

test('source-backed box guidance is explicitly a range, never a confirmed requirement',()=>{
 assert.deepEqual(mainioBoxEstimate(50),{min:40,max:50});
 assert.deepEqual(mainioBoxEstimate(58),{min:47,max:58});
 assert.equal(mainioBoxEstimate(0),null);
});
test('phone validation rejects punctuation-only fake phone numbers',()=>{
 assert.ok(validateMainioMove({...good,contact:'------'},{today:'2026-11-01'}).error);
});
