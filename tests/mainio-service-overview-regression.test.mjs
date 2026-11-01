import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceOverviewQuestion,verifiedServiceOverview} from '../service-overview.mjs';

const row=(category,title,answer,source_url='https://www.mainiomuuttopalvelu.fi/usein-muutosta-kysyttya')=>({
  id:category+'-'+title,category,title,answer,
  source_type:'website',approved:true,source_url
});

test('what do you do asks for company services in Finnish, Swedish and English',()=>{
  for(const question of ['mitä teette','Mitä te oikein teette?','What do you do?','Vad gör ni?']){
    assert.equal(serviceOverviewQuestion(question),true,question);
  }
});

test('approved business-specific service categories answer Mainio question without a contact fallback',()=>{
  const rows=[
    row('Muuttopalvelut','Kotimuuttojen palvelut','Mainio Muuttopalvelu hoitaa kotimuuttoja, tarvittaessa koko muuton tai vain osan siitä.','https://www.mainiomuuttopalvelu.fi/'),
    row('Yritysmuutot','Yritysmuutto','Mainio Muuttopalvelu tekee yritysmuuttoja ja tarjoaa niihin kalusteasennuksia ja kuljetuksia.','https://www.mainiomuuttopalvelu.fi/'),
    row('Kierrätys','Kierrätyspalvelu','Mainio tarjoaa erillisiä kierrätys- ja jätteennoutopalveluja.'),
    row('Varastointi','Välivarastointi ennen muuttoa','Mainio tarjoaa välivarastointia, jos vanhasta asunnosta on lähdettävä ennen uuden vapautumista.'),
    row('Kalusteasennukset','Työpisteiden ja sähköpöytien asennus','Mainio asentaa työpisteitä ja sähköpöytiä sekä toimistokalusteita ja hyllykokonaisuuksia.')
  ];
  const overview=verifiedServiceOverview(rows,{companyName:'Mainio Muuttopalvelu',lang:'fi'});
  assert.ok(overview,'should answer rather than handoff');
  for(const service of ['Muuttopalvelut','Yritysmuutot','Kierrätys','Varastointi','Kalusteasennukset'])
    assert.ok(overview.names.includes(service),service+': '+overview.answer);
  assert.match(overview.answer,/Palveluihimme kuuluvat:/);
  assert.equal(overview.selected.length,5);
});

test('curated published service facts combine into a succinct Mainio service overview',()=>{
 const catalog=['Kotimuutot','Yritysmuutot','Kalusteasennukset','Kierrätyspalvelut','Välivarastointi','Muuttolaatikoiden vuokraus','Pakettiautojen vuokraus'];
 const rows=catalog.map(name=>row('Palvelut','Palvelut: '+name,name,'https://www.mainiomuuttopalvelu.fi/'));
 const result=verifiedServiceOverview(rows,{companyName:'Mainio Muuttopalvelu',lang:'fi'});
 assert.ok(result);
 assert.equal(result.names.length,catalog.length,result.answer);
 for(const name of catalog)assert.ok(result.names.includes(name));
});

test('categories alone, negative answers, prices and news never invent service offerings',()=>{
 const rows=[
   row('Kierrätys','Jätteiden käsittely','Yritys ei tarjoa kierrätyspalvelua.'),
   row('Kalusteasennukset','Kalusteiden hinta','Mainio tarjoaa kalusteita 20 eurolla.'),
   row('Varastointi','Vanhat projektit','Mainio toteutti varastointiprojektin vuonna 2024.'),
   row('Muuttopalvelut','Palvelukuvaukset','Muuttopalvelut ovat usein suosittuja kotitalouksille.'),
   row('Muuttopalvelut','Blogi','Mainio tarjoaa kotimuuttoja.', 'https://www.mainiomuuttopalvelu.fi/blog/palvelut')
 ];
 assert.equal(verifiedServiceOverview(rows,{companyName:'Mainio Muuttopalvelu'}),null);
});

test('a product-only retailer is not converted into a service business',()=>{
 const rows=[
   {category:'Tuotteet',title:'Tenniskenkä',answer:'Myymme tennistuskenkiä.',source_type:'website',approved:true,source_url:'https://example.com/products/tennis'}
 ];
 assert.equal(verifiedServiceOverview(rows,{companyName:'Tennis Shop'}),null);
});
