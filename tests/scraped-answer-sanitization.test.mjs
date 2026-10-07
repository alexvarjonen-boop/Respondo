import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeHtml,
  extractBusinessDocument,
  essentialWebsiteCandidates,
} from '../website-knowledge.mjs';
import { generateGroundedAnswer } from '../server.mjs';

test('website text decoder removes soft hyphens and visible escaped line breaks',()=>{
  assert.equal(decodeHtml('muutto&shy;vastarinnalle &raquo;'),'muuttovastarinnalle »');
  const doc=extractBusinessDocument(
    '<p>Hyvästi \\nmuutto&shy;vastarinnalle &raquo;</p>',
    'https://example.fi/'
  );
  assert.equal(doc.blocks[0]?.text,'Hyvästi muuttovastarinnalle »');
});

test('service navigation import rejects slogans, map links and CTA debris',()=>{
  const doc=extractBusinessDocument(`
    <nav>
      <a href="/kotimuutot">Kotimuutot</a>
      <a href="/yritysmuutot">Yritysmuutot</a>
      <a href="/varastointi">Varastointi</a>
      <a href="/slogan">Hyvästi muutto&shy;vastarinnalle</a>
      <a href="/journey">Hyppää mukaan muuttomatkaan</a>
      <a href="/location">Mainio Muuttopalvelu Oy: Sijainti kartalla &raquo;</a>
      <a href="/old-news">Iso muutto: 8. kesäkuuta 2020</a>
    </nav>
  `,'https://example.fi/');

  const services=essentialWebsiteCandidates({pageDocuments:[doc],products:[]})
    .filter((row)=>row.category==='Palvelut')
    .map((row)=>row.answer);

  assert.ok(services.includes('Kotimuutot'),JSON.stringify(services));
  assert.ok(services.includes('Yritysmuutot'),JSON.stringify(services));
  assert.ok(services.includes('Varastointi'),JSON.stringify(services));
  assert.equal(services.some((value)=>/vastarinn|hyppää|sijainti|kartalla|kesäkuuta/i.test(value)),false,JSON.stringify(services));
});

test('broad service answer never exposes legacy HTML entities or scraped navigation junk',async()=>{
  const rows=[
    {id:'good-1',category:'Palvelut',title:'Palvelut: Kotimuutot',answer:'Kotimuutot',keywords:['palvelut','muutto'],source_type:'website'},
    {id:'good-2',category:'Palvelut',title:'Palvelut: Yritysmuutot',answer:'Yritysmuutot',keywords:['palvelut','muutto'],source_type:'website'},
    {id:'good-3',category:'Palvelut',title:'Palvelut: Varastointi',answer:'Varastointi',keywords:['palvelut','varastointi'],source_type:'website'},
    {id:'bad-1',category:'Palvelut',title:'Palvelut: Hyvästi \\nmuutto&shy;vastarinnalle',answer:'Hyvästi \\nmuutto&shy;vastarinnalle',keywords:['palvelut','muutto'],source_type:'website'},
    {id:'bad-2',category:'Palvelut',title:'Palvelut: Mainio Muuttopalvelu Oy: Sijainti kartalla &raquo;',answer:'Mainio Muuttopalvelu Oy: Sijainti kartalla &raquo;',keywords:['palvelut','muutto'],source_type:'website'},
    {id:'bad-3',category:'Palvelut',title:'Palvelut: Hyppää mukaan muuttomatkaan',answer:'Hyppää mukaan muuttomatkaan',keywords:['palvelut','muutto'],source_type:'website'},
  ];

  const result=await generateGroundedAnswer({
    rows,
    message:'Mitä teette?',
    lang:'fi',
  });

  assert.equal(result.handoff,false,JSON.stringify(result));
  assert.match(result.answer,/Kotimuutot/);
  assert.match(result.answer,/Yritysmuutot/);
  assert.match(result.answer,/Varastointi/);
  assert.doesNotMatch(result.answer,/\\n|&shy;|&raquo;|vastarinn|sijainti kartalla|hyppää mukaan/i);
});
