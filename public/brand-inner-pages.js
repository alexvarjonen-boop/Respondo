/* Minimal Respondo public pages: preserve existing content and function.
   Enhance only document navigation and contact card classes.
   No extra hero, CTA, marketing text, tracking or animation. */
(() => {
  'use strict';
  const loc = (fi, sv, en) => ({fi, sv, en})[document.documentElement.lang] || fi;
  const h = value => String(value || '').replace(/[&<>"']/g,
    char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const path = () => location.pathname.replace(/\/$/,'') || '/';
  const root = () => document.getElementById('app');

  function legalPage(page) {
    const main = page.querySelector('main.legalpage');
    const aside = main?.querySelector('.legal-aside');
    const copy = main?.querySelector('.legalcopy');
    if (!main || !aside || !copy || main.dataset.minimalLegal === '1') return;
    main.dataset.minimalLegal = '1';
    main.classList.add('r-brand-legal');
    aside.classList.add('r-brand-legal-sidebar');
    copy.classList.add('r-brand-legal-copy');

    // Keep document text verbatim. The TOC uses existing headings only.
    const sections = Array.from(copy.children).filter(item=>item.tagName === 'SECTION');
    const links = sections.map((section,i)=>{
      const heading = section.querySelector('h2')?.textContent.trim();
      if(!heading) return '';
      section.id='kohta-'+(i+1);
      section.classList.add('r-brand-legal-section');
      section.style.setProperty('--section-index','"'+String(i+1).padStart(2,'0')+'"');
      return '<a href="#'+section.id+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+h(heading)+'</a>';
    }).join('');
    if (links) {
      const toc = document.createElement('nav');
      toc.className='r-brand-legal-toc';
      toc.setAttribute('aria-label',loc('Sivun sisältö','Sidans innehåll','Page contents'));
      toc.innerHTML='<span class="r-brand-mini-title">'+loc('Sisältö','Innehåll','Contents')+
        '</span><div class="r-brand-toc-links">'+links+'</div>';
      aside.insertBefore(toc,aside.querySelector('.legal-seller')||null);
    }
  }

  function contactPage(page) {
    const main = page.querySelector('.contact-page main');
    if (!main || main.dataset.minimalContact === '1') return;
    main.dataset.minimalContact='1';
    main.classList.add('r-brand-contact-main');
    main.querySelector('.section-kicker')?.classList.add('r-brand-contact-label');
    main.querySelector('h1')?.classList.add('r-brand-contact-title');
    const title = main.querySelector('h1');
    title?.nextElementSibling?.classList.add('r-brand-contact-lead');
    main.querySelector('section:has(#homeContactForm)')?.classList.add('r-brand-contact-form-card');
    main.querySelector('aside:has(a[href^="mailto:"])')?.classList.add('r-brand-contact-info-card');
  }

  function enhance() {
    const page = root();
    if (!page?.firstElementChild) return;
    const route = path();
    if(['/kayttoehdot','/tietosuoja','/evasteet','/dpa','/tietoturva'].includes(route))
      legalPage(page);
    else if(route === '/yhteystiedot')
      contactPage(page);
    // Pricing, features, guides, login, signup and SEO pages already contain
    // the required headings and actions. Do not insert filler sections.
  }

  function start() {
    const host = root();
    if(!host) return;
    enhance();
    new MutationObserver(enhance).observe(host,{childList:true});
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
