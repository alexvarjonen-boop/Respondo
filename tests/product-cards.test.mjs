import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProducts, parseProductKnowledgeRow } from '../website-knowledge.mjs';
import { generateGroundedAnswer, verifiedProductCards } from '../server.mjs';

const url='https://shop.example.fi/products/valkoinen-sohva';
const image='https://cdn.example.fi/assets/sohva.webp';
const row={
  id:'sohva-1',
  category:'Tuotteet',
  title:'Valkoinen kolmen istuttava sohva',
  answer:'Tuote: Valkoinen kolmen istuttava sohva. Hinta: 795.00 EUR. Linkki: '+url+'. Kuva: '+image+'. Kuvaus: Mukava valkoinen sohva.',
  source_url:url,
  approved:true,
};

test('JSON-LD product image and price are discovered from the actual product page',()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({
    '@context':'https://schema.org','@type':'Product',
    name:'Valkoinen kolmen istuttava sohva',
    image:[{ '@type':'ImageObject',url:image }],
    description:'Mukava valkoinen sohva',
    offers:{'@type':'Offer',price:'795.00',priceCurrency:'EUR',url},
  })+'</script>';
  const items=extractProducts(html,url);
  assert.equal(items.length,1);
  assert.equal(items[0].imageUrl,image);
  assert.equal(items[0].price,795);
});

test('product rows preserve image metadata and render only grounded selections',()=>{
  const parsed=parseProductKnowledgeRow(row);
  assert.equal(parsed.imageUrl,image);
  assert.equal(parsed.price,795);
  const cards=verifiedProductCards({intent:'Tuotteet',handoff:false,selected:[row]});
  assert.equal(cards.length,1);
  assert.equal(cards[0].name,row.title);
  assert.equal(cards[0].url,url);
  assert.equal(cards[0].imageUrl,image);
  assert.equal(cards[0].price,795);
  assert.equal(verifiedProductCards({intent:'Tuotteet',handoff:true,selected:[row]}).length,0);
  assert.equal(verifiedProductCards({intent:'Toimitus',handoff:false,selected:[row]}).length,0);
  assert.equal(verifiedProductCards({intent:'Tuotteet',handoff:false,selected:[{
    ...row,id:'unsafe',source_url:'javascript:alert(1)',
    answer:'Tuote: Bad. Hinta: 3 EUR. Linkki: javascript:alert(1)'
  }]}).length,0);
});

test('browsing product names and generic catalog questions select cards',async()=>{
  const browse=await generateGroundedAnswer({
    companyName:'Testikauppa',rows:[row],message:'Näytä sohva',lang:'fi',
  });
  assert.equal(browse.handoff,false);
  assert.equal(browse.intent,'Tuotteet');
  assert.deepEqual(verifiedProductCards(browse).map(x=>x.url),[url]);

  const generic=await generateGroundedAnswer({
    companyName:'Testikauppa',rows:[row],message:'Mitä te myytte?',lang:'fi',
  });
  assert.equal(generic.handoff,false);
  assert.deepEqual(verifiedProductCards(generic).map(x=>x.url),[url]);
});
