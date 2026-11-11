(()=>{
  'use strict';
  // Visible page transition only after the visitor clicks a trusted, same-site
  // answer link. Never browse, submit forms, purchase or change settings.
  const KEY='respondo-guided-path-v1';
  const validPath=path=>/^\/(?:asiakaspalvelubotti|ominaisuudet|funktioner|features|assistant|verkkokauppa-chatbot|ajanvaraus-chatbot|hinnat|tietoturva|tietosuoja|kayttoehdot|yhteystiedot|tilaus|kenelle-sopii|guides(?:\/[a-z0-9-]{1,80})?|kirjaudu|)$/.test(path);
  function translated(fi,sv,en){
    const value=new URLSearchParams(location.search).get('lang')||
      document.documentElement.lang||'en';
    return value==='fi'?fi:value==='sv'?sv:en;
  }
  document.addEventListener('click',event=>{
    const a=event.target?.closest?.('a.fx-site-action[href]');
    if(!a)return;
    let url;
    try{url=new URL(a.getAttribute('href'),location.href);}catch{return;}
    if(url.origin!==location.origin||!validPath(url.pathname)||url.pathname===location.pathname)return;
    try{sessionStorage.setItem(KEY,JSON.stringify({path:url.pathname,at:Date.now()}));}catch{}
  },true);
  let shown=false;
  function maybeShow(){
    if(shown)return;
    let target;
    try{target=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch{return;}
    if(!target||!validPath(target.path)||target.path!==location.pathname||
       !Number.isFinite(target.at)||Date.now()-target.at>120000)return;
    const app=document.getElementById('app');
    const heading=app?.querySelector('main h1,h1');
    if(!heading)return;
    shown=true;
    try{sessionStorage.removeItem(KEY);}catch{}
    const guide=document.createElement('aside');
    guide.className='respondo-guided-arrival';
    guide.setAttribute('role','status');
    const label=document.createElement('span');
    label.textContent=translated('Avasit botin ehdottaman sivun.',
      'Du öppnade sidan som assistenten föreslog.',
      'You opened the page suggested by the assistant.');
    const close=document.createElement('button');close.type='button';close.textContent='×';
    close.setAttribute('aria-label',translated('Sulje opaste','Stäng meddelandet','Dismiss notice'));
    const suggested=app.querySelector(
      'main a.fx-site-action[href],main a[href="/tilaus"],main a[href^="/tilaus?"],main a[href="/assistant"]');
    const validTarget=Boolean(suggested&&suggested instanceof HTMLElement&&
      !suggested.hasAttribute('disabled')&&!suggested.closest('[hidden]'));
    if(validTarget){
      suggested.classList.add('respondo-guided-target');
      const find=document.createElement('button');find.type='button';
      find.className='respondo-guided-find';
      find.textContent=translated('Näytä seuraava toiminto','Visa nästa steg','Show next action');
      find.addEventListener('click',()=>{
        // Only scroll and focus a trusted element. Never click a CTA,
        // submit a form, modify prices or trigger a purchase.
        suggested.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'});
        suggested.focus({preventScroll:true});
      });
      guide.append(find);
    }
    close.addEventListener('click',()=>{
      suggested?.classList.remove('respondo-guided-target');
      guide.remove();
    });
    guide.append(label,close);document.body.appendChild(guide);
    // This is a navigational cue, not an automatic simulated customer action.
    heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',maybeShow,{once:true});
  else maybeShow();
  new MutationObserver(maybeShow).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('popstate',maybeShow);
})();
