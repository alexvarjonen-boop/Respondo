// Geographic wording audit: domestic-town detection only supports a quote
// request, never a promise that the move is booked or available on that date.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioPriorityDomesticRouteAnswer} from '../server.mjs';
import {mainioOfficialPublicFacts} from '../mainio-official-public-facts.mjs';
const facts=mainioOfficialPublicFacts();
const area=facts.find(r=>r.title==='Muuton toimialue');
const pairs=[
 ['Rovaniemeltä','Turkuun'],['Turusta','Rovaniemelle'],
 ['Helsingistä','Tampereelle'],['Tampereelta','Helsinkiin'],
 ['Kaarinasta','Raisioon'],['Porista','Ouluun'],
 ['Kuopiosta','Joensuuhun'],['Vaasasta','Seinäjoelle'],
 ['Kotkasta','Lappeenrantaan'],['Naantalista','Kaarinaan']
];
test('Finnish moving-route paraphrases keep the official service-area fact and do not promise a booking',()=>{
  let checked=0;const failed=[];
  for(const [from,to] of pairs){
    const qs=[
      'Onnistuuko muutto '+from+' '+to+'?',
      'Voitteko hoitaa muuton '+from+' '+to+'?',
      'Tarvitsen muuttoapua '+from+' '+to+', onnistuuko?',
      'Mummon tavaroille tarvis muuton '+from+' '+to+', onnistuisiko?',
      'Hei! Onnistuuko muutto '+from+' '+to+'?',
    ];
    for(const question of qs){
      checked++;
      try{
        const r=mainioPriorityDomesticRouteAnswer(facts,question,'fi');
        assert.ok(r && !r.handoff,question);
        assert.deepEqual(r.sourceIds,[area.id],question);
        assert.match(r.answer,/tarkistamme erikseen/);
        assert.doesNotMatch(r.answer,/varaus on vahvistettu|huomiseksi varmasti|on varmasti saatavilla/);
      }catch(e){failed.push({question,reason:e.message.slice(0,200)});}
    }
  }
  assert.equal(checked,50);
  assert.equal(failed.length,0,JSON.stringify({checked,failed:failed.length,examples:failed.slice(0,25)},null,2));
});
test('English and Swedish route phrasings support verified Finnish endpoints',()=>{
  const examples=[
    ['en','Can you help with a move from Helsinki to Turku?'],
    ['en','Do you offer moves from Tampere to Oulu?'],
    ['sv','Kan ni hjälpa med flytt från Helsingfors till Åbo?'],
    ['sv','Kan ni ordna flytt från Åbo till Helsingfors?']
  ];
  for(const [lang,question] of examples){
    const result=mainioPriorityDomesticRouteAnswer(facts,question,lang);
    assert.ok(result&&!result.handoff,question);
    assert.deepEqual(result.sourceIds,[area.id]);
    assert.ok(!/booking confirmed|bekräftad bokning/.test(result.answer));
  }
});
test('foreign destinations must never inherit domestic coverage from a city mentioned en route',()=>{
  const queries=[
    'Onnistuuko muutto Helsingistä Tallinnaan Turun kautta?',
    'Onnistuuko muutto Rovaniemeltä Tukholmaan?',
    'Voitteko hoitaa muuton Turusta Tukholmaan?',
    'Move from Helsinki to Tallinn via Turku',
    'Flytt från Åbo till Stockholm via Helsingfors',
  ];
  for(const question of queries)
    assert.equal(mainioPriorityDomesticRouteAnswer(facts,question,'fi'),null,question);
});
