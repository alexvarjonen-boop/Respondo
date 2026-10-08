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
    const right=await ask('https://example.fi/ajanvaraus','https://example.fi/contact-us');
    assert.ok((right.actions||[]).some(x=>x.type==='booking'&&x.url==='https://example.fi/ajanvaraus'),JSON.stringify(right));
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
