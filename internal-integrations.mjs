/** Respondo-owned channels, draft routing and lead extraction. No external AI dependencies. */
const norm=s=>String(s??'').normalize('NFKC').trim();
const safe=s=>norm(s).slice(0,4000);
const emails=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const intents=[
 {id:'booking',re:/\b(ajanvaraus|varata|varaus|aika(?:a|na)?|vapaa(?:ta)?|booking|appointment|available|reserve|boka|tid|ledig)\b/i},
 {id:'pricing',re:/\b(hinta|paljonko|maksaa|tarjous|price|cost|quote|pris|kostar|offert)\b/i},
 {id:'complaint',re:/\b(reklamaatio|valitus|pettynyt|rikki|refund|complaint|broken|reklamation|klagomål)\b/i},
 {id:'human',re:/\b(ihminen|asiakaspalvelija|soitto|human|agent|person|medarbetare|människa)\b/i}
];
export function classifyInboundMessage(input) {
 const subject=safe(input?.subject),body=safe(input?.body);
 if(!body&&!subject)return {status:'invalid',reason:'empty_message'};
 const text=(subject+' '+body).slice(0,8000);
 const intent=intents.find(i=>i.re.test(text))?.id??'general';
 const lang=/[åäö]|\b(hej|tack|jag|har|vill|boka)\b/i.test(text)&&/\b(hej|tack|jag|vill|boka)\b/i.test(text)?'sv':
 /\b(hello|hi|please|could|thanks|price|booking|appointment)\b/i.test(text)?'en':'fi';
 return {status:'classified',intent,language:lang,needsHuman:intent==='complaint'||intent==='human',requiresApproval:true};
}
export function prepareInboundCase({source,externalMessageId,from,subject,body,channelContactId}) {
 const allowed=new Set(['email','gmail','outlook','website','whatsapp','instagram','facebook','sms','zendesk','freshdesk','hubspot','pipedrive','shopify','woocommerce','manual']);
 const channel=norm(source).toLowerCase();
 if(!allowed.has(channel))return {status:'invalid',reason:'unsupported_channel'};
 const externalId=norm(externalMessageId);
 if(!externalId||externalId.length>200)return {status:'invalid',reason:'message_id_required'};
 const sender=norm(from).toLowerCase();
 if(channel==='email'&&(!emails.test(sender)||sender.length>254))return {status:'invalid',reason:'sender_email_required'};
 const text=safe(body),heading=safe(subject).slice(0,300);
 if(!text&&!heading)return {status:'invalid',reason:'empty_message'};
 const classification=classifyInboundMessage({subject:heading,body:text});
 return {status:'ready',channel,externalId,sender:sender.slice(0,254),channelContactId:norm(channelContactId).slice(0,200)||null,subject:heading,body:text,classification};
}
export function draftResponse({caseData,approvedFacts=[]}) {
 if(caseData?.status!=='ready')return {status:'invalid'};
 const lang=caseData.classification.language,intent=caseData.classification.intent;
 const templates={
 fi:{booking:'Kiitos viestistäsi. Kerrotko työn laajuuden, kohteen sijainnin ja toivotun ajankohdan? Tarkistamme tämän jälkeen, mikä aika sopisi koko työlle.',pricing:'Kiitos viestistäsi. Kerrotko tarkemmin palvelun ja työn laajuuden, jotta voimme valmistella tarjouksen?',general:'Kiitos viestistäsi. Välitämme asian asiakaspalveluumme ja palaamme asiaan.'},
 sv:{booking:'Tack för ditt meddelande. Beskriv gärna arbetets omfattning, plats och önskad tid så att vi kan kontrollera en lämplig tid.',pricing:'Tack för ditt meddelande. Beskriv gärna tjänsten och arbetets omfattning så kan vi förbereda en offert.',general:'Tack för ditt meddelande. Vi skickar ärendet vidare till kundtjänsten.'},
 en:{booking:'Thank you for your message. Could you share the scope of work, location and preferred time? We will then check a suitable slot for the full job.',pricing:'Thank you for your message. Please describe the service and scope of work so we can prepare a quote.',general:'Thank you for your message. Our team will review your request and follow up.'}
 };
 const category=['booking','pricing'].includes(intent)?intent:'general';
 // Drafts cannot assert availability, pricing, refunds or company-specific facts.
 return {status:'draft',text:templates[lang][category],language:lang,requiresApproval:true,sendAllowed:false,factsUsed:0};
}
export function validateIntegrationSettings(input){
 const allowed=['email','google_calendar','outlook','hubspot','pipedrive','freshdesk','zendesk','whatsapp','instagram','facebook','shopify','woocommerce','google_drive','sharepoint'];
 const provider=norm(input?.provider).toLowerCase();
 if(!allowed.includes(provider))return {status:'invalid',reason:'unknown_provider'};
 const mode=norm(input?.mode||'manual').toLowerCase();
 if(!['manual','connected','disabled'].includes(mode))return {status:'invalid',reason:'unknown_mode'};
 // "connected" must be established by provider verification, not a client claim.
 if(mode==='connected')return {status:'invalid',reason:'provider_verification_required'};
 return {status:'valid',provider,mode};
}
