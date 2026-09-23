(() => {
  const script = document.currentScript;
  const company = script?.dataset?.company;
  if (!company) return;

  const serviceOrigin = new URL(script.src).origin;
  const side = script.dataset.side === 'left' ? 'left' : 'right';
  const fallbackAccent = script.dataset.accent || '#111113';
  const normalizeLang = (value) => {
    const lang = String(value || '').toLowerCase().split('-')[0];
    return ['fi','sv','en'].includes(lang) ? lang : 'fi';
  };
  const requestedLang = String(script.dataset.lang || 'auto').toLowerCase();
  const widgetLang = requestedLang === 'auto' ? normalizeLang(navigator.language) : normalizeLang(requestedLang);
  const SV_WIDGET = new Map(Object.entries({
    'Tarkista':'Kontrollera','Ei vapaita aikoja juuri nyt':'Inga lediga tider just nu','Valitse vapaa aika':'Välj en ledig tid',
    'Lähetetään…':'Skickar…','Pyyntö vastaanotettu':'Begäran mottagen','Kiitos — yhteystiedot on lähetetty ✓':'Tack — dina kontaktuppgifter har skickats ✓',
    'Lähetetty ✓':'Skickat ✓','Lähetys ei onnistunut. Yritä uudelleen.':'Det gick inte att skicka. Försök igen.','Pyydä yhteydenottoa':'Be om kontakt',
    'Asiakaspalvelija mukana':'Kundtjänstmedarbetare ansluten','Valmis auttamaan':'Redo att hjälpa','Asiakaspalvelija: ':'Kundtjänst: ',
    'Hei! Miten voin auttaa?':'Hej! Hur kan jag hjälpa?','Chat ei ole käytössä tällä verkkosivulla.':'Chatten är inte tillgänglig på den här webbplatsen.',
    'En löytänyt tähän varmaa vastausta.':'Jag hittade inget säkert svar på detta.','Varmennettu yrityksen tiedoista':'Verifierat från företagets information',
    'Nimi':'Namn','Sähköposti tai puhelin':'E-post eller telefon','Viesti':'Meddelande','Lähetä':'Skicka','Sulje':'Stäng',
    'Sähköposti':'E-post','Puhelin':'Telefon','Valitse aika':'Välj tid','Varaa':'Boka','Lähetä tarjouspyyntö':'Skicka offertförfrågan'
  }));
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
      .mark{width:34px;height:34px;border-radius:10px;overflow:hidden;display:grid;place-items:center;flex:0 0 auto}.mark svg,.mark img{display:block;width:34px;height:34px;object-fit:cover}
      .headcopy{min-width:0;flex:1}
      .headcopy b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .headcopy small{display:flex;align-items:center;gap:6px;color:#707075;font-size:11px;margin-top:2px}
      .dot{width:7px;height:7px;border-radius:50%;background:#111113;display:inline-block}
      .chat{padding:18px;overflow:auto;flex:1;background:#f7f7f8;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
      .msg{max-width:86%;padding:11px 13px;border-radius:15px;font-size:14px;line-height:1.45;word-break:break-word}
      .bot{align-self:flex-start;background:#fff;border:1px solid #e3e3e6}
      .user{align-self:flex-end;background:#111113;color:#fff}
      .msg a{color:inherit;text-decoration:underline;text-underline-offset:2px}
      .composer{padding:12px;border-top:1px solid #e7e7e9;background:#fff;display:flex;gap:8px}
      .composer input{min-width:0;flex:1;border:1px solid #d9d9dc;border-radius:12px;padding:12px 13px;font:inherit;font-size:14px;outline:none}
      .composer input:focus{border-color:#111113}
      .composer button{width:44px;border:0;border-radius:12px;background:#111113;color:#fff;font-size:18px;font-weight:800;cursor:pointer}
      .launcher{border:0;border-radius:999px;padding:13px 17px;background:#111113;color:#fff;font-weight:750;font-size:14px;cursor:pointer;box-shadow:0 18px 45px rgba(0,0,0,.2);display:flex;align-items:center;gap:9px}.launcher-dot{width:8px;height:8px;border-radius:50%;background:#fff;opacity:.9;box-shadow:0 0 0 4px rgba(255,255,255,.12)}
      .status{font-size:12px;color:#77777c;text-align:center;padding:7px 12px;background:#fff}.status.ready{display:none}
      .error{color:#8b2d2d}
      .quick{display:flex;gap:7px;flex-wrap:wrap;padding:0 16px 12px;background:#f7f7f8}
      .quick:empty{display:none}
      .quick button{border:1px solid #dedee2;background:#fff;border-radius:999px;padding:8px 10px;font:inherit;font-size:12px;color:#343438;cursor:pointer}
      .quick button:hover{border-color:#a9a9af}
      .actions{display:flex;gap:7px;flex-wrap:wrap;align-self:flex-start;max-width:92%}
      .actions a,.actions button{display:inline-flex;align-items:center;gap:6px;border:1px solid #d6d6da;background:#fff;color:#111113;text-decoration:none;border-radius:10px;padding:9px 11px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
      .leadbox{align-self:stretch;background:#fff;border:1px solid #dedee2;border-radius:16px;padding:13px;display:grid;gap:8px}
      .leadbox b{font-size:13px}.leadbox small{font-size:11px;color:#73737a;line-height:1.4}
      .leadbox input{width:100%;border:1px solid #d9d9dc;border-radius:10px;padding:10px 11px;font:inherit;font-size:13px;outline:none}
      .leadbox input:focus{border-color:#111113}
      .leadbox button{border:0;border-radius:10px;padding:10px 12px;background:#111113;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
      .leadbox .lead-ok{font-size:12px;color:#246b45}
      .actionbox{align-self:stretch;background:#fff;border:1px solid #dedee2;border-radius:16px;padding:13px;display:grid;gap:8px}
      .actionbox b{font-size:13px}.actionbox small{font-size:11px;color:#73737a;line-height:1.4}
      .actionbox input,.actionbox textarea{width:100%;border:1px solid #d9d9dc;border-radius:10px;padding:10px 11px;font:inherit;font-size:13px;outline:none;background:#fff;color:#111113}
      .actionbox textarea{min-height:72px;resize:vertical}
      .actionbox input:focus,.actionbox textarea:focus{border-color:#111113}
      .actionbox button{border:0;border-radius:10px;padding:10px 12px;background:#111113;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
      .actionbox .action-ok{font-size:12px;color:#246b45;line-height:1.4}
      .actionbox select{width:100%;border:1px solid #d9d9dc;border-radius:10px;padding:10px 11px;font:inherit;font-size:13px;outline:none;background:#fff;color:#111113}
      .actionbox select:focus{border-color:#111113}
      .action-confirmed{font-size:12px;font-weight:750;color:#246b45;margin-top:2px}
      .quote-result{display:grid;gap:2px;margin-top:8px;padding:12px;border-radius:12px;background:#f6f6f7;color:#111113}
      .quote-result small{font-size:10px;color:#77777d}.quote-result strong{font-size:24px;letter-spacing:-.04em}.quote-result span{font-size:10px;color:#77777d}
      .action-pay{display:flex;justify-content:center;margin-top:8px;border-radius:10px;padding:11px 12px;background:#111113;color:#fff!important;text-decoration:none!important;font-size:12px;font-weight:850}
      .action-pay-note{display:block;margin-top:7px;color:#77777d!important}
      .booking-confirmed{display:grid;gap:3px;margin-top:8px;padding:11px;border-radius:12px;background:#f2fbf6;color:#174c31}
      .booking-confirmed strong{font-size:12px}.booking-confirmed span{font-size:11px}
      .truth-note{align-self:flex-start;margin:-4px 0 2px 4px;color:#6f7772;font-size:10px;font-weight:700}.truth-note span{color:#2f9b63}
      .typing-dots{display:inline-flex;gap:4px;align-items:center;height:14px}
      .typing-dots i{width:5px;height:5px;border-radius:50%;background:#77777c;animation:rblink 1s infinite ease-in-out}
      .typing-dots i:nth-child(2){animation-delay:.15s}.typing-dots i:nth-child(3){animation-delay:.3s}
      @keyframes rblink{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
      .powered{padding:0 12px 10px;text-align:center;background:#fff;color:#9a9aa0;font-size:10px;letter-spacing:.02em}
      @media(max-width:520px){
        .panel{width:calc(100vw - 12px);height:calc(100dvh - 72px);border-radius:20px}
      }
    </style>
    <div class="wrap">
      <section class="panel" aria-label="${t('Respondon asiakaspalvelu', 'RESPONDO AI customer service')}">
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
      <button class="launcher" id="launcher" type="button"><span class="launcher-dot"></span><span class="launcher-label">${t('Kysy meiltä', 'Ask a question')}</span></button>
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
  const launcherLabel = $('.launcher-label');

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
        ['lead','quote_form','booking_form','order_form'].includes(x?.mode)
      ))
      .slice(0, 4);
    if (!valid.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'actions';

    valid.forEach((action) => {
      if (action.mode === 'lead') {
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

  function renderQuickReplies(items = []) {
    quick.innerHTML = '';
    (Array.isArray(items) ? items : []).slice(0, 3).forEach((label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => sendMessage(label));
      quick.appendChild(button);
    });
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
        '/booking-slots?widgetToken=' + encodeURIComponent(token),
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
              const locale = widgetLang === 'en' ? 'en-GB' : 'fi-FI';
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
          const locale = widgetLang === 'en' ? 'en-IE' : 'fi-FI';
          const total = new Intl.NumberFormat(locale, { style:'currency', currency:q.currency || 'EUR' }).format(Number(q.total || 0));
          resultHtml +=
            '<div class="quote-result">' +
              '<small>' + escapeHtml(q.serviceName || t('Tarjous', 'Quote')) + '</small>' +
              '<strong>' + escapeHtml(total) + '</strong>' +
              '<span>' + escapeHtml(
                q.vatPercent > 0
                  ? t('sisältää ALV ' + q.vatPercent + ' %', 'includes VAT ' + q.vatPercent + '%')
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
          const locale = widgetLang === 'en' ? 'en-GB' : 'fi-FI';
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
        box.querySelector('.action-ok').textContent = err.message || t('Lähetys epäonnistui.', 'Sending failed.');
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
    box.innerHTML = '<b>' + t('Haluatko, että joku yrityksestä ottaa sinuun yhteyttä?', 'Would you like the company to contact you?') + '</b><small>' + t('Jätä nimesi ja puhelinnumerosi tai sähköpostisi. Tiedot menevät vain tälle yritykselle yhteydenottoa varten.', 'Leave your name and phone number or email. The details are shared only with this company for contacting you.') + '</small><input name="name" maxlength="120" placeholder="' + t('Nimi, jos haluat', 'Name (optional)') + '"><input name="contact" maxlength="220" required placeholder="' + t('Puhelinnumero tai sähköposti', 'Phone or email') + '"><button type="submit">' + t('Pyydä yhteydenottoa', 'Send contact details') + '</button><div class="lead-ok"></div>';
    box.addEventListener('submit', async (event) => {
      event.preventDefault();
      const contact = String(box.elements.contact.value || '').trim();
      const person = String(box.elements.name.value || '').trim();
      if (!contact) return;
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
          body: JSON.stringify({ name: person, email, phone, message: question, widgetToken: token, visitorRef, lang: widgetLang, pageContext }),
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
    const accent = value || fallbackAccent;
    $('.mark').style.background = accent;
    launcher.style.background = accent;
    $('.composer button').style.background = accent;
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
        status.textContent = t('Asiakaspalvelija mukana', 'Human agent joined');
        status.classList.add('ready');
      } else if (ready) {
        status.textContent = t('Valmis auttamaan', 'Ready');
      }

      const messages = Array.isArray(data.messages) ? data.messages : [];
      for (const item of messages) {
        const created = String(item.created_at || '');
        addMessage(
          t('Asiakaspalvelija: ', 'Support: ') + String(item.message || ''),
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
        serviceOrigin + '/api/public/' + encodeURIComponent(company) + '/widget-token?lang=' + encodeURIComponent(widgetLang),
        { method: 'GET', mode: 'cors', credentials: 'omit' }
      );
      if (!res.ok) throw new Error('Widget not allowed');
      const data = await res.json();
      token = data.token;
      ready = true;
      name.textContent = data.name || 'RESPONDO AI';
      mark.innerHTML = widgetAvatarMarkup(data.avatar || 'robot-1');
      setAccent(data.accent || fallbackAccent);
      status.textContent = t('Valmis auttamaan', 'Ready');
      status.classList.add('ready');
      renderQuickReplies(data.quickReplies || []);
      addMessage(data.greeting || t('Hei! Miten voin auttaa?', 'Hi! How can I help?'));
      startLivePolling();
    } catch {
      ready = false;
      status.textContent = t('Chat ei ole käytössä tällä verkkosivulla.', 'The widget is not active on this website.');
      status.classList.add('error');
      form.style.display = 'none';
      addMessage(t('Tätä chattia ei ole vielä otettu käyttöön tällä verkkosivulla.', 'This RESPONDO AI license is linked to another website or has not been activated yet.'));
    }
  }

  launcher.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    launcherLabel.textContent = open ? t('Sulje', 'Close') : t('Kysy meiltä', 'Ask a question');
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
      renderActions(data.actions || [], message);
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