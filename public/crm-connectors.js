(() => {
  'use strict';
  const API='/api/app/connectors/crm';
  const labels={
    fi:{provider:'CRM-palvelu',credential:'API-tunnus',connect:'Yhdistä ja tarkista',test:'Testaa yhteys',
      disconnect:'Katkaise yhteys',connected:'Yhdistetty',disconnected:'Ei yhdistetty',
      pending:'Jonossa',failed:'Epäonnistunut',loading:'Haetaan yhteyden tilaa…',
      verify:'Tarkistetaan tunnusta…',testing:'Testataan yhteyttä…',removing:'Katkaistaan yhteys…',
      connectedMessage:'CRM-yhteys tarkistettu ja otettu käyttöön.',testGood:'Yhteys toimii.',
      removed:'Yhteys katkaistu ja tunnus poistettu.',loadError:'Yhteystietoja ei voitu hakea.',
      error:'Yhteyttä ei voitu muodostaa.',invalid:'Anna CRM-palvelun API-tunnus.',
      switchConfirm:'Haluatko korvata nykyisen CRM-yhteyden?',
      removeConfirm:'Katkaistaanko yhteys ja poistetaanko tunnus sekä lähettämättömät synkronointipyynnöt?',
      notice:'Tunnus salataan eikä sitä näytetä myöhemmin. Pipedriven API-tunnus voi antaa laajat käyttöoikeudet. HubSpotille tarvitaan kontaktien luku- ja kirjoitusoikeudet.',
      description:'Asiakkaan hyväksymät liidit lähetetään valittuun CRM:ään.',placeholder:'Liitä API-tunnus tähän'},
    sv:{provider:'CRM-system',credential:'API-token',connect:'Anslut och verifiera',test:'Testa anslutning',
      disconnect:'Koppla från',connected:'Ansluten',disconnected:'Inte ansluten',
      pending:'I kö',failed:'Misslyckade',loading:'Hämtar status…',
      verify:'Verifierar token…',testing:'Testar anslutning…',removing:'Kopplar från…',
      connectedMessage:'CRM-anslutningen är verifierad.',testGood:'Anslutningen fungerar.',
      removed:'Anslutningen avslutades och token raderades.',loadError:'Status kunde inte hämtas.',
      error:'Det gick inte att upprätta anslutningen.',invalid:'Ange CRM-systemets API-token.',
      switchConfirm:'Vill du ersätta den befintliga CRM-anslutningen?',
      removeConfirm:'Koppla från och radera token samt ej skickade synkroniseringsuppdrag?',
      notice:'Token lagras krypterad och visas inte igen. Pipedrives API-token kan ge omfattande åtkomst. HubSpot kräver läs- och skrivbehörighet för kontakter.',
      description:'Leads som kunden har godkänt skickas till ditt CRM.',placeholder:'Klistra in API-token här'},
    en:{provider:'CRM provider',credential:'API credential',connect:'Connect & verify',test:'Test connection',
      disconnect:'Disconnect',connected:'Connected',disconnected:'Not connected',
      pending:'Pending',failed:'Failed',loading:'Loading CRM status…',
      verify:'Verifying credentials…',testing:'Testing connection…',removing:'Disconnecting…',
      connectedMessage:'CRM connection verified and enabled.',testGood:'The connection works.',
      removed:'CRM disconnected and credential deleted.',loadError:'Could not load the CRM status.',
      error:'Could not connect to your CRM.',invalid:'Enter your CRM API credential.',
      switchConfirm:'Replace the current CRM connection?',
      removeConfirm:'Disconnect and delete saved credentials and unsent sync tasks?',
      notice:'Credentials are encrypted and never displayed again. Pipedrive API keys may grant broad access. HubSpot requires contact read and write scopes.',
      description:'Customer-consented leads are sent to the selected CRM.',placeholder:'Paste API credential here'}
  };
  function current() {
    const raw=String(document.querySelector('#respondoWorkspace')?.dataset.lang ||
      window.RespondoI18n?.language || document.documentElement.lang || 'en').toLowerCase().slice(0,2);
    return labels[raw]||labels.en;
  }
  function mount() {
    const root=document.getElementById('respondoCrmConnectorMount');
    if(!root||root.dataset.bound==='true')return;
    root.dataset.bound='true';
    const t=current();
    const form=document.createElement('form');
    form.className='respondo-crm-form';
    form.innerHTML=
      '<div class="respondo-crm-status" role="status" aria-live="polite"><strong data-crm-state></strong><span data-crm-queue></span></div>'+
      '<div class="respondo-crm-fields"><label>'+t.provider+'<select name="provider" required><option value="hubspot">HubSpot</option><option value="pipedrive">Pipedrive</option></select></label>'+
      '<label>'+t.credential+'<input name="token" type="password" minlength="15" maxlength="512" required autocomplete="off" spellcheck="false"></label></div>'+
      '<p class="respondo-crm-hint">'+t.description+'</p><p class="respondo-crm-hint">'+t.notice+'</p>'+
      '<div class="respondo-crm-actions"><button type="submit" data-crm-connect>'+t.connect+'</button>'+
      '<button type="button" data-crm-test disabled>'+t.test+'</button>'+
      '<button type="button" data-crm-disconnect disabled>'+t.disconnect+'</button></div>'+
      '<p class="respondo-crm-feedback" role="status" aria-live="polite"></p>';
    root.appendChild(form);
    const provider=form.elements.provider,token=form.elements.token;
    token.placeholder=t.placeholder;
    const status=form.querySelector('[data-crm-state]');
    const queue=form.querySelector('[data-crm-queue]');
    const feedback=form.querySelector('.respondo-crm-feedback');
    const connectButton=form.querySelector('[data-crm-connect]');
    const testButton=form.querySelector('[data-crm-test]');
    const removeButton=form.querySelector('[data-crm-disconnect]');
    let connected=false,busy=false;
    function update(data) {
      connected=Boolean(data?.connected);
      status.textContent=connected
        ? t.connected+' · '+(data.provider==='pipedrive'?'Pipedrive':'HubSpot')
        : t.disconnected;
      status.dataset.connected=String(connected);
      queue.textContent=data?.queue
        ? t.pending+': '+Math.max(0,Number(data.queue.pending)||0)+' · '+t.failed+': '+Math.max(0,Number(data.queue.failed)||0)
        : '';
      if(connected&&['hubspot','pipedrive'].includes(data.provider))provider.value=data.provider;
      testButton.disabled=busy||!connected;
      removeButton.disabled=busy||!connected;
    }
    function lock(value,message='') {
      busy=value;
      connectButton.disabled=value;
      provider.disabled=value;
      token.disabled=value;
      testButton.disabled=value||!connected;
      removeButton.disabled=value||!connected;
      if(message)feedback.textContent=message;
    }
    async function request(method,path=API,body) {
      const response=await fetch(path,{
        method,credentials:'same-origin',cache:'no-store',
        headers:{'content-type':'application/json',accept:'application/json'},
        ...(body?{body:JSON.stringify(body)}:{})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(typeof result.error==='string'?result.error:t.error);
      return result;
    }
    async function refresh() {
      try {update(await request('GET'));} catch {status.textContent=t.loadError;}
    }
    status.textContent=t.loading;
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(busy)return;
      const key=String(token.value||'').trim();
      if(key.length<15){feedback.textContent=t.invalid;return;}
      if(connected&&!window.confirm(t.switchConfirm))return;
      lock(true,t.verify);
      try {
        await request('POST',API,{provider:provider.value,token:key});
        token.value='';
        feedback.textContent=t.connectedMessage;
        await refresh();
      }catch(error){token.value='';feedback.textContent=error.message||t.error;}
      finally{lock(false);}
    });
    testButton.addEventListener('click',async()=>{
      if(busy||!connected)return;
      lock(true,t.testing);
      try{await request('POST',API+'/test');feedback.textContent=t.testGood;}
      catch(error){feedback.textContent=error.message||t.error;}
      finally{await refresh();lock(false);}
    });
    removeButton.addEventListener('click',async()=>{
      if(busy||!connected||!window.confirm(t.removeConfirm))return;
      lock(true,t.removing);
      try{
        await request('DELETE');
        feedback.textContent=t.removed;
        token.value='';
        await refresh();
      }catch(error){feedback.textContent=error.message||t.error;}
      finally{lock(false);}
    });
    refresh();
  }
  function init(){
    const app=document.getElementById('app');
    if(!app)return;
    mount();
    new MutationObserver(mount).observe(app,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();