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
  document.addEventListener('DOMContentLoaded', () => apply());
})();
