import test from 'node:test';
import assert from 'node:assert/strict';
import {relevantConversationalExcerpt,conversationalFacts} from '../conversational-ai.mjs';

const text='Our company offers helpful services to customers. '.repeat(23)+'Delivery is only available in Turku. Installation requires a separate appointment. The warranty covers manufacturing defects only.';
test('long website descriptions retain the relevant contiguous passage rather than only their introduction',()=>{
  const excerpt=relevantConversationalExcerpt(text,[['warranty','manufacturing','defects']]);
  assert.match(excerpt,/warranty covers manufacturing defects only/);
  assert.ok(text.includes(excerpt));
  assert.ok(excerpt.length<=950);
  assert.equal(relevantConversationalExcerpt('Short text.',[['short']]),'Short text.');
});
test('grounded model retrieval supplies the exact relevant excerpt from the approved row',()=>{
  const row={id:'a',approved:true,source_type:'website',source_url:'https://example.com/services',title:'Company services',answer:text};
  const facts=conversationalFacts([row],'What does the warranty cover?',{RESPONDO_CLOUDFLARE_AI_ENABLED:'1'});
  assert.equal(facts.length,1);
  assert.match(facts[0].quoteText,/warranty covers manufacturing defects only/);
  assert.ok(text.includes(facts[0].quoteText));
  assert.equal(facts[0].row,row);
});
