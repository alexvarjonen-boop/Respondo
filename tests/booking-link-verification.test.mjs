import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const appJs=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('stored contact page or duplicated quote link is not offered as a booking calendar',()=>{
  const start=source.indexOf('function chatActions(');
  const chunk=source.slice(start,start+2800);
  assert.match(source,/function bookingLinkLooksLikeContactForm\(raw\)/);
  assert.match(chunk,/!bookingLinkLooksLikeContactForm\(bookingCandidate\)/);
  assert.match(chunk,/bookingCandidate !== quote/);
  assert.match(appJs,/const bookingLinkNeedsReview=/);
  assert.match(appJs,/ei ajanvarauskalenterilta/);
});

test('public Try Bot omits a misleading calendar action for a generic contact link',async()=>{
  const {app}=await import('../server.mjs');
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const ask=async(bookingUrl,quoteRequestUrl)=>{
      const result=await fetch(base+'/api/public/demo-chat',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({message:'Voinko varata ajan?',lang:'fi',profile:{
          companyName:'Testipalvelut',bookingUrl,quoteRequestUrl,
          customFacts:[{key:'Palvelut',answer:'Tarjoamme siivouspalveluja.',category:'Palvelut'}],
        }}),
      });
      assert.equal(result.status,200);
      return result.json();
    };
    const wrong=await ask('https://example.fi/contact-us','https://example.fi/contact-us');
    assert.ok((wrong.actions||[]).some(x=>x.type==='booking'&&x.mode==='booking_form'),JSON.stringify(wrong));
    assert.ok(!(wrong.actions||[]).some(x=>x.type==='booking'&&x.url==='https://example.fi/contact-us'),JSON.stringify(wrong));
    const htmlContact=await ask('https://example.fi/contact-us.html','https://example.fi/tarjous');
    assert.ok(!(htmlContact.actions||[]).some(x=>x.type==='booking'&&x.url==='https://example.fi/contact-us.html'),JSON.stringify(htmlContact));
    assert.match(appJs,/\.html\?/);
    const right=await ask('https://example.fi/ajanvaraus','https://example.fi/contact-us');
    assert.ok((right.actions||[]).some(x=>x.type==='booking'&&x.url==='https://example.fi/ajanvaraus'),JSON.stringify(right));
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});


test('delivery time and opening-hours questions never show a booking widget',async()=>{
  const {app}=await import('../server.mjs');
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try{
    const endpoint='http://127.0.0.1:'+server.address().port+'/api/public/demo-chat';
    const ask=async(message,lang='fi')=>{
      const response=await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message,lang,profile:{
          companyName:'Testipalvelut',
          bookingUrl:'https://example.fi/ajanvaraus',
          customFacts:[
            {key:'Toimitusaika',answer:'Toimitus kestää 2–4 arkipäivää.',category:'Toimitus'},
            {key:'Aukioloajat',answer:'Auki ma-pe 8–18.',category:'Aukioloajat'},
            {key:'Palvelut',answer:'Tarjoamme siivouspalveluja.',category:'Palvelut'},
          ]
        }})
      });
      assert.equal(response.status,200,message);
      return response.json();
    };
    for(const [message,lang] of [
      ['Mikä on toimitusaika?','fi'],
      ['Kuinka pitkä toimitusaika tuotteilla on?','fi'],
      ['Mitkä ovat aukioloajat?','fi'],
      ['Paljonko aikaa toimitukseen menee?','fi'],
      ['What is the delivery time?','en'],
      ['What time are you open?','en'],
      ['Vad är leveranstiden?','sv'],
    ]){
      const answer=await ask(message,lang);
      assert.ok(!(answer.actions||[]).some(x=>x.type==='booking'),message+': '+JSON.stringify(answer.actions));
    }
    for(const [message,lang] of [
      ['Voinko varata ajan?','fi'],
      ['Voinko varata siivouksen?','fi'],
      ['Miten varaan kotikäynnin?','fi'],
      ['Miten ajanvaraus toimii?','fi'],
      ['Can I book an appointment?','en'],
      ['Kan jag boka en tid?','sv'],
      ['Kan jag boka städning?','sv'],
    ]){
      const answer=await ask(message,lang);
      assert.ok((answer.actions||[]).some(x=>x.type==='booking'&&x.mode==='booking_form'),
        message+': '+JSON.stringify(answer.actions));
      assert.ok((answer.actions||[]).some(x=>x.type==='booking'&&x.url==='https://example.fi/ajanvaraus'),
        message+': '+JSON.stringify(answer.actions));
    }
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
