(() => {
 'use strict';
 const langParam=new URLSearchParams(location.search).get('lang');
 const lang=['fi','sv','en'].includes(langParam)?langParam:
   navigator.language.toLowerCase().startsWith('fi')?'fi':
   navigator.language.toLowerCase().startsWith('sv')?'sv':'en';
 document.documentElement.lang=lang;
 const dict={
  fi:{private:'Yksityinen asiointilinkki',title:'Asiointipyyntösi',intro:'Seuraa pyyntösi käsittelyä ja täydennä sitä tarvittaessa. Säilytä tämä linkki yksityisenä.',
   statusTitle:'Pyynnön tila',checking:'Tarkistetaan…',new:'Vastaanotettu',in_progress:'Käsittelyssä',
   done:'Käsitelty',unavailable:'Linkki on virheellinen tai vanhentunut.',error:'Tilaa ei saatu juuri nyt. Päivitä sivu myöhemmin.',
   disclaimer:'Vastaanotettu pyyntö ei vielä ole vahvistettu varaus, hyväksytty tarjous tai maksu.',
   addInfo:'Täydennä pyyntöä',noteDisclaimer:'Lisätiedot näkyvät pyyntöä käsittelevälle yritykselle. Älä lähetä salasanoja tai maksukorttitietoja.',
   noteLabel:'Lisätiedot',submit:'Lähetä lisätiedot',footer:'Linkki vanhenee 30 päivän kuluttua.',
   sent:'Lisätiedot vastaanotettu. Yritys tarkistaa ne.',sendError:'Lähetys ei onnistunut.',
   company:'Yritys',request:'Pyyntö',updated:'Päivitetty',
   quote:'Tarjouspyyntö',booking:'Ajanvarauspyyntö',callback:'Yhteydenottopyyntö'},
  sv:{private:'Privat ärendelänk',title:'Din förfrågan',intro:'Följ din förfrågan och komplettera den vid behov. Dela inte denna privata länk.',
   statusTitle:'Aktuell status',checking:'Kontrollerar…',new:'Mottagen',in_progress:'Behandlas',
   done:'Behandlad',unavailable:'Länken är ogiltig eller har gått ut.',error:'Status kan inte hämtas just nu. Försök senare.',
   disclaimer:'En mottagen förfrågan är inte en bekräftad bokning, godkänd offert eller genomförd betalning.',
   addInfo:'Komplettera förfrågan',noteDisclaimer:'Tilläggsinformationen visas för företaget. Skicka inte lösenord eller betalkortsuppgifter.',
   noteLabel:'Ytterligare information',submit:'Skicka tilläggsinformation',footer:'Länken upphör efter 30 dagar.',
   sent:'Uppgifterna har mottagits. Företaget granskar dem.',sendError:'Det gick inte att skicka.',
   company:'Företag',request:'Förfrågan',updated:'Uppdaterad',
   quote:'Offertförfrågan',booking:'Bokningsförfrågan',callback:'Kontaktförfrågan'},
  en:{private:'Private request link',title:'Your request',intro:'Check the status of your request and add any missing details. Keep this private link to yourself.',
   statusTitle:'Current status',checking:'Checking…',new:'Received',in_progress:'In progress',
   done:'Reviewed',unavailable:'This link is invalid or has expired.',error:'Status is temporarily unavailable. Please try again.',
   disclaimer:'A received request is not a confirmed booking, approved quote or completed payment.',
   addInfo:'Add information',noteDisclaimer:'Additional information is visible to the company handling the request. Never submit passwords or card details.',
   noteLabel:'Additional details',submit:'Send update',footer:'This link expires after 30 days.',
   sent:'Update received. The company will review it.',sendError:'Could not send the update.',
   company:'Company',request:'Request',updated:'Last updated',
   quote:'Quote request',booking:'Booking request',callback:'Contact request'}
 };
 const t=dict[lang];
 for(const node of document.querySelectorAll('[data-i18n]'))
  node.textContent=t[node.dataset.i18n]||node.textContent;
 const status=document.getElementById('requestStatus');
 const details=document.getElementById('requestDetails');
 const panel=document.getElementById('notesPanel');
 const feedback=document.getElementById('noteFeedback');
 const token=new URLSearchParams(location.hash.slice(1)).get('token')||'';
 // The browser fragment never leaves this page in a GET request, and the
 // secret is only sent in the HTTPS POST body. No third-party scripts.
 if(!/^[a-f0-9]{64}$/i.test(token)){status.textContent=t.unavailable;return;}
 async function call(url,body){
  const response=await fetch(url,{method:'POST',credentials:'omit',cache:'no-store',
   headers:{'content-type':'application/json','accept':'application/json'},
   referrerPolicy:'no-referrer',body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true)throw Error('Unavailable');
  return data.data;
 }
 const addDetail=(title,value)=>{
  const line=document.createElement('div');
  const bold=document.createElement('strong');bold.textContent=title+': ';
  line.append(bold,document.createTextNode(String(value||'—')));
  details.append(line);
 };
 async function load(){
  try{
   const result=await call('/api/public/request-status',{token});
   status.textContent=t[result.status]||t.new;
   details.replaceChildren();
   addDetail(t.company,result.companyName);
   addDetail(t.request,t[result.type]||result.type);
   const when=new Date(result.updatedAt);
   if(Number.isFinite(when.getTime()))addDetail(t.updated,when.toLocaleString(lang==='en'?'en-GB':lang==='sv'?'sv-SE':'fi-FI'));
   panel.hidden=false;
  }catch{status.textContent=t.unavailable;panel.hidden=true;}
 }
 const form=document.getElementById('addNoteForm');
 form.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const button=document.getElementById('noteButton');
  button.disabled=true;feedback.textContent='';
  try{
   await call('/api/public/request-status/note',{token,note:form.elements.note.value});
   form.elements.note.value='';feedback.textContent=t.sent;
  }catch{feedback.textContent=t.sendError;}
  finally{button.disabled=false;}
 });
 load();
})();