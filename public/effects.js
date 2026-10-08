(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const compactScreen = window.matchMedia('(max-width: 900px)').matches;
  const mobileLite = coarsePointer || compactScreen;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const isWorkspacePage = () => ['/assistant', '/app', '/demo'].includes(location.pathname)
    || Boolean($('#app .appshell'));

  function prepareStaticWorkspace() {
    document.documentElement.classList.add('static-workspace');
    document.body.classList.add('dashboard-page');
    document.body.classList.remove('assistant-standalone');
    delete document.documentElement.dataset.deepScrollReady;
    delete document.documentElement.dataset.fxAtmosphere;
    $$('.fx-progress, .fx-ambient, .fx-route-wipe, .respondo-marquee, .section-rail-premium, .fx-cube, .fx-scroll-rail, .fx-scene-number, .fx-modal-backdrop').forEach(el => el.remove());
    $$('#app .fx-scene, #app .fx-headline, #app .fx-depth-card, #app .fx-depth, #app .fx-magnetic, #app .motion-tilt, #app [data-reveal], #app [data-tilt]').forEach(el => {
      el.classList.remove('fx-scene', 'fx-scene-live', 'fx-scene-seen', 'fx-headline', 'fx-headline-live', 'fx-depth-card', 'fx-depth', 'fx-magnetic', 'motion-tilt', 'is-visible');
      ['data-fx-scene', 'data-fx-scene-index', 'data-fx-headline', 'data-reveal', 'data-tilt'].forEach(name => el.removeAttribute(name));
      ['transform', 'opacity', 'filter', 'clip-path'].forEach(name => el.style.removeProperty(name));
      [...el.style].filter(name => /^--(?:fx-|mag-|tilt-|shine-|delay$|tx$|ty$|rx$|ry$)/.test(name)).forEach(name => el.style.removeProperty(name));
    });
    [document.documentElement, document.body].forEach(el => {
      [...el.style].filter(name => /^--(?:fx-|orb\d|scroll-progress$|hero-)/.test(name)).forEach(name => el.style.removeProperty(name));
    });
  }

  // Mark workspace routes before their async renderer supplies the dashboard.
  if (isWorkspacePage()) prepareStaticWorkspace();

  function injectBase() {
    if (!$('.fx-progress')) {
      document.body.insertAdjacentHTML('afterbegin', '<div class="fx-progress" aria-hidden="true"><i></i></div><div class="fx-ambient" aria-hidden="true"><span class="fx-orb one"></span><span class="fx-orb two"></span></div>');
    }
  }

  function marquee() {
    const hero = $('.hero');
    if (!hero || $('.respondo-marquee')) return;
    const words = ['ASIAKASPALVELU YMPÄRI VUOROKAUDEN','YRITYKSESI OMA TIETO','EI KEKSITTYJÄ VASTAUKSIA','3 PÄIVÄÄ ILMAISEKSI','TEHTY YRITYKSILLE','RESPONDO AI'];
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
    if (reduce || mobileLite) return;
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

  function assistantLanguage() {
    const queryLang = new URLSearchParams(location.search).get('lang');
    if (['fi','sv','en'].includes(queryLang)) return queryLang;
    const storedLang = localStorage.getItem('respondo_lang');
    return ['fi','sv','en'].includes(storedLang) ? storedLang : 'fi';
  }

  function assistantText(fi, sv, en) {
    const lang = assistantLanguage();
    return lang === 'sv' ? sv : lang === 'en' ? en : fi;
  }

  const faq = [
    {
      keys:['hinta','maksaa','49','vuosi','kuukausi','price','pricing','cost','month','year','pris','kostar','kostnad','månad','manad','årsabonnemang'],
      answer:{
        fi:'Respondo maksaa 49,99 € / kk tai vuositilauksella 44,99 € / kk, jolloin 539,88 € laskutetaan kerran vuodessa. Voit kokeilla kumpaa tahansa 3 päivää ilmaiseksi.',
        sv:'Respondo kostar 49,99 € / mån eller 44,99 € / mån med årsabonnemang, då 539,88 € faktureras en gång per år. Du kan prova båda alternativen gratis i 3 dagar.',
        en:'Respondo costs €49.99 per month, or €44.99 per month on the annual plan, billed as €539.88 once per year. You can try either plan free for 3 days.'
      }
    },
    {
      keys:['kokeilu','ilmainen','3 päiv','trial','free','3 day','provperiod','prova','gratis','3 dagar'],
      answer:{
        fi:'Saat kokeilla Respondoa 3 päivää ilmaiseksi. Maksutapa lisätään alussa Stripessä, mutta veloitus alkaa vasta kokeilun jälkeen, jos et peru tilausta sitä ennen.',
        sv:'Du kan prova Respondo gratis i 3 dagar. Betalningsmetoden läggs till i Stripe i början, men debiteringen börjar först efter provperioden om du inte avslutar innan dess.',
        en:'You can try Respondo free for 3 days. You add a payment method in Stripe at the start, but billing begins only after the trial unless you cancel before it ends.'
      }
    },
    {
      keys:['miten toimii','toimii','tietopohja','tieto','how does it work','how it works','knowledge base','hur fungerar','fungerar','kunskapsbas'],
      answer:{
        fi:'Lisäät yrityksesi tiedot kerran. Respondo vastaa niiden perusteella ja ohjaa asiakkaan sinulle, jos varmaa vastausta ei löydy.',
        sv:'Du lägger in företagets uppgifter en gång. Respondo svarar utifrån dem och skickar kunden vidare till dig om ett säkert svar saknas.',
        en:'You add your company information once. Respondo answers from that information and hands the customer over to you when a reliable answer is not available.'
      }
    },
    {
      keys:['asennus','sivulle','verkkosivu','widget','install','installation','setup','set up','website','installera','installationen','webbplats','hemsida'],
      answer:{
        fi:'Kun tili on valmis, kopioit hallintapaneelista yhden koodirivin verkkosivullesi. Sen jälkeen chat on käytössä.',
        sv:'När kontot är klart kopierar du en kodrad från kontrollpanelen till din webbplats. Därefter är chatten aktiv.',
        en:'Once your account is ready, copy one line of code from the dashboard to your website. The chat is then active.'
      }
    },
    {
      keys:['tietoturva','gdpr','turvallinen','data','security','privacy','safe','säkerhet','sakerhet','integritet','trygg'],
      answer:{
        fi:'Respondo käyttää suojattuja HTTPS-yhteyksiä ja rajattuja käyttöoikeuksia. Korttitiedot käsittelee Stripe. Tarkemmat tiedot löydät tietoturva- ja tietosuojasivuilta.',
        sv:'Respondo använder skyddade HTTPS-anslutningar och begränsade åtkomsträttigheter. Kortuppgifter hanteras av Stripe. Mer information finns på sidorna om säkerhet och integritet.',
        en:'Respondo uses secure HTTPS connections and restricted access controls. Card details are handled by Stripe. More information is available on the security and privacy pages.'
      }
    },
    {
      keys:['peru','irtisano','lopeta','cancel','cancellation','avsluta','uppsäg','uppsag'],
      answer:{
        fi:'Voit perua tilauksen milloin tahansa. Palvelu toimii normaalisti jo maksetun laskutuskauden loppuun asti.',
        sv:'Du kan avsluta abonnemanget när som helst. Tjänsten fungerar normalt till slutet av den redan betalda faktureringsperioden.',
        en:'You can cancel the subscription at any time. The service continues normally until the end of the billing period you have already paid for.'
      }
    },
    {
      keys:['y-tunnus','ytunnus','yritys','business id','company','fo-nummer','företag','foretag','kontakt'],
      answer:{
        fi:'Respondon Y-tunnus on 3599437-5. Saat meidät kiinni sähköpostilla osoitteesta respondoai.fi@outlook.com.',
        sv:'Respondos FO-nummer är 3599437-5. Du når oss via e-post på respondoai.fi@outlook.com.',
        en:'Respondo’s Business ID is 3599437-5. You can reach us by email at respondoai.fi@outlook.com.'
      }
    }
  ];

  function assistantAnswer(text) {
    const q = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const lang = assistantLanguage();

    // Match specific intents before the generic "how it works" intent.
    // This keeps equivalent FI/SV/EN questions on the same answer path.
    const intentOrder = [3, 1, 0, 4, 5, 6, 2];
    const wordMatch = (key) => {
      const k = String(key || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!k) return false;
      if (k.includes(' ')) return q.includes(k);
      const qWords = q.split(/[^a-z0-9åäö]+/i).filter(Boolean);
      return qWords.includes(k);
    };

    for (const index of intentOrder) {
      const item = faq[index];
      if (item && item.keys.some(wordMatch)) return item.answer[lang] || item.answer.fi;
    }

    if (['hei','moi','moikka','hello','hi','hey','hej','halla','tjena'].some(wordMatch)) {
      return assistantText(
        'Moi! Kysy ihan vapaasti Respondosta — esimerkiksi hinnasta, kokeilusta, käyttöönotosta tai siitä, miten palvelu toimii.',
        'Hej! Fråga gärna om Respondo – till exempel om priset, provperioden, installationen eller hur tjänsten fungerar.',
        'Hi! Feel free to ask about Respondo — for example about pricing, the trial, installation, or how the service works.'
      );
    }
    return assistantText(
      'En löytänyt tähän varmaa vastausta. Voit kysyä hinnasta, kokeilusta, käyttöönotosta tai tilauksesta, tai laittaa meille viestiä osoitteeseen respondoai.fi@outlook.com.',
      'Jag hittade inget säkert svar på detta. Du kan fråga om priset, provperioden, installationen eller abonnemanget, eller mejla oss på respondoai.fi@outlook.com.',
      'I could not find a reliable answer to that. You can ask about pricing, the trial, installation or the subscription, or email us at respondoai.fi@outlook.com.'
    );
  }

  const localAiHistory = [];
  const ownerProfileKey = 'respondoOwnerBusinessProfile';
  const commonServices = [
    'Ajoneuvohuolto','Autopesu','Fysioterapia','Hieronta','Ilmastointihuolto','IT-tuki',
    'Kaivuutyöt','Kalusteasennus','Kattohuolto','Kiinteistöhuolto','Kirjanpito','Kuljetus',
    'LVI','Maalaus','Maanrakennus','Muutto','Putkityöt','Rakennus','Remontointi','Siivous',
    'Sähkö','Tuholaistorjunta','Valokuvaus','Verkkosivut','Viemärin avaus','Vihertyöt','Muu'
  ].sort((a,b) => a.localeCompare(b,'fi'));

  const serviceLabels = {
    sv: {
      'Ajoneuvohuolto':'Fordonsservice','Autopesu':'Biltvätt','Fysioterapia':'Fysioterapi','Hieronta':'Massage','Ilmastointihuolto':'Luftkonditioneringsservice','IT-tuki':'IT-support',
      'Kaivuutyöt':'Grävarbeten','Kalusteasennus':'Möbelmontering','Kattohuolto':'Takunderhåll','Kiinteistöhuolto':'Fastighetsskötsel','Kirjanpito':'Bokföring','Kuljetus':'Transport',
      'LVI':'VVS','Maalaus':'Målning','Maanrakennus':'Markarbete','Muutto':'Flytt','Putkityöt':'Rörarbeten','Rakennus':'Bygg','Remontointi':'Renovering','Siivous':'Städning',
      'Sähkö':'Elarbeten','Tuholaistorjunta':'Skadedjursbekämpning','Valokuvaus':'Fotografering','Verkkosivut':'Webbplatser','Viemärin avaus':'Avloppsrensning','Vihertyöt':'Trädgårdsarbete','Muu':'Annat'
    },
    en: {
      'Ajoneuvohuolto':'Vehicle maintenance','Autopesu':'Car wash','Fysioterapia':'Physiotherapy','Hieronta':'Massage','Ilmastointihuolto':'Air conditioning service','IT-tuki':'IT support',
      'Kaivuutyöt':'Excavation','Kalusteasennus':'Furniture installation','Kattohuolto':'Roof maintenance','Kiinteistöhuolto':'Property maintenance','Kirjanpito':'Accounting','Kuljetus':'Transport',
      'LVI':'Plumbing & HVAC','Maalaus':'Painting','Maanrakennus':'Earthworks','Muutto':'Moving','Putkityöt':'Plumbing','Rakennus':'Construction','Remontointi':'Renovation','Siivous':'Cleaning',
      'Sähkö':'Electrical work','Tuholaistorjunta':'Pest control','Valokuvaus':'Photography','Verkkosivut':'Websites','Viemärin avaus':'Drain unblocking','Vihertyöt':'Landscaping','Muu':'Other'
    }
  };

  const servicesText = (services) => Array.isArray(services) ? services.join(', ') : String(services || '');

  function normalizedCustomFacts(profile) {
    return Array.isArray(profile?.customFacts)
      ? profile.customFacts.filter(x => x && String(x.key || '').trim() && String(x.answer || '').trim())
      : [];
  }

  function getOwnerProfile() {
    try {
      return JSON.parse(localStorage.getItem(ownerProfileKey) || '{}') || {};
    } catch {
      return {};
    }
  }

  function saveOwnerProfile(profile) {
    localStorage.setItem(ownerProfileKey, JSON.stringify(profile));
    localAiHistory.length = 0;
  }


  function ownerProfileFallback(text) {
    const p = getOwnerProfile();
    const q = String(text || '').toLowerCase();
    const pick = (keys, value) => value && keys.some(k => q.includes(k)) ? value : '';
    const hits = [
      pick(['hinta','maksaa','hinnoittelu','€'], p.pricing),
      pick(['auki','aukiolo','milloin','kello'], p.hours),
      pick(['puhelin','numero','soittaa'], p.phone),
      pick(['sähköposti','email'], p.email),
      pick(['palvelu','teette','tarjoatte','lvi','putki','sähkö'], servicesText(p.services)),
      pick(['toimialue','alue','missä päin','paikkakunta'], p.serviceArea),
      pick(['osoite','sijainti','missä olette'], p.address),
      pick(['verkkosivu','nettisivu','www'], p.website),
    ].filter(Boolean);
    if (hits.length) return [...new Set(hits)].join('\n');
    const customHit = normalizedCustomFacts(p).find((x) => {
      const title = String(x.key || '').toLowerCase().trim();
      if (!title) return false;
      if (q.includes(title)) return true;
      const words = title.split(/\s+/).filter(w => w.length > 2);
      return words.some(w => q.includes(w));
    });
    if (customHit) return customHit.answer;
    if (p.notes && ['muuta','lisätieto','tärkeä'].some(k => q.includes(k))) return p.notes;
    return '';
  }


  function normalizeText(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9åäö€+\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(s) {
    return normalizeText(s).split(' ').filter(w => w.length > 2);
  }

  function retrieveOwnerFacts(text) {
    const p = getOwnerProfile();
    const q = normalizeText(text);
    const qTokens = new Set(tokens(q));
    const results = [];

    const add = (label, value, score = 1) => {
      const clean = String(value || '').trim();
      if (clean) results.push({ label, value: clean, score });
    };

    const hasAny = (arr) => arr.some(x => q.includes(normalizeText(x)));

    if (hasAny(['hinta','maksaa','hinnoittelu','paljonko','€'])) add('Hinnat', p.pricing, 8);
    if (hasAny(['auki','aukiolo','milloin','kello','lauantai','sunnuntai','arkisin'])) add('Aukioloajat', p.hours, 8);
    if (hasAny(['puhelin','numero','soittaa','yhteys'])) add('Puhelinnumero', p.phone, 8);
    if (hasAny(['sähköposti','email','meili'])) add('Sähköposti', p.email, 8);
    if (hasAny(['palvelu','teette','tarjoatte','saako','onnistuuko'])) add('Palvelut', servicesText(p.services), 7);
    if (hasAny(['toimialue','alue','missä päin','paikkakunta','tuletteko'])) add('Toimialue', p.serviceArea, 7);
    if (hasAny(['osoite','sijainti','missä olette','missä sijaitsee'])) add('Osoite', p.address, 7);
    if (hasAny(['verkkosivu','nettisivu','www','sivut'])) add('Verkkosivu', p.website, 6);

    const serviceText = servicesText(p.services);
    if (serviceText) {
      for (const svc of Array.isArray(p.services) ? p.services : serviceText.split(',')) {
        const n = normalizeText(svc);
        if (n && (q.includes(n) || tokens(n).some(t => qTokens.has(t)))) {
          add('Palvelut', serviceText, 10);
          break;
        }
      }
    }

    for (const x of normalizedCustomFacts(p)) {
      const title = normalizeText(x.key);
      const titleTokens = tokens(title);
      let score = 0;
      if (title && q.includes(title)) score += 12;
      for (const t of titleTokens) if (qTokens.has(t)) score += 3;
      if (score > 0) add(x.key, x.answer, score);
    }

    if (p.notes && hasAny(['muuta','lisätieto','tärkeä','päivystys','maksutapa','takuu','ajanvaraus'])) {
      add('Lisätiedot', p.notes, 5);
    }

    const seen = new Set();
    return results
      .sort((a,b) => b.score - a.score)
      .filter(x => {
        const key = x.label + '|' + x.value;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }

  function isBadModelOutput(text) {
    const s = String(text || '').trim();
    if (!s || s.length < 2) return true;
    const lower = s.toLowerCase();
    const badPhrases = [
      'the code snippet is incorrect',
      'as an ai language model',
      'i cannot comply',
      'system prompt',
      'developer message'
    ];
    if (badPhrases.some(p => lower.includes(p))) return true;
    const sentences = s.split(/[.!?\n]+/).map(x => x.trim()).filter(Boolean);
    if (sentences.length >= 4) {
      const counts = {};
      for (const sentence of sentences) {
        const k = sentence.toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
        if (counts[k] >= 3) return true;
      }
    }
    if (s.length > 900) return true;
    return false;
  }

  function directFactAnswer(facts) {
    if (!facts.length) return '';
    if (facts.length === 1) return facts[0].value;
    return facts.map(x => `${x.label}: ${x.value}`).join('\n');
  }


  async function localAiAnswer(text, onProgress) {
    const profile = getOwnerProfile();
    const lang = assistantLanguage();
    if (onProgress) onProgress(25, assistantText('Katson yrityksen tiedoista…','Kontrollerar företagets uppgifter…','Checking the company information…'));
    const response = await fetch('/api/public/demo-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        lang,
        profile,
        history: localAiHistory.slice(-6),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || assistantText('Vastausta ei saatu tällä kertaa.','Det gick inte att få ett svar den här gången.','No answer was available this time.'));
    if (onProgress) onProgress(100, assistantText('Hetki, etsin vastausta…','Ett ögonblick, jag söker svaret…','One moment, searching for the answer…'));
    const answer = String(data.answer || '').trim() || assistantText(
      'En löytänyt tähän varmaa vastausta yrityksen tiedoista.',
      'Jag hittade inget säkert svar på detta i företagets information.',
      'I could not find a reliable answer to this in the company information.'
    );
    localAiHistory.push({ question: text, answer });
    if (localAiHistory.length > 12) localAiHistory.splice(0, localAiHistory.length - 12);
    return answer;
  }

  function assistant() {
    // Workspaces already include their own contextual chat. The marketing
    // launcher overlaps profile controls on iPhone and must never appear in
    // any authenticated dashboard or the public Try Bot workspace.
    if (isWorkspacePage()) {
      $('.fx-assistant-launch')?.remove();
      $('.fx-assistant')?.remove();
      return;
    }
    if ($('.fx-assistant-launch')) return;
    const qLang = new URLSearchParams(location.search).get('lang');
    const uiLang = ['fi','sv','en'].includes(qLang) ? qLang : (localStorage.getItem('respondo_lang') || 'fi');
    const at = (fi,sv,en) => uiLang === 'sv' ? sv : uiLang === 'en' ? en : fi;
    const onDemo = false;
    document.body.insertAdjacentHTML('beforeend', `
      <button class="fx-assistant-launch" type="button" aria-label="${at('Avaa Respondo','Öppna Respondo','Open Respondo')}"><i class="fx-brand-mark"><svg viewBox="0 0 64 64" focusable="false" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#111114"/><path d="M19 17h17c8 0 13 4 13 11 0 5-3 9-8 10l10 10H39L30 39h-1v9H19V17zm10 8v7h7c2 0 3-1 3-3s-1-4-4-4h-6z" fill="#fff"/></svg></i><span>Respondo</span><b class="fx-live"></b></button>
      <aside class="fx-assistant" aria-label="Respondo">
        <div class="fx-assistant-head"><div class="fx-assistant-id"><span class="fx-assistant-avatar fx-brand-mark"><svg viewBox="0 0 64 64" focusable="false" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#111114"/><path d="M19 17h17c8 0 13 4 13 11 0 5-3 9-8 10l10 10H39L30 39h-1v9H19V17zm10 8v7h7c2 0 3-1 3-3s-1-4-4-4h-6z" fill="#fff"/></svg></span><div><b>Respondo</b><small>${onDemo ? at('sama vastausmoottori kuin oikeassa botissa','samma svarsmotor som i den riktiga botten','the same response engine as the real bot') : at('valmis vastaamaan','redo att svara','ready to answer')}</small></div></div><button class="fx-assistant-close" type="button" aria-label="${at('Sulje','Stäng','Close')}">×</button></div>
        <div class="fx-assistant-messages"><div class="fx-chat-bubble bot">${onDemo ? at('Moi 👋 Testaa nyt yrityksen omilla tiedoilla. Kysy esimerkiksi hinnasta, aukioloajoista, palveluista tai omista lisäämistäsi kysymyksistä.','Hej 👋 Testa nu med företagets egna uppgifter. Fråga till exempel om priser, öppettider, tjänster eller frågor som du själv har lagt till.','Hi 👋 Test with your company details. Ask about prices, opening hours, services, or questions you added yourself.') : at('Moi 👋 Olen Respondon sivuassistentti. Kysy miten palvelu toimii tai mitä se maksaa.','Hej 👋 Jag är Respondos webbassistent. Fråga hur tjänsten fungerar eller vad den kostar.','Hi 👋 I am Respondo’s website assistant. Ask how the service works or what it costs.')}</div>${onDemo ? '' : `<div class="fx-quick"><button type="button">${at('Mitä RESPONDO AI maksaa?','Vad kostar RESPONDO AI?','What does RESPONDO AI cost?')}</button><button type="button">${at('Miten 3 päivän kokeilu toimii?','Hur fungerar den 3 dagar långa provperioden?','How does the 3-day trial work?')}</button><button type="button">${at('Miten asennus toimii?','Hur fungerar installationen?','How does setup work?')}</button></div>`}</div>
        <form class="fx-assistant-form"><input name="message" autocomplete="off" placeholder="${at('Kirjoita kysymys…','Skriv en fråga…','Type a question…')}" aria-label="${at('Kysymys','Fråga','Question')}"><button type="submit" aria-label="${at('Lähetä','Skicka','Send')}">→</button></form>
      </aside>`);
    const launch = $('.fx-assistant-launch'), box = $('.fx-assistant'), close = $('.fx-assistant-close'), messages = $('.fx-assistant-messages'), form = $('.fx-assistant-form');
    const siteAssistantHistory = [];
    const open = () => { box.classList.add('open'); setTimeout(() => form.message.focus(), 180); };
    const shut = () => box.classList.remove('open');
    launch.addEventListener('click', () => box.classList.contains('open') ? shut() : open()); close.addEventListener('click', shut);
    const send = async text => {
      const clean = String(text || '').trim(); if (!clean) return;
      messages.insertAdjacentHTML('beforeend', `<div class="fx-chat-bubble user"></div>`); messages.lastElementChild.textContent = clean;
      messages.insertAdjacentHTML('beforeend', '<div class="fx-chat-bubble bot typing">•••</div>');
      const typing = messages.lastElementChild;
      messages.scrollTop = messages.scrollHeight;
      form.message.disabled = true;
      try {
        const response = await fetch('/api/public/respondo-assistant/chat', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            message:clean,
            lang:uiLang,
            history:siteAssistantHistory.slice(-6),
            pageContext:{url:location.href,title:document.title}
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Chat failed');
        const answer = String(data.answer || '').trim();
        if (!answer) throw new Error('Empty answer');
        typing.classList.remove('typing');
        typing.textContent = answer;
        siteAssistantHistory.push({question:clean,answer});
        if (siteAssistantHistory.length > 12) siteAssistantHistory.splice(0,siteAssistantHistory.length-12);
      } catch (err) {
        typing.classList.remove('typing');
        typing.textContent = at(
          'Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.',
          'Det gick inte att få ett svar just nu. Försök igen om en stund.',
          'The response failed. Please try again in a moment.'
        );
      } finally {
        form.message.disabled = false;
        form.message.focus();
      }
      messages.scrollTop = messages.scrollHeight;
    };
    form.addEventListener('submit', e => { e.preventDefault(); const text = form.message.value; form.reset(); send(text); });
    document.querySelectorAll('.fx-quick button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  }


  function localizeStandaloneAssistant(root) {
    const q = new URLSearchParams(location.search).get('lang');
    let lang = ['fi','sv','en'].includes(q) ? q : (localStorage.getItem('respondo_lang') || 'fi');
    if (!['fi','sv','en'].includes(lang)) lang='fi';
    if (q && ['fi','sv','en'].includes(q)) localStorage.setItem('respondo_lang',q);
    if (!root || lang === 'fi') return;
    const sv = lang === 'sv';
    const pairs = [
      ['KOKEILE OMILLA YRITYSTIEDOILLASI',sv?'TESTA MED DINA FÖRETAGSUPPGIFTER':'TRY WITH YOUR COMPANY DETAILS'],
      ['Kokeile, miten Respondo vastaisi sinun asiakkaillesi.',sv?'Testa hur Respondo skulle svara dina kunder.':'See how Respondo would answer your customers.'],
      ['Lisää alle muutama yrityksesi tieto. Sen jälkeen voit kysyä botilta ihan samalla tavalla kuin oikea asiakkaasi kysyisi.',sv?'Lägg till några uppgifter om ditt företag nedan. Därefter kan du fråga botten precis som en riktig kund skulle göra.':'Add a few details about your company below. Then ask the bot just as a real customer would.'],
      ['Yrityksen nimi',sv?'Företagets namn':'Company name'],['Palvelut',sv?'Tjänster':'Services'],['Valitse palvelu…',sv?'Välj tjänst…':'Choose a service…'],['Lisää',sv?'Lägg till':'Add'],
      ['Voit lisätä tähän kaikki palvelut, joita tarjoatte.',sv?'Du kan lägga till alla tjänster ni erbjuder här.':'You can add all the services you offer here.'],
      ['Hinnat',sv?'Priser':'Prices'],['Aukioloajat',sv?'Öppettider':'Opening hours'],['Puhelinnumero',sv?'Telefonnummer':'Phone number'],['Sähköposti',sv?'E-post':'Email'],['Toimialue',sv?'Serviceområde':'Service area'],['Osoite',sv?'Adress':'Address'],['Verkkosivu',sv?'Webbplats':'Website'],
      ['Tarjouspyyntölinkki',sv?'Länk för offertförfrågan':'Quote request link'],['Vastaustyyli',sv?'Svarsstil':'Response style'],['Luonteva ja ystävällinen',sv?'Naturlig och vänlig':'Natural and friendly'],['Lyhyt ja suora',sv?'Kort och direkt':'Short and direct'],['Asiallinen ja ammattimainen',sv?'Saklig och professionell':'Professional and formal'],
      ['Omat kysymykset ja vastaukset',sv?'Egna frågor och svar':'Custom questions and answers'],['Lisää tähän asioita, joita asiakkaasi kysyvät usein.',sv?'Lägg till sådant som dina kunder ofta frågar om.':'Add things your customers often ask about.'],['+ Lisää kysymys',sv?'+ Lägg till fråga':'+ Add question'],['Asiakkaan kysymys tai aihe',sv?'Kundens fråga eller ämne':'Customer question or topic'],['Vastaus',sv?'Svar':'Answer'],['+ Lisää oma kysymys',sv?'+ Lägg till egen fråga':'+ Add custom question'],
      ['Mitä muuta asiakkaan pitäisi tietää?',sv?'Vad mer bör kunden veta?':'What else should the customer know?'],['Tallenna ja kokeile',sv?'Spara och testa':'Save and test'],
      ['HALUATKO TÄMÄN OMALLE SIVULLESI?',sv?'VILL DU HA DETTA PÅ DIN EGEN WEBBPLATS?':'WANT THIS ON YOUR WEBSITE?'],['Ota Respondo käyttöön omalla verkkosivullasi.',sv?'Ta Respondo i bruk på din egen webbplats.':'Add Respondo to your own website.'],
      ['Kokeile 3 päivää ilmaiseksi. Valitse kuukausi- tai vuositilaus ja lisää maksutapa turvallisesti Stripessä.',sv?'Testa gratis i 3 dagar. Välj månads- eller årsabonnemang och lägg till betalningsmetod säkert via Stripe.':'Try free for 3 days. Choose a monthly or annual plan and add your payment method securely with Stripe.'],
      ['KUUKAUSITILAUS',sv?'MÅNADSABONNEMANG':'MONTHLY PLAN'],['VUOSITILAUS',sv?'ÅRSABONNEMANG':'ANNUAL PLAN'],['49,99 €',sv?'49,99 €':'€49.99'],['44,99 €',sv?'44,99 €':'€44.99'],['/ kk',sv?'/ mån':'/ month'],['Laskutetaan vuosittain 539,88 €',sv?'Faktureras årligen 539,88 €':'Billed annually at €539.88'],['3 päivää ilmaiseksi',sv?'3 dagar gratis':'3 days free'],['Chat suoraan omalle verkkosivullesi',sv?'Chatt direkt på din webbplats':'Chat directly on your website'],['Vastaukset yrityksesi omista tiedoista',sv?'Svar från företagets egna uppgifter':'Answers from your company information'],['Voit perua milloin tahansa',sv?'Du kan säga upp när som helst':'Cancel anytime'],['Valitse kuukausi',sv?'Välj månad':'Choose monthly'],['Säästä 60 €',sv?'Spara 60 €':'Save €60'],['Kaikki samat ominaisuudet kuin kuukausitilauksessa',sv?'Alla samma funktioner som i månadsabonnemanget':'All the same features as the monthly plan'],['Maksu kerran vuodessa',sv?'Betalning en gång per år':'One payment per year'],['Valitse vuosi',sv?'Välj år':'Choose annual'],
      ['Maksut turvallisesti Stripessä',sv?'Säkra betalningar via Stripe':'Secure payments with Stripe'],['Ei veloitusta 3 päivän kokeilun aikana',sv?'Ingen debitering under den 3 dagar långa provperioden':'No charge during the 3-day trial'],['Pääset alkuun heti tilauksen jälkeen',sv?'Kom igång direkt efter beställningen':'Get started immediately after subscribing']
    ];
    const map=new Map(pairs), walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{const raw=n.nodeValue||'',key=raw.trim();if(map.has(key))n.nodeValue=raw.replace(key,map.get(key));});
    const ph=sv?{'Esim. Virtasen LVI Oy':'T.ex. Virtanen VVS Ab','Esim. 65 € / h + alv':'T.ex. 65 € / h','Ma–Pe 8–17':'Mån–Fre 8–17','Katu 1, Tampere':'Gatan 1, Tammerfors','Esim. Oletteko lauantaina auki?':'T.ex. Har ni öppet på lördagar?','Esim. Kyllä. Olemme lauantaisin auki klo 10–14.':'T.ex. Ja. Vi har öppet på lördagar kl. 10–14.','Esim. päivystys, maksutavat, takuu tai ajanvarausohjeet…':'T.ex. jour, betalningssätt, garanti eller bokningsanvisningar…'}:{'Esim. Virtasen LVI Oy':'E.g. Virtanen Plumbing Ltd','Esim. 65 € / h + alv':'E.g. €65 / h','Ma–Pe 8–17':'Mon–Fri 8–17','Katu 1, Tampere':'1 Street, Tampere','Esim. Oletteko lauantaina auki?':'E.g. Are you open on Saturdays?','Esim. Kyllä. Olemme lauantaisin auki klo 10–14.':'E.g. Yes. We are open Saturdays 10–14.','Esim. päivystys, maksutavat, takuu tai ajanvarausohjeet…':'E.g. emergency service, payment methods, warranty or booking instructions…'};
    root.querySelectorAll('[placeholder]').forEach(el=>{const v=el.getAttribute('placeholder');if(ph[v])el.setAttribute('placeholder',ph[v]);});
    const trust = root.querySelector('.assistant-order-trust');
    if (trust) {
      const vals = sv ? ['✓ Säkra betalningar via Stripe','✓ Ingen debitering under den 3 dagar långa provperioden','✓ Kom igång direkt efter beställningen'] : ['✓ Secure payments with Stripe','✓ No charge during the 3-day trial','✓ Get started immediately after subscribing'];
      trust.querySelectorAll('span').forEach((el,i)=>{ if(vals[i]) el.textContent=vals[i]; });
    }
  }

  function standaloneAssistant() {
    document.body.classList.add('assistant-standalone');
    const app = $('#app');
    const p = getOwnerProfile();
    const qLang = new URLSearchParams(location.search).get('lang');
    const pageLang = ['fi','sv','en'].includes(qLang) ? qLang : (localStorage.getItem('respondo_lang') || 'fi');
    const pageTx = (fi,sv,en) => pageLang === 'sv' ? sv : pageLang === 'en' ? en : fi;
    const serviceDisplay = (service) => serviceLabels[pageLang]?.[service] || service;
    const val = (x) => String(x || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const selectedServices = Array.isArray(p.services)
      ? [...p.services]
      : String(p.services || '').split(',').map(x => x.trim()).filter(Boolean);
    const customFacts = normalizedCustomFacts(p).length ? normalizedCustomFacts(p) : [{key:'',answer:''}];

    if (app) {
      app.innerHTML = `
        <main class="assistant-direct-shell">
          <a class="assistant-direct-brand" href="/" aria-label="RESPONDO AI etusivu"><span class="assistant-direct-mark"><svg viewBox="0 0 64 64" focusable="false" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#111114"/><path d="M19 17h17c8 0 13 4 13 11 0 5-3 9-8 10l10 10H39L30 39h-1v9H19V17zm10 8v7h7c2 0 3-1 3-3s-1-4-4-4h-6z" fill="#fff"/></svg></span><b>RESPONDO AI</b></a>
          <section class="assistant-owner-panel">
            <div class="assistant-direct-copy">
              <small>KOKEILE OMILLA YRITYSTIEDOILLASI</small>
              <h1>Kokeile, miten Respondo vastaisi sinun asiakkaillesi.</h1>
              <p>${pageTx('Lisää alle muutama yrityksesi tieto. Sen jälkeen voit kysyä botilta ihan samalla tavalla kuin oikea asiakkaasi kysyisi.','Lägg till några uppgifter om ditt företag nedan. Därefter kan du fråga botten precis som en riktig kund skulle göra.','Add a few details about your company below. Then ask the bot just as a real customer would.')}</p>
            </div>

            <form class="owner-profile-form" id="ownerProfileForm">
              <div class="owner-field"><label>Yrityksen nimi</label><input name="companyName" value="${val(p.companyName)}" placeholder="Esim. Virtasen LVI Oy"></div>

              <div class="owner-field service-builder">
                <label>Palvelut</label>
                <div class="service-add-row">
                  <select id="servicePicker">
                    <option value="">${pageTx('Valitse palvelu…','Välj en tjänst…','Choose a service…')}</option>
                    ${commonServices.map(s => `<option value="${val(s)}">${val(serviceDisplay(s))}</option>`).join('')}
                  </select>
                  <button type="button" id="addService">${pageTx('Lisää','Lägg till','Add')}</button>
                </div>
                <div class="service-add-row service-custom-row">
                  <input id="customServiceInput" type="text" autocomplete="off" placeholder="${pageTx('Tai kirjoita oma palvelu…','Eller skriv din egen tjänst…','Or type your own service…')}">
                  <button type="button" id="addCustomService">${pageTx('Lisää oma','Lägg till egen','Add custom')}</button>
                </div>
                <div class="service-chips" id="serviceChips"></div>
                <small>${pageTx('Voit lisätä tähän kaikki palvelut, joita tarjoatte.','Du kan lägga till alla tjänster ni erbjuder här.','You can add all the services you offer here.')}</small>
              </div>

              <div class="owner-field"><label>Hinnat</label><textarea name="pricing" placeholder="Esim. 65 € / h + alv">${val(p.pricing)}</textarea></div>

              <div class="owner-two">
                <div class="owner-field"><label>Aukioloajat</label><input name="hours" value="${val(p.hours)}" placeholder="Ma–Pe 8–17"></div>
                <div class="owner-field"><label>Puhelinnumero</label><input name="phone" value="${val(p.phone)}" placeholder="040 123 4567"></div>
              </div>

              <div class="owner-two">
                <div class="owner-field"><label>${pageTx('Sähköposti','E-post','Email')}</label><input name="email" type="email" value="${val(p.email)}" placeholder="info@yritys.fi"></div>
                <div class="owner-field"><label>Toimialue</label><input name="serviceArea" value="${val(p.serviceArea)}" placeholder="Tampere + 50 km"></div>
              </div>

              <div class="owner-two">
                <div class="owner-field"><label>Osoite</label><input name="address" value="${val(p.address)}" placeholder="Katu 1, Tampere"></div>
                <div class="owner-field"><label>Verkkosivu</label><input name="website" value="${val(p.website)}" placeholder="https://yritys.fi"></div>
              </div>

              <div class="owner-two">
                <div class="owner-field"><label>Tarjouspyyntölinkki</label><input name="quoteRequestUrl" value="${val(p.quoteRequestUrl)}" placeholder="https://yritys.fi/tarjouspyynto"></div>
                <div class="owner-field"><label>Vastaustyyli</label>
                  <select name="tone">
                    <option value="Luonteva ja ystävällinen" ${String(p.tone || '').includes('Luonteva') ? 'selected' : ''}>Luonteva ja ystävällinen</option>
                    <option value="Lyhyt ja suora" ${String(p.tone || '').includes('Lyhyt') ? 'selected' : ''}>Lyhyt ja suora</option>
                    <option value="Asiallinen ja ammattimainen" ${String(p.tone || '').includes('Asiallinen') ? 'selected' : ''}>Asiallinen ja ammattimainen</option>
                  </select>
                </div>
              </div>

              <div class="custom-facts-block">
                <div class="custom-facts-head">
                  <div><label>${pageTx('Omat kysymykset ja vastaukset','Egna frågor och svar','Custom questions and answers')}</label><small>${pageTx('Lisää tähän asioita, joita asiakkaasi kysyvät usein.','Lägg till sådant som dina kunder ofta frågar om.','Add things your customers often ask about.')}</small></div>
                  <button type="button" id="addCustomFact" data-add-custom-fact>${pageTx('+ Lisää kysymys','+ Lägg till fråga','+ Add question')}</button>
                </div>
                <div id="customFacts">
                  ${customFacts.map((x,i) => `
                    <div class="custom-fact-row" data-index="${i}">
                      <div class="owner-field"><label>Asiakkaan kysymys tai aihe</label><input data-fact-key value="${val(x.key)}" placeholder="Esim. Oletteko lauantaina auki?"></div>
                      <div class="owner-field"><label>Vastaus</label><textarea data-fact-answer placeholder="Esim. Kyllä. Olemme lauantaisin auki klo 10–14.">${val(x.answer)}</textarea></div>
                      <button type="button" class="remove-fact" aria-label="Poista rivi">×</button>
                    </div>`).join('')}
                </div>
                <button type="button" class="add-fact-bottom" id="addCustomFactBottom" data-add-custom-fact>${pageTx('+ Lisää oma kysymys','+ Lägg till egen fråga','+ Add custom question')}</button>
              </div>

              <div class="owner-field"><label>Mitä muuta asiakkaan pitäisi tietää?</label><textarea name="notes" placeholder="Esim. päivystys, maksutavat, takuu tai ajanvarausohjeet…">${val(p.notes)}</textarea></div>

              <button class="owner-save" type="submit">${pageTx('Tallenna ja kokeile','Spara och testa','Save and test')} <span>→</span></button>
              <div class="owner-save-status" id="ownerSaveStatus"></div>
            </form>

            <section class="assistant-order" aria-label="Tilaa RESPONDO AI">
              <div class="assistant-order-head">
                <small>${pageTx('HALUATKO TÄMÄN OMALLE SIVULLESI?','VILL DU HA DETTA PÅ DIN EGEN WEBBPLATS?','WANT THIS ON YOUR WEBSITE?')}</small>
                <h2>${pageTx('Valitse yrityksellesi sopiva Respondo.','Välj rätt Respondo för ditt företag.','Choose the right Respondo plan for your business.')}</h2>
                <p>${pageTx('Kaikissa tilauksissa on 3 päivän ilmainen kokeilu. Vuositilaus on aina 5 €/kk edullisempi.','Alla abonnemang har 3 dagars gratis provperiod. Årsabonnemang är alltid 5 €/mån billigare.','Every plan includes a 3-day free trial. Annual billing is always €5/month cheaper.')}</p>
              </div>
              <div class="assistant-order-grid assistant-order-grid-three">
                <article class="assistant-order-card">
                  <div class="assistant-order-label">BASIC</div>
                  <h3>49,99 € <span>/ kk</span></h3>
                  <p class="assistant-annual-note">44,99 €/kk · ${pageTx('539,88 €/vuosi','539,88 €/år','€539.88/year')}</p>
                  <ul>
                    <li>${pageTx('Ajanvaraukset ja yhteydenotot','Bokningar och kontaktförfrågningar','Bookings and contact requests')}</li>
                    <li>${pageTx('Omat kysymys–vastausparit','Egna frågor och svar','Your own Q&A knowledge')}</li>
                    <li>${pageTx('2 asiakaspalvelijapaikkaa','2 kundserviceplatser','2 customer-service seats')}</li>
                  </ul>
                  <div class="assistant-order-actions">
                    <a class="assistant-order-btn" href="/tilaus?plan=basic_monthly">${pageTx('Kuukausi','Månad','Monthly')} <span>→</span></a>
                    <a class="assistant-order-btn" href="/tilaus?plan=basic_yearly">${pageTx('Vuosi','År','Annual')} <span>→</span></a>
                  </div>
                </article>
                <article class="assistant-order-card featured">
                  <div class="assistant-order-top"><div class="assistant-order-label">ADVANCED</div><span class="assistant-save">${pageTx('SUOSITUIN','POPULÄRAST','MOST POPULAR')}</span></div>
                  <h3>64,99 € <span>/ kk</span></h3>
                  <p class="assistant-annual-note">59,99 €/kk · ${pageTx('719,88 €/vuosi','719,88 €/år','€719.88/year')}</p>
                  <ul>
                    <li>${pageTx('Kaikki Basic-ominaisuudet','Alla Basic-funktioner','Everything in Basic')}</li>
                    <li>${pageTx('Hae tiedot sivustolta','Hämta information från webbplatsen','Website knowledge import')}</li>
                    <li>${pageTx('10 asiakaspalvelijapaikkaa','10 kundserviceplatser','10 customer-service seats')}</li>
                    <li>Google Calendar</li>
                  </ul>
                  <div class="assistant-order-actions">
                    <a class="assistant-order-btn primary" href="/tilaus?plan=advanced_monthly">${pageTx('Kuukausi','Månad','Monthly')} <span>→</span></a>
                    <a class="assistant-order-btn primary" href="/tilaus?plan=advanced_yearly">${pageTx('Vuosi','År','Annual')} <span>→</span></a>
                  </div>
                </article>
                <article class="assistant-order-card">
                  <div class="assistant-order-label">BUSINESS</div>
                  <h3>79,99 € <span>/ kk</span></h3>
                  <p class="assistant-annual-note">74,99 €/kk · ${pageTx('899,88 €/vuosi','899,88 €/år','€899.88/year')}</p>
                  <ul>
                    <li>${pageTx('Kaikki Respondon nykyiset ominaisuudet','Alla nuvarande Respondo-funktioner','All current Respondo features')}</li>
                    <li>${pageTx('20 asiakaspalvelijapaikkaa','20 kundserviceplatser','20 customer-service seats')}</li>
                    <li>${pageTx('Live takeover ja kieliohjaus','Live takeover och språkstyrning','Live takeover and language routing')}</li>
                  </ul>
                  <div class="assistant-order-actions">
                    <a class="assistant-order-btn" href="/tilaus?plan=business_monthly">${pageTx('Kuukausi','Månad','Monthly')} <span>→</span></a>
                    <a class="assistant-order-btn" href="/tilaus?plan=business_yearly">${pageTx('Vuosi','År','Annual')} <span>→</span></a>
                  </div>
                </article>
              </div>
              <div class="assistant-order-trust"><span>✓ ${pageTx('Maksut turvallisesti Stripessä','Säkra betalningar via Stripe','Secure payments with Stripe')}</span><span>✓ ${pageTx('Ei veloitusta 3 päivän kokeilun aikana','Ingen debitering under provperioden','No charge during the 3-day trial')}</span><span>✓ ${pageTx('Hinnat sisältävät ALV 25,5 %','Priserna inkluderar 25,5 % moms','Prices include 25.5% VAT')}</span></div>
            </section>
          </section>
          <div class="assistant-demo-column" id="assistantDemoColumn" aria-label="Testibotti ja tilaus"></div>
        </main>`;
      localizeStandaloneAssistant(app);
    }

    assistant();
    const box = $('.fx-assistant');
    if (box) box.classList.add('open', 'standalone');

    const demoColumn = $('#assistantDemoColumn');
    const orderSection = $('.assistant-order');
    if (demoColumn && box) {
      demoColumn.appendChild(box);
      if (orderSection) demoColumn.appendChild(orderSection);
    }

    const selected = new Set(selectedServices);

    const renderServices = () => {
      const host = $('#serviceChips');
      if (!host) return;
      host.innerHTML = [...selected].sort((a,b) => serviceDisplay(a).localeCompare(serviceDisplay(b), pageLang === 'sv' ? 'sv' : pageLang === 'en' ? 'en' : 'fi')).map(s =>
        `<button type="button" class="service-chip" data-service="${val(s)}"><span>${val(serviceDisplay(s))}</span><b>×</b></button>`
      ).join('');
      $$('.service-chip', host).forEach(btn => btn.addEventListener('click', () => {
        selected.delete(btn.dataset.service);
        renderServices();
      }));
    };

    const bindRemoveFacts = () => {
      $$('.remove-fact').forEach(btn => {
        btn.onclick = () => {
          const rows = $$('.custom-fact-row');
          const row = btn.closest('.custom-fact-row');
          if (rows.length === 1) {
            row.querySelector('[data-fact-key]').value = '';
            row.querySelector('[data-fact-answer]').value = '';
          } else {
            row.remove();
          }
        };
      });
    };

    const addFactRow = (key='', answer='') => {
      const host = $('#customFacts');
      if (!host) return;
      const lang = (() => { const q=new URLSearchParams(location.search).get('lang'); return ['fi','sv','en'].includes(q) ? q : (localStorage.getItem('respondo_lang') || 'fi'); })();
      const tx = (fi,sv,en) => lang === 'sv' ? sv : lang === 'en' ? en : fi;
      host.insertAdjacentHTML('beforeend', `
        <div class="custom-fact-row">
          <div class="owner-field"><label>${tx('Asiakkaan kysymys tai aihe','Kundens fråga eller ämne','Customer question or topic')}</label><input data-fact-key value="${val(key)}" placeholder="${tx('Esim. Mitkä maksutavat käyvät?','T.ex. Vilka betalningssätt accepterar ni?','E.g. Which payment methods do you accept?')}"></div>
          <div class="owner-field"><label>${tx('Vastaus','Svar','Answer')}</label><textarea data-fact-answer placeholder="${tx('Esim. Kortti, lasku ja MobilePay','T.ex. kort, faktura och MobilePay','E.g. card, invoice and MobilePay')}">${val(answer)}</textarea></div>
          <button type="button" class="remove-fact" aria-label="${tx('Poista rivi','Ta bort rad','Remove row')}">×</button>
        </div>`);
      bindRemoveFacts();
      host.lastElementChild?.querySelector('[data-fact-key]')?.focus();
    };

    renderServices();
    bindRemoveFacts();

    $('#addService')?.addEventListener('click', () => {
      const picker = $('#servicePicker');
      const service = String(picker?.value || '').trim();
      if (!service) return;
      selected.add(service);
      picker.value = '';
      renderServices();
    });
    const addCustomService = () => {
      const input = $('#customServiceInput');
      const service = String(input?.value || '').trim();
      if (!service) return;
      selected.add(service);
      input.value = '';
      renderServices();
      input.focus();
    };
    $('#addCustomService')?.addEventListener('click', addCustomService);
    $('#customServiceInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomService();
      }
    });

    const ownerForm = $('#ownerProfileForm');
    ownerForm?.addEventListener('click', (e) => {
      const addButton = e.target.closest('[data-add-custom-fact]');
      if (addButton) {
        e.preventDefault();
        e.stopPropagation();
        addFactRow();
        return;
      }

      const removeButton = e.target.closest('.remove-fact');
      if (removeButton) {
        e.preventDefault();
        const rows = $$('.custom-fact-row');
        const row = removeButton.closest('.custom-fact-row');
        if (!row) return;
        if (rows.length === 1) {
          row.querySelector('[data-fact-key]').value = '';
          row.querySelector('[data-fact-answer]').value = '';
        } else {
          row.remove();
        }
      }
    });

    ownerForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const facts = $$('.custom-fact-row').map(row => ({
        key: row.querySelector('[data-fact-key]')?.value?.trim() || '',
        answer: row.querySelector('[data-fact-answer]')?.value?.trim() || '',
      })).filter(x => x.key && x.answer);

      saveOwnerProfile({
        companyName: f.get('companyName'),
        pricing: f.get('pricing'),
        hours: f.get('hours'),
        phone: f.get('phone'),
        email: f.get('email'),
        services: [...selected].sort((a,b) => a.localeCompare(b,'fi')),
        serviceArea: f.get('serviceArea'),
        address: f.get('address'),
        website: f.get('website'),
        quoteRequestUrl: f.get('quoteRequestUrl'),
        tone: f.get('tone') || 'Luonteva ja ystävällinen',
        notes: f.get('notes'),
        customFacts: facts,
      });

      const status = $('#ownerSaveStatus');
      if (status) {
        status.textContent = pageTx('Tallennettu ✓ Kysy nyt botilta mitä tahansa yrityksestäsi.','Sparat ✓ Fråga nu botten vad som helst om ditt företag.','Saved ✓ Now ask the bot anything about your company.');
        setTimeout(() => { status.textContent = ''; }, 3500);
      }
      const messages = $('.fx-assistant-messages');
      if (messages) {
        messages.insertAdjacentHTML('beforeend', '<div class="fx-chat-bubble bot owner-confirm">' + pageTx('Tiedot päivitettiin. Kysy nyt ihan samalla tavalla kuin oikea asiakkaasi kysyisi.','Uppgifterna uppdaterades. Fråga nu precis som en riktig kund skulle göra.','Information updated. Now ask just like a real customer would.') + '</div>');
        messages.scrollTop = messages.scrollHeight;
      }
    });
  }

  function leftSectionRail() {
    if (document.querySelector(".premium-home")) return;
    if (location.pathname !== '/' || mobileLite || $('.section-rail-premium')) return;
    const sections = [
      { id:'how', label:'Miten toimii' },
      { id:'features', label:'Ominaisuudet' },
      { id:'research', label:'Tutkittua' },
      { id:'calculator', label:'Laskuri' },
      { id:'pricing', label:'Hinnat' },
      { id:'contact', label:'Yhteystiedot' },
    ].filter(x => document.getElementById(x.id));
    if (!sections.length) return;

    document.body.insertAdjacentHTML('beforeend', `
      <nav class="section-rail-premium" aria-label="Sivun eteneminen">
        <div class="section-rail-line"><i></i></div>
        <div class="section-rail-items">
          ${sections.map((s,i)=>`
            <a href="#${s.id}" data-rail-section="${s.id}">
              <span class="rail-dot"></span>
              <b>${String(i+1).padStart(2,'0')}</b>
              <em>${s.label}</em>
            </a>`).join('')}
        </div>
      </nav>`);

    const rail = $('.section-rail-premium');
    const fill = $('.section-rail-line i', rail);
    const links = $$('[data-rail-section]', rail);

    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = Math.max(0, Math.min(1, scrollY / max));
      if (fill) fill.style.transform = 'scaleY(' + p + ')';

      let active = sections[0].id;
      const marker = innerHeight * .38;
      sections.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= marker) active = s.id;
      });
      links.forEach(a => a.classList.toggle('active', a.dataset.railSection === active));
    };

    links.forEach(a => a.addEventListener('click', () => {
      links.forEach(x => x.classList.remove('active'));
      a.classList.add('active');
    }));
    addEventListener('scroll', update, {passive:true});
    addEventListener('resize', update, {passive:true});
    update();
  }

  function premiumProductEffects() {
    const subnavLinks = $$('.product-subnav a[href^="#"]');
    const sections = ['how','features','research','calculator','pricing','contact']
      .map(id => document.getElementById(id))
      .filter(Boolean);

    if (subnavLinks.length && sections.length) {
      const setActive = (id) => {
        subnavLinks.forEach(link => {
          const active = link.getAttribute('href') === '#' + id;
          link.classList.toggle('active', active);
        });
      };

      const io = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(x => x.isIntersecting)
          .sort((a,b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      }, { rootMargin: '-28% 0px -58% 0px', threshold: [0,.1,.25,.5] });

      sections.forEach(section => io.observe(section));
    }

    const cards = $$('.visual-card');
    cards.forEach((card, index) => {
      card.dataset.premiumVisual = '1';
      const frame = $('.visual-frame', card);
      if (frame) {
        frame.style.setProperty('--visual-index', index);
      }
    });

    if (!reduce && !mobileLite) {
      let ticking = false;
      const updateVisuals = () => {
        ticking = false;
        const vh = Math.max(innerHeight, 1);
        cards.forEach((card, index) => {
          const frame = $('.visual-frame', card);
          if (!frame) return;
          const r = card.getBoundingClientRect();
          const progress = Math.max(-1, Math.min(1, (r.top + r.height/2 - vh/2) / vh));
          frame.style.setProperty('--visual-y', (progress * -18 * (index % 2 ? .8 : 1)) + 'px');
          frame.style.setProperty('--visual-scale', String(1.015 - Math.abs(progress) * .012));
        });
      };
      addEventListener('scroll', () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateVisuals);
        }
      }, {passive:true});
      updateVisuals();
    }

    if (mobileLite) {
      cards.forEach((card) => {
        card.classList.add('visual-visible');
        const frame = $('.visual-frame', card);
        if (frame) {
          frame.style.transform = 'none';
          frame.style.clipPath = 'none';
          frame.style.willChange = 'auto';
          frame.style.transition = 'none';
          frame.style.opacity = '1';
        }
      });
      return;
    }

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visual-visible');
          imageObserver.unobserve(entry.target);
        }
      });
    }, {threshold:.18});

    cards.forEach(card => imageObserver.observe(card));
  }


  function deepScrollExperience() {
    if (isWorkspacePage()) return;
    if (document.querySelector('.formpage') || ['/kirjaudu','/tilaus'].includes(location.pathname)) return;

    const route = location.pathname;
    const compactAuthPage = ['/kirjaudu','/tilaus'].includes(route)
      && matchMedia('(max-width: 900px), (hover: none) and (pointer: coarse)').matches;

    // Login and checkout are utility screens, not cinematic scenes. On mobile
    // the 3D scene offsets can move the copy/forms outside the viewport before
    // IntersectionObserver settles, especially in iOS Safari.
    if (compactAuthPage) {
      document.documentElement.dataset.deepScrollReady = '1';
      return;
    }

    if (document.documentElement.dataset.deepScrollReady === '1') return;
    document.documentElement.dataset.deepScrollReady = '1';

    const home = route === '/';
    const assistantPage = route === '/assistant';

    const sceneCandidates = home
      ? $$('main > section, main > .section, .visual-card, .flowstep, .proof-grid > div, .price-card')
      : assistantPage
        ? $$('.assistant-direct-copy, .owner-profile-form, .assistant-order, .assistant-order-card')
        : $$('main > section, main > div, .formcard, .checkout-copy, .login-copy, .panel, .legal-card');

    const scenes = [...new Set(sceneCandidates)].filter((el) => {
      if (!el || el.classList.contains('fx-assistant') || el.closest('.fx-assistant')) return false;
      return el.getBoundingClientRect || el.nodeType === 1;
    });

    const modes = ['rise','slide-left','zoom','slide-right','tilt','wipe','float'];
    scenes.forEach((el, i) => {
      if (!el.dataset.fxScene) {
        el.dataset.fxScene = modes[i % modes.length];
        el.dataset.fxSceneIndex = String(i + 1).padStart(2,'0');
        el.classList.add('fx-scene');
      }
    });

    const headings = $$('main h1, main h2, main h3, .assistant-direct-copy h1, .assistant-order h2')
      .filter(el => !el.closest('.fx-assistant') && !el.dataset.fxHeadline);
    headings.forEach((el, i) => {
      el.dataset.fxHeadline = String(i % 4);
      el.classList.add('fx-headline');
    });

    const depthCards = $$(
      '.visual-card,.flowstep,.truth-card,.price-card,.research-card,.stat-card,.panel,.formcard,.assistant-order-card,.owner-profile-form'
    ).filter(el => !el.closest('.fx-assistant'));
    depthCards.forEach((el, i) => {
      el.classList.add('fx-depth-card');
      el.style.setProperty('--fx-card-index', i % 7);
    });

    if (reduce) {
      scenes.forEach(el => el.classList.add('fx-scene-live'));
      headings.forEach(el => el.classList.add('fx-headline-live'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('fx-scene-live', entry.isIntersecting);
        if (entry.isIntersecting) entry.target.classList.add('fx-scene-seen');
      });
    }, {threshold:[0,.08,.22,.45,.7], rootMargin:'10% 0px 10% 0px'});
    scenes.forEach(el => io.observe(el));

    const hi = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fx-headline-live');
          hi.unobserve(entry.target);
        }
      });
    }, {threshold:.42, rootMargin:'0px 0px -6% 0px'});
    headings.forEach(el => hi.observe(el));

    let lastY = scrollY;
    let lastT = performance.now();
    let raf = 0;

    const update = () => {
      raf = 0;
      const now = performance.now();
      const dy = scrollY - lastY;
      const dt = Math.max(16, now - lastT);
      const velocity = Math.max(-1, Math.min(1, (dy / dt) * .9));
      const dir = dy === 0 ? 0 : dy > 0 ? 1 : -1;
      lastY = scrollY;
      lastT = now;

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const pageP = Math.max(0, Math.min(1, scrollY / maxScroll));
      document.documentElement.style.setProperty('--fx-page', pageP.toFixed(4));
      document.documentElement.style.setProperty('--fx-velocity', velocity.toFixed(4));
      document.documentElement.style.setProperty('--fx-motion-blur', (Math.abs(velocity) * .32).toFixed(3) + 'px');
      document.documentElement.style.setProperty('--fx-direction', String(dir));

      const vh = Math.max(innerHeight, 1);
      scenes.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh * .7 || r.top > vh * 1.7) return;

        const center = r.top + r.height * .5;
        const normalized = (center - vh * .5) / Math.max(vh, r.height);
        const p = Math.max(-1, Math.min(1, normalized));
        const enter = Math.max(0, Math.min(1, 1 - Math.abs((r.top + Math.min(r.height, vh) * .35 - vh * .58) / (vh * .88))));
        const twist = p * (i % 2 ? -1 : 1);

        el.style.setProperty('--fx-local', p.toFixed(4));
        el.style.setProperty('--fx-enter', enter.toFixed(4));
        el.style.setProperty('--fx-shift-y', (p * 34).toFixed(2) + 'px');
        el.style.setProperty('--fx-shift-x', (twist * 28).toFixed(2) + 'px');
        el.style.setProperty('--fx-rot', (twist * 2.1).toFixed(2) + 'deg');
        el.style.setProperty('--fx-scale', (1 - Math.min(.035, Math.abs(p) * .022)).toFixed(4));
      });

      const hero = $('.hero');
      if (hero) {
        const r = hero.getBoundingClientRect();
        const hp = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
        hero.style.setProperty('--hero-progress', hp.toFixed(4));
        hero.style.setProperty('--hero-copy-y', (-hp * 54).toFixed(2) + 'px');
        hero.style.setProperty('--hero-copy-z', (-hp * 40).toFixed(2) + 'px');
        hero.style.setProperty('--hero-copy-scale', (1 - hp * .035).toFixed(4));
        hero.style.setProperty('--hero-copy-opacity', (1 - hp * .28).toFixed(4));
        hero.style.setProperty('--hero-console-y', (hp * 34).toFixed(2) + 'px');
        hero.style.setProperty('--hero-console-z', (hp * 80).toFixed(2) + 'px');
        hero.style.setProperty('--hero-console-rx', (hp * 4).toFixed(2) + 'deg');
        hero.style.setProperty('--hero-console-scale', (1 - hp * .025).toFixed(4));
      }

      const order = $('.assistant-order');
      if (order) {
        const r = order.getBoundingClientRect();
        const op = Math.max(0, Math.min(1, 1 - (r.top - innerHeight * .15) / innerHeight));
        order.style.setProperty('--order-progress', op.toFixed(4));
        order.style.setProperty('--order-glow-opacity', (.35 + op * .65).toFixed(4));
        order.style.setProperty('--order-glow-y', ((1 - op) * 44).toFixed(2) + 'px');
      }
    };

    const requestUpdate = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    addEventListener('scroll', requestUpdate, {passive:true});
    addEventListener('resize', requestUpdate, {passive:true});
    update();

    if (!matchMedia('(pointer: coarse)').matches) {
      depthCards.forEach(card => {
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const x = (e.clientX - r.left) / r.width - .5;
          const y = (e.clientY - r.top) / r.height - .5;
          card.style.setProperty('--fx-pointer-x', (x * 9).toFixed(2) + 'deg');
          card.style.setProperty('--fx-pointer-y', (-y * 8).toFixed(2) + 'deg');
          card.style.setProperty('--fx-light-x', ((x + .5) * 100).toFixed(1) + '%');
          card.style.setProperty('--fx-light-y', ((y + .5) * 100).toFixed(1) + '%');
        });
        card.addEventListener('pointerleave', () => {
          card.style.setProperty('--fx-pointer-x','0deg');
          card.style.setProperty('--fx-pointer-y','0deg');
          card.style.setProperty('--fx-light-x','50%');
          card.style.setProperty('--fx-light-y','50%');
        });
      });
    }
  }

  function cinematicSectionAtmosphere() {
    if (reduce || mobileLite || location.pathname !== '/') return;
    const sections = $$('main > section').filter(Boolean);
    if (!sections.length) return;

    sections.forEach((section, i) => {
      section.dataset.fxAtmosphere = String(i % 6);
      if (!section.querySelector(':scope > .fx-scene-number')) {
        section.insertAdjacentHTML('afterbegin', '<span class="fx-scene-number" aria-hidden="true">' + String(i + 1).padStart(2,'0') + '</span>');
      }
    });

    let active = -1;
    const io = new IntersectionObserver(entries => {
      const visible = entries
        .filter(x => x.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio);
      if (!visible.length) return;
      const idx = sections.indexOf(visible[0].target);
      if (idx >= 0 && idx !== active) {
        active = idx;
        document.documentElement.dataset.fxAtmosphere = String(idx % 6);
      }
    }, {threshold:[.2,.35,.55], rootMargin:'-12% 0px -28% 0px'});
    sections.forEach(s => io.observe(s));
  }

  function kineticNavigation() {
    if (reduce || document.body.dataset.fxNavReady === '1') return;
    document.body.dataset.fxNavReady = '1';

    const overlay = document.createElement('div');
    overlay.className = 'fx-route-wipe';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML = '<i></i><b></b>';
    document.body.appendChild(overlay);

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const raw = a.getAttribute('href') || '';
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;
      let url;
      try { url = new URL(a.href, location.href); } catch { return; }
      if (url.origin !== location.origin || url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      overlay.classList.add('go');
      setTimeout(() => { location.href = url.href; }, 260);
    });
  }


  function immersiveHomepageScenes() {
    if (location.pathname !== '/' || reduce || document.body.dataset.immersiveReady === '1') return;
    document.body.dataset.immersiveReady = '1';

    const story = $('.story-horizontal');
    const track = $('.story-track');
    const progress = $('.story-progress i');
    const current = $('#storyCurrent');
    const world = $('.product-world');
    const worldStage = $('.world-stage');
    const cinema = $('.cinema-conversation');
    const portal = $('.trust-portal');
    const impact = $('.impact-scene');

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = Math.max(innerHeight, 1);

      if (story && track) {
        const r = story.getBoundingClientRect();
        const total = Math.max(1, story.offsetHeight - vh);
        const p = Math.max(0, Math.min(1, -r.top / total));
        track.style.setProperty('--story-p', p.toFixed(4));
        track.style.setProperty('--story-x', (-p * 200).toFixed(3) + 'vw');
        if (progress) progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        const step = Math.min(3, Math.max(1, Math.floor(p * 3) + 1));
        if (current) current.textContent = String(step).padStart(2,'0');
      }

      if (world && worldStage) {
        const r = world.getBoundingClientRect();
        const total = Math.max(1, world.offsetHeight - vh);
        const p = Math.max(0, Math.min(1, -r.top / total));
        worldStage.style.setProperty('--world-p', p.toFixed(4));
        worldStage.style.setProperty('--world-main-z', (40 + p * 80).toFixed(2) + 'px');
        worldStage.style.setProperty('--world-side-x', (1 - p) * 180 + 'px');
        worldStage.style.setProperty('--world-tilt', ((.5 - p) * 10).toFixed(2) + 'deg');
      }

      if (cinema) {
        const r = cinema.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, 1 - Math.abs((r.top + r.height/2 - vh/2) / vh)));
        cinema.style.setProperty('--cinema-p', p.toFixed(4));
        cinema.style.setProperty('--cinema-phone-y', ((1-p) * 70).toFixed(2)+'px');
        cinema.style.setProperty('--cinema-float', ((1-p) * 34).toFixed(2)+'px');
      }

      if (portal) {
        const r = portal.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, 1 - Math.abs((r.top + r.height/2 - vh/2) / vh)));
        portal.style.setProperty('--portal-p', p.toFixed(4));
        portal.style.setProperty('--portal-spin', ((1-p) * 18).toFixed(2)+'deg');
      }

      if (impact) {
        const r = impact.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, 1 - Math.abs((r.top + r.height/2 - vh/2) / vh)));
        impact.style.setProperty('--impact-p', p.toFixed(4));
      }
    };

    const request = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', request, {passive:true});
    addEventListener('resize', request, {passive:true});
    update();
  }

  function ctaPopup() {
    if (mobileLite || $('.fx-modal-backdrop') || sessionStorage.getItem('respondoCtaSeen')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="fx-modal-backdrop" role="dialog" aria-modal="true" aria-label="RESPONDO AI kokeilu"><div class="fx-modal"><button class="fx-modal-close" aria-label="Sulje">×</button><div class="fx-modal-kicker">RESPONDO AI / 3 PÄIVÄÄ</div><h3>Kokeile, miltä Respondo näyttäisi omassa yrityksessäsi.</h3><p>Luo tili, lisää yrityksesi tiedot ja kokeile palvelua 3 päivää ilmaiseksi.</p><div class="fx-modal-actions"><a class="btn ink" href="/tilaus">Kokeile ilmaiseksi →</a><button class="btn ghost fx-modal-later" type="button">Ehkä myöhemmin</button></div></div></div>`);
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
    if (isWorkspacePage()) {
      prepareStaticWorkspace();
      assistant();
      window.addEventListener('respondo:languagechange', () => {
        document.querySelector('.fx-assistant-launch')?.remove();
        document.querySelector('.fx-assistant')?.remove();
        assistant();
      });
      return;
    }
    if (location.pathname === '/' && document.querySelector('.apple-home')) {
      assistant();
      window.addEventListener('respondo:languagechange', () => {
        document.querySelector('.fx-assistant-launch')?.remove();
        document.querySelector('.fx-assistant')?.remove();
        assistant();
      });
      return;
    }
    if (location.pathname === '/' && document.querySelector('.premium-home')) {
      leftSectionRail(); assistant();
      window.addEventListener('respondo:languagechange', () => {
        document.querySelector('.fx-assistant-launch')?.remove();
        document.querySelector('.fx-assistant')?.remove();
        assistant();
      });
      return;
    }
    injectBase();
    kineticNavigation();
    if (location.pathname === '/') {
      marquee(); decorateSections(); revealTargets(); tilts(); magneticButtons(); parallax(); premiumProductEffects(); leftSectionRail(); assistant(); ctaPopup(); cinematicSectionAtmosphere();
    } else {
      revealTargets(); magneticButtons(); assistant(); deepScrollExperience();
    }
  }

  let timer;
  // The server's noscript SEO shell precedes the asynchronously rendered app.
  const rendered = () => location.pathname === '/' ? Boolean($('#app .apple-home, #app .premium-home')) : Boolean($('#app')?.children.length);
  const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => { if (rendered()) { mo.disconnect(); init(); } }, 60); });
  if (rendered()) init(); else mo.observe($('#app') || document.documentElement, {childList:true,subtree:true});
})();
