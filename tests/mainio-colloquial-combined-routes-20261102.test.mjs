// Customer-style Finnish route stress tests; uses the production intent
// functions with synthetic questions. No customer conversations or API calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioMovingRouteIntent,mainioRecognizedDomesticRoute,
  mainioInquiryKind,mainioInquiryActions,MAINIO_BOX_RENTAL_URL,
  MAINIO_VAN_RENTAL_URL} from '../mainio-moving-intake.mjs';
import {interpretMainioLocalIntent} from '../mainio-semantic-intent.mjs';

const cities=[
 ['Turusta','Turkuun'],['Porista','Poriin'],['Rovaniemeltä','Rovaniemelle'],
 ['Kuopiosta','Kuopioon'],['Helsingistä','Helsinkiin'],
 ['Tampereelta','Tampereelle'],['Oulusta','Ouluun'],
 ['Espoosta','Espooseen'],['Vantaalta','Vantaalle'],
 ['Jyväskylästä','Jyväskylään'],['Vaasasta','Vaasaan'],
 ['Kaarinasta','Kaarinaan'],['Raisiosta','Raisioon'],
 ['Naantalista','Naantaliin'],['Salosta','Saloon'],
 ['Kotkasta','Kotkaan'],['Kouvolasta','Kouvolaan'],
 ['Mikkelistä','Mikkeliin'],['Porvoosta','Porvooseen'],
 ['Seinäjoelta','Seinäjoelle'],['Lappeenrannasta','Lappeenrantaan'],
 ['Hämeenlinnasta','Hämeenlinnaan'],['Joensuusta','Joensuuhun'],
 ['Lahdesta','Lahteen'],
];
const prefixes=[s=>s,s=>'Moi! '+s,s=>'Hei, '+s];
const routeCheck=q=>{
 assert.equal(mainioInquiryKind(q),'moving',q);
 assert.equal(mainioMovingRouteIntent(q),true,q);
 assert.equal(mainioRecognizedDomesticRoute(q),true,q);
 assert.equal(interpretMainioLocalIntent(q)?.intent,'moving_route',q);
 assert.equal(mainioInquiryActions(q,'fi')[0]?.mode,'mainio_move_form',q);
};

test('9,936 first-person and colloquial city-to-city moving requests keep their route intent',()=>{
 let count=0;
 const forms=[
  (a,b)=>'Muutan '+a+' '+b+', tarvitsen muuttoapua.',
  (a,b)=>'Muutamme '+a+' '+b+', tarvitaan muuttolaatikoita.',
  (a,b)=>'Muuttaisin '+a+' '+b+', osaatteko auttaa?',
  (a,b)=>'Muutasin '+a+' '+b+', saaks teiltä apua?',
  (a,b)=>'Muutetaan '+a+' '+b+' ensi kuussa.',
  (a,b)=>'Ollaan muuttamassa '+a+' '+b+', tarvis paku mukaan.'
 ];
 for(let a=0;a<cities.length;a++)for(let b=0;b<cities.length;b++){
  if(a===b)continue;
  for(const form of forms)for(const prefix of prefixes){
   const q=prefix(form(cities[a][0],cities[b][1]));
   routeCheck(q);count++;
  }
 }
 assert.equal(count,9936);
});

test('1,656 primary moving-route questions with extra box/van rental intent remain moving requests',()=>{
 let count=0;
 const forms=[
  (a,b)=>'Onnistuuko muutto '+a+' '+b+', ja voinko vuokrata muuttolaatikoita?',
  (a,b)=>'Teettekö muuttoja '+a+' '+b+' ja voiko samalla vuokrata pakettiauton?',
  (a,b)=>'Voitteko hoitaa muuton '+a+' '+b+' ja vuokrata muuttolaatikoita?',
 ];
 for(let a=0;a<cities.length;a++)for(let b=0;b<cities.length;b++){
  if(a===b)continue;
  for(const form of forms){routeCheck(form(cities[a][0],cities[b][1]));count++;}
 }
 assert.equal(count,1656);
});

test('a van or boxes RENTED for a move are not mistaken for ordering a moving service',()=>{
 for(const [from,to] of cities.slice(0,10))for(const q of [
  'Voinko vuokrata pakettiauton muuttoon '+from+' '+to+'?',
  'Haluaisin vuokrata muuttolaatikoita muuttoon '+from+' '+to+'.'
 ]){
  const van=/pakettiaut/.test(q);
  assert.equal(mainioInquiryKind(q),van?'van':'boxes',q);
  assert.equal(mainioMovingRouteIntent(q),false,q);
  const actions=mainioInquiryActions(q,'fi');
  assert.equal(actions.length,1,q);
  assert.equal(actions[0].url,van?MAINIO_VAN_RENTAL_URL:MAINIO_BOX_RENTAL_URL,q);
 }
});
