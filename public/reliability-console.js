// Owner reliability console, in existing Growth Center; client is read-only
// except when owner explicitly creates or restores a manual-answers checkpoint.
(() => {
  'use strict';
  const URL_BASE='/api/app/native';
  const el=(tag,cls,text)=>{
    const item=document.createElement(tag);
    if(cls)item.className=cls;
    if(text!==undefined)item.textContent=String(text);
    return item;
  };
  async function api(path,method='GET',payload){
    const response=await fetch(URL_BASE+path,{
      method,credentials:'same-origin',cache:'no-store',
      headers:{accept:'application/json','content-type':'application/json'},
      ...(payload?{body:JSON.stringify(payload)}:{})
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.ok!==true)throw Error(String(body.error||'Unavailable').slice(0,170));
    return body.data;
  }
  let opened=false,loaded=false,busy=false;
  function mount(){
    const host=document.getElementById('respondoGrowthCenter');
    const ws=document.getElementById('respondoWorkspace');
    if(!host||!ws||ws.dataset.demo==='true'||host.querySelector('#respondoReliabilityConsole'))return false;
    const lang=['fi','sv','en'].includes(ws.dataset.lang)?ws.dataset.lang:'en';
    const t=(fi,sv,en)=>lang==='fi'?fi:lang==='sv'?sv:en;
    const section=el('section','rs-reliability');
    section.id='respondoReliabilityConsole';
    const alerts=el('div','rs-reliability-alerts');alerts.setAttribute('role','status');
    const main=el('details','rs-reliability-details');
    const toggle=el('summary','rs-reliability-toggle',
      t('Botin laatutarkistus, versiot ja seuranta','Botkvalitet, versioner och uppföljning',
        'Bot quality, versions and monitoring'));
    const panel=el('div','rs-reliability-content');
    main.append(toggle,panel);section.append(alerts,main);
    const previous=host.querySelector('.rs-growth-details');
    if(previous)previous.after(section);else host.append(section);
    const notice=el('p','rs-reliability-note');
    notice.setAttribute('role','status');
    panel.append(notice);
    const refresh=el('button','rs-growth-secondary',t('Päivitä tarkistus','Uppdatera kontroll','Refresh checks'));
    refresh.type='button';panel.append(refresh);
    const dashboard=el('div','rs-reliability-dashboard');panel.append(dashboard);
    const history=el('div','rs-reliability-versions');panel.append(history);
    const findings=el('div','rs-reliability-findings');panel.append(findings);
    const pages=el('div','rs-reliability-pages');panel.append(pages);
    const compliance=el('div','rs-reliability-compliance');panel.append(compliance);
    const heading=(parent,title)=>parent.append(el('h3','rs-reliability-title',title));
    const card=(parent,title,description)=>{
      const div=el('div','rs-reliability-card');
      div.append(el('strong','',title),el('p','',description));
      parent.append(div);return div;
    };
    function update(data){
      dashboard.replaceChildren();history.replaceChildren();
      findings.replaceChildren();pages.replaceChildren();compliance.replaceChildren();
      alerts.replaceChildren();
      const a=data.alerts?.items||[];
      if(a.length){
        const head=el('p','rs-reliability-alert-intro',t(
          'Huomiota vaativat asiat','Saker som behöver granskas','Items requiring attention'));
        alerts.append(head);
        for(const item of a){
          const label={
            overdue_tasks:t('Myöhässä olevat tehtävät','Försenade uppgifter','Overdue tasks'),
            pending_approvals:t('Odottavat hyväksynnät','Väntande godkännanden','Pending approvals'),
            uncertain_replies:t('Epävarmat vastaukset','Osäkra svar','Uncertain answers'),
            knowledge_conflicts:t('Mahdolliset tietoristiriidat','Möjliga faktakonflikter','Potential fact conflicts')
          }[item.key]||item.key;
          const btn=el('button','rs-reliability-alert',label+' · '+item.total);
          btn.type='button';btn.dataset.workspaceNav=item.target;
          alerts.append(btn);
        }
      }else alerts.append(el('span','rs-reliability-note',t(
        'Ei uusia havaittuja kiireellisiä tehtäviä näissä tarkistuksissa.',
        'Inga nya brådskande avvikelser upptäcktes i dessa kontroller.',
        'No urgent issues detected by these limited checks.')));
      heading(dashboard,t('Laatu ja tietopohja','Kvalitet och kunskapsbas','Quality and knowledge'));
      const metrics=el('div','rs-reliability-metrics');
      for(const [label,value] of [
        [t('Tietojen kattavuus','Kunskapstäckning','Topic coverage'),(data.knowledge?.coveragePercent??0)+' %'],
        [t('Hyväksytyt tiedot','Godkända fakta','Approved facts'),data.knowledge?.approvedFacts||0],
        [t('Vanhentuneet / tarkistamattomat','Gamla / overifierade','Old / unverified'),data.knowledge?.unverifiedOrOlderThan90Days||0],
        [t('Ristiriitaepäilyt','Misstänkta konflikter','Possible conflicts'),data.knowledge?.potentialConflicts?.length||0],
        [t('Analysoidut vastaukset','Granskade svar','Replies screened'),data.testLab?.recordedRepliesScreened||0],
        [t('Riskihavainnot','Riskindikatorer','Risk flags'),data.testLab?.flagged||0]
      ]){
        const item=el('div','rs-reliability-metric');
        item.append(el('strong','',value),el('span','',label));metrics.append(item);
      }
      dashboard.append(metrics,el('p','rs-reliability-note',t(
        'Kattavuus mittaa hyväksyttyjen aiheiden esiintymistä, ei botin älykkyyttä. Testilaboratorio tarkastelee enintään 300 tallennettua vastausta, ei suorita oikeita uusia keskusteluja. Riskihavainto voi olla myös väärä hälytys.',
        'Täckning visar godkända ämnesfakta, inte botens intelligens. Testlabbet granskar upp till 300 sparade svar, inte verkliga nya konversationer.',
        'Coverage measures approved topic evidence, not model intelligence. The lab screens up to 300 recorded answers, not newly executed live conversations; a flag may be a false positive.'
      )));
      if(data.knowledge?.partialSample)dashboard.append(el('p','rs-reliability-note',
        t('Tietopohjasta analysoitiin vain 1 500 uusinta tietuetta.',
          'Endast de 1 500 senaste kunskapsposterna analyserades.',
          'Only the 1,500 most recent knowledge records were reviewed.')));

      heading(history,t('Manuaalisten vastausten versiohistoria','Versioner av manuella svar','Manual answer versions'));
      history.append(el('p','rs-reliability-note',t(
        'Tallennetaan vain yrityksen itse lisäämät vastaukset. Verkkosivulta tuotuja tietoja ja asetuksia ei palauteta tässä.',
        'Endast manuellt tillagda svar sparas. Importerat innehåll och inställningar återställs inte här.',
        'Only manually entered answers are included. Imported website information and settings are not rolled back.')));
      const create=el('button','rs-growth-secondary',t('Tallenna palautuspiste','Spara återställningspunkt','Save checkpoint'));
      create.type='button';history.append(create);
      create.addEventListener('click',async()=>{
        if(busy||!window.confirm(t('Tallennetaanko manuaalisten vastausten nykyinen versio?',
          'Spara en version av de manuella svaren?','Save a checkpoint of current manual answers?')))return;
        busy=true;create.disabled=true;
        try{
          const title=t('Käsin tallennettu','Manuellt sparad','Owner checkpoint')+' '+new Date().toLocaleDateString();
          await api('/manual-versions','POST',{label:title,confirm:true});
          busy=false;loaded=false;await load();
        }catch(err){notice.textContent=err.message;}finally{busy=false;create.disabled=false;}
      });
      for(const version of data.versions?.versions||[]){
        const item=card(history,String(version.label||'Checkpoint'),
          String(version.count||0)+' '+t('vastausta','svar','answers')+' · '+
          String(version.created_at||'').slice(0,10));
        const restore=el('button','rs-growth-secondary',t('Palauta tämä versio','Återställ den här versionen','Restore this version'));
        restore.type='button';
        restore.addEventListener('click',async()=>{
          if(busy||!window.confirm(t(
            'Tämä muuttaa julkaistuja manuaalisia vastauksia. Muut tiedot säilyvät. Jatketaanko?',
            'Detta ändrar publicerade manuella svar. Fortsätta?',
            'This changes published manual answers. Other data stays unchanged. Continue?')))return;
          const phrase=window.prompt(t(
            'Kirjoita RESTORE MANUAL ANSWERS vahvistaaksesi palautuksen.',
            'Skriv RESTORE MANUAL ANSWERS för att bekräfta.',
            'Type RESTORE MANUAL ANSWERS to confirm restoration.'));
          if(phrase!=='RESTORE MANUAL ANSWERS')return;
          busy=true;restore.disabled=true;
          try{await api('/manual-versions/'+encodeURIComponent(version.id)+'/restore','POST',
            {confirm:true,phrase});busy=false;loaded=false;await load();}
          catch(error){notice.textContent=error.message;}
          finally{busy=false;restore.disabled=false;}
        });
        item.append(restore);
      }

      heading(findings,t('Tarkistusta vaativat havainnot','Fynd som bör granskas','Review findings'));
      const conflicts=data.knowledge?.potentialConflicts||[];
      const warnings=data.knowledge?.possibleLanguageLinkIssues||[];
      for(const conflict of conflicts.slice(0,15)){
        card(findings,conflict.title,t('Mahdollisesti ristiriitaiset vastaukset','Möjligen motstridiga svar',
          'Potentially conflicting answers')+(conflict.prices?.length
          ?' · '+conflict.prices.join(' / ')+' €':''));
      }
      for(const issue of warnings.slice(0,12)){
        card(findings,issue.title,t('Linkin kieli ei vastaa tietueen kieltä','Länkens språk kan vara fel','Possible link-language mismatch')+
          ' · '+issue.expected.toUpperCase()+' → '+issue.found.toUpperCase());
      }
      if(!conflicts.length&&!warnings.length)findings.append(el('p','rs-reliability-note',
        t('Ei tämän tarkistuksen löytämiä ristiriitoja. Tämä ei takaa tietojen oikeellisuutta.',
          'Inga konflikter hittades av denna kontroll. Det garanterar inte korrekthet.',
          'This check found no conflicts; it does not guarantee factual accuracy.')));

      heading(pages,t('Asiakaskeskustelujen sivut','Sidor med kundsamtal','Conversation entry pages'));
      for(const site of data.journey||[])card(pages,site.page,
        String(site.replies)+' '+t('vastausta','svar','replies')+' · '+
        String(site.handoffs)+' '+t('siirtoa ihmiselle','överlämningar','handoffs'));
      pages.append(el('p','rs-reliability-note',t(
        'Luvut perustuvat tallennettuihin keskusteluihin, eivät todista myyntiä.',
        'Siffrorna kommer från sparade konversationer och bevisar inte försäljning.',
        'Based on recorded conversations, not verified sales or conversions.')));

      heading(compliance,t('Tietosuoja- ja AI-tarkistuslista','Checklista för integritet och AI','Privacy and AI checklist'));
      compliance.append(el('p','rs-reliability-note',t(
        'Omistajan tarkistettavia kohtia. Tämä ei ole lakisääteinen vaatimustenmukaisuustodistus.',
        'Ägaren måste granska dessa punkter. Ingen juridisk certifiering.',
        'Owner review checklist only. Not a legal compliance certification.')));
      for(const item of data.compliance?.checks||[])card(compliance,'• '+item.text,
        t('Vaatii yrityksen oman tarkistuksen','Kräver företagets kontroll','Requires owner review'));
    }
    async function load(){
      if(busy||loaded)return;
      busy=true;refresh.disabled=true;notice.textContent=t('Tarkistetaan…','Kontrollerar…','Checking…');
      try{const data=await api('/reliability');loaded=true;update(data);
        notice.textContent=t('Tiedot perustuvat Respondon tallenteisiin.',
          'Uppgifter kommer från Respondos sparade data.',
          'These diagnostics use recorded Respondo data.');}
      catch(error){notice.textContent=error.message;}
      finally{busy=false;refresh.disabled=false;}
    }
    refresh.addEventListener('click',()=>{loaded=false;load();});
    main.addEventListener('toggle',()=>{opened=main.open;if(opened)load();});
    // Alerts are meaningful on Overview even if the advanced details stay closed.
    const observer=new MutationObserver(()=>{if(ws.dataset.currentView==='overview')load();});
    observer.observe(ws,{attributes:true,attributeFilter:['data-current-view']});
    if(ws.dataset.currentView==='overview')load();
    return true;
  }
  function start(){
    if(mount())return;
    const obs=new MutationObserver(()=>{if(mount())obs.disconnect();});
    obs.observe(document.body,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
