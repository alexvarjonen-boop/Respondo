import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const server=read('server.mjs');
const app=read('public/app.js');
const traffic=read('public/traffic.html');
const css=read('public/checkout-setup-service.css');

function sourceBetween(start,end){
  const first=server.indexOf(start),last=server.indexOf(end,first);
  assert.ok(first>=0&&last>first,'Expected route or helper: '+start);
  return server.slice(first,last);
}

test('image bytes have safe signatures and only PNG, JPEG and WebP are accepted',()=>{
  const code=sourceBetween('function setupIntakeImageMime(bytes)','async function ensureSetupIntakeImages(');
  const sniff=new Function('Buffer','SETUP_IMAGE_MAX_BYTES',code+'; return setupIntakeImageMime;')(Buffer,8*1024*1024);
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(10)]);
  const jpeg=Buffer.from([255,216,255,224,1,2,3,4,5,6,7,8,9,10,255,217]);
  const webp=Buffer.from('RIFF0000WEBPVP8 0000');
  assert.equal(sniff(png),'image/png');
  assert.equal(sniff(jpeg),'image/jpeg');
  assert.equal(sniff(webp),'image/webp');
  assert.equal(sniff(Buffer.from('<svg><script>bad</script></svg>')),'');
  assert.equal(sniff(Buffer.alloc(10)),'');
  assert.equal(sniff(Buffer.alloc(8*1024*1024+1)),'');
});

test('requested greeting is optional, bounded and rejects HTML/control characters',()=>{
  const code=sourceBetween('function setupGreetingInput(raw,selected)','async function validateSetupImageToken(');
  const parse=new Function(code+';return setupGreetingInput;')();
  assert.equal(parse('Hello there',true),'Hello there');
  assert.equal(parse('  ',true),'');
  assert.equal(parse(null,true),'');
  assert.equal(parse('<script>',false),'');
  assert.throws(()=>parse('<script>',true),/220/);
  assert.throws(()=>parse('x'.repeat(221),true),/220/);
  assert.throws(()=>parse('hi\nthere',true),/220/);
});

test('assisted setup image is mandatory only when selected, uploaded before checkout in every path',()=>{
  assert.match(app,/name="setupReferenceImage" accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(app,/name="setupGreeting" rows="3" maxlength="220"/);
  assert.match(app,/fileInput.required=checkbox.checked/);
  assert.match(app,/fileInput.disabled=!checkbox.checked/);
  assert.match(app,/greeting.disabled=!checkbox.checked/);
  assert.match(app,/async function uploadSetupImage\(formData\)/);
  assert.equal((app.match(/const setupImageToken=await uploadSetupImage\((?:form|fd)\);/g)||[]).length,3);
  assert.equal((app.match(/setupGreeting:String\((?:form|fd).get\('setupGreeting'\)/g)||[]).length,3);
  assert.equal((server.match(/await validateSetupImageToken\(req.body\?\.setupImageToken,setupService\)/g)||[]).length,2);
  assert.equal((server.match(/bindSetupImageToSession\((?:client|pool),setupImageToken,session.id\)/g)||[]).length,2);
  assert.equal((server.match(/setup_image_token:setupImageToken,setup_greeting:setupGreeting/g)||[]).length,4);
  assert.match(css,/\.setup-reference-image\[hidden\]/);
});

test('uploads are rate limited, same origin only, durable and visible only to owner',()=>{
  assert.match(server,/app.use\('\/api\/public\/setup-image-upload', express.raw\(/);
  assert.match(server,/limit:'8mb'/);
  assert.match(server,/setupImageUploadLimiter=rateLimit/);
  assert.match(server,/new URL\(origin\).host.toLowerCase\(\)!==host/);
  assert.match(server,/CREATE TABLE IF NOT EXISTS setup_intake_images/);
  assert.match(server,/image_bytes BYTEA NOT NULL/);
  assert.match(server,/crypto.randomBytes\(24\).toString\('hex'\)/);
  assert.match(server,/session_id IS NULL AND expires_at>NOW\(\)/);
  assert.match(server,/app.get\('\/api\/app\/internal\/setup-service-requests\/:id\/image',auth,ownerTrafficOnly/);
  assert.match(server,/res.set\('X-Content-Type-Options','nosniff'\)/);
  assert.match(server,/has_images/);
  assert.match(server,/DELETE FROM setup_intake_images WHERE session_id IN/);
});

test('paid setup acknowledgement and owner inbox include submitted image and optional greeting',()=>{
  const email=sourceBetween('async function notifySetupServiceAfterCheckout(session)','async function sendHomepageContactEmail(');
  assert.match(email,/setupToken=String\(session.metadata\?\.setup_image_token/);
  assert.match(email,/setupGreetingInput\(session.metadata\?\.setup_greeting/);
  assert.match(email,/imageMissing:true/);
  assert.match(email,/requested_greeting/);
  assert.match(email,/Botin kuva on vastaanotettu/);
  assert.match(email,/Requested greeting:/);
  assert.match(email,/Avaa asiakkaan toimittama kuva/);
  assert.match(server,/LEFT JOIN setup_intake_images si ON si.session_id=sr.session_id/);
  assert.match(traffic,/job.has_image/);
  assert.match(traffic,/job.requested_greeting/);
  assert.match(traffic,/job.requested_greeting\|\|job.greeting/);
  assert.match(traffic,/setup-customer-image/);
});
