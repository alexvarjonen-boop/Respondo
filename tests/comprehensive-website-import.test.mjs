import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBusinessDocument,essentialWebsiteCandidates} from '../website-knowledge.mjs';
import {generateGroundedAnswer,queryTopic} from '../server.mjs';

test('website importer captures broad customer-facing commerce knowledge', async()=>{
  const html=`
  <html><body>
    <section><h2>Toimitus ja seuranta</h2>
      <p>Tilaukset toimitetaan 2–4 arkipäivässä ja lähetyksen seurantakoodi lähetetään sähköpostiin.</p>
    </section>
    <section><h2>Palautukset</h2>
      <p>Tuotteilla on 30 päivän palautusoikeus, kun tuote on käyttämätön.</p>
    </section>
    <section><h2>Maksutavat</h2>
      <p>Voit maksaa Visa- ja Mastercard-korteilla, MobilePaylla sekä Klarnalla.</p>
    </section>
    <section><h2>Laatu ja valmistus</h2>
      <p>Jokainen putteri CNC-koneistetaan Suomessa ja tarkastetaan ennen toimitusta.</p>
    </section>
    <section><h2>Materiaalit</h2>
      <p>Putterit valmistetaan 303 ruostumattomasta teräksestä.</p>
    </section>
    <section><h2>Hoito-ohje</h2>
      <p>Pyyhi putteri käytön jälkeen kuivalla liinalla ja vältä voimakkaita puhdistusaineita.</p>
    </section>
    <section><h2>Koko-opas</h2>
      <p>Varsipituudet ovat 33, 34 ja 35 tuumaa.</p>
    </section>
    <section><h2>Myymälä</h2>
      <p>Myymälämme sijaitsee osoitteessa Testikatu 1, 20100 Turku.</p>
    </section>
    <section><h2>Yhteystiedot</h2>
      <p>Asiakaspalvelu: info@example.fi</p><p>Puhelin +358 40 123 4567</p>
    </section>
    <section><h2>Voiko lahjakorttia käyttää verkkokaupassa?</h2>
      <p>Lahjakortti käy verkkokaupassa maksuvälineenä.</p>
    </section>
  </body></html>`;
  const doc=extractBusinessDocument(html,'https://shop.example/pages/info');
  const facts=essentialWebsiteCandidates({finalUrl:'https://shop.example/',pageDocuments:[doc]});
  const categories=new Set(facts.map((item)=>item.category));
  for(const category of [
    'Toimitus ja seuranta','Palautukset ja vaihdot','Maksaminen','Laatu ja valmistus',
    'Materiaalit','Hoito-ohjeet','Koot ja mitat','Sijainti ja myymälät','Yhteystiedot'
  ]) assert.ok(categories.has(category),category+' was not imported');
  assert.ok(facts.some((item)=>/lahjakorttia käyttää verkkokaupassa/i.test(item.title)),JSON.stringify(facts));

  const rows=facts.map((item,index)=>({...item,id:'fact-'+index,source_type:'website',source_url:item.sourceUrl}));
  const returns=await generateGroundedAnswer({rows,message:'Miten palautus toimii?',lang:'fi'});
  assert.equal(returns.handoff,false,JSON.stringify(returns));
  assert.match(returns.answer,/30 päivän palautusoikeus/i);

  const location=await generateGroundedAnswer({rows,message:'Missä myymälänne sijaitsee?',lang:'fi'});
  assert.equal(location.handoff,false,JSON.stringify(location));
  assert.match(location.answer,/Testikatu|Turku/i);

  const quality=await generateGroundedAnswer({rows,message:'Miten tuotteiden laatu varmistetaan?',lang:'fi'});
  assert.equal(quality.handoff,false,JSON.stringify(quality));
  assert.match(quality.answer,/CNC|tarkastetaan/i);

  assert.equal(queryTopic('Mistä materiaalista tuotteet on tehty?'),'materials');
  assert.equal(queryTopic('Missä myymälänne sijaitsee?'),'stores');
  assert.equal(queryTopic('Miten tuotteiden laatu varmistetaan?'),'quality');
});

test('structured product variants provide colors sizes materials specs and price range', async()=>{
  const product={
    '@context':'https://schema.org',
    '@type':'ProductGroup',
    name:'Tour Putter',
    category:'Putter',
    brand:{'@type':'Brand',name:'Example Golf'},
    description:'CNC milled tour putter.',
    additionalProperty:[{'@type':'PropertyValue',name:'Loft',value:'3 degrees'}],
    hasVariant:[
      {
        '@type':'Product',name:'Tour Putter Black',color:'Black',size:'34 in',material:'303 stainless steel',
        offers:{'@type':'Offer',price:'199',priceCurrency:'EUR',availability:'https://schema.org/InStock',url:'https://shop.example/products/tour-putter'}
      },
      {
        '@type':'Product',name:'Tour Putter Silver',color:'Silver',size:'35 in',material:'303 stainless steel',
        offers:{'@type':'Offer',price:'229',priceCurrency:'EUR',availability:'https://schema.org/InStock',url:'https://shop.example/products/tour-putter'}
      }
    ]
  };
  const doc=extractBusinessDocument(
    '<script type="application/ld+json">'+JSON.stringify(product)+'</script>',
    'https://shop.example/products/tour-putter'
  );
  const facts=essentialWebsiteCandidates({finalUrl:'https://shop.example/',pageDocuments:[doc]});
  const row=facts.find((item)=>item.title==='Tour Putter');
  assert.ok(row,JSON.stringify(facts));
  assert.match(row.answer,/Hinta: 199\.00–229\.00 EUR/i);
  assert.match(row.answer,/Värit: Black, Silver/i);
  assert.match(row.answer,/Koot: 34 in, 35 in/i);
  assert.match(row.answer,/Materiaalit: 303 stainless steel/i);
  assert.match(row.answer,/Loft: 3 degrees/i);

  const rows=facts.map((item,index)=>({...item,id:'product-'+index,source_type:'website',source_url:item.sourceUrl}));

  const colors=await generateGroundedAnswer({rows,message:'Mitä värejä Tour Putterista on?',lang:'fi'});
  assert.equal(colors.handoff,false,JSON.stringify(colors));
  assert.match(colors.answer,/Black/);
  assert.match(colors.answer,/Silver/);

  const sizes=await generateGroundedAnswer({rows,message:'Mitä kokoja Tour Putterista on?',lang:'fi'});
  assert.equal(sizes.handoff,false,JSON.stringify(sizes));
  assert.match(sizes.answer,/34 in/);
  assert.match(sizes.answer,/35 in/);

  const material=await generateGroundedAnswer({rows,message:'Mistä materiaalista Tour Putter on tehty?',lang:'fi'});
  assert.equal(material.handoff,false,JSON.stringify(material));
  assert.match(material.answer,/303 stainless steel/i);
});
