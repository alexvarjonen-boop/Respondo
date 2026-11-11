(()=>{
  'use strict';
  if(window.location.pathname!=='/assistant')return;
  const lang=()=>{const v=new URLSearchParams(location.search).get('lang')||document.documentElement.lang||'en';
    return ['fi','sv','en'].includes(v)?v:'en';};
  const t=(fi,sv,en)=>lang()==='fi'?fi:lang()==='sv'?sv:en;
  const make=(tag,className,value)=>{
    const el=document.createElement(tag);el.className=className;
    if(value!==undefined)el.textContent=value;
    return el;
  };
  function mount(){
    const content=document.querySelector('#respondo-site-chat.rx-stage-mode .rx-content');
    if(!content||!content.querySelector('.rx-ask-form')||content.querySelector('.rx-instant-website-demo'))return;
    const panel=make('section','rx-instant-website-demo');
    const title=make('strong','rx-instant-demo-title',t('Kokeile omalla sivustollasi','Förhandsgranska med din webbplats','Preview your website'));
    const explanation=make('p','rx-instant-demo-desc',t(
      'Syötä osoite. Näet esimerkin julkisista sivutiedoista. Täysi botti vaatii käyttöönoton.',
      'Ange adressen. Se ett exempel från offentliga webbplatsdata. En riktig bot kräver installation.',
      'Enter your site. See an example based on public metadata. A fully working bot requires setup.'));
    const form=make('form','rx-instant-demo-form');
    const field=make('input','rx-instant-demo-input');field.type='url';field.required=true;
    field.maxLength=260;field.placeholder='https://company.example';
    // A share link carries ONLY the public website URL and language.
    // Never persist a private tenant knowledge base or visitor details.
    const shared=new URLSearchParams(location.search);
    const candidate=String(shared.get('website')||'').trim();
    const shareable=(()=>{
      if(candidate.length<9||candidate.length>260)return false;
      try{
        const url=new URL(candidate);
        return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&
          !/^(?:localhost|127\.|10\.|192\.168\.|0\.|169\.254\.|\[?::1\]?)/i.test(url.hostname);
      }catch{return false;}
    })();
    if(shareable)field.value=candidate;
    field.setAttribute('aria-label',t('Verkkosivun osoite','Webbadress','Website URL'));
    const button=make('button','rx-instant-demo-submit',t('Esikatsele','Förhandsgranska','Preview'));button.type='submit';
    form.append(field,button);
    const result=make('div','rx-instant-demo-result');result.setAttribute('aria-live','polite');
    form.addEventListener('submit',async event=>{
      event.preventDefault();button.disabled=true;
      result.replaceChildren(make('span','rx-instant-demo-loading',t(
        'Haetaan julkista sivukuvausta…','Hämtar offentlig sidbeskrivning…','Reading public website description…')));
      try{
        const response=await fetch('/api/public/website-demo-preview',{
          method:'POST',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},
          body:JSON.stringify({website:field.value.trim()})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw Error('Preview not available');
        const source=new URL(data.finalUrl||'');
        if(!['https:','http:'].includes(source.protocol))throw Error('Invalid source URL');
        const heading=make('strong','rx-instant-demo-company',data.heading||data.title||source.hostname);
        const question=make('p','rx-instant-demo-question',t(
          'Asiakas: Mitä yrityksenne tarjoaa?','Kund: Vad erbjuder ni?','Visitor: What does your company offer?'));
        const answer=make('p','rx-instant-demo-answer',
          data.description||t('Julkinen kuvaus ei kerro tätä varmasti. Tietopohja täytyy tarkistaa.',
            'Den offentliga beskrivningen ger inget tillförlitligt svar.',
            'The public description does not provide a reliable answer.'));
        const note=make('small','rx-instant-demo-disclaimer',t(
          'Esikatselu julkisista metatiedoista – ei valmis botti. Emme arvaa hintoja tai ajanvarauksia.',
          'Förhandsgranskning av offentlig metadata, inte en installerad bot. Vi gissar inga priser eller tider.',
          'A public metadata preview, not an installed bot. Prices and bookings are not guessed.'));
        const link=make('a','rx-instant-demo-visit',t('Avaa lähdesivu','Visa källsidan','Open source page'));
        link.href=source.href;link.rel='noopener noreferrer';link.target='_blank';
        // Small real interaction, intentionally limited to the public homepage
        // fields actually returned by the safety-checked preview endpoint.
        const demo=document.createElement('div');
        demo.className='rx-instant-demo-interactive';
        const prompts=document.createElement('div');
        prompts.className='rx-instant-demo-prompts';
        prompts.setAttribute('role','group');
        prompts.setAttribute('aria-label',t('Kokeilukysymykset','Exempelfrågor','Demo questions'));
        const liveQuestion=make('div','rx-instant-demo-question','');
        const liveAnswer=make('div','rx-instant-demo-answer','');
        liveAnswer.setAttribute('role','status');
        const cases=[
          [t('Mitä yritys tarjoaa?','Vad erbjuder företaget?','What does the company offer?'),
           data.description||t('Etusivun julkiset metatiedot eivät kerro tätä varmuudella.',
             'Den offentliga sidbeskrivningen innehåller inga bekräftade tjänster.',
             'This public page summary does not verify the company’s services.')],
          [t('Paljonko palvelut maksavat?','Vad kostar tjänsterna?','How much do services cost?'),
           t('Hintoja ei voitu varmistaa etusivun metatiedoista. Respondo tarkistaisi hyväksytyn hinnaston ennen hintavastausta.',
             'Priser kan inte verifieras från startsidans metadata. Respondo kräver en godkänd prislista.',
             'Prices cannot be verified from homepage metadata. Respondo needs approved pricing sources.')],
          [t('Voinko varata ajan?','Kan jag boka en tid?','Can I book an appointment?'),
           t('Saatavuutta ei voida varmistaa tästä esikatselusta. Oikea botti tarkistaa yrityksen hyväksymän kalenterin ja tarvittavan työajan.',
             'Tillgänglighet kan inte verifieras i denna förhandsgranskning. Den riktiga botten behöver godkända kalender- och tidsregler.',
             'Availability cannot be verified in this preview. A configured bot checks actual calendar slots and required service duration.')]
        ];
        function selectDemo(index){
          const pair=cases[index];
          if(!pair)return;
          liveQuestion.textContent=pair[0];
          liveAnswer.textContent=pair[1];
          [...prompts.querySelectorAll('button')].forEach((b,i)=>
            b.setAttribute('aria-pressed',String(i===index)));
        }
        cases.forEach((pair,i)=>{
          const choice=make('button','rx-instant-demo-prompt',pair[0]);
          choice.type='button';choice.setAttribute('aria-pressed','false');
          choice.addEventListener('click',()=>selectDemo(i));
          prompts.appendChild(choice);
        });
        demo.append(prompts,liveQuestion,liveAnswer);
        const share=new URL('/assistant',location.origin);
        share.searchParams.set('lang',lang());
        share.searchParams.set('website',source.href);
        share.searchParams.set('preview','1');
        const sharePanel=make('div','rx-instant-demo-share');
        const copy=make('button','rx-instant-demo-submit',t(
          'Kopioi esittelylinkki','Kopiera demolänk','Copy demo link'));
        copy.type='button';
        const shareLink=make('a','rx-instant-demo-visit',t(
          'Avaa jaettava esikatselu','Öppna delbar förhandsvisning','Open shareable preview'));
        shareLink.href=share.href;shareLink.rel='noopener noreferrer';shareLink.target='_blank';
        copy.addEventListener('click',async()=>{
          try{
            if(!navigator.clipboard?.writeText)throw Error('Unavailable');
            await navigator.clipboard.writeText(share.href);
            copy.textContent=t('Kopioitu','Kopierad','Copied');
          }catch{
            // Browsers without Clipboard permission still get a selectable URL.
            const fallback=make('input','rx-instant-demo-input');
            fallback.readOnly=true;fallback.value=share.href;
            fallback.setAttribute('aria-label',t('Jaettava esittelylinkki','Delbar demolänk','Shareable demo link'));
            sharePanel.appendChild(fallback);fallback.focus();fallback.select();
          }
        });
        sharePanel.append(copy,shareLink);
        result.replaceChildren(heading,demo,note,link,sharePanel);
        selectDemo(0);
      }catch{
        result.replaceChildren(make('p','rx-instant-demo-error',t(
          'Esikatselua ei voitu hakea. Tarkista julkinen URL.','Kunde inte förhandsgranska adressen.',
          'Preview failed. Check the public website URL.')));
      }finally{button.disabled=false;}
    });
    panel.append(title,explanation,form,result);
    content.appendChild(panel);
    // Only an explicit, public demo link requests the metadata preview.
    // The existing backend rate limit and SSRF-safe fetch still apply.
    if(shareable&&shared.get('preview')==='1')
      queueMicrotask(()=>{if(panel.isConnected)form.requestSubmit();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});
})();
