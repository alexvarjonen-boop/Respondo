// Public fullscreen navigation shared by all marketing pages.
export function publicMenuMarkup(t,lang){
 const entries=[
  [t('Etusivu','Startsida','Home'),'/'],
  [t('Tuote','Produkt','Product'),`/asiakaspalvelubotti?lang=${lang}`],
  [t('Ominaisuudet','Funktioner','Features'),`/ominaisuudet?lang=${lang}`],
  [t('Kokeile bottia','Testa botten','Try the bot'),`/assistant?lang=${lang}`],
  [t('Verkkokaupoille','För webbutiker','For online stores'),`/verkkokauppa-chatbot?lang=${lang}`],
  [t('Ajanvaraukset','Bokningar','Bookings'),`/ajanvaraus-chatbot?lang=${lang}`],
  [t('Hinnat','Priser','Pricing'),`/hinnat?lang=${lang}`],
  [t('Tietoturva','Säkerhet','Security'),`/tietoturva?lang=${lang}`],
  [t('Yhteystiedot','Kontakt','Contact'),`/yhteystiedot?lang=${lang}`],
  [t('Kirjaudu','Logga in','Log in'),`/kirjaudu?lang=${lang}`]
 ];
 return `<div class="apple-menu-overlay" id="apple-nav-overlay" aria-hidden="true" inert>
  <div class="apple-menu-head"><a href="/" class="apple-menu-logo">RESPONDO AI</a><button class="apple-menu-close" data-apple-menu-close type="button" aria-label="${t('Sulje valikko','Stäng menyn','Close menu')}">×</button></div>
  <nav class="apple-menu-body" aria-label="${t('Sivuston valikko','Webbplatsmeny','Site navigation')}">
    <p class="apple-menu-label">${t('Tutustu Respondoon','Upptäck Respondo','Explore Respondo')}</p>
    <div class="apple-menu-links">${entries.map(([label,href])=>`<a href="${href}">${label} <span aria-hidden="true">↗</span></a>`).join('')}</div>
    <div class="apple-menu-footer"><a class="apple-menu-cta" href="/tilaus">${t('Aloita ilmainen kokeilu','Börja gratis provperiod','Start free trial')}</a></div>
  </nav>
 </div>`;
}
export function bindPublicMenu(){
 const opener=document.querySelector('#app [data-apple-menu-open]');
 const overlay=document.querySelector('#app #apple-nav-overlay');
 document.querySelectorAll('body > #apple-nav-overlay').forEach(old=>old.remove());
 if(!opener||!overlay){document.body.classList.remove('apple-menu-open');return;}
 // Move the overlay outside the header's sticky/transform stacking contexts.
 document.body.appendChild(overlay);
 document.body.classList.remove('apple-menu-open');
 const closeButton=overlay.querySelector('[data-apple-menu-close]');
 function close(restoreFocus){
  overlay.setAttribute('aria-hidden','true');
  overlay.setAttribute('inert','');
  opener.setAttribute('aria-expanded','false');
  document.body.classList.remove('apple-menu-open');
  if(restoreFocus)opener.focus();
 }
 opener.addEventListener('click',()=>{
  overlay.removeAttribute('inert');
  overlay.setAttribute('aria-hidden','false');
  opener.setAttribute('aria-expanded','true');
  document.body.classList.add('apple-menu-open');
  closeButton?.focus();
 });
 closeButton?.addEventListener('click',()=>close(true));
 overlay.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>close(false)));
 if(!window.__respondoPublicMenuKeys){
  document.addEventListener('keydown',event=>{
   const panel=document.querySelector('#apple-nav-overlay[aria-hidden="false"]');
   if(!panel)return;
   if(event.key==='Escape'){
    event.preventDefault();
    document.querySelector('[data-apple-menu-close]')?.click();
    return;
   }
   if(event.key!=='Tab')return;
   const items=[...panel.querySelectorAll('a[href],button:not([disabled])')];
   if(!items.length)return;
   if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
   else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
  });
  window.__respondoPublicMenuKeys=true;
 }
}
