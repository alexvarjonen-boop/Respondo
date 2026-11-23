import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProspect,draftFor,nextStage,installMovexaSales} from '../movexa-sales-os.mjs';
const sample={name:'Example',website:'https://www.example.com/',source:'https://example.com/contact',role:'Sales manager',evidence:'Public business website',email:'sales@example.com',lang:'en',roleFit:true,serviceFit:true,needFit:true};
test('normalizes canonical domain and verified inputs',()=>{const p=normalizeProspect(sample);assert.equal(p.domain,'example.com');assert.equal(p.score,100);assert.equal(normalizeProspect({...sample,roleFit:'true'}).score,65);});
test('requires evidence, source, role and safe URLs',()=>{for(const patch of [{website:'file:///etc/passwd'},{source:'https://user:password@example.com'},{evidence:''},{role:''},{email:'invalid'}])assert.throws(()=>normalizeProspect({...sample,...patch}));});
test('approval gates, blocked state and no direct contact',()=>{assert.equal(nextStage('new','contacted',true),false);assert.equal(nextStage('review','approved',false),false);assert.equal(nextStage('review','approved',true),true);assert.equal(nextStage('approved','contacted',false),false);for(const s of ['new','review','approved','contacted','replied','won','lost'])assert.equal(nextStage('blocked',s,true),false);});
test('drafts use correct language and opt out without claiming unverified facts',()=>{for(const lang of ['fi','sv','en']){const d=draftFor({...sample,lang});assert.ok(d.subject.includes('Example'));assert.ok(d.body.includes('https://respondoai.fi'));assert.ok(!d.body.includes(sample.evidence));}assert.match(draftFor({...sample,lang:'en'}).body,/Reply if you do not/);});
test('all registered routes require authenticated platform owner, writes require same-origin JSON',()=>{const routes=[];const app={get:(...a)=>routes.push(['GET',...a]),post:(...a)=>routes.push(['POST',...a])};const auth=()=>{},ownerOnly=()=>{};installMovexaSales(app,{db:null,auth,ownerOnly});assert.equal(routes.length,5);for(const [method,path,noStore,a,o,guard] of routes){assert.equal(a,auth);assert.equal(o,ownerOnly);if(method==='POST'){let denied=0,passed=0;const res={status(n){denied=n;return this;},json(){}};guard({get:()=>undefined,is:()=>false},res,()=>passed++);assert.equal(denied,403);assert.equal(passed,0);guard({get:key=>({'X-Movexa-Action':'1','Sec-Fetch-Site':'same-origin'}[key]),is:()=>true},res,()=>passed++);assert.equal(passed,1);}}});

test('rejects IP/local hosts, canonicalizes DNS dot and strips subject newlines',()=>{
 for(const website of ['https://127.0.0.1','https://192.168.0.1','https://service.local','https://[::1]','https://app.internal'])assert.throws(()=>normalizeProspect({...sample,website}));
 assert.equal(normalizeProspect({...sample,website:'https://www.example.com.'}).domain,'example.com');
 assert.doesNotMatch(draftFor({...sample,name:'Example\r\nBcc: test@example.com'}).subject,/[\r\n]/);
 assert.equal(nextStage('constructor','approved',true),false);
 assert.equal(nextStage('review',['approved'],true),false);
});
