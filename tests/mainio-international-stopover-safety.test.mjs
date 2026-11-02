import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioMovingRouteIntent,mainioRecognizedDomesticRoute} from '../mainio-moving-intake.mjs';
import {mainioPriorityDomesticRouteAnswer} from '../server.mjs';
import {interpretMainioLocalIntent} from '../mainio-semantic-intent.mjs';

const source={
  id:'mainio-route-source',title:'Muuton toimialue',
  category:'Muuttopalvelut',approved:true,source_type:'website',
  source_url:'https://www.mainiomuuttopalvelu.fi/avaimet-kateen-muutto-vai-omatoiminen-muutto-vaihtoehdot-vertailussa',
  answer:'Mainio palvelee Turussa ja Varsinais-Suomessa. Muutot voivat suuntautua myös muualle Suomeen; tarkka reitti ja toteutus sovitaan erikseen.'
};

test('international move with incidental Finnish cities never becomes approved domestic route',()=>{
  const foreign=[
    'Onnistuuko muutto Helsingistä Tallinnaan Turun kautta?',
    'Teettekö muuttoja Turusta Tukholmaan Helsingin kautta?',
    'Oisko muutto Porista Berliiniin Tampereen kautta?',
    'Pitäisi muuttaa Kuopiosta Osloon Joensuun kautta.',
    'Muutatteko Oulusta Lontooseen Helsingin kautta?',
    'Can you arrange a moving service from Helsinki to Tallinn via Turku?',
    'Can you arrange a moving service from Turku to Stockholm via Helsinki?',
    'Kan ni ordna flytt från Åbo till Stockholm via Helsingfors?',
  ];
  for(const q of foreign){
    assert.equal(mainioMovingRouteIntent(q),true,q);
    assert.equal(mainioRecognizedDomesticRoute(q),false,q);
    assert.equal(mainioPriorityDomesticRouteAnswer([source],q,'fi',
      interpretMainioLocalIntent(q)),null,q);
  }
});

test('24-city domestic route stress suite remains valid after checking actual endpoints',()=>{
  // The separate 5,520-case suite tests all 24x23 pairs and 10 templates.
  const domestic=[
    ['Onnistuuko muutto Rovaniemeltä Turkuun?','fi'],
    ['Ois muutto Oulusta Helsinkiin','fi'],
    ['Teettekö muuttoja Tampereelta Kuopioon?','fi'],
    ['Muuttaisittekö Joensuusta Turkuun?','fi'],
    ['Muutto Turusta Turkuun, onnistuuko?','fi'],
    ['Can you arrange a moving service from Rovaniemi to Turku?','en'],
    ['Kan ni ordna flytt från Rovaniemi till Åbo?','sv'],
  ];
  for(const [q,lang] of domestic){
    assert.equal(mainioMovingRouteIntent(q),true,q);
    assert.equal(mainioRecognizedDomesticRoute(q),true,q);
    const ans=mainioPriorityDomesticRouteAnswer([source],q,lang,
      interpretMainioLocalIntent(q));
    assert.ok(ans&&!ans.handoff,q);
    assert.deepEqual(ans.sourceIds,[source.id],q);
    assert.doesNotMatch(ans.answer,/confirmed booking|vahvistettu tilaus|vahvistettu varaus/i,q);
  }
});
