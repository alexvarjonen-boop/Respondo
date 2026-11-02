import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioCustomerVoice,mainioServiceAreaVoice} from '../mainio-customer-voice.mjs';
import {mainioVerifiedMovingRouteReply,mainioSemanticGroundedReply} from '../server.mjs';

const area={
 id:'approved-area',source_type:'website',title:'Muuton toimialue',category:'Muuttopalvelut',
 source_url:'https://www.mainiomuuttopalvelu.fi/avaimet-kateen-muutto-vai-omatoiminen-muutto-vaihtoehdot-vertailussa',
 answer:'Mainio palvelee Turussa ja Varsinais-Suomessa, esimerkiksi Raisiossa, Kaarinassa, Liedossa, Maskussa ja Naantalissa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti ja toteutus sovitaan erikseen.'
};
test('verified Mainio domestic route replies use company first-person voice in FI SV EN',()=>{
 const q='onnistuuko muutto rovaniemeltä kuopioon';
 for(const [lang,required,forbidden] of [
   ['fi',/\b(?:Palvelemme|tarkistamme|meiltä)\b/i,/\bMainio (?:tarkistaa|palvelee|vahvistaa)\b/i],
   ['sv',/\b(?:Vi utför|vi kontrollerar|oss)\b/i,/\bMainio (?:utför|bekräftar)\b/i],
   ['en',/\b(?:We handle|we can|us)\b/i,/\bMainio (?:handles|confirms)\b/i]
 ]) {
   const reply=mainioVerifiedMovingRouteReply([area],q,lang);
   assert.ok(reply&&!reply.handoff,lang);
   assert.deepEqual(reply.sourceIds,[area.id],lang);
   assert.match(reply.answer,required,lang);
   assert.doesNotMatch(reply.answer,forbidden,lang);
   assert.doesNotMatch(reply.answer,/vahvistettu tilaus|confirmed booking|garanterad bokning/i,lang);
 }
});

test('Mainio service area answer is first-person but remains evidence-scoped',()=>{
 for(const [lang,pattern] of [
   ['fi',/^Palvelemme Turussa/],['sv',/^Vi betjänar Åbo/],['en',/^We serve Turku/]
 ]){
   const result=mainioSemanticGroundedReply([area],{intent:'service_area',confidence:97},lang);
   assert.match(result.answer,pattern);
   assert.deepEqual(result.sourceIds,[area.id]);
 }
 const without=mainioServiceAreaVoice('Palvelemme vain Turussa.','fi');
 assert.doesNotMatch(without,/muualle Suomeen/);
});

test('tenant-scoped grammatical conversion keeps service facts and safe caveats unchanged',()=>{
 assert.equal(
   mainioCustomerVoice('Mainio Muuttopalvelu tarjoaa muuttolaatikoiden vuokrausta. Mainio vahvistaa ajan erikseen.','fi'),
   'Tarjoamme muuttolaatikoiden vuokrausta. Vahvistamme ajan erikseen.'
 );
 assert.equal(mainioCustomerVoice('Mainio palvelee Turussa.','fi'),'Palvelemme Turussa.');
 assert.equal(mainioCustomerVoice('Mainio utför flyttar.','sv'),'Vi utför flyttar.');
 assert.equal(mainioCustomerVoice('Mainio offers moving services.','en'),'We offer moving services.');
 assert.equal(mainioCustomerVoice('Mainio ei tarjoa tätä palvelua.','fi'),'Mainio ei tarjoa tätä palvelua.');
 assert.equal(mainioCustomerVoice('Emme voi luvata vapaata aikaa.','fi'),'Emme voi luvata vapaata aikaa.');
});
