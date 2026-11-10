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
        result.replaceChildren(heading,question,answer,note,link);
      }catch{
        result.replaceChildren(make('p','rx-instant-demo-error',t(
          'Esikatselua ei voitu hakea. Tarkista julkinen URL.','Kunde inte förhandsgranska adressen.',
          'Preview failed. Check the public website URL.')));
      }finally{button.disabled=false;}
    });
    panel.append(title,explanation,form,result);
    content.appendChild(panel);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});
})();
