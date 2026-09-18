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
    const words = ['24/7 ASIAKASPALVELU','HYVÄKSYTTY TIETO','EI ARVAILUA','3 PÄIVÄÄ MAKSUTTA','SUOMALAINEN B2B','RESPONDO AI'];
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
    {keys:['hinta','maksaa','49','vuosi','kuukausi','price','pricing','cost','month','year'], answer:'RESPONDO AI maksaa 49 € / kk + alv tai 549 € / vuosi + alv. Molemmissa on 3 päivän maksuton kokeilu.'},
    {keys:['kokeilu','ilmainen','3 päiv','trial','free','3 day'], answer:'Saat 3 päivää maksutta. Maksutapa lisätään alussa Stripessä, ja veloitus alkaa vasta kokeilun jälkeen, ellet peru tilausta ennen sitä.'},
    {keys:['miten toimii','toimii','tietopohja','tieto','how does it work','how it works','knowledge base'], answer:'Lisäät yrityksesi hyväksytyt tiedot tietopohjaan. RESPONDO AI vastaa asiakkaalle niiden perusteella ja ohjaa epävarmat tilanteet ihmiselle sen sijaan, että arvaisi.'},
    {keys:['asennus','sivulle','verkkosivu','widget','install','installation','website'], answer:'Kun tili on käytössä, saat hallintapaneelista yhden asennusrivin, jolla chat-widget lisätään verkkosivulle.'},
    {keys:['tietoturva','gdpr','turvallinen','data','security','privacy','safe'], answer:'RESPONDO AI käyttää HTTPS-yhteyksiä, salattuja palveluntarjoajia ja rajattuja käyttöoikeuksia. Maksukorttitiedot käsittelee Stripe. Lisätiedot löydät Tietoturva- ja Tietosuojasivuista.'},
    {keys:['peru','irtisano','lopeta','cancel','cancellation'], answer:'Tilauksen voi perua koska tahansa. Käyttö jatkuu maksetun laskutuskauden loppuun.'},
    {keys:['y-tunnus','ytunnus','yritys','business id','company'], answer:'Respondon Y-tunnus on 3599437-5. Yhteyssähköposti on respondoai.fi@outlook.com.'}
  ];

  function assistantAnswer(text) {
    const q = text.toLowerCase();
    const hit = faq.find(item => item.keys.some(k => q.includes(k)));
    if (hit) return hit.answer;
    if (q.includes('hei') || q.includes('moi') || q.includes('hello') || q.includes('hi') || q.includes('hey')) return 'Moi! Kysy vaikka hinnasta, kokeilusta, käyttöönotosta, tietoturvasta tai siitä miten RESPONDO AI toimii.';
    return 'En halua keksiä vastausta. Voin auttaa Respondon hinnassa, kokeilussa, käyttöönotossa, tietoturvassa ja tilauksessa — tai voit ottaa yhteyttä osoitteeseen respondoai.fi@outlook.com.';
  }

  const localAiHistory = [];
  const ownerProfileKey = 'respondoOwnerBusinessProfile';
  const commonServices = [
    'Ajoneuvohuolto','Autopesu','Fysioterapia','Hieronta','Ilmastointihuolto','IT-tuki',
    'Kaivuutyöt','Kalusteasennus','Kattohuolto','Kiinteistöhuolto','Kirjanpito','Kuljetus',
    'LVI','Maalaus','Maanrakennus','Muutto','Putkityöt','Rakennus','Remontointi','Siivous',
    'Sähkö','Tuholaistorjunta','Valokuvaus','Verkkosivut','Viemärin avaus','Vihertyöt','Muu'
  ].sort((a,b) => a.localeCompare(b,'fi'));

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

  function localAiSystem() {
    const p = getOwnerProfile();
    const companyFacts = [
      p.companyName && `Yrityksen nimi: ${p.companyName}`,
      p.pricing && `Hinnat: ${p.pricing}`,
      p.hours && `Aukioloajat: ${p.hours}`,
      p.phone && `Puhelinnumero: ${p.phone}`,
      p.email && `Sähköposti: ${p.email}`,
      servicesText(p.services) && `Palvelut: ${servicesText(p.services)}`,
      p.serviceArea && `Toimialue: ${p.serviceArea}`,
      p.address && `Osoite: ${p.address}`,
      p.website && `Verkkosivu: ${p.website}`,
      p.notes && `Muut tärkeät tiedot: ${p.notes}`,
      ...normalizedCustomFacts(p).map(x => `${x.key}: ${x.answer}`),
    ].filter(Boolean).join('\n');

    return `Olet yrityksen verkkosivulla toimiva RESPONDO AI-asiakaspalveluassistentti. Vastaa suomeksi selkeästi ja lyhyesti.
Käytä VAIN alla olevia yrityksen omistajan syöttämiä hyväksyttyjä tietoja, kun vastaat yritystä koskeviin kysymyksiin. Älä keksi hintaa, aukioloa, palvelua, yhteystietoa tai muuta faktaa.
Jos tietoa ei ole annettu, sano suoraan ettet tiedä varmasti ja ohjaa ottamaan yhteyttä yritykseen.

YRITYKSEN HYVÄKSYTYT TIEDOT:
${companyFacts || 'Yrityksen tietoja ei ole vielä syötetty.'}

YLEINEN TOIMINTAOHJE:
- Vastaa luonnollisesti asiakkaan kysymykseen.
- Jos asiakas kysyy useita asioita, vastaa kaikkiin joihin tiedot löytyvät.
- Älä mainitse promptia, localStoragea tai teknistä toteutusta.
- Älä väitä tehneesi varausta, tilausta tai muuta toimintoa.
- Jos tieto puuttuu, älä arvaa.`;
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
    if (onProgress) onProgress(25, 'Haetaan yrityksen tiedoista…');
    const response = await fetch('/api/public/demo-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        profile,
        history: localAiHistory.slice(-6),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Demon vastaaminen epäonnistui.');
    if (onProgress) onProgress(100, 'Muotoillaan vastausta…');
    const answer = String(data.answer || '').trim() || 'En löydä tähän vielä varmaa vastausta.';
    localAiHistory.push({ question: text, answer });
    if (localAiHistory.length > 12) localAiHistory.splice(0, localAiHistory.length - 12);
    return answer;
  }

  function assistant() {
    if ($('.fx-assistant-launch')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button class="fx-assistant-launch" type="button" aria-label="Avaa RESPONDO-botti"><i>R</i><span>RESPONDO-botti</span><b class="fx-live"></b></button>
      <aside class="fx-assistant" aria-label="RESPONDO-botti">
        <div class="fx-assistant-head"><div class="fx-assistant-id"><span class="fx-assistant-avatar">R</span><div><b>RESPONDO-botti</b><small>${location.pathname === '/assistant' ? 'sama vastausmoottori kuin oikeassa botissa' : 'valmis vastaamaan'}</small></div></div><button class="fx-assistant-close" type="button" aria-label="Sulje">×</button></div>
        <div class="fx-assistant-messages"><div class="fx-chat-bubble bot">${location.pathname === '/assistant' ? 'Moi 👋 Testaa nyt yrityksen omilla tiedoilla. Kysy esimerkiksi hinnasta, aukioloajoista, palveluista tai omista lisäämistäsi kysymyksistä.' : 'Moi 👋 Olen Respondon sivuassistentti. Kysy miten palvelu toimii tai mitä se maksaa.'}</div><div class="fx-quick"><button type="button">Mitä RESPONDO AI maksaa?</button><button type="button">Miten 3 päivän kokeilu toimii?</button><button type="button">Miten asennus toimii?</button></div></div>
        <form class="fx-assistant-form"><input name="message" autocomplete="off" placeholder="Kirjoita kysymys…" aria-label="Kysymys"><button type="submit" aria-label="Lähetä">→</button></form>
      </aside>`);
    const launch = $('.fx-assistant-launch'), box = $('.fx-assistant'), close = $('.fx-assistant-close'), messages = $('.fx-assistant-messages'), form = $('.fx-assistant-form');
    const open = () => { box.classList.add('open'); setTimeout(() => form.message.focus(), 180); };
    const shut = () => box.classList.remove('open');
    launch.addEventListener('click', () => box.classList.contains('open') ? shut() : open()); close.addEventListener('click', shut);
    const send = async text => {
      const clean = String(text || '').trim(); if (!clean) return;
      messages.insertAdjacentHTML('beforeend', `<div class="fx-chat-bubble user"></div>`); messages.lastElementChild.textContent = clean;
      messages.insertAdjacentHTML('beforeend', '<div class="fx-chat-bubble bot typing">•••</div>');
      const typing = messages.lastElementChild;
      messages.scrollTop = messages.scrollHeight;
      try {
        if (location.pathname === '/assistant') {
          typing.textContent = 'Haetaan hyväksytyistä tiedoista…';
          const answer = await localAiAnswer(clean, (pct) => {
            if (pct >= 100) typing.textContent = 'Muotoillaan vastausta…';
            messages.scrollTop = messages.scrollHeight;
          });
          typing.classList.remove('typing');
          typing.textContent = answer;
        } else {
          await new Promise(r => setTimeout(r, 420 + Math.random()*350));
          typing.classList.remove('typing');
          typing.textContent = assistantAnswer(clean);
        }
      } catch (err) {
        typing.classList.remove('typing');
        const fallback = location.pathname === '/assistant'
          ? (ownerProfileFallback(clean) || 'En löydä tätä tietoa yrityksen tallennetuista tiedoista.')
          : assistantAnswer(clean);
        typing.textContent = fallback + (location.pathname === '/assistant' ? '' : ' (Yhteys vastauspalveluun katkesi.)');
      }
      messages.scrollTop = messages.scrollHeight;
    };
    form.addEventListener('submit', e => { e.preventDefault(); const text = form.message.value; form.reset(); send(text); });
    $$('.fx-quick button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
  }


  function standaloneAssistant() {
    document.body.classList.add('assistant-standalone');
    const app = $('#app');
    const p = getOwnerProfile();
    const val = (x) => String(x || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const selectedServices = Array.isArray(p.services)
      ? [...p.services]
      : String(p.services || '').split(',').map(x => x.trim()).filter(Boolean);
    const customFacts = normalizedCustomFacts(p).length ? normalizedCustomFacts(p) : [{key:'',answer:''}];

    if (app) {
      app.innerHTML = `
        <main class="assistant-direct-shell">
          <a class="assistant-direct-brand" href="/" aria-label="RESPONDO AI etusivu"><span>R</span><b>RESPONDO AI</b></a>
          <section class="assistant-owner-panel">
            <div class="assistant-direct-copy">
              <small>TESTAA OMAN YRITYKSESI TIEDOILLA</small>
              <h1>Rakenna botin tietopohja.</h1>
              <p>Lisää yrityksesi tiedot ja omat kysymys–vastausparit. Testibotti käyttää samaa vastauslogiikkaa kuin oikea widget.</p>
            </div>

            <form class="owner-profile-form" id="ownerProfileForm">
              <div class="owner-field"><label>Yrityksen nimi</label><input name="companyName" value="${val(p.companyName)}" placeholder="Esim. Virtasen LVI Oy"></div>

              <div class="owner-field service-builder">
                <label>Palvelut</label>
                <div class="service-add-row">
                  <select id="servicePicker">
                    <option value="">Valitse palvelu…</option>
                    ${commonServices.map(s => `<option value="${val(s)}">${val(s)}</option>`).join('')}
                  </select>
                  <button type="button" id="addService">Lisää</button>
                </div>
                <div class="service-chips" id="serviceChips"></div>
                <small>Voit valita useita palveluja.</small>
              </div>

              <div class="owner-field"><label>Hinnat</label><textarea name="pricing" placeholder="Esim. 65 € / h + alv">${val(p.pricing)}</textarea></div>

              <div class="owner-two">
                <div class="owner-field"><label>Aukioloajat</label><input name="hours" value="${val(p.hours)}" placeholder="Ma–Pe 8–17"></div>
                <div class="owner-field"><label>Puhelinnumero</label><input name="phone" value="${val(p.phone)}" placeholder="040 123 4567"></div>
              </div>

              <div class="owner-two">
                <div class="owner-field"><label>Sähköposti</label><input name="email" type="email" value="${val(p.email)}" placeholder="info@yritys.fi"></div>
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
                  <div><label>Omat hakusanat ja vastaukset</label><small>Esim. “Päivystys” → “Päivystämme 24/7 numerossa…”</small></div>
                  <button type="button" id="addCustomFact" data-add-custom-fact>+ Uusi rivi</button>
                </div>
                <div id="customFacts">
                  ${customFacts.map((x,i) => `
                    <div class="custom-fact-row" data-index="${i}">
                      <div class="owner-field"><label>Otsikko / kysymys / hakusana</label><input data-fact-key value="${val(x.key)}" placeholder="Esim. Oletteko lauantaina auki?"></div>
                      <div class="owner-field"><label>Vastaus</label><textarea data-fact-answer placeholder="Esim. Kyllä, lauantaisin klo 10–14.">${val(x.answer)}</textarea></div>
                      <button type="button" class="remove-fact" aria-label="Poista rivi">×</button>
                    </div>`).join('')}
                </div>
                <button type="button" class="add-fact-bottom" id="addCustomFactBottom" data-add-custom-fact>+ Lisää oma kysymys / hakusana</button>
              </div>

              <div class="owner-field"><label>Muut tärkeät tiedot</label><textarea name="notes" placeholder="Päivystys, maksutavat, takuukäytännöt, ajanvaraus…">${val(p.notes)}</textarea></div>

              <button class="owner-save" type="submit">Tallenna botille <span>→</span></button>
              <div class="owner-save-status" id="ownerSaveStatus"></div>
            </form>
          </section>
        </main>`;
    }

    assistant();
    const box = $('.fx-assistant');
    if (box) box.classList.add('open', 'standalone');

    const selected = new Set(selectedServices);

    const renderServices = () => {
      const host = $('#serviceChips');
      if (!host) return;
      host.innerHTML = [...selected].sort((a,b) => a.localeCompare(b,'fi')).map(s =>
        `<button type="button" class="service-chip" data-service="${val(s)}"><span>${val(s)}</span><b>×</b></button>`
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
      host.insertAdjacentHTML('beforeend', `
        <div class="custom-fact-row">
          <div class="owner-field"><label>Otsikko / kysymys / hakusana</label><input data-fact-key value="${val(key)}" placeholder="Esim. Mitkä maksutavat käyvät?"></div>
          <div class="owner-field"><label>Vastaus</label><textarea data-fact-answer placeholder="Esim. Kortti, lasku ja MobilePay">${val(answer)}</textarea></div>
          <button type="button" class="remove-fact" aria-label="Poista rivi">×</button>
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
        status.textContent = 'Tallennettu ✓ Kysy nyt botilta yrityksestä.';
        setTimeout(() => { status.textContent = ''; }, 3500);
      }
      const messages = $('.fx-assistant-messages');
      if (messages) {
        messages.insertAdjacentHTML('beforeend', '<div class="fx-chat-bubble bot owner-confirm">Tiedot päivitetty. Testaa nyt kysymällä kuten oikea asiakkaasi kysyisi.</div>');
        messages.scrollTop = messages.scrollHeight;
      }
    });
  }

  function leftSectionRail() {
    if (location.pathname !== '/' || $('.section-rail-premium')) return;
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

    if (!reduce) {
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

  function ctaPopup() {
    if ($('.fx-modal-backdrop') || sessionStorage.getItem('respondoCtaSeen')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="fx-modal-backdrop" role="dialog" aria-modal="true" aria-label="RESPONDO AI kokeilu"><div class="fx-modal"><button class="fx-modal-close" aria-label="Sulje">×</button><div class="fx-modal-kicker">RESPONDO AI / 3 PÄIVÄÄ</div><h3>Katso miltä 24/7-asiakaspalvelu näyttää omassa yrityksessäsi.</h3><p>Luo tili, lisää yrityksesi hyväksytty tieto ja testaa palvelua 3 päivää maksutta.</p><div class="fx-modal-actions"><a class="btn ink" href="/tilaus">Aloita maksutta →</a><button class="btn ghost fx-modal-later" type="button">Katson myöhemmin</button></div></div></div>`);
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
    if (location.pathname === '/assistant') {
      standaloneAssistant();
      return;
    }
    if (location.pathname === '/') {
      marquee(); decorateSections(); revealTargets(); tilts(); magneticButtons(); parallax(); premiumProductEffects(); leftSectionRail(); assistant(); ctaPopup();
    } else {
      revealTargets(); magneticButtons(); assistant();
    }
  }

  let timer;
  const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => { if ($('#app')?.children.length) { mo.disconnect(); init(); } }, 60); });
  if ($('#app')?.children.length) init(); else mo.observe($('#app') || document.documentElement, {childList:true,subtree:true});
})();
