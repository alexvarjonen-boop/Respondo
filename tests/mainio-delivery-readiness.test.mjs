import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateMainioMove,mainioMoveDetails,mainioMoveActions,isMainioMovingTenant,MAINIO_TENANT_ID} from '../mainio-moving-intake.mjs';

const details={
  consent:true,
  serviceType:'home',
  desiredDate:'2026-12-12',
  areaSqm:'85',
  name:'Esimerkki Testaaja',
  contact:'test@example.com',extraContact:'+358 40 123 4567',
  originAddress:'Esimerkkikatu 5',originCity:'Rovaniemi',originHousing:'apartment',
  originFloor:'3',originElevator:'no',originParking:'no',
  destinationAddress:'Koekatu 2',destinationCity:'Turku',destinationHousing:'apartment',
  destinationFloor:'2',destinationElevator:'yes',destinationParking:'yes',
  ownBoxes:'no',boxCount:'68',
  carryingHelp:'yes',packingHelp:'yes',storageNeeded:'no',
  specialItems:'Piano',notes:'Kantoreitti 30 metriä',
  wholeApartment:'yes',yearsAtCurrentHome:'3 vuotta'
};

test('Mainio moving quote is validated with consent, and full contact details are in handoff summary',()=>{
  const result=validateMainioMove(details,{today:'2026-11-01'});
  assert.ok(result.data,result.error);
  const summary=mainioMoveDetails(result.data);
  for(const value of ['Esimerkki Testaaja','test@example.com','Rovaniemi','Turku',
      'Esimerkkikatu 5','Koekatu 2','Piano','Kantoreitti 30 metriä','3 vuotta','Muutetaanko koko asunto','+358 40 123 4567']){
    assert.ok(summary.includes(value),value);
  }
  assert.ok(summary.includes('Hinta, muuttopäivän saatavuus'));
  assert.ok(summary.includes('Palvelu: Kotimuutto'));
  assert.ok(summary.includes('Lähtökohteen tyyppi: Kerrostalo'));
  assert.ok(summary.includes('Muutetaanko koko asunto: Kyllä'));
  assert.ok(!summary.includes('Lähtökohteen tyyppi: apartment'));
  assert.ok(summary.indexOf('Esimerkki Testaaja')<summary.indexOf('Esimerkkikatu 5'));
});

test('Mainio form blocks missing consent, bad dates, addresses and apartment floor',()=>{
  const cases=[
    {...details,consent:false},
    {...details,desiredDate:'2026-10-01'},
    {...details,originAddress:'A'},
    {...details,destinationFloor:''},
    {...details,contact:'bogus'},
    {...details,extraContact:'bad'}
  ];
  for(const candidate of cases){
    assert.ok(validateMainioMove(candidate,{today:'2026-11-01'}).error,JSON.stringify(candidate));
  }
});

test('only Mainio configured tenant may expose moving quote workflow',()=>{
  assert.ok(isMainioMovingTenant({id:MAINIO_TENANT_ID,website:'https://mainiomuuttopalvelu.fi'}));
  assert.equal(isMainioMovingTenant({id:'00000000-0000-0000-0000-000000000000',website:'https://mainiomuuttopalvelu.fi'}),false);
  assert.equal(isMainioMovingTenant({id:MAINIO_TENANT_ID,website:'https://example.com'}),false);
  for(const lang of ['fi','sv','en']){
    const actions=mainioMoveActions(lang);
    assert.ok(actions.some(x=>x.mode==='mainio_move_form'),lang);
    assert.ok(actions.some(x=>x.url==='https://tarjous.mainiomuuttopalvelu.fi/'),lang);
  }
});

test('Mainio owner notification only follows safe persistence and is scoped to verified email',async()=>{
  const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
  const writer=server.indexOf('INSERT INTO action_requests(id,tenant_id,visitor_ref,request_type');
  const notifier=server.indexOf('mailResult=await notifyMainioMoveOwner(');
  assert.ok(writer>=0&&notifier>writer,'notification only after request exists');
  assert.match(server,/cleanEmail\(tenant\.contact_email\)!=='info@mainiomuuttopalvelu\.fi'/);
  assert.match(server,/if\(mainioMoveRequest\)\{/);
  assert.match(server,/notifyMainioMoveOwner\(tenant,id,validatedMainio\.data\)/);
});
