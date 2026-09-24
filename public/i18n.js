// RESPONDO AI shared browser internationalisation layer.
// UI language is persisted per browser. Company/widget language can override it.
(() => {
  const SUPPORTED = ['fi', 'sv', 'en'];
  const normalize = (value) => {
    const lang = String(value || '').toLowerCase().split('-')[0];
    return SUPPORTED.includes(lang) ? lang : 'fi';
  };
  const initial = normalize(localStorage.getItem('respondo_lang') || document.documentElement.lang || navigator.language);
  let current = initial;

  const dictionaries = {
    fi: {
      language: 'Kieli', finnish: 'Suomi', swedish: 'Ruotsi', english: 'Englanti',
      login: 'Kirjaudu', logout: 'Kirjaudu ulos', signup: 'Luo tili', continue: 'Jatka',
      save: 'Tallenna', cancel: 'Peruuta', close: 'Sulje', back: 'Takaisin',
      loading: 'Ladataan…', error: 'Jokin meni pieleen.', retry: 'Yritä uudelleen',
      send: 'Lähetä', settings: 'Asetukset', profile: 'Profiili', billing: 'Tilaus',
      conversations: 'Keskustelut', knowledge: 'Tietopohja', leads: 'Liidit',
      testBot: 'Testaa bottia', integrations: 'Integraatiot',
      threeDayTrial: 'Kokeile 3 päivää maksutta',
      chatPlaceholder: 'Kirjoita viesti…', chatSend: 'Lähetä',
      online: 'Paikalla', poweredBy: 'Powered by RESPONDO AI',
      humanFallback: 'En löytänyt tähän varmaa vastausta yrityksen tiedoista. Voit jättää yhteystietosi, niin yritys voi palata asiaan.',
    },
    sv: {
      language: 'Språk', finnish: 'Finska', swedish: 'Svenska', english: 'Engelska',
      login: 'Logga in', logout: 'Logga ut', signup: 'Skapa konto', continue: 'Fortsätt',
      save: 'Spara', cancel: 'Avbryt', close: 'Stäng', back: 'Tillbaka',
      loading: 'Laddar…', error: 'Något gick fel.', retry: 'Försök igen',
      send: 'Skicka', settings: 'Inställningar', profile: 'Profil', billing: 'Abonnemang',
      conversations: 'Konversationer', knowledge: 'Kunskapsbas', leads: 'Leads',
      testBot: 'Testa botten', integrations: 'Integrationer',
      threeDayTrial: 'Prova gratis i 3 dagar',
      chatPlaceholder: 'Skriv ett meddelande…', chatSend: 'Skicka',
      online: 'Online', poweredBy: 'Drivs av RESPONDO AI',
      humanFallback: 'Jag hittade inget säkert svar i företagets information. Du kan lämna dina kontaktuppgifter så att företaget kan återkomma.',
    },
    en: {
      language: 'Language', finnish: 'Finnish', swedish: 'Swedish', english: 'English',
      login: 'Log in', logout: 'Log out', signup: 'Create account', continue: 'Continue',
      save: 'Save', cancel: 'Cancel', close: 'Close', back: 'Back',
      loading: 'Loading…', error: 'Something went wrong.', retry: 'Try again',
      send: 'Send', settings: 'Settings', profile: 'Profile', billing: 'Subscription',
      conversations: 'Conversations', knowledge: 'Knowledge base', leads: 'Leads',
      testBot: 'Test the bot', integrations: 'Integrations',
      threeDayTrial: 'Try free for 3 days',
      chatPlaceholder: 'Type a message…', chatSend: 'Send',
      online: 'Online', poweredBy: 'Powered by RESPONDO AI',
      humanFallback: 'I could not find a reliable answer in the company information. You can leave your contact details and the company can get back to you.',
    }
  };

  function translate(key, fallback = '') {
    return dictionaries[current]?.[key] ?? dictionaries.fi[key] ?? fallback ?? key;
  }
  function apply(root = document) {
    document.documentElement.lang = current;
    root.querySelectorAll?.('[data-i18n]').forEach((el) => {
      const value = translate(el.dataset.i18n, el.textContent);
      if (value) el.textContent = value;
    });
    root.querySelectorAll?.('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', translate(el.dataset.i18nPlaceholder, el.getAttribute('placeholder') || ''));
    });
    root.querySelectorAll?.('[data-lang-select]').forEach((el) => { el.value = current; });
  }
  function setLanguage(value) {
    current = normalize(value);
    localStorage.setItem('respondo_lang', current);
    apply();
    window.dispatchEvent(new CustomEvent('respondo:languagechange', { detail: { language: current } }));
    return current;
  }
  function languageSelector(className = 'language-select') {
    return '<label class="' + className + '"><span class="sr-only">' + translate('language') + '</span>' +
      '<select data-lang-select aria-label="' + translate('language') + '">' +
      '<option value="fi">FI</option><option value="sv">SV</option><option value="en">EN</option>' +
      '</select></label>';
  }
  document.addEventListener('change', (event) => {
    if (event.target?.matches?.('[data-lang-select]')) setLanguage(event.target.value);
  });
  window.RespondoI18n = {
    supported: SUPPORTED, dictionaries, normalize,
    get language() { return current; },
    t: translate, setLanguage, apply, languageSelector
  };
  // Translate dynamically rendered application UI as well as static data-i18n labels.
  // app.js renders most authenticated views after page load, so translating only headings
  // or data-i18n nodes leaves buttons, helper text, notices and placeholders in Finnish.
  let dynamicRun = 0;
  let dynamicTimer = null;
  let dynamicBusy = false;
  const dynamicCache = new Map();

  const shouldTranslateText = (value) => {
    const s = String(value || '').replace(/\\s+/g, ' ').trim();
    if (!s || s.length < 2) return false;
    if (/^(RESPONDO AI|FI|SV|EN|https?:\\/\\/|[+]?\\d[\\d .()-]*|[€$£]?\\d[\\d., %/-]*|[A-Z0-9_-]{2,20})$/.test(s)) return false;
    return /[A-Za-zÀ-ÖØ-öø-ÿÅÄÖåäö]/.test(s);
  };

  async function translateDynamicUi(root = document) {
    const lang = current;
    if (lang === 'fi' || dynamicBusy) return;
    const run = ++dynamicRun;
    const nodes = [];
    const attrs = [];
    const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script,style,code,pre,[data-no-auto-i18n]')) return NodeFilter.FILTER_REJECT;
        return shouldTranslateText(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    (root.querySelectorAll?.('input[placeholder],textarea[placeholder],[title],[aria-label]') || []).forEach((el) => {
      ['placeholder','title','aria-label'].forEach((name) => {
        const value = el.getAttribute(name);
        if (shouldTranslateText(value) && !el.matches('[data-no-auto-i18n]')) attrs.push({el,name,value});
      });
    });

    const entries = [];
    nodes.forEach((node) => entries.push({kind:'text', node, value:String(node.nodeValue || '').trim()}));
    attrs.forEach((x) => entries.push({kind:'attr', ...x}));
    const missing = [...new Set(entries.map(x => x.value).filter(v => !dynamicCache.has(lang + '\\n' + v)))];
    if (!missing.length) {
      entries.forEach((x) => {
        const tr = dynamicCache.get(lang + '\\n' + x.value);
        if (!tr) return;
        if (x.kind === 'text' && x.node.isConnected) {
          const raw = x.node.nodeValue || '';
          const lead = raw.match(/^\\s*/)?.[0] || '';
          const tail = raw.match(/\\s*$/)?.[0] || '';
          x.node.nodeValue = lead + tr + tail;
        } else if (x.kind === 'attr' && x.el.isConnected) x.el.setAttribute(x.name, tr);
      });
      return;
    }

    dynamicBusy = true;
    try {
      for (let i = 0; i < missing.length; i += 80) {
        const batch = missing.slice(i, i + 80);
        const response = await fetch('/api/i18n/translate', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({lang,texts:batch,context:'authenticated Respondo dashboard UI; translate every visible Finnish UI string naturally and preserve product names, URLs, emails, numbers and placeholders'})
        });
        if (!response.ok) continue;
        const data = await response.json().catch(() => ({}));
        (data.translations || []).forEach((tr, idx) => {
          if (tr) dynamicCache.set(lang + '\\n' + batch[idx], tr);
        });
      }
      if (run !== dynamicRun || current !== lang) return;
      entries.forEach((x) => {
        const tr = dynamicCache.get(lang + '\\n' + x.value);
        if (!tr) return;
        if (x.kind === 'text' && x.node.isConnected) {
          const raw = x.node.nodeValue || '';
          const lead = raw.match(/^\\s*/)?.[0] || '';
          const tail = raw.match(/\\s*$/)?.[0] || '';
          x.node.nodeValue = lead + tr + tail;
        } else if (x.kind === 'attr' && x.el.isConnected) x.el.setAttribute(x.name, tr);
      });
    } catch (_) {
      // Keep the original Finnish text if the translation service is temporarily unavailable.
    } finally {
      dynamicBusy = false;
    }
  }

  function scheduleDynamicTranslation() {
    clearTimeout(dynamicTimer);
    dynamicTimer = setTimeout(() => translateDynamicUi(document), 30);
  }

  const observer = new MutationObserver((mutations) => {
    if (current === 'fi' || dynamicBusy) return;
    if (mutations.some(m => m.addedNodes.length || m.type === 'characterData')) scheduleDynamicTranslation();
  });

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    observer.observe(document.body, {subtree:true,childList:true,characterData:true});
    scheduleDynamicTranslation();
  });
  window.addEventListener('respondo:languagechange', () => {
    // app.js already rerenders on language change; translate the complete resulting view.
    scheduleDynamicTranslation();
  });
})();
