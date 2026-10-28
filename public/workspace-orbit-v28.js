/* Lightweight, scroll-responsive navigation for the post-setup workspace.
   The existing Respondo application remains responsible for every real action.
   No new customer APIs, billing calls, scroll traps or animation dependencies. */
const ITEMS = [
  {id:'bot', icon:'chat', names:['Kokeile bottia','Testa botten','Try your bot'], notes:['Keskustele botin kanssa ja tarkista vastaukset.','Testa botten och se hur den svarar.','Ask questions and review your bot’s replies.']},
  {id:'overview', icon:'home', names:['Yleisnäkymä','Översikt','Overview'], notes:['Tärkeimmät asiat yhdessä näkymässä.','Det viktigaste på ett ställe.','The essentials in one clear view.']},
  {id:'setup', icon:'robot', names:['Botin tiedot','Bottuppgifter','Bot details'], notes:['Nimi, tervetuloviesti ja botin perustiedot.','Namn, välkomsttext och botuppgifter.','Edit your bot’s name, greeting and details.']},
  {id:'answers', icon:'book', names:['Vastaukset','Svar','Answers'], notes:['Botin hyväksytty tietopohja ja puuttuvat vastaukset.','Bottens kunskapsbas och saknade svar.','Your bot’s knowledge base and unanswered questions.']},
  {id:'customers', icon:'users', names:['Asiakkaat','Kunder','Customers'], notes:['Keskustelut ja yhteydenotot yhdessä paikassa.','Konversationer och förfrågningar på ett ställe.','Conversations and enquiries in one place.']},
  {id:'automation', icon:'spark', names:['Toiminnot','Funktioner','Actions'], notes:['Seuraa asiakkaiden pyyntöjä ja toimintoja.','Följ kundernas förfrågningar och funktioner.','Review customer requests and actions.']},
  {id:'install', icon:'code', names:['Asennus','Installation','Installation'], notes:['Asenna Respondo yrityksesi verkkosivulle.','Installera Respondo på företagets webbplats.','Add Respondo to your company website.']},
  {id:'profile', icon:'person', names:['Profiili','Profil','Profile'], notes:['Yritykset ja oman tilin tiedot.','Företag och kontouppgifter.','Your companies and account information.']},
  {id:'billing', icon:'card', names:['Laskutus','Fakturering','Billing'], notes:['Tilaus, maksut ja laskut.','Abonnemang, betalningar och fakturor.','Your plan, payments and invoices.']},
  {id:'settings', icon:'settings', names:['Asetukset','Inställningar','Settings'], notes:['Yrityksen yhteystiedot ja muut asetukset.','Företagsuppgifter och inställningar.','Company contact details and settings.']}
];
const PATHS = {
  chat:'<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 10h8M8 13h5"/>',
  home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M10 21v-7h4v7"/>',
  robot:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 7V3m-2 0h4M1 12h3m16 0h3"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>',
  book:'<path d="M12 6C9 4 5 4 3 5v14c3-1 7-1 9 1 2-2 6-2 9-1V5c-2-1-6-1-9 1Zm0 0v14"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/>',
  spark:'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',
  code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 18"/>',
  person:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h5"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.93 4.93l2.12 2.12m9.9 9.9 2.12 2.12M2 12h3m14 0h3M4.93 19.07l2.12-2.12m9.9-9.9 2.12-2.12"/>'
};
const icon=(name)=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(PATHS[name]||PATHS.home)+'</svg>';
const escaped=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function mountWorkspaceOrbit(workspace,{onNavigate}={}) {
  if (!workspace || !workspace.querySelector('.respondo-workspace-content')) return null;
  if (workspace._respondoOrbit) return workspace._respondoOrbit;
  const lang=workspace.dataset.lang==='fi'?0:workspace.dataset.lang==='sv'?1:2;
  const words=(fi,sv,en)=>[fi,sv,en][lang];
  const label=(item)=>item.names[lang];
  const descriptions=(item)=>item.notes[lang];
  const content=workspace.querySelector('.respondo-workspace-content');
  const zone=document.createElement('section');
  zone.className='rs-orbit-section';
  zone.setAttribute('aria-label',words('Työtilan navigointi','Navigering i arbetsytan','Workspace navigation'));
  zone.innerHTML=[
    '<div class="rs-orbit-intro"><span class="rs-orbit-eyebrow">RESPONDO OS <span aria-hidden="true">/</span> ',
      words('TYÖTILA','ARBETSYTA','WORKSPACE'),'</span>',
      '<h2>',words('Kaikki yhdessä paikassa.','Allt på ett ställe.','Everything in one place.'),'</h2>',
      '<p>',words('Vieritä nähdäksesi osiot tai valitse kuvake suoraan.','Skrolla mellan avsnitten eller välj en ikon.','Scroll through the sections or tap an icon.'),'</p></div>',
    '<div class="rs-orbit-layout">',
      '<nav class="rs-orbit-wheel" tabindex="0" aria-label="',escaped(words('Selaa työtilan osioita','Bläddra bland avsnitt','Browse workspace sections')),'">',
        '<div class="rs-orbit-halo rs-orbit-halo-a" aria-hidden="true"></div>',
        '<div class="rs-orbit-halo rs-orbit-halo-b" aria-hidden="true"></div>',
        '<div class="rs-orbit-core" aria-hidden="true"><img src="/respondo-symbol.svg" alt=""><small>RESPONDO</small></div>',
        ITEMS.map((item,i)=>'<button type="button" class="rs-orbit-node" data-rs-orbit-index="'+i+'" data-rs-orbit-open="'+item.id+'" aria-label="'+escaped(label(item))+'" title="'+escaped(label(item))+'">'+icon(item.icon)+'</button>').join(''),
      '</nav>',
      '<div class="rs-orbit-story">',
        '<span class="rs-orbit-index" id="rsOrbitIndex">01 / ',String(ITEMS.length).padStart(2,'0'),'</span>',
        '<h3 id="rsOrbitTitle"></h3>',
        '<p id="rsOrbitNote"></p>',
        '<button class="rs-orbit-open" type="button" id="rsOrbitOpen">',words('Avaa osio','Öppna avsnitt','Open section'),'<span aria-hidden="true"> ↗</span></button>',
        '<div class="rs-orbit-quick" aria-label="',escaped(words('Pikavalinnat','Snabbval','Quick access')),'">',
          ['bot','setup','answers','billing'].map(id=>{
            const item=ITEMS.find(entry=>entry.id===id);
            return '<button type="button" data-rs-orbit-open="'+id+'">'+escaped(label(item))+'</button>';
          }).join(''),
        '</div>',
      '</div>',
    '</div>'
  ].join('');
  content.before(zone);
  const wheel=zone.querySelector('.rs-orbit-wheel');
  const nodes=[...zone.querySelectorAll('.rs-orbit-node')];
  const title=zone.querySelector('#rsOrbitTitle');
  const note=zone.querySelector('#rsOrbitNote');
  const counter=zone.querySelector('#rsOrbitIndex');
  const open=zone.querySelector('#rsOrbitOpen');
  let currentIndex=0;
  let manualUntil=0;
  let raf=0;
  const reduceMotion=()=>window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const positionNodes=()=>{
    const radius=(wheel.clientWidth||270)*.405;
    nodes.forEach((node,i)=>{
      const angle=(-Math.PI/2)+((i-currentIndex)*Math.PI*2/ITEMS.length);
      const x=Math.cos(angle)*radius;
      const y=Math.sin(angle)*radius*.91;
      node.style.setProperty('--rs-node-x',x.toFixed(2)+'px');
      node.style.setProperty('--rs-node-y',y.toFixed(2)+'px');
    });
  };
  const showIndex=(index)=>{
    currentIndex=(index+ITEMS.length)%ITEMS.length;
    const item=ITEMS[currentIndex];
    title.textContent=label(item);
    note.textContent=descriptions(item);
    counter.textContent=String(currentIndex+1).padStart(2,'0')+' / '+String(ITEMS.length).padStart(2,'0');
    nodes.forEach((node,i)=>{
      node.classList.toggle('is-active',i===currentIndex);
      node.setAttribute('aria-pressed',String(i===currentIndex));
    });
    wheel.style.setProperty('--rs-orbit-turn',String(-currentIndex*360/ITEMS.length)+'deg');
    positionNodes();
  };
  const setActive=(id)=>{
    const index=ITEMS.findIndex(item=>item.id===id);
    if(index!==-1)showIndex(index);
  };
  const navigate=(id)=>{
    const item=ITEMS.find(entry=>entry.id===id);
    if(!item || typeof onNavigate!=='function')return;
    manualUntil=performance.now()+950;
    setActive(id);
    onNavigate(id);
    requestAnimationFrame(()=>{
      if(!content.isConnected)return;
      const top=window.scrollY+content.getBoundingClientRect().top-18;
      window.scrollTo({top:Math.max(0,top),behavior:reduceMotion()?'auto':'smooth'});
    });
  };
  zone.addEventListener('click',(event)=>{
    const node=event.target.closest('[data-rs-orbit-open]');
    if(node && zone.contains(node))navigate(node.dataset.rsOrbitOpen);
  });
  open.addEventListener('click',()=>navigate(ITEMS[currentIndex].id));
  wheel.addEventListener('keydown',(event)=>{
    if(event.target!==wheel)return;
    if(event.key==='ArrowRight'||event.key==='ArrowDown'){
      event.preventDefault();manualUntil=performance.now()+1500;showIndex(currentIndex+1);
    }else if(event.key==='ArrowLeft'||event.key==='ArrowUp'){
      event.preventDefault();manualUntil=performance.now()+1500;showIndex(currentIndex-1);
    }else if(event.key==='Enter'){
      event.preventDefault();navigate(ITEMS[currentIndex].id);
    }
  });
  const updateFromScroll=()=>{
    raf=0;
    if(workspace.hidden || !workspace.classList.contains('rs-orbit-ready'))return;
    if(performance.now()<manualUntil)return;
    const rect=zone.getBoundingClientRect();
    const height=window.innerHeight||document.documentElement.clientHeight;
    if(rect.bottom<95||rect.top>height-90)return;
    const journey=clamp((95-rect.top)/Math.max(220,rect.height-100),0,1);
    const next=Math.round(journey*(ITEMS.length-1));
    if(next!==currentIndex)showIndex(next);
  };
  const onScroll=()=>{if(!raf)raf=requestAnimationFrame(updateFromScroll);};
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',positionNodes,{passive:true});
  let resizeObserver;
  if('ResizeObserver' in window){
    resizeObserver=new ResizeObserver(positionNodes);
    resizeObserver.observe(wheel);
  }
  workspace.classList.add('rs-orbit-ready');
  showIndex(0);
  const api={setActive,go:navigate,element:zone,destroy(){
    window.removeEventListener('scroll',onScroll);
    window.removeEventListener('resize',positionNodes);
    if(resizeObserver)resizeObserver.disconnect();
    if(raf)cancelAnimationFrame(raf);
    zone.remove();workspace.classList.remove('rs-orbit-ready');
    delete workspace._respondoOrbit;
  }};
  workspace._respondoOrbit=api;
  return api;
}
