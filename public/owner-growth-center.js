// Owner-only Growth Center. Reuses authenticated first-party APIs.
(() => {
  'use strict';
  const ROOT='/api/app/native/growth';
  const node=(tag,cls,text)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=String(text);
    return n;
  };
  let loaded=false,initialised=false;
  const tr=(lang,fi,sv,en)=>lang==='fi'?fi:lang==='sv'?sv:en;
  async function api(path='',options={}){
    const response=await fetch(ROOT+path,{
      method:options.method||'GET',credentials:'same-origin',cache:'no-store',
      headers:{accept:'application/json','content-type':'application/json'},
      ...(options.data?{body:JSON.stringify(options.data)}:{})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok!==true)throw Error(String(result.error||'Service unavailable').slice(0,150));
    return result.data;
  }
  function nav(target,label){
    const button=node('button','rs-growth-button',label);
    button.type='button';button.dataset.workspaceNav=target;
    return button;
  }
  function build(){
    const page=document.querySelector('#respondoWorkspace [data-workspace-page="overview"]');
    if(!page||page.querySelector('#respondoGrowthCenter'))return;
    const lang=document.getElementById('respondoWorkspace')?.dataset.lang||'en';
    const t=(fi,sv,en)=>tr(lang,fi,sv,en);
    const root=node('section','rs-growth-center');
    root.id='respondoGrowthCenter';
    root.setAttribute('aria-label',t('Seuraava askel','Nästa steg','Next step'));
    const heading=node('div','rs-growth-head');
    heading.append(node('small','rs-growth-kicker','RESPONDO • GROWTH'),
      node('h2','rs-growth-title',t('Seuraava askel','Nästa steg','Next step')));
    const refresh=node('button','rs-growth-secondary',t('Päivitä','Uppdatera','Refresh'));
    refresh.type='button';heading.append(refresh);
    const summary=node('p','rs-growth-summary',t('Tarkistetaan työtilaa…','Kontrollerar arbetsytan…','Checking your workspace…'));
    summary.setAttribute('role','status');
    const actions=node('div','rs-growth-action');
    const indicators=node('div','rs-growth-indicators');
    const status=node('p','rs-growth-status');
    status.setAttribute('role','status');
    const details=node('details','rs-growth-details');
    const toggle=node('summary','rs-growth-toggle',
      t('Lisätyökalut ja asetukset','Verktyg och inställningar','Tools and settings'));
    const columns=node('div','rs-growth-columns');
    const settings=node('form','rs-growth-section');
    settings.append(node('h3','',t('Botin tyyli ja palvelualue','Botstil och serviceområde','Bot style and service area')));
    const toneLabel=node('label','rs-growth-label',
      t('Botin tervehdyksen tyyli','Hälsningsstil','Greeting style'));
    const tone=node('select','rs-growth-field');
    for(const [v,fi,sv,en] of [
      ['standard','Oletus','Standard','Standard'],
      ['concise','Tiivis','Kortfattad','Concise'],
      ['friendly','Ystävällinen','Vänlig','Friendly'],
      ['formal','Muodollinen','Formell','Formal']
    ]){const o=node('option','',t(fi,sv,en));o.value=v;tone.append(o);}
    toneLabel.append(tone);
    const pcLabel=node('label','rs-growth-label',
      t('Vahvistetut postinumerot, pilkuilla erotettuna','Godkända postnummer, åtskilda med kommatecken','Approved Finnish postcodes, comma separated'));
    const pc=node('textarea','rs-growth-field');
    pc.rows=2;pc.maxLength=1500;pc.placeholder='20100, 20320';
    pcLabel.append(pc);
    const settingsNotice=node('p','rs-growth-note',
      t('Vain itse hyväksymäsi Suomen postinumerot. Muiden alueiden saatavuutta ei luvata. Muokattu tyyli koskee vain oletustervehdystä.',
      'Endast godkända finländska postnummer. Andra områden lovas inte. Stilen gäller bara standardhälsningen.',
      'Only owner-approved Finnish postcodes. Other areas are never promised. Style changes only the default greeting.'));
    const save=node('button','rs-growth-button',t('Tallenna','Spara','Save settings'));
    save.type='submit';
    const saved=node('p','rs-growth-response');
    saved.setAttribute('role','status');
    settings.append(toneLabel,pcLabel,settingsNotice,save,saved);
    settings.addEventListener('submit',async e=>{
      e.preventDefault();save.disabled=true;saved.textContent=t('Tallennetaan…','Sparar…','Saving…');
      try{
        const postalCodes=pc.value.split(/[,;\s]+/).map(x=>x.trim()).filter(Boolean);
        await api('/settings',{method:'PUT',data:{tone:tone.value,postalCodes,confirm:true}});
        saved.textContent=t('Tallennettu. Palvelualueet ovat käytössä botissa.','Sparat. Serviceområdena används av botten.','Saved. Service-area rules are active in the bot.');
      }catch(err){saved.textContent=err.message;}
      finally{save.disabled=false;}
    });

    const tools=node('div','rs-growth-section');
    tools.append(node('h3','',t('Tarjouslaskuri','Offertkalkyl','Quote preview')));
    const qtyLabel=node('label','rs-growth-label',
      t('Yksiköiden määrä','Antal enheter','Number of units'));
    const qty=node('input','rs-growth-field');qty.type='number';qty.min='0.001';qty.max='100000';qty.step='any';qty.value='1';
    qtyLabel.append(qty);
    const quoteBtn=node('button','rs-growth-secondary',t('Laske arvio','Beräkna uppskattning','Calculate estimate'));
    quoteBtn.type='button';
    const quoteResult=node('p','rs-growth-response');quoteResult.setAttribute('role','status');
    tools.append(qtyLabel,quoteBtn,quoteResult,node('p','rs-growth-note',
      t('Laskenta käyttää vain yrityksen aiemmin määrittämää hinnastoa. Ei sitovaa tarjousta tai vahvistettua varausta.',
      'Endast tidigare godkända priser. Ingen bindande offert eller bekräftad bokning.',
      'Uses previously configured company pricing only. Not a binding quote or confirmed booking.')));
    quoteBtn.addEventListener('click',async()=>{
      quoteBtn.disabled=true;quoteResult.textContent=t('Tarkistetaan hintasääntöjä…','Kontrollerar prisregler…','Checking approved pricing…');
      try{
        const result=await api('/quote-preview?quantity='+encodeURIComponent(qty.value));
        const money=new Intl.NumberFormat(lang==='fi'?'fi-FI':lang==='sv'?'sv-SE':'en-US',
          {style:'currency',currency:result.currency||'EUR'}).format(result.totalCents/100);
        quoteResult.textContent=String(result.service)+' · '+money+
          ' · '+t('Alustava laskelma','Preliminär beräkning','Non-binding estimate');
      }catch(err){quoteResult.textContent=t('Hyväksy hinnasto ensin: ','Godkänn priserna först: ','Configure approved prices first: ')+err.message;}
      finally{quoteBtn.disabled=false;}
    });

    const report=node('div','rs-growth-section');
    report.append(node('h3','',t('Viikon tulokset','Veckans resultat','Weekly performance')));
    const download=node('button','rs-growth-secondary',
      t('Lataa viimeisen 7 päivän raportti','Ladda ned senaste 7 dagarnas rapport','Download last 7 days report'));
    download.type='button';
    const reportMessage=node('p','rs-growth-response');reportMessage.setAttribute('role','status');
    report.append(download,reportMessage,node('p','rs-growth-note',
      t('Tiedot tulevat Respondon tietokannasta. Raporttia ei lähetetä ulkopuoliselle palvelulle.',
      'Data kommer från Respondos databas. Ingen extern tjänst kontaktas.',
      'Uses recorded Respondo data. No report is sent to an external service.')));
    download.addEventListener('click',async()=>{
      download.disabled=true;reportMessage.textContent=t('Luodaan…','Skapar…','Preparing…');
      try{
        const data=await api('/weekly-report');
        const lines=[
          'RESPONDO AI — 7-day activity report',
          'Created: '+data.generatedAt,'',
          'Conversations: '+data.messages,
          'Grounded AI answers: '+data.sourcedBotAnswers,
          'Human handoffs: '+data.humanHandoffs,
          'Leads: '+data.leads,
          'Booking requests: '+data.bookingRequests,
          'Quote requests: '+data.quoteRequests,
          'Callback requests: '+data.callbackRequests,'',
          'Requests are not confirmed orders or verified revenue.',
          'Customer resolution and paid sales are not established by this report.'
        ].join('\n');
        const href=URL.createObjectURL(new Blob([lines],{type:'text/plain;charset=utf-8'}));
        const a=node('a');a.href=href;a.download='respondo-weekly-report.txt';
        document.body.append(a);a.click();a.remove();URL.revokeObjectURL(href);
        reportMessage.textContent=t('Raportti ladattu','Rapporten hämtad','Report downloaded');
      }catch(err){reportMessage.textContent=err.message;}
      finally{download.disabled=false;}
    });

    const compare=node('form','rs-growth-section');
    compare.append(node('h3','',t('Vertaa vastausluonnoksia','Jämför svarsutkast','Compare answer drafts')));
    const question=node('textarea','rs-growth-field');
    question.rows=2;question.maxLength=1200;question.required=true;
    question.placeholder=t('Asiakkaan kysymys','Kundfråga','Customer question');
    const answerA=node('textarea','rs-growth-field');answerA.rows=2;answerA.required=true;answerA.maxLength=3000;answerA.placeholder='A';
    const answerB=node('textarea','rs-growth-field');answerB.rows=2;answerB.required=true;answerB.maxLength=3000;answerB.placeholder='B';
    const checkBtn=node('button','rs-growth-secondary',t('Vertaile turvallisuutta','Jämför säkerhet','Compare safety checks'));checkBtn.type='submit';
    const comparison=node('p','rs-growth-response');comparison.setAttribute('role','status');
    compare.append(question,answerA,answerB,checkBtn,comparison,node('p','rs-growth-note',
      t('Manuaalinen vertailu. Ei automaattista julkaisua, liikenteen A/B-testiä tai todistettua myyntivaikutusta.',
      'Manuell jämförelse. Ingen automatisk publicering eller live-A/B-test.',
      'Manual safety comparison only. No automatic publishing, live A/B test or proven conversion lift.')));
    compare.addEventListener('submit',async e=>{
      e.preventDefault();checkBtn.disabled=true;comparison.textContent=t('Tarkistetaan…','Kontrollerar…','Checking…');
      try{
        const out=await api('/compare',{method:'POST',data:{
          question:question.value,language:lang,first:answerA.value,second:answerB.value
        }});
        comparison.textContent=out.variants.map(x=>x.key+': '+x.words+' '+t('sanaa','ord','words')+
          ', '+x.flags.length+' '+t('huomiota','anmärkningar','flags')).join(' · ')+
          '. '+t('Tarkista sisältö itse ennen hyväksyntää.','Kontrollera innehållet före godkännande.','Review facts before approving.');
      }catch(err){comparison.textContent=err.message;}
      finally{checkBtn.disabled=false;}
    });
    columns.append(settings,tools,report,compare);
    details.append(toggle,columns);
    root.append(heading,summary,actions,indicators,status,details);
    const cards=page.querySelector('.respondo-workspace-overview-grid');
    if(cards)cards.before(root);else page.append(root);

    function update(data){
      const facts=data.approvedFacts||0,gaps=data.unansweredLast7Days||0,leads=data.leadsLast7Days||0;
      const key=data.nextAction?.key||'test';
      const next={
        knowledge:[t('Hyväksy yrityksen tiedot ennen kuin botti vastaa asiakkaiden kysymyksiin.','Godkänn företagsuppgifter först.','Approve company knowledge before answering customer questions.'),'settings'],
        quality:[t('Tarkista epävarmat vastaukset ja hyväksy tarvittavat korjaukset.','Granska osäkra svar och godkänn korrigeringar.','Review uncertain answers and approve corrections.'),'automation'],
        installation:[t('Tarkista upotus oikealta verkkosivulta. Widgetin yhteyttä ei ole vielä havaittu viimeisen 7 päivän aikana.','Kontrollera installationen på webbplatsen.','Verify installation on the actual site. No recent widget connection was observed.'),'install'],
        test:[t('Kokeile bottiasi oikeilla asiakaskysymyksillä ennen markkinointia.','Testa botten med riktiga kundfrågor.','Test your bot with real customer questions before promoting it.'),'bot'],
        results:[t('Tarkastele viikon tuloksia ja testaa yksi parannus kerrallaan.','Granska veckans resultat.','Review the last seven days and improve one step at a time.'),'automation']
      }[key];
      summary.textContent=next[0];
      actions.replaceChildren(nav(next[1],t('Avaa seuraava vaihe','Öppna nästa steg','Open next step')));
      indicators.replaceChildren();
      for(const [title,value] of [
        [t('Hyväksytyt tiedot','Godkända uppgifter','Approved facts'),facts],
        [t('Epävarmat 7 pv','Osäkra 7 d','Uncertain 7d'),gaps],
        [t('Liidit 7 pv','Leads 7 d','Leads 7d'),leads]
      ]){const item=node('div','rs-growth-stat');item.append(node('strong','',value),node('span','',title));indicators.append(item);}
      const seen=data.widget?.lastSeenAt;
      status.textContent=seen
        ? t('Widget-yhteys havaittu: ','Widgetkontakt upptäckt: ','Widget token requested: ')+
          new Date(seen).toLocaleDateString(lang==='fi'?'fi-FI':lang==='sv'?'sv-SE':'en-US')+
          t('. Tämä ei yksin varmista ulkoasua tai toimivuutta.','. Detta bevisar inte att widgeten fungerade visuellt.','. This does not prove visual or conversational correctness.')
        :t('Asennuksen toimivuutta ei ole vahvistettu.','Installationen är ännu inte verifierad.','Widget installation has not been verified.');
      if(!initialised){
        initialised=true;
        tone.value=data.settings?.tone||'standard';
        pc.value=(data.settings?.postalCodes||[]).join(', ');
      }
    }
    async function load(){
      if(loaded)return;
      loaded=true;refresh.disabled=true;
      try{const data=await api();update(data);}
      catch(err){
        summary.textContent=t('Työtilan tila ei ole saatavilla.','Arbetsytans status är inte tillgänglig.','Workspace status unavailable.');
        status.textContent=err.message;
      }finally{refresh.disabled=false;}
    }
    refresh.addEventListener('click',()=>{loaded=false;load();});
    const ws=document.getElementById('respondoWorkspace');
    new MutationObserver(()=>{
      if(ws?.dataset.currentView==='overview')load();
    }).observe(ws,{attributes:true,attributeFilter:['data-current-view']});
    if(ws?.dataset.currentView==='overview')load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  function install(){
    build();
    if(document.querySelector('#respondoGrowthCenter'))return;
    const observer=new MutationObserver(()=>{
      build();
      if(document.querySelector('#respondoGrowthCenter'))observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
})();