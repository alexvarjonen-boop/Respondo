/* Respondo brand chapters for public interior pages.
   Progressive enhancement only: no changes to app state, forms, prices or legal copy. */
(() => {
  'use strict';
  const logo = '/respondo-approved-arrow-20261012.png';
  const loc = (fi,sv,en) => ({fi,sv,en})[document.documentElement.lang] || fi;
  const h = (value) => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const path = () => window.location.pathname.replace(/\/$/,'') || '/';
  const root = () => document.getElementById('app');
  const make = (tag, cls, html) => { const element = document.createElement(tag); element.className = cls; element.innerHTML = html; return element; };
  const badge = () => '<span class="r-brand-eyebrow"><span class="r-brand-live-dot" aria-hidden="true"></span>RESPONDO AI <span class="r-brand-eyebrow-line"></span> ' + loc('Älykkäämpää asiakaspalvelua','Smartare kundservice','Smarter customer service') + '</span>';
  const visual = (label) => '<div class="r-brand-orbit" aria-hidden="true"><div class="r-brand-orbit-ring r-brand-orbit-ring--one"></div><div class="r-brand-orbit-ring r-brand-orbit-ring--two"></div><div class="r-brand-orbit-core"><img src="' + logo + '" alt="" width="100" height="100"></div><div class="r-brand-orbit-point r-brand-orbit-point--one"></div><div class="r-brand-orbit-point r-brand-orbit-point--two"></div><span class="r-brand-orbit-caption">' + h(label) + '</span></div>';
  const hero = ({title,intro,tag,visualLabel}) => make('section','r-brand-hero','<div class="container r-brand-hero-grid"><div class="r-brand-hero-copy">' + badge() + '<div class="r-brand-hero-label">' + h(tag) + '</div><h1>' + h(title) + '</h1><p>' + h(intro) + '</p><a class="r-brand-hero-link" href="/">' + loc('Takaisin etusivulle','Till startsidan','Back to homepage') + ' <span aria-hidden="true">↗</span></a></div>' + visual(visualLabel || 'RESPONDO / 2026') + '</div>');
  function legalPage(page) {
    const main = page.querySelector('main.legalpage');
    const aside = page.querySelector('.legal-aside');
    const copy = page.querySelector('.legalcopy');
    if (!main || !aside || !copy || main.querySelector('.r-brand-hero')) return;
    const title = aside.querySelector('h1')?.textContent.trim() || loc('Tietoa palvelusta','Om tjänsten','About the service');
    const intro = aside.querySelector(':scope > p')?.textContent.trim() || '';
    const label = aside.querySelector('.section-kicker')?.textContent.trim() || 'RESPONDO AI';
    const security = path() === '/tietoturva';
    main.classList.add('r-brand-legal');
    // The existing localized title and summary are the legal heading. No giant marketing hero.
    aside.classList.add('r-brand-legal-sidebar');
    copy.classList.add('r-brand-legal-copy');
    const sections = Array.from(copy.children).filter(child => child.tagName === 'SECTION');
    const links = sections.map((section,index) => {
      const heading = section.querySelector('h2')?.textContent.trim();
      if (!heading) return '';
      section.id = 'kohta-' + (index+1);
      section.classList.add('r-brand-legal-section');
      const marker = String(index+1).padStart(2,'0');
      section.style.setProperty('--section-index','"' + marker + '"');
      return '<a href="#' + section.id + '"><span>' + marker + '</span>' + h(heading) + '</a>';
    }).join('');
    const toc = make('nav','r-brand-legal-toc','<span class="r-brand-mini-title">' + loc('TÄLLÄ SIVULLA','PÅ DEN HÄR SIDAN','ON THIS PAGE') + '</span><div class="r-brand-toc-links">' + links + '</div>');
    toc.setAttribute('aria-label',loc('Sivun sisältö','Sidans innehåll','Page contents'));
    aside.insertBefore(toc,aside.querySelector('.legal-seller') || null);

  }
  function contactPage(page) {
    const main = page.querySelector('.contact-page main');
    const container = main?.querySelector(':scope > .container');
    if (!main || !container || main.querySelector('.r-brand-contact-banner')) return;
    main.classList.add('r-brand-contact-main');
    const caption = main.querySelector('.section-kicker');
    const title = main.querySelector('h1');
    if(caption) caption.classList.add('r-brand-contact-label');
    if(title) title.classList.add('r-brand-contact-title');
    const intro = title?.nextElementSibling;
    if(intro) intro.classList.add('r-brand-contact-lead');
    // Keep only the original contact heading, message form, and contact details.
    const grids = Array.from(main.querySelectorAll('section,aside')).filter(el => el.querySelector('#homeContactForm') || el.querySelector('a[href^="mailto:"]'));
    grids.forEach((el,index) => el.classList.add(index===0?'r-brand-contact-form-card':'r-brand-contact-info-card'));
  }
  function flowInsert(page, targetSelector, after) {
    const section = page.querySelector(targetSelector);
    if(!section || page.querySelector('.r-brand-flow')) return;
    const flow = make('section','r-brand-flow','<div class="container"><div class="r-brand-flow-intro"><span class="r-brand-mini-title">RESPONDO AI / 01—03</span><h2>' + loc('Yksi sujuva kokonaisuus.','En smidigare helhet.','One seamless experience.') + '</h2><p>' + loc('Samat periaatteet kaikilla sivuilla – selkeä, nopea ja yrityksesi näköinen.','Samma principer på varje sida – tydligt, snabbt och med ditt varumärke.','Clear, fast, and made for your business.') + '</p></div><div class="r-brand-flow-steps"><div><span>01</span><strong>' + loc('Asiakas kysyy','Kunden frågar','A customer asks') + '</strong><small>' + loc('Keskustelu alkaa verkkosivulla.','Dialogen börjar på webbplatsen.','The conversation starts on your site.') + '</small></div><div><span>02</span><strong>' + loc('Respondo vastaa','Respondo svarar','Respondo responds') + '</strong><small>' + loc('Vastaus perustuu yrityksen tietoihin.','Svar med företagets information.','Using business-approved information.') + '</small></div><div><span>03</span><strong>' + loc('Asia etenee','Ärendet går vidare','Business moves forward') + '</strong><small>' + loc('Tarvittaessa asiakkaan yhteydenotto ohjataan eteenpäin.','Vid behov lämnas ärendet vidare.','Handoff when more help is needed.') + '</small></div></div></div>');
    if(after) section.after(flow); else section.before(flow);
  }
  function signupPage(page) {
    const main = page.querySelector('main.signup-page');
    if(!main || main.querySelector('.r-brand-signup-intro')) return;
    const card = page.querySelector('#signup');
    if(!card) return;
    main.prepend(make('div','r-brand-signup-intro','<h1>' + loc('Luo tili','Skapa konto','Create account') + '</h1>'));
  }
  function pricingPage(page) {
    const main = page.querySelector('.pricing-page main');
    if(!main || main.querySelector('.r-brand-pricing-banner')) return;
    main.prepend(make('div','r-brand-pricing-banner','<div class="container"><span class="r-brand-mini-title">' + loc('LÄPINÄKYVÄ HINNOITTELU','TYDLIGA PRISER','STRAIGHTFORWARD PRICING') + '</span><strong>' + loc('Vähemmän odottamista.<br>Enemmän aikaa olennaiseen.','Mindre väntan.<br>Mer tid till det viktiga.','Less waiting.<br>More time for what matters.') + '</strong><span class="r-brand-pricing-deco" aria-hidden="true">↗</span></div>'));
  }
  function guidesPage(page) {
    const heroSection=page.querySelector('.global-guide-hero');
    if(!heroSection || page.querySelector('.r-brand-guides-deco')) return;
    heroSection.append(make('div','r-brand-guides-deco','<img src="' + logo + '" alt="" width="84" height="84"><span>RESPONDO / KNOWLEDGE</span>'));
  }
  function enhance() {
    const page = root(); if(!page || !page.firstElementChild) return;
    const p = path();
    if(['/kayttoehdot','/tietosuoja','/evasteet','/dpa','/tietoturva'].includes(p)) legalPage(page);
    else if(p==='/yhteystiedot') contactPage(page);



    else if(p==='/tilaus') signupPage(page);

  }
  const start = () => {
    const host = root();
    if(!host) return;
    enhance();
    new MutationObserver(enhance).observe(host,{childList:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
