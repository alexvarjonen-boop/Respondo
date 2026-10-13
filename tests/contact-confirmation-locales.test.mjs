import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const expectTexts={
  "fi": "Kiitos yhteydenotosta. Tiimimme käsittelee viestinne ja palaamme asiaan 24 tunnin kuluessa.",
  "sv": "Tack för att ni kontaktade oss. Vårt team behandlar ert meddelande och återkommer inom 24 timmar.",
  "en": "Thank you for contacting us. Our team will review your message and get back to you within 24 hours."
};

test('Respondo contact form success confirmation states 24-hour follow-up in FI SV EN',()=>{
 const start=server.indexOf("app.post('/api/public/respondo-contact'");
 const end=server.indexOf("app.post('/api/public/:slug/lead'",start);
 assert.ok(start>=0 && end>start);
 const endpoint=server.slice(start,end);
 for(const [lang,msg] of Object.entries(expectTexts)){
   assert.ok(endpoint.includes(msg),'missing '+lang+' server confirmation');
   assert.ok(client.includes(msg),'missing '+lang+' client fallback');
 }
 assert.match(endpoint,/emailSent:Boolean\(emailDelivery\.sent\)/,'email provider result still separately reported');
 assert.match(endpoint,/INSERT INTO leads\(/,'contact request must still be saved to DB');
 assert.match(client,/className='home-contact-status success'/,'success style must remain');
});

test('old confirmation texts are not returned from website contact handler',()=>{
 const endpoint=server.slice(server.indexOf("app.post('/api/public/respondo-contact'"),server.indexOf("app.post('/api/public/:slug/lead'"));
 assert.doesNotMatch(endpoint,/Kiitos! Viestisi lähetettiin sähköpostiimme\./);
 assert.doesNotMatch(endpoint,/Viestisi tallennettiin Respondon yhteydenottoihin/);
});