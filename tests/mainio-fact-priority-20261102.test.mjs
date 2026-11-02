// Deterministic Mainio customer-phrasing regression with approved
// public website facts. These are local routing checks, not live chat calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mainioPublicFactAnswer} from '../mainio-public-fact-answer.mjs';

const sourceUrl='https://www.mainiomuuttopalvelu.fi/muuttolaatikot-ja-tarvikkeet';
const rows=[
  {id:'rental-source',title:'Muuttolaatikoiden hinta',category:'Muuttolaatikot',
    answer:'Muuttolaatikoiden vuokra maksaa 0,20 euroa laatikolta vuorokaudessa. Minimilaskutus on 10 euroa.',
    source_type:'website',source_url:sourceUrl,approved:true},
  {id:'delivery-source',title:'Laatikoiden kuljetusmaksu',category:'Muuttolaatikot',
    answer:'Laatikoiden toimitus ja nouto maksaa 25 euroa ajokerralta Turkuun, Raisioon, Kaarinaan, Maskuun, Lietoon ja Naantaliin. Muualle sopimuksen mukaan.',
    source_type:'website',source_url:sourceUrl,approved:true},
  {id:'quantity-source',title:'Kuinka monta muuttolaatikkoa tarvitsen?',category:'Muuttolaatikot',
    answer:'Muuttolaatikoita tarvitaan suuntaa-antavasti 0,8–1 kappaletta asuinneliötä kohti.',
    source_type:'website',source_url:'https://www.mainiomuuttopalvelu.fi/usein-muutosta-kysyttya',approved:true},
];
const check=(q,id,required)=>{
  const reply=mainioPublicFactAnswer(rows,q,'fi');
  assert.ok(reply&&!reply.handoff,q);
  assert.deepEqual(reply.sourceIds,[id],q);
  assert.match(reply.answer,required,q);
};
const wrappers=[
  q=>q,
  q=>'Hei, '+q,
  q=>'Moi! '+q,
  q=>'Kysymys: '+q,
  q=>q+' Kiitos!',
];

test('400 delivery fee phrasings use verified 25-euro delivery, not 0,20-euro rental price',()=>{
  const towns=['Turkuun','Raisioon','Kaarinaan','Maskuun','Lietoon',
    'Naantaliin','kotiin Turkuun','kotiin Raisioon','kotiin Kaarinaan','kotiin Naantaliin'];
  const templates=[
    x=>'Paljonko muuttolaatikoiden toimitus maksaa '+x+'?',
    x=>'Mitä laatikoiden kuljetus maksaa '+x+'?',
    x=>'Mikä on muuttolaatikoiden toimituksen hinta '+x+'?',
    x=>'Minkä verran laatikoiden kuljetus maksaa '+x+'?',
    x=>'Onko laatikoiden kotiinkuljetus ilmainen '+x+'?',
    x=>'Mitä laatikoiden kuljetus maksaa '+x+'?',
    x=>'Laatikoiden toimitusmaksu, paljonko se on '+x+'?',
    x=>'Paljonko maksaa laatikoiden toimitus '+x+'?',
  ];
  let count=0;
  for(const town of towns)for(const template of templates)for(const wrap of wrappers){
    check(wrap(template(town)),'delivery-source',/25 euroa/); count++;
  }
  assert.equal(count,400);
});

test('640 needed-box quantity phrasings never show a rental price',()=>{
  const areas=['20','25','30','35','40','45','50','55','60','65','70','75','80','85','90','100'];
  const templates=[
    x=>'Montako muuttolaatikkoa tarvitsen '+x+' neliön asuntoon?',
    x=>'Kuinka monta laatikkoa tarvitaan '+x+' m2 asuntoon?',
    x=>'Paljonko muuttolaatikoita tarvitaan '+x+' neliölle?',
    x=>'Kuinka paljon muuttolaatikoita tarvitsisin '+x+' neliöön?',
    x=>'Paljonko laatikoita pitää varata '+x+' neliöön?',
    x=>'Paljonko muuttolaatikoita kannattaa varata '+x+' neliöön?',
    x=>'Mikä on laatikoiden määrä '+x+' neliön asuntoon?',
    x=>'Riittääkö '+x+' muuttolaatikkoa vai tarvitsenko enemmän?',
  ];
  let count=0;
  for(const area of areas)for(const template of templates)for(const wrap of wrappers){
    check(wrap(template(area)),'quantity-source',/0,8–1/); count++;
  }
  assert.equal(count,640);
});

test('320 actual rental-price phrasings still use 0,20 euros per box per day',()=>{
  const contexts=['viikoksi','päiväksi','kuukaudeksi','nyt',
    'minun muuttoon','tänään','loppuviikosta','ensi kuussa'];
  const templates=[
    x=>'Mitä muuttolaatikon vuokra maksaa '+x+'?',
    x=>'Paljonko muuttolaatikoiden vuokra maksaa '+x+'?',
    x=>'Mikä on muuttolaatikoiden vuokrahinta '+x+'?',
    x=>'Paljonko laatikot maksavat vuokralla '+x+'?',
    x=>'Mitä maksaa muuttolaatikon vuokraaminen '+x+'?',
    x=>'Kuinka paljon maksaa laatikoiden vuokra '+x+'?',
    x=>'Muuttolaatikoiden vuokrauksen hinta '+x+'?',
    x=>'Mikä on laatikoiden kappalehinta vuokratessa '+x+'?',
  ];
  let count=0;
  for(const context of contexts)for(const template of templates)for(const wrap of wrappers){
    check(wrap(template(context)),'rental-source',/0,20 euroa/); count++;
  }
  assert.equal(count,320);
});

test('a price row without Mainio-approved website provenance is not a trusted answer',()=>{
  const valid=rows[0];
  for(const mutated of [
    {...valid,approved:false},
    {...valid,source_type:'customer'},
    {...valid,source_url:'https://other-company.example/boxes'},
    {...valid,id:''},
  ])assert.equal(mainioPublicFactAnswer([mutated],
    'Paljonko laatikoiden vuokra maksaa?','fi'),null);
});
