import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBusinessDocument, essentialWebsiteCandidates, essentialWebsiteProfile, extractProducts, usableWebsiteRow } from '../website-knowledge.mjs';

const url='https://example.com/services';
const bundle=(html,source=url)=>({finalUrl:source,pageDocuments:[extractBusinessDocument(html,source)]});

test('service area and published booking link are extracted, not guessed',()=>{
  const b=bundle('<section><h2>Toimialue</h2><p>Turku, Raisio ja Naantali</p><a href="https://booking.example.org/reserve">Varaa aika</a></section>');
  const p=essentialWebsiteProfile(b);
  assert.equal(p.serviceArea,'Turku, Raisio ja Naantali');
  assert.equal(p.bookingUrl,'https://booking.example.org/reserve');
  for(const row of essentialWebsiteCandidates(b)) assert.ok(usableWebsiteRow({...row,source_type:'website'}));
  assert.equal(essentialWebsiteProfile(bundle('<a href="#">Varaa aika</a>')).bookingUrl,'');
});

test('accordion and definition list retain question context',()=>{
  const rows=essentialWebsiteCandidates(bundle('<details><summary>Can I customize my order?</summary><p>You can customize your order at no extra cost.</p></details><dl><dt>How do I order?</dt><dd>You can order directly online.</dd></dl>'));
  assert.ok(rows.some(x=>x.title==='Can I customize my order?'));
  assert.ok(rows.some(x=>x.title==='How do I order?'));
});

test('multiple public contacts retained and hidden contacts excluded',()=>{
  const rows=essentialWebsiteCandidates(bundle('<p>Contact us: info@example.com, sales@example.com</p><a hidden href="mailto:hidden@example.com">Hidden</a>'));
  assert.ok(rows.some(x=>x.answer==='sales@example.com'));
  assert.ok(rows.some(x=>x.answer==='info@example.com'));
  assert.ok(!rows.some(x=>x.answer==='hidden@example.com'));
});

test('structured product with unknown price and unavailable stock',()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({'@type':'https://schema.org/Product',name:'Example product',offers:{'@type':'Offer',price:'',availability:'https://schema.org/OutOfStock'}})+'</script>';
  const [p]=extractProducts(html,'https://example.com/products/example');
  assert.ok(p);
  assert.equal(p.price,null);
  assert.equal(p.availability,'ei varastossa');
  assert.equal(p.imageUrl,'');
});

test('customer policies are available from terms pages',()=>{
  const rows=essentialWebsiteCandidates(bundle('<h1>Terms and Conditions</h1><p>Returns are accepted within 30 days.</p><p>Shipping is free for orders over 100 EUR.</p>','https://example.com/terms'));
  assert.ok(rows.some(x=>x.category==='Palautukset ja vaihdot'));
  assert.ok(rows.some(x=>x.category==='Toimitus ja seuranta'));
});
