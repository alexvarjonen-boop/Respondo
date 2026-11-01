// Mainio-specific intake. Business facts remain in approved knowledge rows.
// Basic fields verified at https://tarjous.mainiomuuttopalvelu.fi/ on 2026-11-01.
// Access/boxes fields requested explicitly by the owner; these are questions,
// never assertions about available services, prices or availability.
export const MOVING_QUOTE_URL = 'https://tarjous.mainiomuuttopalvelu.fi/';
const tr = (fi,en,sv) => ({fi,en,sv});
export const MOVING_FIELDS = [
 ['name',tr('Mikä on etu- ja sukunimesi?','What is your full name?','Vad är ditt för- och efternamn?')],
 ['email',tr('Mikä on sähköpostiosoitteesi?','What is your email address?','Vad är din e-postadress?')],
 ['phone',tr('Mikä on puhelinnumerosi?','What is your phone number?','Vad är ditt telefonnummer?')],
 ['residents',tr('Kuinka monta asukasta muuttaa?','How many residents are moving?','Hur många personer flyttar?')],
 ['date',tr('Mille päivälle toivot muuttoa? Anna päivämäärä muodossa pp.kk.vvvv.','What moving date would you prefer? Use DD.MM.YYYY.','Vilket flyttdatum önskar du? Ange DD.MM.ÅÅÅÅ.')],
 ['wholeHome',tr('Muutetaanko koko asunto vai vain osa tavaroista?','Are you moving the whole home or only some belongings?','Flyttas hela bostaden eller bara en del av sakerna?')],
 ['yearsAtHome',tr('Kuinka kauan olette asuneet nykyisessä asunnossanne?','How long have you lived in your current home?','Hur länge har ni bott i er nuvarande bostad?')],
 ['from',tr('Mikä on lähtöosoite ja paikkakunta?','What is the pickup address and town?','Vilken är avreseadressen och orten?')],
 ['size',tr('Mikä on lähtöasunnon koko neliömetreinä?','What is the size of your current home in square metres?','Hur stor är den nuvarande bostaden i kvadratmeter?')],
 ['fromAccess',tr('Mikä on lähtöasunnon talotyyppi ja kerros? Onko käytettävissä hissi?','What is the pickup building type and floor? Is there a lift?','Vilken hustyp och våning gäller på avreseadressen? Finns det hiss?')],
 ['fromParking',tr('Saako muuttoauton lähtöosoitteessa oven eteen? Jos ei, mikä on arvioitu kantomatka?','Can the moving van park by the pickup entrance? If not, what is the approximate carrying distance?','Kan flyttbilen parkera vid avreseadressens dörr? Om inte, hur lång är bärsträckan ungefär?')],
 ['to',tr('Mikä on kohdeosoite ja paikkakunta?','What is the destination address and town?','Vilken är destinationsadressen och orten?')],
 ['toAccess',tr('Mikä on kohteen talotyyppi ja kerros? Onko käytettävissä hissi?','What is the destination building type and floor? Is there a lift?','Vilken hustyp och våning gäller på destinationsadressen? Finns det hiss?')],
 ['toParking',tr('Saako muuttoauton kohteessa oven eteen? Jos ei, mikä on arvioitu kantomatka?','Can the moving van park by the destination entrance? If not, what is the approximate carrying distance?','Kan flyttbilen parkera vid destinationens dörr? Om inte, hur lång är bärsträckan ungefär?')],
 ['boxes',tr('Onko sinulla omat muuttolaatikot? Jos tarvitset laatikoita, kuinka monta? Voit vastata myös ”en tiedä”.','Do you have your own moving boxes? If you need boxes, how many? You can also answer “I do not know”.','Har du egna flyttlådor? Om du behöver lådor, hur många? Du kan också svara ”vet inte”.')],
 ['details',tr('Onko muutossa muuta huomioitavaa, esimerkiksi suuria tai raskaita esineitä? Voit vastata ”ei”.','Is there anything else to consider, such as large or heavy items? You can answer “none”.','Finns det något annat att beakta, till exempel stora eller tunga föremål? Du kan svara ”nej”.')],
];
const copy = {
 intro:tr('Kartoitetaan muutto Mainion arvioitavaksi. Tämä ei ole vahvistettu varaus. Voit palata edelliseen kysymykseen kirjoittamalla ”takaisin” tai lopettaa kirjoittamalla ”peruuta”.','Let us collect the moving details for Mainio to review. This is not a confirmed booking. Type “back” to correct the previous answer or “cancel” to stop.','Vi samlar flyttuppgifterna för Mainios bedömning. Detta är inte en bekräftad bokning. Skriv ”tillbaka” för att ändra föregående svar eller ”avbryt” för att avsluta.'),
 review:tr('Tarkista tiedot. Kirjoita ”vahvista” tallentaaksesi pyynnön ja yhteystietosi Mainion käsiteltäväksi. Korjaa kenttä kirjoittamalla ”korjaa 8” (kentän numero). Hinta ja ajankohta vahvistetaan erikseen.','Review the details. Type “confirm” to save the request and your contact details for Mainio to review. To correct a field, type “edit 8” (field number). Price and availability must be confirmed separately.','Kontrollera uppgifterna. Skriv ”bekräfta” för att spara förfrågan och kontaktuppgifterna för Mainios behandling. Ändra ett fält genom att skriva ”ändra 8” (fältnummer). Pris och tidpunkt bekräftas separat.'),
 saved:tr('Muuttopyyntösi on tallennettu Mainion käsiteltäväksi. Muuttoa, hintaa tai ajankohtaa ei ole vielä vahvistettu.','Your moving request has been saved for Mainio to review. The move, price and date have not yet been confirmed.','Din flyttförfrågan har sparats för Mainios behandling. Flytten, priset och tidpunkten är ännu inte bekräftade.'),
 cancelled:tr('Kartoitus lopetettu. Muuttopyyntöä ei lähetetty.','Intake cancelled. No moving request was submitted.','Kartläggningen avbröts. Ingen flyttförfrågan skickades.'),
 invalid:tr('Tarkista vastaus ja yritä uudelleen.','Please check your answer and try again.','Kontrollera svaret och försök igen.'),
};
export function isMainioTenant(tenant) {
 try { return new URL(tenant.website).hostname.replace(/^www\./,'').toLowerCase()==='mainiomuuttopalvelu.fi'; } catch { return false; }
}
export function startsMovingIntake(message) {
 return /\b(?:tilaa muutto|haluan (?:tilata|varata) muuton|muuttotarjous|muuttokartoitus|book (?:a |my )?move|moving quote|boka flytt|flyttoffert)\b/iu.test(message);
}
function valid(key,value,now) {
 if(!value || value.length>600 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return false;
 if(key==='email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
 if(key==='phone') return /^[+\d ()-]{5,30}$/.test(value) && value.replace(/\D/g,'').length>=5;
 if(key==='residents') return /^\d{1,3}$/.test(value) && Number(value)>0;
 if(key==='date') {
  const m=value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if(!m)return false;
  const [,d,mo,y]=m.map(Number); const dt=new Date(Date.UTC(y,mo-1,d));
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Helsinki'}).format(now);
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d&&dt.toISOString().slice(0,10)>=today;
 }
 return true;
}
export function movingSummary(answers,lang='fi') {
 return MOVING_FIELDS.map(([key,question],i)=>`${i+1}. ${question[lang]}\n${answers[key]||'—'}`).join('\n\n');
}
export function advanceMovingIntake({tenant,state,message,lang='fi',now=new Date()}) {
 if(!isMainioTenant(tenant))return null;
 lang=['fi','en','sv'].includes(lang)?lang:'fi';
 const text=String(message||'').trim();
 if(!state || state.status==='submitted') {
  if(!startsMovingIntake(text))return null;
  state={status:'collecting',step:0,answers:{},lang};
  return {state,answer:copy.intro[lang]+'\n\n'+MOVING_FIELDS[0][1][lang]};
 }
 lang=state.lang;
 state={...state,answers:{...state.answers}};
 if(/^(peruuta|cancel|avbryt)$/iu.test(text))return {state:null,answer:copy.cancelled[lang]};
 const edit=text.match(/^(?:korjaa|edit|ändra)\s+(\d{1,2})$/iu);
 if(edit || /^(takaisin|back|tillbaka)$/iu.test(text)) {
  const step=edit?Number(edit[1])-1:Math.max(0,(state.step??MOVING_FIELDS.length)-1);
  if(step<0||step>=MOVING_FIELDS.length)return {state,answer:copy.invalid[lang]};
  state.step=step;state.status='collecting';
  return {state,answer:MOVING_FIELDS[step][1][lang]};
 }
 if(state.status==='review') {
  if(!/^(vahvista|confirm|bekräfta)$/iu.test(text))return {state,answer:copy.review[lang]};
  state.status='submitted';
  return {state,submit:true,answer:copy.saved[lang],summary:movingSummary(state.answers,lang)};
 }
 // Questions during intake go through the normal grounded answer engine.
 // They must not silently become an address, name or other field answer.
 if(text.includes('?'))return null;
 const [key]=MOVING_FIELDS[state.step];
 if(!valid(key,text,now))return {state,answer:copy.invalid[lang]+'\n'+MOVING_FIELDS[state.step][1][lang]};
 state.answers[key]=text;
 const next=MOVING_FIELDS.findIndex(([field],i)=>i>state.step&&!state.answers[field]);
 const missing=MOVING_FIELDS.findIndex(([field])=>!state.answers[field]);
 state.step=next>=0?next:missing>=0?missing:MOVING_FIELDS.length;
 if(state.step===MOVING_FIELDS.length){state.status='review';return {state,answer:movingSummary(state.answers,lang)+'\n\n'+copy.review[lang]};}
 return {state,answer:MOVING_FIELDS[state.step][1][lang]};
}
