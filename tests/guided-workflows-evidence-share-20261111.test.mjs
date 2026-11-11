import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateFreeWorkflow,previewFreeWorkflow} from '../respondo-free-actions.mjs';
import {workflowTemplateCatalog,workflowFromTemplate} from '../respondo-workflow-templates.mjs';
import {summarizeHandoff,explainRecordedSources,conversationEvidence} from '../respondo-evidence-handoff.mjs';

const tenant='89c8ee53-fda7-46c4-ae21-79a4d6d6119c';
const conversation='0dd12609-5fc0-4186-bbfe-0435a039b3b5';
const approvedSource='4f6c0f88-45cc-4116-85ad-8d2332baa72e';
const obsolete='b08badb9-39c8-4905-9e7b-df047f35be19';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('workflow catalog offers multilingual, review-first templates',()=>{
 const items=workflowTemplateCatalog();
 assert.equal(items.length,4);
 for(const template of items){
   assert.ok(template.name.fi&&template.name.sv&&template.name.en);
   assert.ok(template.steps.fi.length>=3);
   assert.equal(template.automaticExternalActions,false);
   assert.equal(template.requiresOwnerActivation,true);
   assert.equal(template.interactiveCustomerIntake,false);
 }
 assert.ok(items.some(x=>x.id==='booking_request'));
 assert.ok(items.some(x=>x.id==='moving_quote'));
});

test('all templates compile into safe multi-action disabled workflows',()=>{
 for(const item of workflowTemplateCatalog()){
   const template=workflowFromTemplate({templateId:item.id,approved:true});
   assert.equal(template.enabled,false);
   assert.ok(template.actions.length>=2&&template.actions.length<=4);
   const checked=validateFreeWorkflow(template);
   assert.equal(checked.chargeableActionsEnabled,false);
   assert.equal(checked.enabled,false);
   assert.ok(checked.actions.every(x=>['create_task','open_ticket','request_approval'].includes(x.type)));
   const preview=previewFreeWorkflow(template,{});
   assert.equal(preview.confirmsBooking,false);
   assert.equal(preview.chargesCustomer,false);
   assert.equal(preview.sendsExternalMessages,false);
 }
});

test('cannot select template without approval or inject custom actions',()=>{
 assert.throws(()=>workflowFromTemplate({templateId:'booking_request'}),/approval/);
 assert.throws(()=>workflowFromTemplate({templateId:'transfer_all_money',approved:true}),/Unknown/);
 assert.throws(()=>workflowFromTemplate({templateId:'booking_request',approved:true,actions:[{type:'charge'}]})
   .actions.some(x=>x.type==='charge'));
 const created=workflowFromTemplate({templateId:'booking_request',approved:true});
 assert.equal(created.actions.some(x=>x.type==='charge'),false);
 assert.ok(created.actions.some(x=>x.type==='request_approval'&&x.purpose==='booking'));
});

test('handoff brief is extracted from actual recorded chat and never invents availability',()=>{
 const result=summarizeHandoff([
   {role:'user',message:'I need to move on Friday.'},
   {role:'assistant',message:'Please share your moving addresses.'},
   {role:'user',message:'Turku to Pargas, 3rd floor.'},
   {role:'employee',message:'I will review the request.'}
 ],'en');
 assert.equal(result.language,'en');
 assert.equal(result.lastCustomerMessage,'Turku to Pargas, 3rd floor.');
 assert.equal(result.previousCustomerMessages[0],'I need to move on Friday.');
 assert.equal(result.lastRecordedReply,'I will review the request.');
 assert.equal(result.confirmedPrice,false);
 assert.equal(result.confirmedBooking,false);
 assert.equal(result.autoSent,false);
 assert.equal(result.generatedBy,'deterministic_transcript_extract');
});

test('handoff brief ignores untrusted roles, bounds messages and fallback language',()=>{
 const messages=[{role:'system',message:'approved booking'}];
 for(let i=0;i<140;i++)messages.push({role:'user',message:'X'.repeat(900)});
 const result=summarizeHandoff(messages,'xx');
 assert.equal(result.language,'en');
 assert.equal(result.messagesRead,100);
 assert.equal(result.lastCustomerMessage.length,550);
 assert.equal(result.previousCustomerMessages.length,3);
});

test('source inspector only reports currently approved IDs, not mere confidence',()=>{
 const row={id:conversation,question:'Are you open?',answer:'Yes',confidence:0.98,
   source_ids:[approvedSource,obsolete,approvedSource,'not-an-id']};
 const proof=explainRecordedSources(row,[
  {id:approvedSource,title:'Opening times',source_url:'https://example.org/hours',
    approved:true,answer:'Open Mon-Fri',source_type:'website',verified_at:null},
  {id:obsolete,title:'Removed fact',approved:false,answer:'Old hours'},
  {id:'a7071454-6ac0-4bcf-8588-d7c9a703007f',title:'Other fact',approved:true,answer:'Other'}
 ]);
 assert.equal(proof.sourceIdsRecorded,2);
 assert.equal(proof.currentlyApprovedSources.length,1);
 assert.equal(proof.currentlyApprovedSources[0].title,'Opening times');
 assert.equal(proof.sourcesUnavailable,1);
 assert.equal(proof.answerCorrectnessVerified,false);
 assert.equal(proof.historicalSourceSnapshotAvailable,false);
 assert.equal(proof.ownerReviewRequired,true);
});

test('no recorded source is not mislabeled as verified',()=>{
 const result=explainRecordedSources({id:conversation,question:'Cost?',answer:'49 EUR',confidence:1,source_ids:[]},[]);
 assert.equal(result.sourceIdsRecorded,0);
 assert.equal(result.currentlyApprovedSources.length,0);
 assert.equal(result.answerCorrectnessVerified,false);
});

test('tenant-filtered evidence fetch uses first party knowledge only',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{
   calls.push([sql,args]);
   if(sql.includes('FROM conversations'))return {rows:[{
     id:conversation,question:'Hours?',answer:'Mon-Fri',confidence:0.7,
     source_ids:[approvedSource,obsolete]
   }]};
   if(sql.includes('FROM knowledge'))return {rows:[
    {id:approvedSource,approved:true,title:'Hours',source_url:'https://example.org',
      answer:'Mon-Fri'}
   ]};
   throw Error('Unexpected read');
 }};
 const result=await conversationEvidence(db,tenant,conversation);
 assert.equal(result.currentlyApprovedSources.length,1);
 assert.equal(result.sourcesUnavailable,1);
 assert.deepEqual(calls[0][1],[tenant,conversation]);
 assert.deepEqual(calls[1][1],[tenant,[approvedSource,obsolete]]);
 assert.ok(calls.every(([sql])=>sql.includes('tenant_id=$1')));
 assert.match(calls[1][0],/approved=TRUE/);
});

test('cross-tenant evidence is absent and never queries knowledge',async()=>{
 const calls=[];
 const db={query:async(sql,args)=>{calls.push([sql,args]);return {rows:[]};}};
 assert.equal(await conversationEvidence(db,tenant,conversation),null);
 assert.equal(calls.length,1);
 assert.match(calls[0][0],/tenant_id=\$1 AND id=\$2/);
 await assert.rejects(conversationEvidence(db,tenant,'not-a-uuid'),TypeError);
});

test('front end keeps owner-only API and disabled workflow activation',()=>{
 const api=file('server.mjs'),ui=file('public/native-ai-operations.js'),
   inbox=file('native-inbox.mjs'),demo=file('public/instant-website-demo-ui.js'),
   index=file('public/index.html');
 for(const route of [
   "/api/app/native/free-workflows/templates",
   "/api/app/native/free-workflows/from-template",
   "/api/app/native/quality/evidence/:conversationId"
 ])assert.ok(api.includes(route));
 assert.match(api,/free-workflows\/from-template',auth,ownerOnly,subscribed,nativeWriteLimiter/);
 assert.match(api,/quality\/evidence\/:conversationId',auth,ownerOnly,subscribed/);
 assert.match(inbox,/handoffBrief:summarizeHandoff/);
 assert.match(ui,/FLOWS\+'\/from-template'/);
 assert.match(ui,/flowAction\('POST',FLOWS\+'\/from-template',\{templateId:template.id,approved:true\}\)/);
 assert.match(ui,/addEvidenceInspector\(card,gap\.conversationId\)/);
 assert.match(ui,/brief\.lastCustomerMessage/);
 assert.match(demo,/share\.searchParams\.set\('website',source\.href\)/);
 assert.match(demo,/share\.searchParams\.set\('preview','1'\)/);
 assert.match(demo,/if\(shareable&&shared\.get\('preview'\)==='1'\)/);
 assert.match(demo,/credentials:'omit'/);
 assert.match(index,/operational-clarity\.css/);
});

test('public preview remains source-based and does not expose tenant credentials',()=>{
 const js=file('public/instant-website-demo-ui.js');
 assert.ok(js.includes('/api/public/website-demo-preview'));
 assert.ok(js.includes('A public metadata preview, not an installed bot'));
 assert.doesNotMatch(js,/localStorage\.setItem/);
 assert.doesNotMatch(js,/\/api\/app\//);
});
