(() => {
  const script = document.currentScript;
  const company = script?.dataset?.company;
  if (!company) return;

  const serviceOrigin = new URL(script.src).origin;
  const side = script.dataset.side === 'left' ? 'left' : 'right';
  const fallbackAccent = script.dataset.accent || '#111113';

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
  shadow.innerHTML = \`
    <style>
      *{box-sizing:border-box}
      :host{all:initial}
      .wrap{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif;color:#111113}
      .panel{width:min(390px,calc(100vw - 24px));height:min(610px,calc(100vh - 92px));background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:22px;box-shadow:0 28px 80px rgba(0,0,0,.22);overflow:hidden;display:none;flex-direction:column;margin-bottom:10px}
      .panel.open{display:flex}
      .head{padding:16px 17px;border-bottom:1px solid #e7e7e9;display:flex;align-items:center;gap:11px;background:#fff}
      .mark{width:34px;height:34px;border-radius:10px;background:#111113;color:#fff;display:grid;place-items:center;font-weight:900}
      .headcopy{min-width:0;flex:1}
      .headcopy b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .headcopy small{display:flex;align-items:center;gap:6px;color:#707075;font-size:11px;margin-top:2px}
      .dot{width:7px;height:7px;border-radius:50%;background:#111113;display:inline-block}
      .chat{padding:16px;overflow:auto;flex:1;background:#f7f7f8;display:flex;flex-direction:column;gap:10px}
      .msg{max-width:86%;padding:11px 13px;border-radius:15px;font-size:14px;line-height:1.45;word-break:break-word}
      .bot{align-self:flex-start;background:#fff;border:1px solid #e3e3e6}
      .user{align-self:flex-end;background:#111113;color:#fff}
      .msg a{color:inherit;text-decoration:underline;text-underline-offset:2px}
      .composer{padding:12px;border-top:1px solid #e7e7e9;background:#fff;display:flex;gap:8px}
      .composer input{min-width:0;flex:1;border:1px solid #d9d9dc;border-radius:12px;padding:12px 13px;font:inherit;font-size:14px;outline:none}
      .composer input:focus{border-color:#111113}
      .composer button{width:44px;border:0;border-radius:12px;background:#111113;color:#fff;font-size:18px;font-weight:800;cursor:pointer}
      .launcher{border:0;border-radius:14px;padding:13px 16px;background:#111113;color:#fff;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 18px 45px rgba(0,0,0,.2)}
      .status{font-size:12px;color:#77777c;text-align:center;padding:8px 12px;background:#fff}
      .error{color:#8b2d2d}
      @media(max-width:520px){
        .panel{width:calc(100vw - 20px);height:min(640px,calc(100vh - 84px));border-radius:18px}
      }
    </style>
    <div class="wrap">
      <section class="panel" aria-label="RESPONDO AI asiakaspalvelu">
        <header class="head">
          <div class="mark">R</div>
          <div class="headcopy"><b id="name">RESPONDO AI</b><small><span class="dot"></span> Vastaa yrityksen tiedoilla</small></div>
        </header>
        <div class="chat" id="chat"></div>
        <div class="status" id="status">Yhdistetään…</div>
        <form class="composer" id="form">
          <input id="input" autocomplete="off" placeholder="Kirjoita kysymys…" aria-label="Kirjoita kysymys">
          <button type="submit" aria-label="Lähetä">→</button>
        </form>
      </section>
      <button class="launcher" id="launcher" type="button">Kysy meiltä&nbsp;&nbsp;↗</button>
    </div>\`;

  const $ = (q) => shadow.querySelector(q);
  const panel = $('.panel');
  const launcher = $('#launcher');
  const chat = $('#chat');
  const status = $('#status');
  const form = $('#form');
  const input = $('#input');
  const name = $('#name');

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

  function setAccent(value) {
    const accent = value || fallbackAccent;
    $('.mark').style.background = accent;
    launcher.style.background = accent;
    $('.composer button').style.background = accent;
  }

  async function activate() {
    try {
      const res = await fetch(
        serviceOrigin + '/api/public/' + encodeURIComponent(company) + '/widget-token',
        { method: 'GET', mode: 'cors', credentials: 'omit' }
      );
      if (!res.ok) throw new Error('Widget not allowed');
      const data = await res.json();
      token = data.token;
      ready = true;
      name.textContent = data.name || 'RESPONDO AI';
      setAccent(data.accent || fallbackAccent);
      status.textContent = 'Valmis vastaamaan';
      addMessage(data.greeting || 'Hei! Miten voin auttaa?');
    } catch {
      ready = false;
      status.textContent = 'Widget ei ole käytössä tällä verkkosivulla.';
      status.classList.add('error');
      form.style.display = 'none';
      addMessage('Tämä RESPONDO AI -lisenssi on sidottu toiseen verkkosivuun tai sitä ei ole vielä aktivoitu.');
    }
  }

  launcher.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    launcher.textContent = open ? 'Sulje' : 'Kysy meiltä  ↗';
    if (open && ready) setTimeout(() => input.focus(), 50);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = String(input.value || '').trim();
    if (!message || !ready) return;

    addMessage(message, 'user');
    input.value = '';
    input.disabled = true;
    const pending = addMessage('Hetki…');

    try {
      const res = await fetch(
        serviceOrigin + '/api/public/' + encodeURIComponent(company) + '/chat',
        {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ message, widgetToken: token, visitorRef }),
        }
      );
      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();
      pending.innerHTML = linkify(data.answer || 'En löydä tähän vielä varmaa vastausta.');
    } catch {
      pending.textContent = 'Vastaaminen epäonnistui. Yritä hetken kuluttua uudelleen.';
    } finally {
      input.disabled = false;
      input.focus();
      chat.scrollTop = chat.scrollHeight;
    }
  });

  activate();
})();