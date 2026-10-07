import test from 'node:test';
import assert from 'node:assert/strict';
import { essentialWebsiteCandidates, essentialWebsiteProfile } from '../website-knowledge.mjs';

test('service-business import recovers concatenated email and physical address without template-store junk',()=>{
  const bundle={
    finalUrl:'https://examplebarber.fi/',
    products:[
      {
        name:'Herbal Essence Oil',
        url:'https://examplebarber.fi/product/herbal-essence-oil/',
        price:55,
        maxPrice:55,
        currency:'USD',
        description:'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
      },
      {
        name:'Premium Balm',
        url:'https://examplebarber.fi/product/premium-balm/',
        price:75,
        maxPrice:75,
        currency:'USD',
        description:'Lorem ipsum dolor sit amet.'
      },
      {
        name:'Shop - Example Barber',
        url:'https://examplebarber.fi/shop/',
        price:0,
        maxPrice:0,
        currency:'USD',
        description:'Demo product catalog'
      },
    ],
    pageDocuments:[
      {
        url:'https://examplebarber.fi/',
        products:[],
        links:[],
        blocks:[
          {heading:'Yhteystiedot',text:'info@examplebarber.fiHallituskatu 11 33200 Tampere'},
          {heading:'Aukioloajat',text:'Ma-Pe: 09:00–19:00 La: 09:00–17:00'},
          {heading:'Palvelut',text:'Tarjoamme hiustenleikkauksia ja parranajoa.'},
        ],
        text:''
      },
      {
        url:'https://examplebarber.fi/product/herbal-essence-oil/',
        products:[{
          name:'Herbal Essence Oil',
          url:'https://examplebarber.fi/product/herbal-essence-oil/',
          price:55,
          maxPrice:55,
          currency:'USD',
          description:'Lorem ipsum dolor sit amet.'
        }],
        links:[],
        blocks:[
          {heading:'Herbal Essence Oil',text:'$55.00'},
          {heading:'Description',text:'Lorem ipsum dolor sit amet.'}
        ],
        text:''
      }
    ]
  };

  const rows=essentialWebsiteCandidates(bundle);
  const combined=rows.map((row)=>row.title+' | '+row.answer).join('\n');
  assert.match(combined,/Sähköposti \| info@examplebarber\.fi/i);
  assert.match(combined,/Osoite \| Hallituskatu 11/i);
  assert.match(combined,/Osoite \| 33200 Tampere/i);
  assert.doesNotMatch(combined,/Lorem ipsum|Herbal Essence Oil|Premium Balm|Shop - Example Barber|\$55/i);

  const profile=essentialWebsiteProfile(bundle);
  assert.equal(profile.email,'info@examplebarber.fi');
  assert.match(profile.address,/Hallituskatu 11/);
  assert.match(profile.address,/33200 Tampere/);
});
