(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function injectBase() {
    if (!$('.fx-progress')) {
      document.body.insertAdjacentHTML('afterbegin', '<div class="fx-progress" aria-hidden="true"><i></i></div><div class="fx-ambient" aria-hidden="true"><span class="fx-orb one"></span><span class="fx-orb two"></span></div>');
    }
  }

  function marquee() {
    const hero = $('.hero');
    if (!hero || $('.respondo-marquee')) return;
    const words = ['24/7 ASIAKASPALVELU','HYVÄKSYTTY TIETO','EI ARVAILUA','3 PÄIVÄÄ MAKSUTTA','SUOMALAINEN B2B','RESPONDO'];
    const row = [...words, ...words].map(x => `<span>${x}</span>`).join('');
    hero.insertAdjacentHTML('afterend', `<div class="respondo-marquee" aria-hidden="true"><div class="marquee-track">${row}</div></div>`);
  }

  function decorateSections() {
    ['.workflow','.control','.pricing-section'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.classList.add('fx-depth');
      if (!el.querySelector('.fx-cube.a')) el.insertAdjacentHTML('beforeend','<span class="fx-cube a" aria-hidden="true"></span><span class="fx-cube b" aria-hidden="true"></span><span class="fx-scroll-rail" aria-hidden="true"><i></i></span>');
    });
  }

  function revealTargets() {
    const groups = [
      ['.hero-copy > *','left'],['.signal-console','right'],['.split-head h2','left'],['.split-head p','right'],
      ['.flowstep','up'],['.control-copy > *','left'],['.truth-card','right'],['.control-list > div','left'],
      ['.proof-grid > div','up'],['.price-card','up'],['.cta, .footer .foot-top > *','up']
    ];
    groups.forEach(([sel, dir]) => $$(sel).forEach((el, i) => {
      if (!el.dataset.reveal) el.dataset.reveal = dir;
      el.style.setProperty('--delay', `${Math.min(i * 85, 340)}ms`);
    }));
    if (reduce) return $$("[data-reveal]").forEach(el => el.classList.add('is-visible'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:.14, rootMargin:'0px 0px -6% 0px'});
    $$('[data-reveal]').forEach(el => io.observe(el));
  }

  function tilts() {
    if (reduce || matchMedia('(pointer: coarse)').matches) return;
    $$('.signal-console,.flowstep,.truth-card,.price-card').forEach(el => {
      el.dataset.tilt = '1';
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        const max = el.classList.contains('signal-console') ? 5 : 3.2;
        el.style.setProperty('--ty', `${x * max * 2}deg`);
        el.style.setProperty('--tx', `${-y * max * 2}deg`);
        if (el.classList.contains('signal-console')) {
          el.style.setProperty('--ry', `${x * 7}deg`);
          el.style.setProperty('--rx', `${-y * 7}deg`);
        }
      });
      el.addEventListener('pointerleave', () => {
        ['--tx','--ty','--rx','--ry'].forEach(k => el.style.setProperty(k,'0deg'));
      });
    });
  }

  function magneticButtons() {
    if (reduce || matchMedia('(pointer: coarse)').matches) return;
    $$('.btn').forEach(btn => {
      btn.classList.add('fx-magnetic');
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * .11;
        const y = (e.clientY - (r.top + r.height / 2)) * .13;
        btn.style.setProperty('--mag-x', `${x}px`);
        btn.style.setProperty('--mag-y', `${y}px`);
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.setProperty('--mag-x','0px');btn.style.setProperty('--mag-y','0px');
      });
    });
  }

  function parallax() {
    if (reduce) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const h = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = Math.min(1, scrollY / h);
      document.documentElement.style.setProperty('--scroll-progress', p);
      document.documentElement.style.setProperty('--orb1', `${scrollY * .08}px`);
      document.documentElement.style.setProperty('--orb2', `${scrollY * -.055}px`);
      const consoleEl = $('.signal-console');
      if (consoleEl) {
        const r = consoleEl.getBoundingClientRect();
        const center = r.top + r.height / 2 - innerHeight / 2;
        consoleEl.style.setProperty('--lift', `${Math.max(-22, Math.min(22, -center * .035))}px`);
      }
      const glow = $('.hero-glow');
      if (glow) {
        glow.style.setProperty('--hero-y', `${Math.min(70, scrollY * .12)}px`);
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive:true});
    addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5) * 28;
      const y = (e.clientY / innerHeight - .5) * 20;
      document.documentElement.style.setProperty('--hero-x', `${x}px`);
      document.documentElement.style.setProperty('--hero-y', `${y}px`);
    }, {passive:true});
    update();
  }

  const faq = [
    {keys:['hinta','maksaa','49','vuosi','kuukausi'], answer:'Respondo maksaa 49 € / kk + alv tai 549 € / vuosi + alv. Molemmissa on 3 päivän maksuton kokeilu.'},
    {keys:['kokeilu','ilmainen','3 päiv'], answer:'Saat 3 päivää maksutta. Maksutapa lisätään alussa Stripessä, ja veloitus alkaa vasta kokeilun jälkeen, ellet peru tilausta ennen sitä.'},
    {keys:['miten toimii','toimii','tietopohja','tieto'], answer:'Lisäät yrityksesi hyväksytyt tiedot tietopohjaan. Respondo vastaa asiakkaalle niiden perusteella ja ohjaa epävarmat tilanteet ihmiselle sen sijaan, että arvaisi.'},
    {keys:['asennus','sivulle','verkkosivu','widget'], answer:'Kun tili on käytössä, saat hallintapaneelista yhden asennusrivin, jolla chat-widget lisätään verkkosivulle.'},
    {keys:['tietoturva','gdpr','turvallinen','data'], answer:'Respondo käyttää HTTPS-yhteyksiä, salattuja palveluntarjoajia ja rajattuja käyttöoikeuksia. Maksukorttitiedot käsittelee Stripe. Lisätiedot löydät Tietoturva- ja Tietosuojasivuista.'},
    {keys:['peru','irtisano','lopeta'], answer:'Tilauksen voi perua koska tahansa. Käyttö jatkuu maksetun laskutuskauden loppuun.'},
    {keys:['y-tunnus','ytunnus','yritys'], answer:'Respondon Y-tunnus on 3599437-5. Yhteyssähköposti on respondoai.fi@outlook.com.'}
  ];

  function assistantAnswer(text) {
    const q = text.toLowerCase();
    const hit = faq.find(item => item.keys.some(k => q.includes(k)));
    if (hit) return hit.answer;
    if (q.includes('hei') || q.includes('moi')) return 'Moi! Kysy vaikka hinnasta, kokeilusta, käyttöönotosta, tietoturvasta tai siitä miten Respondo toimii.';
    return 'En halua keksiä vastausta. Voin auttaa Respondon hinnassa, kokeilussa, käyttöönotossa, tietoturvassa ja tilauksessa — tai voit ottaa yhteyttä osoitteeseen respondoai.fi@outlook.com.';
  }

  function assistant() {
    if ($('.fx-assistant-launch')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button class="fx-assistant-launch" type="button" aria-label="Avaa Respondo Assistant"><i>R</i><span>Respondo Assistant</span><b class="fx-live"></b></button>
      <aside class="fx-assistant" aria-label="Respondo Assistant">
        <div class="fx-assistant-head"><div class="fx-assistant-id"><span class="fx-assistant-avatar">R</span><div><b>Respondo Assistant</b><small>valmis vastaamaan</small></div></div><button class="fx-assistant-close" type="button" aria-label="Sulje">×</button></div>
        <div class="fx-assistant-messages"><div class="fx-chat-bubble bot">Moi 👋 Olen Respondon sivuassistentti. Kysy miten palvelu toimii tai mitä se maksaa.</div><div class="fx-quick"><button type="button">Mitä Respondo maksaa?</button><button type="button">Miten 3 päivän kokeilu toimii?</button><button type="button">Miten asennus toimii?</button></div></div>
        <form class="fx-assistant-form"><input name="message" autocomplete="off" placeholder="Kirjoita kysymys…" aria-label="Kysymys"><button type="submit" aria-label="Lähetä">→</button></form>
      </aside>`);
    const launch = $('.fx-assistant-launch'), box = $('.fx-assistant'), close = $('.fx-assistant-close'), messages = $('.fx-assistant-messages'), form = $('.fx-assistant-form');
    const open = () => { box.classList.add('open'); setTimeout(() => form.message.focus(), 180); };
    const shut = () => box.classList.remove('open');
    launch.addEventListener('click', () => box.classList.contains('open') ? shut() : open()); close.addEventListener('click', shut);
    const send = text => {
      const clean = String(text || '').trim(); if (!clean) return;
      messages.insertAdjacentHTML('beforeend', `<div class="fx-chat-bubble user"></div>`); messages.lastElementChild.textContent = clean;
      messages.insertAdjacentHTML('beforeend', '<div class="fx-chat-bubble bot typing">•••</div>');
      messages.scrollTop = messages.scrollHeight;
      setTimeout(() => {
        const typing = messages.querySelector('.typing'); if (typing) { typing.classList.remove('typing'); typing.textContent = assistantAnswer(clean); }
        messages.scrollTop = messages.scrollHeight;
      }, 420 + Math.random()*350);
    };
    form.addEventListener('submit', e => { e.preventDefault(); const text = form.message.value; form.reset(); send(text); });
    $$('.fx-quick button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  }

  function ctaPopup() {
    if ($('.fx-modal-backdrop') || sessionStorage.getItem('respondoCtaSeen')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="fx-modal-backdrop" role="dialog" aria-modal="true" aria-label="Respondo kokeilu"><div class="fx-modal"><button class="fx-modal-close" aria-label="Sulje">×</button><div class="fx-modal-kicker">RESPONDO / 3 PÄIVÄÄ</div><h3>Katso miltä 24/7-asiakaspalvelu näyttää omassa yrityksessäsi.</h3><p>Luo tili, lisää yrityksesi hyväksytty tieto ja testaa palvelua 3 päivää maksutta.</p><div class="fx-modal-actions"><a class="btn ink" href="/tilaus">Aloita maksutta →</a><button class="btn ghost fx-modal-later" type="button">Katson myöhemmin</button></div></div></div>`);
    const bg = $('.fx-modal-backdrop');
    const close = () => { bg.classList.remove('open'); sessionStorage.setItem('respondoCtaSeen','1'); };
    $('.fx-modal-close').addEventListener('click', close); $('.fx-modal-later').addEventListener('click', close); bg.addEventListener('click', e => { if (e.target === bg) close(); });
    let fired = false;
    const maybe = () => {
      if (fired) return;
      const h = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (scrollY / h > .48) { fired = true; bg.classList.add('open'); }
    };
    addEventListener('scroll', maybe, {passive:true});
    setTimeout(() => { if (!fired && !sessionStorage.getItem('respondoCtaSeen')) { fired=true; bg.classList.add('open'); } }, 18000);
  }

  function init() {
    injectBase();
    if (location.pathname === '/') {
      marquee(); decorateSections(); revealTargets(); tilts(); magneticButtons(); parallax(); assistant(); ctaPopup();
    } else {
      revealTargets(); magneticButtons(); assistant();
    }
  }

  let timer;
  const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => { if ($('#app')?.children.length) { mo.disconnect(); init(); } }, 60); });
  if ($('#app')?.children.length) init(); else mo.observe($('#app') || document.documentElement, {childList:true,subtree:true});
})();
