// Owner-only, localized Customer Operations in the existing Respondo Growth Center.
(() => {
 'use strict';
 const base='/api/app/native';
 const node=(tag,cls,text)=>{
  const x=document.createElement(tag);if(cls)x.className=cls;
  if(text!==undefined)x.textContent=String(text);
  return x;
 };
 async function api(path,method='GET',body){
  const response=await fetch(base+path,{method,credentials:'same-origin',cache:'no-store',
   headers:{accept:'application/json','content-type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{})});
  const out=await response.json().catch(()=>({}));
  if(!response.ok||out.ok!==true)throw Error(String(out.error||'Unavailable').slice(0,150));
  return out.data;
 }
 let initialized=false;
 function init(){
  const root=document.getElementById('respondoGrowthCenter');
  const ws=document.getElementById('respondoWorkspace');
  if(!root||!ws||ws.dataset.demo==='true')return false;
  if(root.querySelector('#respondoCustomerOps'))return true;
  const lang=['fi','sv','en'].includes(ws.dataset.lang)?ws.dataset.lang:'en';
  const t=(fi,sv,en)=>lang==='fi'?fi:lang==='sv'?sv:en;
  const container=node('section','rs-customer-ops');
  container.id='respondoCustomerOps';
  const details=node('details','rs-ops-details');
  details.append(node('summary','rs-ops-toggle',
   t('Asiakasprosessit, tarjoukset ja yritysverkosto',
    'Kundprocesser, offerter och företagsöversikt',
    'Customer workflows, quotes and company overview')));
  const content=node('div','rs-ops-body');
  details.append(content);container.append(details);
  root.append(container);
  const feedback=node('p','rs-ops-feedback');
  feedback.setAttribute('role','status');
  const intro=node('p','rs-ops-note',t(
   'Ota yrityksen omat prosessit käyttöön yksi kerrallaan. Pyyntöjen käsittely ei vahvista varausta eikä tarjousta.',
   'Aktivera processerna en i taget. En förfrågan bekräftar inte bokning eller offert.',
   'Enable approved procedures one at a time. Receiving a request is not a confirmed booking or quote.'));
  const procedures=node('section','rs-ops-block');
  const quote=node('section','rs-ops-block');
  const triage=node('section','rs-ops-block');
  const agencies=node('section','rs-ops-block');
  content.append(intro,feedback,procedures,quote,triage,agencies);
  let loaded=false,working=false;
  function heading(parent,label){parent.append(node('h3','rs-ops-heading',label));}
  function line(parent,title,description){
   const div=node('div','rs-ops-row');
   div.append(node('strong','',title),node('p','',description));
   parent.append(div);return div;
  }
  async function render(){
   if(working)return;
   working=true;feedback.textContent=t('Haetaan tietoja…','Hämtar uppgifter…','Loading company operations…');
   try{
    const data=await api('/customer-ops');
    loaded=true;feedback.textContent='';
    procedures.replaceChildren();quote.replaceChildren();triage.replaceChildren();
    heading(procedures,t('Hyväksytyt asiointiprosessit','Godkända kundprocesser','Approved customer procedures'));
    const captions={
     moving_quote:t('Muuton kartoitus','Flyttförfrågan','Moving-service intake'),
     service_quote:t('Palvelutarjouspyyntö','Offertförfrågan','Service quote intake'),
     booking_request:t('Ajanvarauksen kartoitus','Bokningsförfrågan','Appointment enquiry')
    };
    for(const item of data.procedures||[]){
     const row=line(procedures,captions[item.code]||item.code,
       t('Asiakas täyttää tarvittavat tiedot, yritys tarkistaa pyynnön.',
        'Kunden anger detaljer, företaget granskar förfrågan.',
        'The visitor supplies the details and your team reviews the request.'));
     const label=node('label','rs-ops-toggle-label');
     const checkbox=node('input');checkbox.type='checkbox';checkbox.checked=item.enabled===true;
     label.append(checkbox,node('span','',t('Käytössä','Aktiv','Enabled')));
     checkbox.addEventListener('change',async()=>{
      const intended=checkbox.checked;
      if(!window.confirm(intended?t(
       'Otetaanko tämä asiointiprosessi käyttöön tämän yrityksen botissa?',
       'Vill du aktivera processen för företagets bot?',
       'Enable this intake process in this company widget?'):
       t('Poistetaanko tämä prosessi käytöstä?','Avaktivera processen?',
         'Disable this procedure?'))){checkbox.checked=!intended;return;}
      checkbox.disabled=true;
      try{await api('/customer-ops/procedure','PUT',
        {code:item.code,enabled:intended,confirm:true});
       feedback.textContent=t('Asetus tallennettu','Inställningen sparad','Procedure setting saved');
      }catch(error){checkbox.checked=!intended;feedback.textContent=error.message;}
      finally{checkbox.disabled=false;}
     });
     row.append(label);
    }
    procedures.append(node('p','rs-ops-note',
      t('Prosessit eivät lähetä automaattisesti sitovia tarjouksia tai vahvista varauksia.',
       'Processerna skickar inte bindande offerter eller bokningar.',
       'Procedures never send binding quotes or automatically confirm bookings.')));
    heading(quote,t('Tarjouslaskennan erittely','Offertberäkning','Transparent quote breakdown'));
    quote.append(node('p','rs-ops-note',t(
     'Laskenta käyttää vain nykyisiä hyväksyttyjä perus-, yksikkö- ja vähimmäishintoja. Matka- ja lisäpalvelukuluja ei ole vahvistettu.',
     'Beräkningen använder endast grund-, stycke- och minimipriser. Resekostnader är inte verifierade.',
     'Uses existing configured base, unit and minimum prices. Travel and add-on charges are not verified.')));
    const form=node('form','rs-ops-quote-form');
    const label=node('label','',t('Yksiköiden määrä','Antal enheter','Number of units'));
    const quantity=node('input','');quantity.type='number';quantity.min='0.001';quantity.max='100000';
    quantity.step='any';quantity.value='1';quantity.required=true;
    label.append(quantity);
    const calculate=node('button','rs-ops-button',t('Laske hinta-arvio','Beräkna uppskattning','Calculate estimate'));
    calculate.type='submit';
    const result=node('p','rs-ops-quote-result');result.setAttribute('role','status');
    form.append(label,calculate,result);quote.append(form);
    form.addEventListener('submit',async event=>{
     event.preventDefault();calculate.disabled=true;
     try{
      const data=await api('/customer-ops/quote-breakdown?quantity='+encodeURIComponent(quantity.value));
      const euro=x=>new Intl.NumberFormat(lang==='en'?'en-IE':lang==='sv'?'sv-SE':'fi-FI',
       {style:'currency',currency:'EUR'}).format(x/100);
      result.textContent=data.service+': '+euro(data.baseCents)+' + '+
       data.quantity+' × '+euro(data.unitCents)+' · '+
       t('vähimmäishinta','minimipris','minimum')+' '+euro(data.minimumCents)+
       ' · '+t('yhteensä','totalt','total')+' '+euro(data.totalCents)+
       ' ('+t('sisältää ALV:n','inklusive moms','incl. VAT')+' '+data.vatPercent+' %). '+
       t('Ei sitova tarjous.','Ej bindande offert.','Non-binding estimate.');
     }catch(error){result.textContent=error.message;}
     finally{calculate.disabled=false;}
    });
    heading(triage,t('Ostovalmiit pyynnöt – viimeiset 30 päivää',
     'Köpklara förfrågningar – senaste 30 dagarna',
     'Lead qualification – last 30 days'));
    const recent=(data.qualifiedRequests||[]).filter(x=>
      ['quote','booking','callback'].includes(x.type)).slice(0,15);
    if(!recent.length)triage.append(node('p','rs-ops-note',
     t('Ei vielä käsiteltäviä pyyntöjä','Inga förfrågningar ännu','No eligible requests yet')));
    for(const item of recent){
     const view=line(triage,
       (item.type==='quote'?t('Tarjous','Offert','Quote'):item.type==='booking'?
         t('Ajanvaraus','Bokning','Booking'):t('Yhteydenotto','Kontakt','Contact'))+
       ' · '+String(item.status||'new'),
       t('Yhteystieto annettu','Kontaktuppgifter lämnade','Contact provided')+
         ': '+(item.qualification?.contactProvided?t('kyllä','ja','yes'):t('ei','nej','no'))+
         ' · '+String(item.createdAt||'').slice(0,10));
     const button=node('button','rs-ops-secondary',
       t('Katso asiakkaan lisätiedot','Visa kundens tillägg','View customer updates'));
     button.type='button';
     const notes=node('div','rs-ops-update-list');
     button.addEventListener('click',async()=>{
      button.disabled=true;
      try{
       const result=await api('/customer-ops/requests/'+encodeURIComponent(item.id)+'/updates');
       notes.replaceChildren();
       if(!result.updates.length)notes.append(node('p','rs-ops-note',
        t('Ei lisätietoja','Inga tillägg','No additional updates')));
       for(const update of result.updates)notes.append(node('p','rs-ops-note',
        String(update.created_at||'').slice(0,10)+' · '+String(update.note||'')));
      }catch(error){notes.textContent=error.message;}
      finally{button.disabled=false;}
     });
     view.append(button,notes);
    }
    triage.append(node('p','rs-ops-note',t(
      'Aieluokitus on avuksi käsittelyjärjestyksessä. Pyyntö tai liidi ei ole vahvistettu kauppa.',
      'Avsiktssignaleringen hjälper prioritering men betyder inte en bekräftad försäljning.',
      'Intent classification helps triage. A lead or request is not a verified sale.')));
    await loadAgency();
   }catch(error){feedback.textContent=error.message;}
   finally{working=false;}
  }
  async function loadAgency(){
   agencies.replaceChildren();
   heading(agencies,t('Usean yrityksen näkymä','Flera företags översikt','Multi-company overview'));
   try{
    const summary=await api('/agency/summary');
    if((summary.workspaces||[]).length<2){
     agencies.append(node('p','rs-ops-note',t(
      'Hallinnoit nyt yhtä yritystä. Voit lisätä yrityksiä Profile-osion kautta.',
      'Du administrerar ett företag. Lägg till fler under Profil.',
      'You currently manage one company. Add another via Profile.')));
     return;
    }
    for(const workspace of summary.workspaces){
     const card=line(agencies,String(workspace.name||'Company'),
       String(workspace.subscription_status||'inactive')+' · '+
       String(workspace.leads_30d||0)+' '+t('liidiä','leads','leads')+' · '+
       String(workspace.requests_30d||0)+' '+t('pyyntöä','förfrågningar','requests'));
     if(workspace.selected)card.append(node('small','rs-ops-current',
       t('Nykyinen työtila','Aktuell arbetsyta','Current workspace')));
    }
    agencies.append(node('p','rs-ops-note',t(
      'Näet vain omistamasi yritykset. Kumppaniprovisioita, asiakkaan omia tunnuksia tai white label -asetuksia ei vielä hallinnoida täällä.',
      'Endast företag du äger visas. Provisioner och white label ingår inte här.',
      'Only your owned companies appear here. Partner commissions, client delegation and white labeling are not configured.')));
   }catch(error){agencies.append(node('p','rs-ops-note',error.message));}
  }
  details.addEventListener('toggle',()=>{if(details.open&&!loaded)render();});
  const observer=new MutationObserver(()=>{
   if(ws.dataset.currentView==='overview'&&details.open&&!loaded)render();
  });
  observer.observe(ws,{attributes:true,attributeFilter:['data-current-view']});
  return true;
 }
 function start(){
  if(init())return;
  const observer=new MutationObserver(()=>{if(init())observer.disconnect();});
  observer.observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
