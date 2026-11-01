(() => {
  const script = document.currentScript;
  const company = script?.dataset?.company;
  if (!company) return;
  // Google Sites embeds receive an installation identifier owned by this
  // specific Respondo tenant. The iframe's random Google hostname is not
  // treated as a stable license identity.
  const googleSitesKey = String(script?.dataset?.sitesKey || '').trim();

  const serviceOrigin = new URL(script.src).origin;
  const side = script.dataset.side === 'left' ? 'left' : 'right';
  const fallbackAccent = script.dataset.accent || '#111113';
  const normalizeLang = (value) => {
    const lang = String(value || '').toLowerCase().split('-')[0];
    return ['fi','sv','en'].includes(lang) ? lang : 'fi';
  };
  const requestedLang = String(script.dataset.lang || 'auto').toLowerCase();
  const storedLang = (() => { try { return localStorage.getItem('respondo_lang') || ''; } catch { return ''; } })();
  const rawPageLang = String(document.documentElement.lang || '').toLowerCase().split('-')[0];
  const pageLang = ['fi','sv','en'].includes(rawPageLang) ? rawPageLang : '';
  // The actual page language is authoritative when it is explicitly Finnish,
  // Swedish or English. If the host page does not declare a supported language,
  // fall back to the embed setting / saved browser language instead of silently
  // forcing Finnish.
  const widgetLang = pageLang
    ? pageLang
    : requestedLang === 'auto'
      ? normalizeLang(storedLang || navigator.language)
      : normalizeLang(requestedLang);
  const SV_WIDGET = new Map(Object.entries({
    'Tarkista':'Kontrollera','Ei vapaita aikoja juuri nyt':'Inga lediga tider just nu','Valitse vapaa aika':'Välj en ledig tid',
    'Lähetetään…':'Skickar…','Pyyntö vastaanotettu':'Begäran mottagen','Kiitos — yhteystiedot on lähetetty ✓':'Tack — dina kontaktuppgifter har skickats ✓',
    'Lähetetty ✓':'Skickat ✓','Lähetys ei onnistunut. Yritä uudelleen.':'Det gick inte att skicka. Försök igen.','Pyydä yhteydenottoa':'Be om kontakt',
    'Asiakaspalvelija mukana':'Kundtjänstmedarbetare ansluten','Valmis auttamaan':'Redo att hjälpa','Asiakaspalvelija: ':'Kundtjänst: ','paikalla':'online',
    'Hei! Miten voin auttaa?':'Hej! Hur kan jag hjälpa?','Chat ei ole käytössä tällä verkkosivulla.':'Chatten är inte tillgänglig på den här webbplatsen.',
    'En löytänyt tähän varmaa vastausta.':'Jag hittade inget säkert svar på detta.','Varmennettu yrityksen tiedoista':'Verifierat från företagets information',
    'Nimi':'Namn','Sähköposti tai puhelin':'E-post eller telefon','Viesti':'Meddelande','Lähetä':'Skicka','Sulje':'Stäng',
    'Sähköposti':'E-post','Puhelin':'Telefon','Valitse aika':'Välj tid','Valitse toimipiste':'Välj butik','Hae toimipistettä':'Sök butik','Toimipistettä ei löydy':'Ingen matchande butik','Varaa':'Boka','Lähetä tarjouspyyntö':'Skicka offertförfrågan'
  }));
  const EXTRA_SV_WIDGET = {
    'Hyväksyn yhteystietojeni lähettämisen yritykselle yhteydenottoa varten.': 'Jag godkänner att mina kontaktuppgifter skickas till företaget för denna kontaktförfrågan.',
  "Respondon asiakaspalvelu": "Respondos kundservice",
  "Paikalla nyt": "Online nu",
  "Yhdistetään…": "Ansluter…",
  "Kysy jotain…": "Skriv din fråga…",
  "Kirjoita kysymyksesi": "Skriv din fråga",
  "Kysy meiltä": "Fråga oss",
  "Avaa chat": "Öppna chatten",
  "Ei käytettävissä": "Inte tillgänglig",
  "Laske tarjous tästä": "Beräkna offert här",
  "Kerro määrä ja mitä tarvitset. Jos yritys on määrittänyt hintakaavan, Respondo laskee hinnan heti.": "Ange mängden och vad du behöver. Om företaget har angett en prisformel räknar Respondo ut priset direkt.",
  "Puhelin tai sähköposti": "Telefon eller e-post",
  "Määrä": "Antal",
  "Mitä tarvitset?": "Vad behöver du?",
  "Budjetti, jos tiedossa": "Budget, om känd",
  "Laske ja lähetä tarjouspyyntö": "Beräkna och skicka offertförfrågan",
  "Varaa vapaa aika": "Boka en ledig tid",
  "Respondo näyttää vain oikeasti vapaat ajat. Valittu aika poistuu heti muiden varattavista.": "Respondo visar bara tider som faktiskt är lediga. När en tid bokas försvinner den direkt för andra.",
  "Haetaan vapaita aikoja…": "Hämtar lediga tider…",
  "Lisätieto": "Ytterligare information",
  "Varaa aika": "Boka tid",
  "Tarkista tilauksen tila": "Kontrollera orderstatus",
  "Anna tilausnumero ja tilauksessa käytetty sähköposti.": "Ange ordernumret och e-postadressen som användes för beställningen.",
  "Tilausnumero": "Ordernummer",
  "Vapaita aikoja ei saatu ladattua": "Lediga tider kunde inte laddas",
  "Tarjous": "Offert",
  "ALV 0 %": "Moms 0 %",
  "Maksa / hyväksy tarjous →": "Betala / godkänn offert →",
  "Yritys ei ole vielä yhdistänyt maksutiliä. Tarjouspyyntö on silti lähetetty.": "Företaget har ännu inte anslutit ett betalkonto. Offertförfrågan skickades ändå.",
  "Aika varattu": "Tid bokad",
  "Valmis ✓": "Klart ✓",
  "Lähetys epäonnistui.": "Det gick inte att skicka.",
  "Haluatko, että joku yrityksestä ottaa sinuun yhteyttä?": "Vill du att någon från företaget kontaktar dig?",
  "Jätä nimesi ja puhelinnumerosi tai sähköpostisi. Tiedot menevät vain tälle yritykselle yhteydenottoa varten.": "Lämna ditt namn och telefonnummer eller din e-postadress. Uppgifterna delas endast med detta företag för att de ska kunna kontakta dig.",
  "Nimi, jos haluat": "Namn, om du vill",
  "Puhelinnumero tai sähköposti": "Telefonnummer eller e-post",
  "Tätä chattia ei ole vielä otettu käyttöön tällä verkkosivulla.": "Den här chatten har ännu inte aktiverats på denna webbplats.",
  "Katso tuote →": "Visa produkt →",
  "Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.": "Det gick inte att få ett svar just nu. Försök igen om en stund."
};
  Object.entries(EXTRA_SV_WIDGET).forEach(([fi,sv]) => SV_WIDGET.set(fi,sv));
  function t(fi, en) {
    if (widgetLang === 'en') return en || fi;
    if (widgetLang === 'sv') return SV_WIDGET.get(fi) || fi;
    return fi;
  }

  const ROBOT_AVATARS = [
    ['robot-1','#111114','#ffffff','#63e6a5'],
    ['robot-2','#172554','#dbeafe','#60a5fa'],
    ['robot-3','#3f1d58','#f3e8ff','#d8b4fe'],
    ['robot-4','#3b2417','#fff7ed','#fb923c'],
    ['robot-5','#123b35','#ecfdf5','#5eead4'],
    ['robot-6','#292524','#fafaf9','#facc15'],
    ['robot-7','#3f1722','#fff1f2','#fb7185'],
    ['robot-8','#182235','#f8fafc','#a5b4fc'],
    ['robot-9','#26331d','#f7fee7','#a3e635'],
    ['robot-10','#27272a','#fafafa','#e4e4e7'],
  ].map(([id,bg,face,accent],i) => ({ id,bg,face,accent,i }));

  function widgetAvatarMarkup(value) {
    const raw = String(value || 'robot-1');
    if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(raw)) {
      return '<img src="' + raw.replace(/"/g,'&quot;') + '" alt="">';
    }
    const p = ROBOT_AVATARS.find((x) => x.id === raw) || ROBOT_AVATARS[0];
    const v = p.i % 5;
    const eyes = v === 0
      ? '<circle cx="24" cy="31" r="3.2"/><circle cx="40" cy="31" r="3.2"/>'
      : v === 1
        ? '<rect x="20" y="28" width="8" height="5" rx="2.5"/><rect x="36" y="28" width="8" height="5" rx="2.5"/>'
        : v === 2
          ? '<path d="M20 31h8M36 31h8" stroke-width="4" stroke-linecap="round"/>'
          : v === 3
            ? '<circle cx="24" cy="31" r="2.4"/><circle cx="40" cy="31" r="2.4"/><circle cx="24" cy="31" r="5.2" fill="none" stroke-width="1.5"/><circle cx="40" cy="31" r="5.2" fill="none" stroke-width="1.5"/>'
            : '<path d="M20 30l4-2 4 2M36 30l4-2 4 2" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    const mouth = p.i % 3 === 0
      ? '<rect x="25" y="40" width="14" height="4" rx="2"/>'
      : p.i % 3 === 1
        ? '<path d="M25 40c4 5 10 5 14 0" fill="none" stroke-width="2.5" stroke-linecap="round"/>'
        : '<circle cx="32" cy="41" r="3" fill="none" stroke-width="2"/>';
    const antenna = p.i % 2 === 0
      ? '<path d="M32 17v-6" stroke="' + p.accent + '" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="9" r="3" fill="' + p.accent + '"/>'
      : '<path d="M24 17l-4-5M40 17l4-5" stroke="' + p.accent + '" stroke-width="3" stroke-linecap="round"/><circle cx="19" cy="11" r="2.5" fill="' + p.accent + '"/><circle cx="45" cy="11" r="2.5" fill="' + p.accent + '"/>';
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<rect width="64" height="64" rx="18" fill="' + p.bg + '"/>' +
      antenna +
      '<rect x="13" y="17" width="38" height="35" rx="12" fill="' + p.face + '"/>' +
      '<g fill="' + p.bg + '" stroke="' + p.bg + '">' + eyes + mouth + '</g>' +
      '<rect x="9" y="28" width="5" height="13" rx="2.5" fill="' + p.accent + '"/>' +
      '<rect x="50" y="28" width="5" height="13" rx="2.5" fill="' + p.accent + '"/>' +
      '</svg>';
  }

  const root = document.createElement('div');
  root.id = 'respondo-ai-widget';
  Object.assign(root.style, {
    position: 'fixed',
    zIndex: '2147483646',
    bottom: '18px',
    [side]: '18px',
  });
  document.body.appendChild(root);

  const shadow = root.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      *{box-sizing:border-box}
      :host{all:initial}
      .wrap{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif;color:#111113}
      .panel{width:min(410px,calc(100vw - 24px));height:min(640px,calc(100vh - 92px));background:#fff;border:1px solid rgba(0,0,0,.11);border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.24);overflow:hidden;display:none;flex-direction:column;margin-bottom:10px}
      .panel.open{display:flex}
      .head{padding:17px 18px;border-bottom:1px solid #e7e7e9;display:flex;align-items:center;gap:11px;background:#fff}
      .mark{width:34px;height:34px;border-radius:10px;overflow:hidden;display:grid;place-items:center;flex:0 0 auto}.mark svg,.mark img{display:block;width:34px;height:34px;object-fit:contain}
      .headcopy{min-width:0;flex:1}
      .headcopy b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .headcopy small{display:flex;align-items:center;gap:6px;color:#707075;font-size:11px;margin-top:2px}
      .dot{width:7px;height:7px;border-radius:50%;background:#111113;display:inline-block}
      .chat{padding:18px;overflow:auto;flex:1;background:#f7f7f8;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
      .msg{white-space:pre-line;max-width:86%;padding:11px 13px;border-radius:15px;font-size:14px;line-height:1.45;word-break:break-word}
      .bot{align-self:flex-start;background:#fff;border:1px solid #e3e3e6}
      .user{align-self:flex-end;background:var(--bot-accent,#111113);color:var(--bot-accent-ink,#fff)}
      .msg a{color:inherit;text-decoration:underline;text-underline-offset:2px}
      .composer{padding:12px;border-top:1px solid #e7e7e9;background:#fff;display:flex;gap:8px}
      .composer input{min-width:0;flex:1;border:1px solid #d9d9dc;border-radius:12px;padding:12px 13px;font:inherit;font-size:14px;outline:none}
      .composer input:focus{border-color:var(--bot-accent,#111113)}
      .composer button{width:44px;border:0;border-radius:12px;background:var(--bot-accent,#111113);color:var(--bot-accent-ink,#fff);font-size:18px;font-weight:800;cursor:pointer}
      /* The collapsed widget is the customer's own bot identity, not a generic CTA. */
      .launcher{appearance:none;max-width:min(290px,calc(100vw - 36px));min-height:66px;border:1px solid rgba(20,22,24,.10);border-radius:20px;padding:9px 13px 9px 9px;background:#fff;color:#18191c;cursor:pointer;box-shadow:0 14px 42px rgba(12,16,20,.19),0 2px 10px rgba(12,16,20,.08);display:flex;align-items:center;gap:11px;text-align:left;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
      .launcher:hover{transform:translateY(-2px);box-shadow:0 18px 46px rgba(12,16,20,.22),0 3px 12px rgba(12,16,20,.08);border-color:rgba(20,22,24,.18)}
      .launcher:focus-visible{outline:3px solid var(--bot-accent,#111113);outline-offset:3px}
      .launcher-avatar{width:46px;height:46px;border-radius:14px;position:relative;flex:0 0 46px;background:#f3f3f4;display:grid;place-items:center;overflow:visible}
      .launcher-avatar svg,.launcher-avatar img{display:block;width:46px;height:46px;border-radius:14px;object-fit:contain}
      .launcher-online{position:absolute;right:-3px;bottom:-3px;width:12px;height:12px;background:#22a366;border:2px solid #fff;border-radius:50%;display:none}
      .launcher.ready .launcher-online{display:block}
      .launcher-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
      .launcher-name{font-size:13px;font-weight:780;line-height:1.2;color:#17191c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .launcher-subtitle{font-size:11px;color:#6d7076;font-weight:500;line-height:1.3;white-space:nowrap}
      .launcher-close{display:none;align-items:center;justify-content:center;flex:0 0 22px;color:#7a7c82;font-size:22px;line-height:1}
      .launcher[aria-expanded="true"] .launcher-close{display:flex}
      @media(prefers-reduced-motion:reduce){.launcher{transition:none}.launcher:hover{transform:none}}
      .status{font-size:12px;color:#77777c;text-align:center;padding:7px 12px;background:#fff}.status.ready{display:none}
      .error{color:#8b2d2d}
      .quick{display:flex;gap:7px;flex-wrap:wrap;padding:0 16px 12px;background:#f7f7f8}
      .quick:empty{display:none}
      .quick button{position:relative;z-index:2;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border:1px solid #dedee2;background:#fff;border-radius:999px;padding:8px 10px;font:inherit;font-size:12px;color:#343438;cursor:pointer}
      .quick button:hover{border-color:#a9a9af}
      .product-results{display:grid;gap:9px;align-self:stretch;min-width:0}
      .product-card{display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:16px;background:#fff;border:1px solid #e3e3e7;color:#1b1b1f!important;text-decoration:none!important;min-width:0}
      .product-card:hover,.product-card:focus-visible{border-color:#aaa;box-shadow:0 4px 16px #0001;outline:none}
      .product-image{height:80px;width:80px;flex:0 0 80px;object-fit:contain;border-radius:10px;background:#f3f3f5}
      .product-image-fallback{display:grid;place-items:center;color:#999;font-size:23px}
      .product-details{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
      .product-name{font-size:13px;font-weight:800;line-height:1.35;overflow-wrap:anywhere}
      .product-description{font-size:12px;line-height:1.4;color:#62626b;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
      .product-price{font-size:14px;font-weight:800;margin-top:1px}
      .product-open{font-size:11px;font-weight:750;color:#4e4e59}
      .branch-choices{display:grid;gap:8px;align-self:stretch;min-width:0;padding:4px 0}
      .branch-choices input{width:100%;border:1px solid #c5d2e1;border-radius:10px;padding:10px 12px;font:inherit;font-size:13px;color:#1b2b43;background:#fff}
      .branch-choice-list{display:flex;gap:8px;flex-wrap:wrap;max-height:165px;overflow-y:auto}
      .branch-choice-list small{color:#677387;font-size:12px}

      .branch-choices button{appearance:none;border:1px solid #c5d2e1;background:#fff;color:#162b48;border-radius:12px;padding:10px 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:42px}
      .branch-choices button:hover{background:#eef5ff;border-color:#7198c9}
      .branch-choices button:focus-visible{outline:3px solid #3484df;outline-offset:2px}
      .actions{display:flex;gap:7px;flex-wrap:wrap;align-self:flex-start;max-width:92%}
      .actions a,.actions button{display:inline-flex;align-items:center;gap:6px;border:1px solid #d6d6da;background:#fff;color:#111113;text-decoration:none;border-radius:10px;padding:9px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
      .leadbox{align-self:stretch;background:#fff;border:1px solid #dedee2;border-radius:16px;padding:13px;display:grid;gap:8px}
      .leadbox b{font-size:13px}.leadbox small{font-size:11px;color:#73737a;line-height:1.4}
      .leadbox input{width:100%;border:1px solid #d9d9dc;border-radius:10px;padding:10px 11px;font:inherit;font-size:13px;outline:none}
      .leadbox input:focus{border-color:#111113}
      .leadbox button{border:0;border-radius:10px;padding:10px 12px;background:var(--bot-accent,#111113);color:var(--bot-accent-ink,#fff);font:inherit;font-size:13px;font-weight:800;cursor:pointer}
      .leadbox .lead-ok{font-size:12px;color:#246b45}
      .mainio-form{gap:10px}.mainio-step{border:0;margin:0;padding:0;display:grid;gap:9px;min-width:0}
      .mainio-step[hidden]{display:none}.mainio-step legend{font-size:13px;font-weight:800;margin-bottom:9px}
      .mainio-form label{font-size:12px;line-height:1.45;color:#282832;display:block;font-weight:650}
      .mainio-form input,.mainio-form select,.mainio-form textarea{display:block;width:100%;border:1px solid #d9d9dc;border-radius:10px;padding:10px 11px;margin-top:5px;font:inherit;font-size:13px;color:#111113;background:#fff}
      .mainio-form .mainio-consent{display:flex;align-items:flex-start;gap:8px}.mainio-form .mainio-consent input{width:auto;margin-top:3px}
      .mainio-nav{display:flex;gap:8px;justify-content:flex-end}.mainio-nav button{flex:1}.mainio-form .mainio-info{font-size:11px;line-height:1.5;color:#565b69}
      .mainio-form .mainio-error{color:#a42323;font-size:12px}.mainio-form .mainio-success{font-size:12px;color:#136a3d}
      .actionbox{align-self:stretch;background:#fff;border:1px solid #dedee2;border-radius:16px;padding:13px;display:grid;gap:8px}
      .actionbox b{font-size:13px}.actionbox small{font-size:11px;color:#73737a;line-height:1.4}
      .actionbox input,.actionbox textarea{width:100%;border:1px solid #d9d9dc;border-radius:10px;padding:10px 11px;font:inherit;font-size:13px;outline:none;background:#fff;color:#111113}
      .actionbox textarea{min-height:72px;resize:vertical}
      .actionbox input:focus,.actionbox textarea:focus{border-color:#111113}
      .actionbox button{border:0;border-radius:10px;padding:10px 12px;background:var(--bot-accent,#111113);color:var(--bot-accent-ink,#fff);font:inherit;font-size:13px;font-weight:800;cursor:pointer}
      .actionbox .action-ok{font-size:12px;color:#246b45;line-height:1.4}
      .actionbox select{width:100%;border:1px solid #d9d9dc;border-radius:10px;padding:10px 11px;font:inherit;font-size:13px;outline:none;background:#fff;color:#111113}
      .actionbox select:focus{border-color:#111113}
      .action-confirmed{font-size:12px;font-weight:750;color:#246b45;margin-top:2px}
      .quote-result{display:grid;gap:2px;margin-top:8px;padding:12px;border-radius:12px;background:#f6f6f7;color:#111113}
      .quote-result small{font-size:10px;color:#77777d}.quote-result strong{font-size:24px;letter-spacing:-.04em}.quote-result span{font-size:10px;color:#77777d}
      .action-pay{display:flex;justify-content:center;margin-top:8px;border-radius:10px;padding:11px 12px;background:var(--bot-accent,#111113);color:var(--bot-accent-ink,#fff)!important;text-decoration:none!important;font-size:12px;font-weight:850}
      .action-pay-note{display:block;margin-top:7px;color:#77777d!important}
      .booking-confirmed{display:grid;gap:3px;margin-top:8px;padding:11px;border-radius:12px;background:#f2fbf6;color:#174c31}
      .booking-confirmed strong{font-size:12px}.booking-confirmed span{font-size:11px}
      .truth-note{align-self:flex-start;margin:-4px 0 2px 4px;color:#6f7772;font-size:10px;font-weight:700}.truth-note span{color:#2f9b63}
      .typing-dots{display:inline-flex;gap:4px;align-items:center;height:14px}
      .typing-dots i{width:5px;height:5px;border-radius:50%;background:#77777c;animation:rblink 1s infinite ease-in-out}
      .typing-dots i:nth-child(2){animation-delay:.15s}.typing-dots i:nth-child(3){animation-delay:.3s}
      @keyframes rblink{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
      .powered{padding:0 12px 10px;text-align:center;background:#fff;color:#9a9aa0;font-size:10px;letter-spacing:.02em}
      /* iOS Safari: preserve viewport scale when keyboard opens. */
      @media(max-width:1024px), (hover:none) and (pointer:coarse){
        .composer input,.leadbox input,.actionbox input,.actionbox textarea,.actionbox select{font-size:16px!important}
      }
      @media(max-width:520px){
        .panel{width:calc(100vw - 12px);height:calc(100dvh - 72px);border-radius:20px}
      }
    </style>
    <div class="wrap">
      <section class="panel" id="respondo-chat-panel" aria-label="${t('Respondon asiakaspalvelu', 'RESPONDO AI customer service')}">
        <header class="head">
          <div class="mark" aria-hidden="true">${widgetAvatarMarkup('robot-1')}</div>
          <div class="headcopy"><b id="name">RESPONDO AI</b><small><span class="dot"></span> ${t('Paikalla nyt', 'Online now')}</small></div>
        </header>
        <div class="chat" id="chat"></div>
        <div class="quick" id="quick"></div>
        <div class="status" id="status">${t('Yhdistetään…', 'Connecting…')}</div>
        <form class="composer" id="form">
          <input id="input" autocomplete="off" placeholder="${t('Kysy jotain…', 'Type your question…')}" aria-label="${t('Kirjoita kysymyksesi', 'Type your question')}">
          <button type="submit" aria-label="${t('Lähetä', 'Send')}">→</button>
        </form>
        <div class="powered">RESPONDO AI</div>
      </section>
      <button class="launcher" id="launcher" type="button" aria-controls="respondo-chat-panel" aria-expanded="false" aria-label="${t('Avaa chat', 'Open chat')}">
        <span class="launcher-avatar" aria-hidden="true">${widgetAvatarMarkup('robot-1')}<span class="launcher-online"></span></span>
        <span class="launcher-copy"><span class="launcher-name">RESPONDO AI</span><span class="launcher-subtitle">${t('Yhdistetään…', 'Connecting…')}</span></span>
        <span class="launcher-close" aria-hidden="true">×</span>
      </button>
    </div>`;

  const $ = (q) => shadow.querySelector(q);
  const panel = $('.panel');
  const launcher = $('#launcher');
  const chat = $('#chat');
  const status = $('#status');
  const form = $('#form');
  const input = $('#input');
  const name = $('#name');
  const mark = $('.mark');
  const quick = $('#quick');
  const launcherAvatar = $('.launcher-avatar');
  const launcherName = $('.launcher-name');
  const launcherSubtitle = $('.launcher-subtitle');

  let token = '';
  let ready = false;
  let visitorRef = '';
  let livePollAfter = '';
  let livePollTimer = null;
  const pageContext = {
    url: String(window.location.href || '').slice(0, 1000),
    title: String(document.title || '').slice(0, 300),
    path: String(window.location.pathname || '').slice(0, 500),
  };

  try {
    const key = 'respondo-visitor-' + company;
    visitorRef = sessionStorage.getItem(key) || crypto.randomUUID();
    sessionStorage.setItem(key, visitorRef);
  } catch {
    visitorRef = String(Date.now()) + Math.random().toString(36).slice(2);
  }

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[m]);

  const linkify = (value) =>
    escapeHtml(value).replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

  function addMessage(text, who = 'bot') {
    const el = document.createElement('div');
    el.className = 'msg ' + who;
    if (who === 'bot') el.innerHTML = linkify(text);
    else el.textContent = text;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
  }

  function safeActionUrl(value) {
    const url = String(value || '').trim();
    return /^(https?:\/\/|tel:|mailto:)/i.test(url) ? url : '';
  }

  function trackAction(action) {
    try {
      fetch(serviceOrigin + '/api/public/' + encodeURIComponent(company) + '/action-event', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          actionType: action.type || 'link',
          label: action.label,
          target: action.url || '',
          widgetToken: token,
          visitorRef,
          pageContext,
        }),
      }).catch(() => {});
    } catch {}
  }

  function renderActions(actions = [], question = '') {
    const valid = (Array.isArray(actions) ? actions : [])
      .filter((x) => x?.label && (
        safeActionUrl(x?.url) ||
        ['lead','contact_form','quote_form','booking_form','order_form','mainio_move_form'].includes(x?.mode)
      ))
      .slice(0, 4);
    if (!valid.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'actions';

    valid.forEach((action) => {
      if (action.mode === 'mainio_move_form') {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label + ' →';
        button.addEventListener('click', () => {
          trackAction(action);
          showMainioMovingForm(question);
        });
        wrap.appendChild(button);
        return;
      }
      if (action.mode === 'lead' || action.mode === 'contact_form') {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label + ' →';
        button.addEventListener('click', () => {
          trackAction(action);
          showLeadForm(question);
        });
        wrap.appendChild(button);
        return;
      }

      if (['quote_form','booking_form','order_form'].includes(action.mode)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label + ' →';
        button.addEventListener('click', () => {
          trackAction(action);
          showActionForm(action, question);
        });
        wrap.appendChild(button);
        return;
      }

      const a = document.createElement('a');
      a.href = safeActionUrl(action.url);
      a.textContent = action.label + ' →';
      if (/^https?:\/\//i.test(a.href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      a.addEventListener('click', () => trackAction(action));
      wrap.appendChild(a);
    });

    chat.appendChild(wrap);
  }

  function renderBranchChoices(items = []) {
    const names=(Array.isArray(items)?items:[]).filter(name=>
      typeof name==='string' && name.length>=2 && name.length<=65
    ).slice(0,1000);
    if(!names.length)return;
    const wrap=document.createElement('div');
    wrap.className='branch-choices';
    wrap.setAttribute('role','group');
    wrap.setAttribute('aria-label',t('Valitse toimipiste','Select a location'));
    const list=document.createElement('div');
    list.className='branch-choice-list';
    const draw=(query='')=>{
      list.replaceChildren();
      const needle=String(query).toLocaleLowerCase();
      const filtered=names.filter(name=>name.toLocaleLowerCase().includes(needle));
      for(const name of filtered.slice(0,18)){
        const button=document.createElement('button');
        button.type='button';button.textContent=name;
        button.addEventListener('click',()=>{
          wrap.querySelectorAll('button').forEach(b=>{b.disabled=true;});
          sendMessage(name);
        });
        list.appendChild(button);
      }
      if(!filtered.length){
        const empty=document.createElement('small');
        empty.textContent=t('Toimipistettä ei löydy','No matching location');
        list.appendChild(empty);
      }
    };
    if(names.length>12){
      const search=document.createElement('input');
      search.type='search';search.autocomplete='off';
      search.placeholder=t('Hae toimipistettä','Search locations');
      search.setAttribute('aria-label',search.placeholder);
      search.addEventListener('input',()=>draw(search.value));
      wrap.appendChild(search);
    }
    wrap.appendChild(list);
    draw();
    chat.appendChild(wrap);
  }

  function renderProducts(items = []) {
    const valid=(Array.isArray(items)?items:[])
      .filter((p)=>p?.name && /^https?:\/\//i.test(safeActionUrl(p.url))).slice(0,4);
    if(!valid.length) return false;
    const wrap=document.createElement('div');
    wrap.className='product-results';
    const locale=widgetLang==='sv'?'sv-SE':widgetLang==='en'?'en-US':'fi-FI';
    function formatPrice(value,currency){
      if(!Number.isFinite(value)) return '';
      const code=currency==='€'?'EUR':currency==='$'?'USD':currency==='£'?'GBP':currency;
      try {if(/^[A-Z]{3}$/.test(code||'')) return new Intl.NumberFormat(locale,{style:'currency',currency:code}).format(value);} catch {}
      return new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(value);
    }
    for(const item of valid){
      const card=document.createElement('a');
      card.className='product-card'; card.href=item.url;card.target='_blank';card.rel='noopener noreferrer';
      const image=document.createElement(item.imageUrl&&/^https?:\/\//i.test(item.imageUrl)?'img':'span');
      image.className='product-image'+(image.tagName==='SPAN'?' product-image-fallback':'');
      if(image.tagName==='IMG'){
        image.src=item.imageUrl;image.alt=item.name;image.loading='lazy';
        image.addEventListener('error',()=>{
          const fallback=document.createElement('span');fallback.className='product-image product-image-fallback';fallback.textContent='◻';
          image.replaceWith(fallback);
        },{once:true});
      }else image.textContent='◻';
      const details=document.createElement('span');details.className='product-details';
      const title=document.createElement('strong');title.className='product-name';title.textContent=item.name;
      details.appendChild(title);
      if(item.description){
        const description=document.createElement('span');description.className='product-description';
        description.textContent=item.description;details.appendChild(description);
      }
      if(Number.isFinite(item.price)){
        const price=document.createElement('strong');price.className='product-price';
        price.textContent=formatPrice(item.price,item.currency)+
          (Number.isFinite(item.maxPrice)&&item.maxPrice>item.price?' – '+formatPrice(item.maxPrice,item.currency):'');
        details.appendChild(price);
      }
      const cta=document.createElement('span');cta.className='product-open';
      cta.textContent=t('Katso tuote →','View product →');details.appendChild(cta);
      card.append(image,details);
      card.addEventListener('click',()=>trackAction({type:'product',label:item.name,url:item.url}));
      wrap.appendChild(card);
    }
    chat.appendChild(wrap);
    return true;
  }

  function renderQuickReplies(items = []) {
    quick.innerHTML = '';
    (Array.isArray(items) ? items : []).slice(0, 3).forEach((label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.quickReply = String(label || '');
      const submitQuickReply = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        const value = String(button.dataset.quickReply || button.textContent || '').trim();
        if (!value || button.disabled) return;
        button.disabled = true;
        Promise.resolve(sendMessage(value)).finally(() => { button.disabled = false; });
      };
      // iOS Safari can occasionally swallow the synthetic click on controls
      // inside a fixed Shadow DOM panel after scrolling. touchend guarantees
      // the tap is handled; click remains the desktop/accessibility fallback.
      button.addEventListener('touchend', submitQuickReply, { passive:false });
      button.addEventListener('click', (event) => {
        if (event.detail === 0 || !('ontouchstart' in window)) submitQuickReply(event);
      });
      quick.appendChild(button);
    });
  }


  // Mainio's publicly documented moving enquiry: the customer enters facts
  // and explicitly consents, then Mainio's staff approves or rejects the
  // request. Never calculate a move price or reserve a date in this form.
  function showMainioMovingForm(question='') {
    if(chat.querySelector('.actionbox'))return;
    const M={
      fi:{
        heading:'Muuttokartoitus · tarjouspyyntö',intro:'Kerro muutostasi. Mainio tarkistaa tiedot ja vahvistaa hinnan sekä ajankohdan erikseen.',
        steps:['Muuton perustiedot','Lähtöpaikka','Kohdepaikka','Laatikot ja lisätiedot','Yhteystiedot ja hyväksyntä'],
        type:'Muuton tyyppi',date:'Toivottu muuttopäivä',size:'Asunnon tai toimitilan koko (m²)',people:'Asukkaiden määrä (valinnainen)',
        street:'Katuosoite ja talonumero',city:'Postitoimipaikka',housing:'Kiinteistön tyyppi',floor:'Kerros, jos kerrostalo',
        elevator:'Onko hissi?',parking:'Saako muuttoauton oven eteen?',ownBoxes:'Onko omia muuttolaatikoita?',
        requestedBoxes:'Kuinka monta vuokralaatikkoa toivot? (valinnainen)',carrying:'Tarvitsetko kantoapua?',
        packing:'Tarvitsetko pakkausapua?',storage:'Tarvitsetko varastointia?',special:'Suuret, painavat tai erityiset tavarat (esim. piano)',
        notes:'Muut lisätiedot / kantomatkat',name:'Nimi',contact:'Puhelinnumero tai sähköposti',
        consent:'Hyväksyn, että antamani tiedot lähetetään Mainio Muuttopalvelulle tarjouspyynnön käsittelyä varten.',
        none:'Valitse',yes:'Kyllä',no:'Ei',unknown:'En tiedä',some:'Osittain',na:'Ei koske',
        home:'Kotimuutto',business:'Yritysmuutto',other:'Muu kuljetus',apartment:'Kerrostalo',
        detached:'Omakotitalo',row:'Rivitalo',businessPlace:'Yritystila',otherPlace:'Muu',prev:'Edellinen',next:'Seuraava',
        send:'Lähetä Mainion tarkistettavaksi',sending:'Lähetetään…',
        sent:'Tarjouspyyntösi tallennettiin Mainion käsiteltäväksi. Hinta, ajankohta ja tilaus vahvistetaan erikseen.',
        error:'Lähetys epäonnistui. Tarkista tiedot ja yritä uudelleen.',
        boxHint:'Mainion sivuilla on kaksi suuntaa antavaa laatikko-ohjetta: 0,8–1 laatikkoa / m². Valitse itse arvioitu määrä, ja Mainio tarkistaa tarpeen.'
      },
      sv:{
        heading:'Flyttkartläggning · offertförfrågan',intro:'Beskriv flytten. Mainio kontrollerar detaljerna och bekräftar pris och datum separat.',
        steps:['Grunduppgifter','Från','Till','Flyttlådor och tillägg','Kontaktuppgifter och samtycke'],
        type:'Typ av flytt',date:'Önskat flyttdatum',size:'Bostadens eller lokalens storlek (m²)',people:'Antal boende (valfritt)',
        street:'Gatuadress och nummer',city:'Ort',housing:'Typ av byggnad',floor:'Våning, om höghus',
        elevator:'Finns hiss?',parking:'Kan flyttbilen stå vid dörren?',ownBoxes:'Har du egna flyttlådor?',
        requestedBoxes:'Hur många hyrlådor önskar du? (valfritt)',carrying:'Behöver du bärhjälp?',
        packing:'Behöver du packhjälp?',storage:'Behöver du magasinering?',special:'Stora eller tunga föremål (t.ex. piano)',
        notes:'Övriga uppgifter / bäravstånd',name:'Namn',contact:'Telefonnummer eller e-post',
        consent:'Jag godkänner att uppgifterna skickas till Mainio Muuttopalvelu för behandling av offertförfrågan.',
        none:'Välj',yes:'Ja',no:'Nej',unknown:'Vet inte',some:'Delvis',na:'Ej aktuellt',
        home:'Bostadsflytt',business:'Företagsflytt',other:'Annan transport',apartment:'Flervåningshus',
        detached:'Villa',row:'Radhus',businessPlace:'Företagslokal',otherPlace:'Annat',prev:'Tillbaka',next:'Nästa',
        send:'Skicka för granskning',sending:'Skickar…',
        sent:'Din förfrågan har sparats för Mainios granskning. Pris, datum och bokning bekräftas separat.',
        error:'Det gick inte att skicka. Kontrollera uppgifterna och försök igen.',
        boxHint:'Mainios sidor anger två riktvärden: 0,8–1 låda per m². Välj ett ungefärligt antal. Mainio granskar behovet.'
      },
      en:{
        heading:'Moving enquiry · quote request',intro:'Tell us about your move. Mainio will review the details and separately confirm the price and date.',
        steps:['Move details','Moving from','Moving to','Boxes and extras','Contact and consent'],
        type:'Type of move',date:'Preferred moving date',size:'Property size (m²)',people:'Number of residents (optional)',
        street:'Street address and building number',city:'City',housing:'Property type',floor:'Floor if apartment building',
        elevator:'Is there an elevator?',parking:'Can the moving van park at the entrance?',ownBoxes:'Do you have your own moving boxes?',
        requestedBoxes:'How many rental boxes would you like? (optional)',carrying:'Do you need carrying help?',
        packing:'Do you need packing help?',storage:'Do you need storage?',special:'Large or heavy items (e.g. piano)',
        notes:'Other details / carrying distances',name:'Name',contact:'Phone number or email',
        consent:'I agree to send the information to Mainio Muuttopalvelu so they can review this quote request.',
        none:'Select',yes:'Yes',no:'No',unknown:'Not sure',some:'Some',na:'Not applicable',
        home:'Home move',business:'Business move',other:'Other transport',apartment:'Apartment building',
        detached:'Detached house',row:'Terraced house',businessPlace:'Business premises',otherPlace:'Other',
        prev:'Back',next:'Next',send:'Submit for Mainio’s review',sending:'Sending…',
        sent:'Your request was saved for Mainio to review. The price, date and booking will be confirmed separately.',
        error:'Could not send. Check the details and try again.',
        boxHint:'Mainio’s website gives two approximate guidelines: 0.8–1 box per m². Choose an estimate; Mainio will check the quantity.'
      }
    };
    const L=M[widgetLang]||M.fi;
    const form=document.createElement('form');
    form.className='actionbox mainio-form';
    form.setAttribute('novalidate','');
    const options=(values)=>'<option value="">'+escapeHtml(L.none)+'</option>'+
      values.map(([value,label])=>'<option value="'+escapeHtml(value)+'">'+escapeHtml(label)+'</option>').join('');
    const yesNo=[['yes',L.yes],['no',L.no],['unknown',L.unknown]];
    const house=[['apartment',L.apartment],['detached',L.detached],['row',L.row],['business',L.businessPlace],['other',L.otherPlace],['unknown',L.unknown]];
    const field=(name,label,type='text',required=false,extra='')=>
      '<label>'+escapeHtml(label)+'<input name="'+name+'" type="'+type+'"'+
      (required?' required':'')+' '+extra+'></label>';
    const select=(name,label,list,required=false)=>
      '<label>'+escapeHtml(label)+'<select name="'+name+'"'+(required?' required':'')+'>'+options(list)+'</select></label>';
    const block=(index,content)=>'<fieldset class="mainio-step" data-step="'+index+'"'+(index?' hidden':'')+
      '><legend>'+String(index+1)+'/5 · '+escapeHtml(L.steps[index])+'</legend>'+content+'</fieldset>';
    const origin=(prefix)=>field(prefix+'Address',L.street,'text',true,'maxlength="220"')+
      field(prefix+'City',L.city,'text',true,'maxlength="100"')+
      select(prefix+'Housing',L.housing,house,true)+
      field(prefix+'Floor',L.floor,'text',false,'maxlength="24"')+
      select(prefix+'Elevator',L.elevator,[...yesNo,['na',L.na]],true)+
      select(prefix+'Parking',L.parking,yesNo,true);
    const body=
      block(0,select('serviceType',L.type,[['home',L.home],['business',L.business],['other',L.other]],true)+
        field('desiredDate',L.date,'date',true)+field('areaSqm',L.size,'number',true,'min="1" max="1500" step="0.5"')+
        field('peopleCount',L.people,'number',false,'min="1" max="999"'))+
      block(1,origin('origin'))+block(2,origin('destination'))+
      block(3,select('ownBoxes',L.ownBoxes,[['yes',L.yes],['no',L.no],['some',L.some],['unknown',L.unknown]],true)+
        '<small class="mainio-info">'+escapeHtml(L.boxHint)+'</small>'+
        '<small class="mainio-info" data-mainio-box-estimate></small>'+
        field('boxCount',L.requestedBoxes,'number',false,'min="0" max="9999"')+
        select('carryingHelp',L.carrying,yesNo,true)+select('packingHelp',L.packing,yesNo,true)+
        select('storageNeeded',L.storage,yesNo,true)+
        '<label>'+escapeHtml(L.special)+'<textarea name="specialItems" maxlength="650"></textarea></label>'+
        '<label>'+escapeHtml(L.notes)+'<textarea name="notes" maxlength="850"></textarea></label>')+
      block(4,field('name',L.name,'text',true,'maxlength="120"')+
        field('contact',L.contact,'text',true,'maxlength="220"')+
        '<label class="mainio-consent"><input name="consent" type="checkbox" required> '+escapeHtml(L.consent)+'</label>'+
        '<small class="mainio-info">'+escapeHtml(L.intro)+'</small>');
    form.innerHTML='<b>'+escapeHtml(L.heading)+'</b><small>'+escapeHtml(L.intro)+'</small>'+body+
      '<div class="mainio-nav"><button type="button" data-mainio-back hidden>'+escapeHtml(L.prev)+'</button>'+
      '<button type="button" data-mainio-next>'+escapeHtml(L.next)+'</button>'+
      '<button type="submit" data-mainio-submit hidden>'+escapeHtml(L.send)+'</button></div>'+
      '<div class="mainio-error" role="alert"></div><div class="mainio-success" role="status"></div>';
    chat.appendChild(form);
    let step=0;
    const steps=[...form.querySelectorAll('[data-step]')];
    const back=form.querySelector('[data-mainio-back]'),next=form.querySelector('[data-mainio-next]');
    const send=form.querySelector('[data-mainio-submit]'),error=form.querySelector('.mainio-error');
    const show=(index)=>{
      step=index;steps.forEach((x,i)=>x.hidden=i!==step);
      back.hidden=step===0;next.hidden=step===steps.length-1;send.hidden=step!==steps.length-1;
      error.textContent='';chat.scrollTop=chat.scrollHeight;
    };
    const estimateEl=form.querySelector('[data-mainio-box-estimate]');
    const updateBoxEstimate=()=>{
      const sqm=Number(form.elements.areaSqm.value);
      if(!Number.isFinite(sqm)||sqm<=0||sqm>1500){estimateEl.textContent='';return;}
      const lo=Math.ceil(sqm*0.8),hi=Math.ceil(sqm);
      estimateEl.textContent=widgetLang==='en'
        ? 'Based on '+sqm+' m², Mainio’s two guidance figures suggest about '+lo+'–'+hi+' boxes. This is an estimate, not a confirmed number.'
        : widgetLang==='sv'
          ? 'För '+sqm+' m² ger Mainios två riktvärden ungefär '+lo+'–'+hi+' lådor. Det är en uppskattning.'
          : sqm+' m²:n asunnolle Mainion kaksi ohjetta antavat suuntaa-antavaksi arvioksi noin '+lo+'–'+hi+' laatikkoa. Määrä vahvistetaan erikseen.';
    };
    form.elements.areaSqm.addEventListener('input',updateBoxEstimate);
    updateBoxEstimate();
    form.elements.desiredDate.min=new Date().toLocaleDateString('sv-SE');
    function validateStep(){
      const current=steps[step];
      const prefix=step===1?'origin':step===2?'destination':'';
      if(prefix){
        form.elements[prefix+'Floor'].required=form.elements[prefix+'Housing'].value==='apartment';
      }
      const elements=[...current.querySelectorAll('input,textarea,select')];
      for(const el of elements){
        if(!el.checkValidity()){el.reportValidity();el.focus();return false;}
      }
      return true;
    }
    back.addEventListener('click',()=>show(Math.max(0,step-1)));
    next.addEventListener('click',()=>{if(validateStep())show(Math.min(steps.length-1,step+1));});
    form.addEventListener('submit',async(ev)=>{
      ev.preventDefault();
      if(!validateStep())return;
      const fields=Object.fromEntries(new FormData(form).entries());
      fields.consent=form.elements.consent.checked;
      // Enforce the previous steps too; changing values must not bypass them.
      for(const required of ['serviceType','desiredDate','areaSqm','originAddress','originCity','originHousing',
         'originElevator','originParking','destinationAddress','destinationCity','destinationHousing',
         'destinationElevator','destinationParking','ownBoxes','carryingHelp','packingHelp','storageNeeded','name','contact']){
        if(!String(fields[required]||'').trim()){error.textContent=L.error;return;}
      }
      if(fields.originHousing==='apartment'&&!fields.originFloor){show(1);error.textContent=L.error;return;}
      if(fields.destinationHousing==='apartment'&&!fields.destinationFloor){show(2);error.textContent=L.error;return;}
      send.disabled=true;const old=send.textContent;send.textContent=L.sending;error.textContent='';
      try{
        const response=await fetch(serviceOrigin+'/api/public/'+encodeURIComponent(company)+'/action-request',{
          method:'POST',mode:'cors',credentials:'omit',
          headers:{'Content-Type':'text/plain;charset=UTF-8'},
          body:JSON.stringify({
            type:'quote',mode:'mainio_move',fields,question,
            widgetToken:token,visitorRef,sourceChannel:'website',lang:widgetLang,pageContext
          }),
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.ok)throw new Error(data.error||L.error);
        form.querySelector('.mainio-success').textContent=data.customerMessage||L.sent;
        form.querySelectorAll('input,select,textarea,button').forEach(el=>{el.disabled=true;});
        send.hidden=true;back.hidden=true;
      }catch(err){error.textContent=err.message||L.error;send.disabled=false;send.textContent=old;}
    });
    show(0);
  }

  function showActionForm(action, question) {
    if (chat.querySelector('.actionbox')) return;

    const box = document.createElement('form');
    box.className = 'actionbox';

    if (action.mode === 'quote_form') {
      box.innerHTML =
        '<b>' + t('Laske tarjous tästä', 'Calculate a quote') + '</b>' +
        '<small>' + t('Kerro määrä ja mitä tarvitset. Jos yritys on määrittänyt hintakaavan, Respondo laskee hinnan heti.', 'Tell us the quantity and what you need. If the company has configured pricing, Respondo calculates it immediately.') + '</small>' +
        '<input name="name" maxlength="120" placeholder="' + t('Nimi', 'Name') + '">' +
        '<input name="contact" maxlength="220" required placeholder="' + t('Puhelin tai sähköposti', 'Phone or email') + '">' +
        '<input name="quantity" inputmode="decimal" min="0" step="0.01" placeholder="' + t('Määrä', 'Quantity') + '">' +
        '<textarea name="details" maxlength="1800" placeholder="' + t('Mitä tarvitset?', 'What do you need?') + '">' + escapeHtml(question) + '</textarea>' +
        '<input name="budget" maxlength="120" placeholder="' + t('Budjetti, jos tiedossa', 'Budget, if known') + '">' +
        '<button type="submit">' + t('Laske ja lähetä tarjouspyyntö', 'Calculate and send') + '</button>' +
        '<div class="action-ok"></div>';
    } else if (action.mode === 'booking_form') {
      box.innerHTML =
        '<b>' + t('Varaa vapaa aika', 'Book an available time') + '</b>' +
        '<small>' + t('Respondo näyttää vain oikeasti vapaat ajat. Valittu aika poistuu heti muiden varattavista.', 'Respondo only shows truly available times. Once booked, the slot is no longer available to others.') + '</small>' +
        '<input name="name" maxlength="120" placeholder="' + t('Nimi', 'Name') + '">' +
        '<input name="contact" maxlength="220" required placeholder="' + t('Puhelin tai sähköposti', 'Phone or email') + '">' +
        '<select name="slotId" required><option value="">' + t('Haetaan vapaita aikoja…', 'Loading available times…') + '</option></select>' +
        '<textarea name="note" maxlength="1000" placeholder="' + t('Lisätieto', 'Additional note') + '"></textarea>' +
        '<button type="submit" disabled>' + t('Varaa aika', 'Book time') + '</button>' +
        '<div class="action-ok"></div>';
    } else {
      box.innerHTML =
        '<b>' + t('Tarkista tilauksen tila', 'Check order status') + '</b>' +
        '<small>' + t('Anna tilausnumero ja tilauksessa käytetty sähköposti.', 'Enter the order number and email used for the order.') + '</small>' +
        '<input name="orderNumber" maxlength="120" required placeholder="' + t('Tilausnumero', 'Order number') + '">' +
        '<input name="email" type="email" maxlength="220" required placeholder="' + t('Sähköposti', 'Email') + '">' +
        '<button type="submit">' + t('Tarkista', 'Check') + '</button>' +
        '<div class="action-ok"></div>';
    }

    if (action.mode === 'booking_form') {
      const slotSelect = box.elements.slotId;
      const submitButton = box.querySelector('button[type="submit"]');
      fetch(
        serviceOrigin + '/api/public/' + encodeURIComponent(company) +
        '/booking-slots?widgetToken=' + encodeURIComponent(token) + '&lang=' + encodeURIComponent(widgetLang),
        { method:'GET', mode:'cors', credentials:'omit' }
      )
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Slots failed');
          const slots = Array.isArray(data.slots) ? data.slots : [];
          if (!slots.length) {
            slotSelect.innerHTML = '<option value="">' + t('Ei vapaita aikoja juuri nyt', 'No available times right now') + '</option>';
            submitButton.disabled = true;
            return;
          }
          slotSelect.innerHTML =
            '<option value="">' + t('Valitse vapaa aika', 'Choose an available time') + '</option>' +
            slots.map((slot) => {
              const start = new Date(slot.starts_at);
              const end = new Date(slot.ends_at);
              const locale = widgetLang === 'en' ? 'en-GB-u-hc-h12' : widgetLang === 'sv' ? 'sv-SE' : 'fi-FI';
              const date = start.toLocaleDateString(locale, { weekday:'short', day:'2-digit', month:'2-digit' });
              const startTime = start.toLocaleTimeString(locale, { hour:'2-digit', minute:'2-digit' });
              const endTime = end.toLocaleTimeString(locale, { hour:'2-digit', minute:'2-digit' });
              return '<option value="' + escapeHtml(slot.id) + '">' +
                escapeHtml(date + ' · ' + startTime + '–' + endTime) +
                '</option>';
            }).join('');
          submitButton.disabled = false;
        })
        .catch(() => {
          slotSelect.innerHTML = '<option value="">' + t('Vapaita aikoja ei saatu ladattua', 'Available times could not be loaded') + '</option>';
          submitButton.disabled = true;
        });
    }

    box.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(box);
      const fields = Object.fromEntries(fd.entries());
      const button = box.querySelector('button[type="submit"]');
      const original = button.textContent;
      button.disabled = true;
      button.textContent = t('Lähetetään…', 'Sending…');

      try {
        const type =
          action.mode === 'quote_form' ? 'quote' :
          action.mode === 'booking_form' ? 'booking' :
          'order_status';

        const res = await fetch(serviceOrigin + '/api/public/' + encodeURIComponent(company) + '/action-request', {
          method:'POST',
          mode:'cors',
          credentials:'omit',
          headers:{ 'Content-Type':'text/plain;charset=UTF-8' },
          body:JSON.stringify({
            type,
            fields,
            question,
            widgetToken:token,
            visitorRef,
            sourceChannel:'website',
            lang:widgetLang,
            pageContext,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Action failed');

        const ok = box.querySelector('.action-ok');
        let resultHtml = '<div class="action-confirmed">✓ ' +
          escapeHtml(data.customerMessage || t('Pyyntö vastaanotettu', 'Request received')) +
          '</div>';

        if (data.quote) {
          const q = data.quote;
          const locale = widgetLang === 'en' ? 'en-IE' : widgetLang === 'sv' ? 'sv-SE' : 'fi-FI';
          const total = new Intl.NumberFormat(locale, { style:'currency', currency:q.currency || 'EUR' }).format(Number(q.total || 0));
          resultHtml +=
            '<div class="quote-result">' +
              '<small>' + escapeHtml(q.serviceName || t('Tarjous', 'Quote')) + '</small>' +
              '<strong>' + escapeHtml(total) + '</strong>' +
              '<span>' + escapeHtml(
                q.vatPercent > 0
                  ? (widgetLang === 'en'
                      ? 'includes VAT ' + q.vatPercent + '%'
                      : widgetLang === 'sv'
                        ? 'inklusive moms ' + q.vatPercent + ' %'
                        : 'sisältää ALV ' + q.vatPercent + ' %')
                  : t('ALV 0 %', 'VAT 0%')
              ) + '</span>' +
            '</div>';
          if (data.checkoutUrl) {
            resultHtml += '<a class="action-pay" href="' + escapeHtml(data.checkoutUrl) + '" target="_blank" rel="noopener noreferrer">' +
              t('Maksa / hyväksy tarjous →', 'Pay / accept quote →') +
              '</a>';
          } else {
            resultHtml += '<small class="action-pay-note">' +
              t('Yritys ei ole vielä yhdistänyt maksutiliä. Tarjouspyyntö on silti lähetetty.', 'The company has not connected payments yet. The quote request was still sent.') +
              '</small>';
          }
        }

        if (data.booking?.startsAt) {
          const start = new Date(data.booking.startsAt);
          const locale = widgetLang === 'en' ? 'en-GB-u-hc-h12' : widgetLang === 'sv' ? 'sv-SE' : 'fi-FI';
          const formatted = start.toLocaleString(locale, {
            weekday:'long', day:'2-digit', month:'2-digit', year:'numeric',
            hour:'2-digit', minute:'2-digit'
          });
          resultHtml += '<div class="booking-confirmed"><strong>' +
            t('Aika varattu', 'Time booked') +
            '</strong><span>' + escapeHtml(formatted) + '</span></div>';
        }

        ok.innerHTML = resultHtml;
        box.querySelectorAll('input,textarea,select,button').forEach((el) => el.disabled = true);
        button.textContent = t('Valmis ✓', 'Done ✓');

        if (type === 'order_status' && data.customerMessage) {
          addMessage(data.customerMessage);
        }
      } catch (err) {
        box.querySelector('.action-ok').textContent = widgetLang === 'fi' && err.message ? err.message : t('Lähetys epäonnistui.', 'Sending failed.');
        button.disabled = false;
        button.textContent = original;
      }

      chat.scrollTop = chat.scrollHeight;
    });

    chat.appendChild(box);
    chat.scrollTop = chat.scrollHeight;
  }

  function showLeadForm(question) {
    if (chat.querySelector('.leadbox')) return;
    const box = document.createElement('form');
    box.className = 'leadbox';
    box.innerHTML = '<b>' + t('Haluatko, että joku yrityksestä ottaa sinuun yhteyttä?', 'Would you like the company to contact you?') + '</b><small>' + t('Jätä nimesi ja puhelinnumerosi tai sähköpostisi. Tiedot menevät vain tälle yritykselle yhteydenottoa varten.', 'Leave your name and phone number or email. The details are shared only with this company for contacting you.') + '</small><label style="display:flex;align-items:flex-start;gap:8px;margin:10px 0;font-size:12px"><input type="checkbox" name="consent" required style="width:auto;margin-top:2px">' + t('Hyväksyn yhteystietojeni lähettämisen yritykselle yhteydenottoa varten.', 'I agree to share my contact details with the company for this request.') + '</label><input name="name" maxlength="120" placeholder="' + t('Nimi, jos haluat', 'Name (optional)') + '"><input name="contact" maxlength="220" required placeholder="' + t('Puhelinnumero tai sähköposti', 'Phone or email') + '"><button type="submit">' + t('Pyydä yhteydenottoa', 'Send contact details') + '</button><div class="lead-ok"></div>';
    box.addEventListener('submit', async (event) => {
      event.preventDefault();
      const contact = String(box.elements.contact.value || '').trim();
      const person = String(box.elements.name.value || '').trim();
      if (!contact || !box.elements.consent.checked) return;
      const button = box.querySelector('button');
      button.disabled = true;
      button.textContent = t('Lähetetään…', 'Sending…');
      const email = contact.includes('@') ? contact : '';
      const phone = email ? '' : contact;
      try {
        const res = await fetch(serviceOrigin + '/api/public/' + encodeURIComponent(company) + '/lead', {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ name: person, email, phone, message: question, consent: box.elements.consent.checked, widgetToken: token, visitorRef, lang: widgetLang, pageContext }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lähetys epäonnistui');
        box.querySelector('.lead-ok').textContent = t('Kiitos — yhteystiedot on lähetetty ✓', 'Thank you — your contact details were sent ✓');
        box.querySelectorAll('input,button').forEach((el) => el.disabled = true);
        button.textContent = t('Lähetetty ✓', 'Sent ✓');
      } catch {
        box.querySelector('.lead-ok').textContent = t('Lähetys ei onnistunut. Yritä uudelleen.', 'Sending failed. Please try again.');
        button.disabled = false;
        button.textContent = t('Pyydä yhteydenottoa', 'Send contact details');
      }
    });
    chat.appendChild(box);
    chat.scrollTop = chat.scrollHeight;
  }

  function setAccent(value) {
    const valid=(v)=>/^#[0-9a-f]{6}$/i.test(String(v||''));
    const accent=valid(value)?String(value):valid(fallbackAccent)?fallbackAccent:'#111113';
    const channels=[1,3,5].map((i)=>parseInt(accent.slice(i,i+2),16)/255);
    const linear=channels.map((v)=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
    const luminance=0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
    root.style.setProperty('--bot-accent',accent);
    root.style.setProperty('--bot-accent-ink',luminance>0.179?'#111113':'#ffffff');
    $('.mark').style.background=accent;
    $('.dot').style.background=accent;
  }

  async function pollLiveTakeover() {
    if (!ready || !token || !visitorRef) return;
    try {
      const url = serviceOrigin + '/api/public/' + encodeURIComponent(company) +
        '/live?widgetToken=' + encodeURIComponent(token) +
        '&visitorRef=' + encodeURIComponent(visitorRef) +
        (livePollAfter ? '&after=' + encodeURIComponent(livePollAfter) : '');
      const res = await fetch(url,{ method:'GET',mode:'cors',credentials:'omit' });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));

      if (data.mode === 'human') {
        const agentName = String(data.agent?.display_name || '').trim();
        status.textContent = agentName ? agentName + ' · ' + t('paikalla', 'online') : t('Asiakaspalvelija mukana', 'Human agent joined');
        status.classList.add('ready');
      } else if (ready) {
        status.textContent = t('Valmis auttamaan', 'Ready');
      }

      const messages = Array.isArray(data.messages) ? data.messages : [];
      for (const item of messages) {
        const created = String(item.created_at || '');
        const agentName = String(item.agent_name || data.agent?.display_name || '').trim();
        addMessage(
          (agentName ? agentName + ': ' : t('Asiakaspalvelija: ', 'Support: ')) + String(item.message || ''),
          'bot'
        );
        if (created) livePollAfter = created;
      }
    } catch {}
  }

  function startLivePolling() {
    if (livePollTimer) return;
    livePollTimer = setInterval(pollLiveTakeover,3000);
    pollLiveTakeover();
  }

  async function activate() {
    try {
      const res = await fetch(
        serviceOrigin + '/api/public/' + encodeURIComponent(company) +
          '/widget-token?lang=' + encodeURIComponent(widgetLang) +
          (googleSitesKey ? '&sitesKey=' + encodeURIComponent(googleSitesKey) +
            '&googleFrame=' + encodeURIComponent(location.hostname) : ''),
        { method: 'GET', mode: 'cors', credentials: 'omit' }
      );
      if (!res.ok) throw new Error('Widget not allowed');
      const data = await res.json();
      token = data.token;
      ready = true;
      const botDisplayName=String(data.name||'RESPONDO AI').trim().slice(0,100)||'RESPONDO AI';
      const botAvatar=widgetAvatarMarkup(data.avatar || 'robot-1');
      name.textContent = botDisplayName;
      mark.innerHTML = botAvatar;
      launcherName.textContent = botDisplayName;
      launcherAvatar.innerHTML = botAvatar + '<span class="launcher-online"></span>';
      launcherSubtitle.textContent = t('Valmis auttamaan', 'Ready to help');
      launcher.classList.add('ready');
      launcher.setAttribute('aria-label',botDisplayName+' – '+t('Avaa chat','Open chat'));
      setAccent(data.accent || fallbackAccent);
      status.textContent = t('Valmis auttamaan', 'Ready');
      status.classList.add('ready');
      renderQuickReplies(data.quickReplies || []);
      addMessage(data.greeting || t('Hei! Miten voin auttaa?', 'Hi! How can I help?'));
      startLivePolling();
    } catch {
      ready = false;
      launcher.classList.remove('ready');
      launcherSubtitle.textContent = t('Ei käytettävissä', 'Unavailable');
      status.textContent = t('Chat ei ole käytössä tällä verkkosivulla.', 'The widget is not active on this website.');
      status.classList.add('error');
      form.style.display = 'none';
      addMessage(t('Tätä chattia ei ole vielä otettu käyttöön tällä verkkosivulla.', 'This RESPONDO AI license is linked to another website or has not been activated yet.'));
    }
  }

  launcher.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    launcher.setAttribute('aria-expanded',String(open));
    launcher.setAttribute('aria-label',(launcherName.textContent||'RESPONDO AI')+' – '+
      (open?t('Sulje','Close'):t('Avaa chat','Open chat')));
    if (open && ready) setTimeout(() => input.focus(), 50);
  });

  async function sendMessage(rawMessage) {
    const message = String(rawMessage || '').trim();
    if (!message || !ready) return;

    addMessage(message, 'user');
    input.value = '';
    input.disabled = true;
    const pending = addMessage('');
    pending.innerHTML = '<span class="typing-dots"><i></i><i></i><i></i></span>';
    chat.scrollTop = chat.scrollHeight;

    try {
      const res = await fetch(
        serviceOrigin + '/api/public/' + encodeURIComponent(company) + '/chat',
        {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ message, widgetToken: token, visitorRef, lang: widgetLang, pageContext }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      pending.innerHTML = linkify(data.answer || t('En löytänyt tähän varmaa vastausta.', 'I cannot find a reliable answer to this yet.'));
      if (data.verified) {
        const note = document.createElement('div');
        note.className = 'truth-note';
        note.innerHTML = '<span>✓</span> ' + t('Varmennettu yrityksen tiedoista', 'Verified from company information');
        chat.appendChild(note);
      }
      const hasProducts=renderProducts(data.products || []);
      renderActions((data.actions || []).filter((action)=>!hasProducts || action?.type!=='product'), message);
      renderBranchChoices(data.branchChoices || []);
      if ((data.canLeaveContact || data.handoff) && !data.humanTakeover) showLeadForm(message);
      if (data.humanTakeover) {
        status.textContent = t('Asiakaspalvelija mukana', 'Human agent joined');
      }
    } catch {
      pending.textContent = t('Vastausta ei saatu juuri nyt. Yritä hetken päästä uudelleen.', 'The response failed. Please try again in a moment.');
    } finally {
      input.disabled = false;
      input.focus();
      chat.scrollTop = chat.scrollHeight;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendMessage(input.value);
  });


  activate();
})();