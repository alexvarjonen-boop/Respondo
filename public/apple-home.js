import { spiralHeroMarkup } from './spiral-hero.js?v=20261125-restore-orbit-v1';
const paths={
 bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-8z"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
 growth:'<path d="M3 20h18M5 16v-4h3v4m3 0V9h3v7m3 0V5h3v11M5 8l6-5 4 2 5-4"/>',
 users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v3"/>',
 layers:'<path d="m12 3 10 6-10 6L2 9zM2 13l10 6 10-6M2 17l10 6 10-6"/>',
 shield:'<path d="M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6zM8 12l3 3 5-6"/>'
};
const icon=(name)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths[name]+'</svg>';
const arrow='<span aria-hidden="true">→</span>';
export function demoFirstHero(t,lang){
  const L=['fi','sv','en'].includes(lang)?lang:'en';
  const demo='/yhteystiedot?intent=demo&amp;lang='+L;
  const tryBot='/assistant?lang='+L;
  const features='/ominaisuudet?lang='+L;
  const order='/tilaus?plan=respondo_monthly&amp;lang='+L;
  const stats=[
    ['bolt','24/7',t('Aina tavoitettavissa','Alltid tillgänglig','Always available')],
    ['globe',t('Monikielinen','Flerspråkig','Multilingual'),'FI / SV / EN'],
    ['growth',t('Lisää liidejä','Fler leads','More leads'),t('Vierailijoista asiakkaita','Från besökare till kunder','Turn visitors into customers')]
  ];
  const benefits=[
    ['bolt',t('Säästä aikaa','Spara tid','Save time'),t('Vastaukset heti','Snabba svar','Instant answers'),tryBot],
    ['users',t('Kerää lisää liidejä','Få fler leads','Get more leads'),t('Kerää ja kartoita yhteydenotot','Samla och kvalificera förfrågningar','Capture and qualify enquiries'),features],
    ['layers',t('Helppo käyttää','Enkel att använda','Easy to use'),t('Vaivaton käyttöönotto','Smidig installation','Simple setup'),features]
  ];
  const statCards=stats.map(([glyph,title,copy])=>'<div class="df-stat">'+icon(glyph)+'<strong>'+title+'</strong><span>'+copy+'</span></div>').join('');
  const benefitCards=benefits.map(([glyph,title,copy,href])=>'<a class="df-benefit" href="'+href+'"><span class="df-benefit-icon">'+icon(glyph)+'</span><span class="df-benefit-copy"><strong>'+title+'</strong><span>'+copy+'</span></span><span class="df-chevron" aria-hidden="true">›</span></a>').join('');
  const hero=`<section class="df-landing" aria-labelledby="df-home-title">
    <div class="df-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="df-inner">
      <div class="df-eyebrow"><i></i> RESPONDO AI / 24/7</div>
      <h1 id="df-home-title">${t('Älykkäämpää','Smartare','Smarter')}<br><span>${t('asiakaspalvelua.','kundservice.','customer service.')}</span></h1>
      <p class="df-description">${t('Tekoälyasiakaspalvelu verkkosivuillesi. Vastaa kysymyksiin, auta asiakkaita ja kerää yhteydenottoja – 24/7.','AI-kundservice för din webbplats. Svara på frågor, hjälp kunder och samla förfrågningar – dygnet runt.','AI customer service for your website. Answers questions, helps your customers and captures enquiries — 24/7.')}</p>
      <a class="rs-book-demo df-primary" href="${demo}">${t('Varaa demo','Boka demo','Book a demo')} ${arrow}</a>
      <div class="df-stats">${statCards}</div>
      <div class="df-visual">
        <a class="df-phone-link" href="${tryBot}" aria-label="${t('Kokeile bottia','Testa botten','Try the bot')}">
          <div class="df-phone"><div class="df-phone-screen"><div class="df-camera"></div>
          <div class="df-phone-head"><img src="/favicon.svg" width="46" height="46" alt=""><div><strong>Respondo AI</strong><small><i></i> ${t('Valmiina auttamaan','Redo att hjälpa','Online – ready to help')}</small></div><span aria-hidden="true">···</span></div>
          <div class="df-chat-bubble">${t('Miten voin auttaa tänään?','Hur kan jag hjälpa dig idag?','How can I help you today?')}</div>
          <div class="df-typing" aria-hidden="true"><i></i><i></i><i></i></div>
          </div></div>
        </a>
      </div>
      <div class="df-trust">${icon('shield')} ${t('Suunniteltu kasvaville yrityksille','Byggt för växande företag','Built for growing businesses')}</div>
      <h2 class="df-benefit-title">${t('Miksi valita Respondo AI?','Varför välja Respondo AI?','Why choose Respondo AI?')}</h2>
      <div class="df-benefits">${benefitCards}</div>
    </div>
  </section>`;
  // Retain the existing interactive feature orbit and its ten chapters below the new hero.
  const orbit=spiralHeroMarkup(t,L)
    .replace(/<h1 id="apple-home-title">[\s\S]*?<\/h1>/,'<h2 id="apple-home-title">'+t('Tutustu ominaisuuksiin','Utforska funktionerna','Explore the features')+'</h2>')
    .replace(/<a class="rs-chat-navigation-note"[^>]*>[\s\S]*?<\/a>/,'')
    .replace(/<a class="rs-product-jump"[^>]*>[\s\S]*?<\/a>/,'<a class="rs-book-demo" href="'+order+'">'+t('Tilaa nyt','Beställ nu','Subscribe now')+'</a>');
  return hero+orbit;
}
export function appleHomeMarkup(t,lang,count,pricingMarkup=''){
  return `${demoFirstHero(t,lang)}${pricingMarkup}`;
}
