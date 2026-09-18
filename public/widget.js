(() => {
  const script = document.currentScript;
  const company = script?.dataset?.company;
  if (!company) return;

  const serviceOrigin = new URL(script.src).origin;
  const side = script.dataset.side === 'left' ? 'left' : 'right';
  const fallbackAccent = script.dataset.accent || '#111113';
  const widgetLang = 'fi';
  const t = (fi, en) => widgetLang === 'en' ? en : fi;

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
      .mark{width:34px;height:34px;border-radius:10px;overflow:hidden;display:grid;place-items:center;flex:0 0 auto}.mark svg{display:block;width:34px;height:34px}
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
      .actions a{display:inline-flex;align-items:center;gap:6px;border:1px solid #d6d6da;background:#fff;color:#111113;text-decoration:none;border-radius:10px;padding:9px 11px;font-size:12px;font-weight:700}
      .leadbox{align-self:stretch;background:#fff;border:1px solid #dedee2;border-radius:16px;padding:13px;display:grid;gap:8px}
      .leadbox b{font-size:13px}.leadbox small{font-size:11px;color:#73737a;line-height:1.4}
      .leadbox input{width:100%;border:1px solid #d9d9dc;border-radius:10px;padding:10px 11px;font:inherit;font-size:13px;outline:none}
      .leadbox input:focus{border-color:#111113}
      .leadbox button{border:0;border-radius:10px;padding:10px 12px;background:#111113;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
      .leadbox .lead-ok{font-size:12px;color:#246b45}
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
      <section class="panel" aria-label="${t('RESPONDO AI asiakaspalvelu', 'RESPONDO AI customer service')}">
        <header class="head">
          <div class="mark" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><rect width="64" height="64" rx="18" fill="#111114"/><path d="M19 17h17c8 0 13 4 13 11 0 5-3 9-8 10l10 10H39L30 39h-1v9H19V17zm10 8v7h7c2 0 3-1 3-3s-1-4-4-4h-6z" fill="#fff"/></svg></div>
          <div class="headcopy"><b id="name">RESPONDO AI</b><small><span class="dot"></span> ${t('Asiakaspalvelu verkossa', 'Customer service online')}</small></div>
        </header>
        <div class="chat" id="chat"></div>
        <div class="quick" id="quick"></div>
        <div class="status" id="status">${t('Yhdistetään…', 'Connecting…')}</div>
        <form class="composer" id="form">
          <input id="input" autocomplete="off" placeholder="${t('Kirjoita kysymys…', 'Type your question…')}" aria-label="${t('Kirjoita kysymys', 'Type your question')}">
          <button type="submit" aria-label="${t('Lähetä', 'Send')}">→</button>
        </form>
        <div class="powered">Powered by RESPONDO AI</div>
      </section>
      <button class="launcher" id="launcher" type="button"><span class="launcher-dot"></span><span class="launcher-label">${t('Kysy meiltä', 'Ask us')}</span></button>
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

  function renderActions(actions = []) {
    const valid = (Array.isArray(actions) ? actions : []).filter((x) => safeActionUrl(x?.url) && x?.label).slice(0, 3);
    if (!valid.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'actions';
    valid.forEach((action) => {
      const a = document.createElement('a');
      a.href = safeActionUrl(action.url);
      a.textContent = action.label + ' →';
      if (/^https?:\/\//i.test(a.href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
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

  function showLeadForm(question) {
    if (chat.querySelector('.leadbox')) return;
    const box = document.createElement('form');
    box.className = 'leadbox';
    box.innerHTML = '<b>' + t('Haluatko, että yritys ottaa yhteyttä?', 'Would you like the company to contact you?') + '</b><small>' + t('Jätä nimi ja puhelin tai sähköposti. Tiedot välitetään vain tälle yritykselle yhteydenottoa varten.', 'Leave your name and phone number or email. The details are shared only with this company for contacting you.') + '</small><input name="name" maxlength="120" placeholder="' + t('Nimi (valinnainen)', 'Name (optional)') + '"><input name="contact" maxlength="220" required placeholder="' + t('Puhelin tai sähköposti', 'Phone or email') + '"><button type="submit">' + t('Jätä yhteystiedot', 'Send contact details') + '</button><div class="lead-ok"></div>';
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
          body: JSON.stringify({ name: person, email, phone, message: question, widgetToken: token, visitorRef, lang: widgetLang }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Lähetys epäonnistui');
        box.querySelector('.lead-ok').textContent = t('Kiitos — yhteystiedot on lähetetty ✓', 'Thank you — your contact details were sent ✓');
        box.querySelectorAll('input,button').forEach((el) => el.disabled = true);
        button.textContent = t('Lähetetty ✓', 'Sent ✓');
      } catch {
        box.querySelector('.lead-ok').textContent = t('Lähetys ei onnistunut. Yritä uudelleen.', 'Sending failed. Please try again.');
        button.disabled = false;
        button.textContent = t('Jätä yhteystiedot', 'Send contact details');
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
      mark.innerHTML = '<svg viewBox="0 0 64 64" focusable="false" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#111114"/><path d="M19 17h17c8 0 13 4 13 11 0 5-3 9-8 10l10 10H39L30 39h-1v9H19V17zm10 8v7h7c2 0 3-1 3-3s-1-4-4-4h-6z" fill="#fff"/></svg>';
      setAccent(data.accent || fallbackAccent);
      status.textContent = t('Valmis vastaamaan', 'Ready to help');
      status.classList.add('ready');
      renderQuickReplies(data.quickReplies || []);
      addMessage(data.greeting || t('Hei! Miten voin auttaa?', 'Hi! How can I help?'));
    } catch {
      ready = false;
      status.textContent = t('Widget ei ole käytössä tällä verkkosivulla.', 'The widget is not active on this website.');
      status.classList.add('error');
      form.style.display = 'none';
      addMessage(t('Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun tai sitä ei ole vielä aktivoitu.', 'This RESPONDO AI license is linked to another website or has not been activated yet.'));
    }
  }

  launcher.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    launcherLabel.textContent = open ? t('Sulje', 'Close') : t('Kysy meiltä', 'Ask us');
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
          body: JSON.stringify({ message, widgetToken: token, visitorRef, lang: widgetLang }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      pending.innerHTML = linkify(data.answer || t('En löydä tähän vielä varmaa vastausta.', 'I cannot find a reliable answer to this yet.'));
      renderActions(data.actions || []);
      if (data.canLeaveContact || data.handoff) showLeadForm(message);
    } catch {
      pending.textContent = t('Vastaaminen epäonnistui. Yritä hetken kuluttua uudelleen.', 'The response failed. Please try again in a moment.');
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