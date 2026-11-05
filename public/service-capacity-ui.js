(() => {
  'use strict';
  const words={
    fi:{title:'Älykäs työajan arviointi',subtitle:'Määritä yrityksesi omat palvelut ja hyväksytyt työaikanormit. Respondo kysyy tarvittavat määrät ja tarkistaa koko työn pituisen vapaan ajan. Ikkunanpesu ei ole oletuspalvelu.',add:'Lisää palvelu',choose:'Valitse palvelu',name:'Palvelun nimi',aliases:'Muut nimet (pilkuilla erotettuna)',calculation:'Laskentatapa',fixed:'Kiinteä kesto',quantity:'Määrän perusteella',unit:'Laskentayksikkö (esim. kpl, m², käynti)',perUnit:'Minuuttia per yksikkö',base:'Valmisteluaika, min',buffer:'Siirtymä- ja varoaika, min',maximum:'Suurin automaattisesti arvioitava määrä',active:'Käytä automaattista työajan arviointia',save:'Tallenna palvelun työaikasäännöt',loading:'Ladataan palveluja…',saved:'Säännöt tallennettu.',failed:'Asetuksia ei voitu tallentaa.',unconfigured:'Ei käytössä – täytä ja tarkista työaikanormit ennen käyttöönottoa.',configured:'Käytössä – arviointi tehdään vain yrityksen hyväksymillä säännöillä.',warning:'Liian monimutkaiset tai puutteellisesti kuvatut työt ohjataan työntekijälle. Vapaata aikaa ei luvata, jos kalenteria ei voida tarkistaa. Arvio ei ole sitova tarjous.',
      windowSubtitle:'Tätä ikkunanpesusääntöä käytetään vain, jos yrityksesi on ottanut sen erikseen käyttöön.',windowUnit:'Minuuttia per tavallinen ikkuna (yksi puoli)',large:'Ison ikkunan kerroin',both:'Molempien puolien kerroin',access:'Vaikean pääsyn lisäminuutit',windows:'Enimmäisikkunamäärä'},
    sv:{title:'Smart arbetstidsberäkning',subtitle:'Lägg till företagets egna tjänster och godkända tidsnormer. Respondo frågar efter arbetsmängd och kontrollerar ett sammanhängande ledigt tidsintervall. Fönstertvätt är ingen standardtjänst.',add:'Lägg till tjänst',choose:'Välj tjänst',name:'Tjänstens namn',aliases:'Andra namn (kommaseparerade)',calculation:'Beräkningsmetod',fixed:'Fast tid',quantity:'Enligt mängd',unit:'Enhet (t.ex. st, m², besök)',perUnit:'Minuter per enhet',base:'Förberedelse, minuter',buffer:'Restid och buffert, minuter',maximum:'Maximal mängd för automatisk beräkning',active:'Aktivera automatisk arbetstidsberäkning',save:'Spara tjänstens tidsregler',loading:'Laddar tjänster…',saved:'Regler sparade.',failed:'Kunde inte spara inställningarna.',unconfigured:'Inte aktiv – granska tidsnormerna innan du aktiverar.',configured:'Aktiv – endast företagets godkända tidsnormer används.',warning:'Komplicerade arbeten eller bristfällig information skickas till personalen. Ingen tid utlovas utan verifierad kalender. Uppskattningar är inte bindande offerter.',
      windowSubtitle:'Den här inställningen gäller endast om företaget själv har aktiverat fönstertvätt.',windowUnit:'Minuter per vanligt fönster (ena sidan)',large:'Faktor för stora fönster',both:'Faktor för båda sidor',access:'Extra minuter för svår åtkomst',windows:'Maxantal fönster'},
    en:{title:'Smart service duration estimates',subtitle:'Add your company’s services and approved duration standards. Respondo asks for the required workload and checks a continuous available time slot. Window cleaning is not a default service.',add:'Add a service',choose:'Select service',name:'Service name',aliases:'Alternative names (comma-separated)',calculation:'Duration method',fixed:'Fixed duration',quantity:'Quantity-based duration',unit:'Unit (e.g. item, m², visit)',perUnit:'Minutes per unit',base:'Setup time, minutes',buffer:'Travel / safety buffer, minutes',maximum:'Maximum units for automatic estimates',active:'Enable automatic job duration estimates',save:'Save service duration rules',loading:'Loading services…',saved:'Settings saved.',failed:'Could not save service rules.',unconfigured:'Not enabled — review your own time standards before enabling.',configured:'Enabled — only your approved time standards are used.',warning:'Complex jobs and incomplete details must be reviewed by staff. No slot is promised without verified calendar availability. Estimates are nonbinding.',
      windowSubtitle:'This legacy setting applies only if your company explicitly enabled window cleaning.',windowUnit:'Minutes per standard window (one side)',large:'Large-window multiplier',both:'Both-sides multiplier',access:'Additional minutes for difficult access',windows:'Maximum windows for automatic estimates'}
  };
  const locale=()=>{
    const k=String(document.querySelector('#respondoWorkspace')?.dataset.lang||
      document.documentElement.lang||'en').toLowerCase().slice(0,2);
    return words[k]||words.en;
  };
  const legacy={serviceKey:'window_cleaning',minutesPerWindow:8,baseMinutes:20,
    bufferMinutes:30,largeMultiplier:1.5,doubleSidedMultiplier:2,
    difficultAccessMinutes:30,maxWindows:50,enabled:false};
  function fresh(){
    return {serviceKey:'custom_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
      serviceName:'',aliases:'',calculation:'fixed',unitLabel:'visit',
      minutesPerUnit:60,maxUnits:100,baseMinutes:0,bufferMinutes:15,enabled:false};
  }
  function mount(){
    const root=document.getElementById('respondoServiceCapacityMount');
    if(!root||root.dataset.ready==='1')return;
    root.dataset.ready='1';
    const t=locale(),section=document.createElement('section');
    section.className='respondo-service-config';
    const title=document.createElement('h3');title.textContent=t.title;
    const intro=document.createElement('p');intro.className='service-desc';intro.textContent=t.subtitle;
    const toolbar=document.createElement('div');toolbar.className='service-toolbar';
    const select=document.createElement('select');select.setAttribute('aria-label',t.choose);
    const add=document.createElement('button');add.type='button';add.textContent=t.add;
    add.className='service-add';
    toolbar.append(select,add);
    const form=document.createElement('form');form.className='service-form';
    const note=document.createElement('p');note.className='service-note';note.textContent=t.warning;
    const status=document.createElement('p');status.className='service-status';
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent=t.loading;
    section.append(title,intro,toolbar,form,note,status);root.appendChild(section);
    let configs=[],current=fresh(),save,checkbox,fields={};
    function field(key,label,value,type='number',min,max,step){
      const wrap=document.createElement('label');wrap.className='service-field';
      const caption=document.createElement('span');caption.textContent=label;
      const input=document.createElement('input');input.name=key;input.type=type;
      if(min!==undefined)input.min=String(min);
      if(max!==undefined)input.max=String(max);
      if(step!==undefined)input.step=String(step);
      input.value=String(value??'');input.required=true;
      wrap.append(caption,input);form.appendChild(wrap);fields[key]=input;
      return input;
    }
    function addSelect(key,label,options,value){
      const wrap=document.createElement('label');wrap.className='service-field';
      const caption=document.createElement('span');caption.textContent=label;
      const el=document.createElement('select');el.name=key;
      for(const [v,name] of options){const op=document.createElement('option');
        op.value=v;op.textContent=name;el.appendChild(op);}
      el.value=value;wrap.append(caption,el);form.appendChild(wrap);fields[key]=el;
      return el;
    }
    function options(){
      select.replaceChildren();
      for(const item of configs){
        const op=document.createElement('option');op.value=item.serviceKey;
        op.textContent=item.serviceName||'Window cleaning (legacy)';
        select.appendChild(op);
      }
      if(!configs.some(x=>x.serviceKey===current.serviceKey)){
        const draft=document.createElement('option');draft.value=current.serviceKey;
        draft.textContent=t.add;select.appendChild(draft);
      }
      select.value=current.serviceKey;
    }
    function render(){
      form.replaceChildren();fields={};
      const isWindow=current.serviceKey==='window_cleaning';
      if(isWindow){
        const windowNote=document.createElement('p');windowNote.className='service-note';
        windowNote.style.gridColumn='1/-1';windowNote.textContent=t.windowSubtitle;form.append(windowNote);
        field('minutesPerWindow',t.windowUnit,current.minutesPerWindow, 'number',1,180,.5);
        field('baseMinutes',t.base,current.baseMinutes,'number',0,360,1);
        field('bufferMinutes',t.buffer,current.bufferMinutes,'number',0,180,1);
        field('largeMultiplier',t.large,current.largeMultiplier,'number',1,4,.05);
        field('doubleSidedMultiplier',t.both,current.doubleSidedMultiplier,'number',1,3,.05);
        field('difficultAccessMinutes',t.access,current.difficultAccessMinutes,'number',0,240,1);
        field('maxWindows',t.windows,current.maxWindows,'number',1,300,1);
      }else{
        field('serviceName',t.name,current.serviceName,'text');
        field('aliases',t.aliases,current.aliases,'text').required=false;
        addSelect('calculation',t.calculation,[['fixed',t.fixed],['quantity',t.quantity]],current.calculation);
        field('unitLabel',t.unit,current.unitLabel,'text');
        field('minutesPerUnit',t.perUnit,current.minutesPerUnit,'number',1,720,1);
        field('baseMinutes',t.base,current.baseMinutes,'number',0,360,1);
        field('bufferMinutes',t.buffer,current.bufferMinutes,'number',0,180,1);
        field('maxUnits',t.maximum,current.maxUnits,'number',1,10000,1);
      }
      const toggle=document.createElement('label');toggle.className='service-toggle';
      checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=current.enabled===true;
      toggle.append(checkbox,document.createTextNode(t.active));
      save=document.createElement('button');save.type='submit';save.className='service-save';save.textContent=t.save;
      form.append(toggle,save);options();
      status.textContent=checkbox.checked?t.configured:t.unconfigured;
    }
    add.addEventListener('click',()=>{current=fresh();render();});
    select.addEventListener('change',()=>{
      const selected=configs.find(x=>x.serviceKey===select.value);
      if(selected){current={...selected};render();}
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();save.disabled=true;status.textContent=t.loading;
      const data={serviceKey:current.serviceKey,enabled:checkbox.checked};
      for(const [key,input] of Object.entries(fields))
        data[key]=input.type==='number'?Number(input.value):input.value;
      try{
        const response=await fetch('/api/app/service-capacity',{
          method:'PUT',credentials:'same-origin',
          headers:{'content-type':'application/json',accept:'application/json'},
          body:JSON.stringify(data)
        });
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw Error(result.error||t.failed);
        current=result.config;
        const pos=configs.findIndex(x=>x.serviceKey===current.serviceKey);
        if(pos>=0)configs[pos]=current;else configs.push(current);
        options();status.textContent=t.saved+' '+(checkbox.checked?t.configured:t.unconfigured);
      }catch(error){status.textContent=error.message||t.failed;}
      finally{save.disabled=false;}
    });
    async function read(){
      try{
        const response=await fetch('/api/app/service-capacity',{credentials:'same-origin',cache:'no-store'});
        const data=await response.json();
        if(!response.ok)throw Error(data.error||t.failed);
        configs=Array.isArray(data.configs)?data.configs:
          data.config?[data.config]:[];
        current=configs[0]||fresh();render();
      }catch(error){render();status.textContent=error.message||t.failed;}
    }
    read();
  }
  function init(){
    const host=document.getElementById('app');if(!host)return;
    new MutationObserver(mount).observe(host,{childList:true,subtree:true});mount();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();