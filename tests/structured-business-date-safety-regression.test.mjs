import test from 'node:test';
import assert from 'node:assert/strict';
import {structuredBusinessFacts} from '../structured-business-facts.mjs';

const url='https://example.com/stores/turku';
const facts=node=>structuredBusinessFacts('<script type="application/ld+json">'+JSON.stringify(node)+'</script>',url);
const company={'@type':'Store',url,address:{addressLocality:'Turku'}};
const weekly={dayOfWeek:'Monday',opens:'09:00',closes:'17:00'};
const holiday={dayOfWeek:'Tuesday',opens:'10:00',closes:'12:00',validFrom:'2026-12-24',validThrough:'2026-12-24'};

test('temporary hours never become ordinary weekly hours',()=>{
  const rows=facts({...company,openingHoursSpecification:[weekly,holiday]});
  assert.equal(rows.find(r=>r.category==='Aukioloajat')?.answer,'Ma: 09:00 - 17:00');
  assert.equal(facts({...company,openingHoursSpecification:[holiday]}).some(r=>r.category==='Aukioloajat'),false);
});
test('explicit holiday closure remains a dated branch fact',()=>{
  const rows=facts({...company,openingHoursSpecification:[weekly],specialOpeningHoursSpecification:{validFrom:'2026-12-24',validThrough:'2026-12-24',opens:'00:00',closes:'00:00'}});
  assert.equal(rows.find(r=>r.category==='Poikkeusaukioloajat')?.answer,'2026-12-24: suljettu');
});
test('foreign structured identities and invalid company URLs are rejected',()=>{
  for(const node of [{...company,'@id':'https://other.example/#store',openingHoursSpecification:[weekly]},{...company,url:'javascript:alert(1)',openingHoursSpecification:[weekly]}]){
    assert.equal(facts(node).length,0);
  }
});
test('booking links must be actual HTTP destinations rather than fragments',()=>{
  for(const target of ['#booking','javascript:alert(1)','mailto:office@example.com']){
    assert.equal(facts({...company,potentialAction:{'@type':'ReserveAction',target}}).some(r=>r.category==='Ajanvaraus'),false);
  }
  assert.equal(facts({...company,potentialAction:{'@type':'ReserveAction',target:'https://booking.example/reserve'}}).find(r=>r.category==='Ajanvaraus')?.answer,'https://booking.example/reserve');
});
