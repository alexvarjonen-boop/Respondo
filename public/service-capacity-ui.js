(() => {
  'use strict';
  const text={
    fi:{title:'Älykäs työajan arviointi',subtitle:'Ikkunanpesu: asiakas antaa ikkunoiden määrän, koon, pesupuolet ja saavutettavuuden. Respondo laskee keston näillä yrityksesi hyväksymillä säännöillä ja tarkistaa koko työn mittaisen vapaan ajan.',
      active:'Käytä automaattista työajan arviointia',unit:'Minuuttia / tavallinen ikkuna (yksi puoli)',
      base:'Valmistelu, min',buffer:'Siirtymä- ja varoaika, min',large:'Ison ikkunan kerroin',
      both:'Molempien puolien kerroin',access:'Vaikean pääsyn lisäminuutit',
      maximum:'Enimmäisikkunamäärä automaattiselle arviolle',save:'Tallenna yrityksen työaikasäännöt',
      loading:'Ladataan työaikasääntöjä…',saved:'Säännöt tallennettu.',failed:'Asetuksia ei voitu tallentaa.',
      warning:'Automaattista ajanvarausta ei luvata, jos kalenteria ei voi tarkistaa, tiedot puuttuvat tai aika on liian lyhyt. Arviot ovat suuntaa-antavia, eivät sitovia tarjouksia.',
      unconfigured:'Ei käytössä – täytä yrityksen omat työaikanormit ja ota käyttöön erikseen.',
      configured:'Käytössä – vasta kun olet vahvistanut, että työaikanormit ovat oikein.'},
    sv:{title:'Smart arbetstidsberäkning',subtitle:'Fönstertvätt: kunden anger antal, storlek, sidor och tillgänglighet. Respondo beräknar arbetstiden enligt företagets godkända regler och kontrollerar hela tidsintervallet.',
      active:'Aktivera automatisk arbetstidsberäkning',unit:'Minuter per vanligt fönster (ena sidan)',
      base:'Förberedelse, min',buffer:'Restid och buffert, min',large:'Faktor för stora fönster',
      both:'Faktor för båda sidor',access:'Extra minuter för svår åtkomst',
      maximum:'Maxantal fönster för automatisk uppskattning',save:'Spara företagets tidsregler',
      loading:'Hämtar tidsregler…',saved:'Regler sparade.',failed:'Inställningarna kunde inte sparas.',
      warning:'En bokning utlovas inte om kalendern inte kan kontrolleras, uppgifter saknas eller tiden är för kort. Uppskattningar är inte bindande offerter.',
      unconfigured:'Inte aktiverad – ange företagets tidsnormer och aktivera separat.',
      configured:'Aktiv – när du har verifierat att tidsnormerna stämmer.'},
    en:{title:'Smart service duration estimates',subtitle:'Window cleaning: the visitor provides window count, size, cleaning sides and accessibility. Respondo calculates the workload from your approved standards and checks a continuous available slot.',
      active:'Enable automatic job duration estimates',unit:'Minutes per standard window (one side)',
      base:'Setup time, minutes',buffer:'Travel / safety buffer, minutes',large:'Large-window multiplier',
      both:'Both-sides multiplier',access:'Additional minutes for difficult access',
      maximum:'Maximum windows for automatic estimates',save:'Save company duration rules',
      loading:'Loading company service rules…',saved:'Settings saved.',failed:'Could not save service rules.',
      warning:'No booking is promised if calendar availability cannot be checked, details are missing, or a slot is too short. Estimates are nonbinding.',
      unconfigured:'Not enabled — enter and review your own time standards before enabling.',
      configured:'Enabled — only after you verify these time standards.'}
  };
  const getWords=()=>{
    const key=String(document.querySelector('#respondoWorkspace')?.dataset.lang||
      document.documentElement.lang||'en').toLowerCase().slice(0,2);
    return text[key]||text.en;
  };
  const defaults={minutesPerWindow:8,baseMinutes:20,bufferMinutes:30,largeMultiplier:1.5,
    doubleSidedMultiplier:2,difficultAccessMinutes:30,maxWindows:50,enabled:false};
  function mount(){
    const root=document.getElementById('respondoServiceCapacityMount');
    if(!root||root.dataset.ready==='1')return;
    root.dataset.ready='1';
    const t=getWords(),section=document.createElement('section');
    section.className='respondo-service-config';
    const title=document.createElement('h3');title.textContent=t.title;
    const intro=document.createElement('p');intro.className='service-desc';intro.textContent=t.subtitle;
    const status=document.createElement('p');status.className='service-status';
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent=t.loading;
    const form=document.createElement('form');form.className='service-form';
    const keys=[
      ['minutesPerWindow','unit',1,180,.5],['baseMinutes','base',0,360,1],
      ['bufferMinutes','buffer',0,180,1],['largeMultiplier','large',1,4,.05],
      ['doubleSidedMultiplier','both',1,3,.05],
      ['difficultAccessMinutes','access',0,240,1],['maxWindows','maximum',1,300,1]
    ];
    const fields={};
    for(const [key,word,min,max,step] of keys){
      const label=document.createElement('label');label.className='service-field';
      const caption=document.createElement('span');caption.textContent=t[word];
      const input=document.createElement('input');
      input.type='number';input.name=key;input.min=String(min);input.max=String(max);
      input.step=String(step);input.required=true;input.value=String(defaults[key]);
      label.append(caption,input);form.appendChild(label);fields[key]=input;
    }
    const toggle=document.createElement('label');toggle.className='service-toggle';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.name='enabled';
    toggle.append(checkbox,document.createTextNode(t.active));
    const save=document.createElement('button');save.type='submit';save.className='service-save';save.textContent=t.save;
    const note=document.createElement('p');note.className='service-note';note.textContent=t.warning;
    form.append(toggle,save);
    section.append(title,intro,form,note,status);
    root.appendChild(section);
    async function read(){
      try{
        const response=await fetch('/api/app/service-capacity',{credentials:'same-origin',cache:'no-store'});
        const data=await response.json();
        if(!response.ok)throw Error(data.error||t.failed);
        if(data.config){
          for(const [key] of keys)if(data.config[key]!==undefined)fields[key].value=String(data.config[key]);
          checkbox.checked=data.config.enabled===true;
        }
        status.textContent=checkbox.checked?t.configured:t.unconfigured;
      }catch(error){status.textContent=error.message||t.failed;}
    }
    form.addEventListener('submit',async event=>{
      event.preventDefault();save.disabled=true;status.textContent=t.loading;
      const data={serviceKey:'window_cleaning',enabled:checkbox.checked};
      for(const [key] of keys)data[key]=Number(fields[key].value);
      try{
        const response=await fetch('/api/app/service-capacity',{
          method:'PUT',credentials:'same-origin',
          headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(data)
        });
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw Error(result.error||t.failed);
        status.textContent=t.saved+' '+(checkbox.checked?t.configured:t.unconfigured);
      }catch(error){status.textContent=error.message||t.failed;}
      finally{save.disabled=false;}
    });
    read();
  }
  function init(){
    const host=document.getElementById('app');if(!host)return;
    new MutationObserver(mount).observe(host,{childList:true,subtree:true});mount();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();