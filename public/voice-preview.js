(() => {
  'use strict';
  // Free speech-to-text through the visitor's browser, not a paid Respondo API.
  // Some browsers send microphone audio to their speech-recognition provider.
  // The Respondo chat receives only the text submitted by the visitor.
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass || !window.isSecureContext) return;

  const translations = {
    fi: {
      speak: 'Puhu kysymyksesi', stop: 'Lopeta puhuminen',
      listening: 'Kuunnellaan…', processing: 'Viimeistellään puhetta…',
      review: 'Tarkista teksti ja lähetä.', noSpeech: 'Puhetta ei tunnistettu. Yritä uudelleen.',
      permission: 'Mikrofonin käyttö estetty. Salli mikrofoni selaimesta.',
      microphone: 'Mikrofonia ei löytynyt.',
      unavailable: 'Puheentunnistus ei ole käytettävissä juuri nyt.',
      failed: 'Puheentunnistus epäonnistui. Kirjoita kysymyksesi.',
      privacy: 'Puhe voidaan käsitellä selaimesi puhepalvelussa.'
    },
    sv: {
      speak: 'Ställ din fråga med rösten', stop: 'Sluta tala',
      listening: 'Lyssnar…', processing: 'Bearbetar tal…',
      review: 'Kontrollera texten och skicka.', noSpeech: 'Inget tal kunde identifieras. Försök igen.',
      permission: 'Mikrofonen är blockerad. Ge åtkomst i webbläsaren.',
      microphone: 'Ingen mikrofon hittades.',
      unavailable: 'Taligenkänning är inte tillgänglig just nu.',
      failed: 'Taligenkänningen misslyckades. Skriv din fråga.',
      privacy: 'Tal kan behandlas av webbläsarens taltjänst.'
    },
    en: {
      speak: 'Speak your question', stop: 'Stop voice input',
      listening: 'Listening…', processing: 'Finishing speech recognition…',
      review: 'Review the text and press send.', noSpeech: 'No speech was detected. Try again.',
      permission: 'Microphone access was blocked. Enable it in your browser.',
      microphone: 'No microphone was found.',
      unavailable: 'Speech recognition is unavailable right now.',
      failed: 'Speech recognition failed. Please type your question.',
      privacy: 'Your browser speech service may process the audio.'
    }
  };
  const style = document.createElement('style');
  style.textContent = [
    '#app #previewForm .respondo-voice-input-wrap{display:block;position:relative;min-width:0;width:100%}',
    '#app #previewForm .respondo-voice-input-wrap>input{width:100%!important;padding-right:110px!important}',
    '#app #previewForm .respondo-voice-lang-picker{position:absolute!important;top:50%!important;right:54px!important;transform:translateY(-50%)!important;display:block!important;width:47px!important;height:40px!important;min-height:40px!important;padding:0 4px!important;background:#f2f3f5!important;border:1px solid #dde1e8!important;border-radius:11px!important;color:#252830!important;font-size:11px!important;font-weight:750!important;z-index:2}',
    '#app #previewForm .respondo-voice-lang-picker:focus-visible{outline:3px solid #555!important;outline-offset:2px}',
    '#app #previewForm .respondo-voice-preview-btn{position:absolute!important;top:50%!important;right:5px!important;transform:translateY(-50%)!important;display:grid!important;place-items:center!important;min-height:40px!important;height:40px!important;width:42px!important;border:1px solid #dde1e8!important;border-radius:11px!important;background:#fff!important;color:#252830!important;box-shadow:none!important;z-index:2}',
    '#app #previewForm .respondo-voice-preview-btn svg{height:19px;width:19px;display:block}',
    '#app #previewForm .respondo-voice-preview-btn.listening{background:#fee8e5!important;color:#ab2419!important;border-color:#edada6!important}',
    '#app #previewForm .respondo-voice-preview-btn:focus-visible{outline:3px solid #555!important;outline-offset:2px}',
    '#app .respondo-voice-preview-note{padding:0 16px 8px;background:#fff;color:#566170;font-size:12px;line-height:1.4}',
    '#app .respondo-voice-preview-note[hidden]{display:none!important}'
  ].join('\n');
  document.head.appendChild(style);

  function language() {
    let saved = '';
    try { saved = localStorage.getItem('respondo_lang') || ''; } catch {}
    const params = new URLSearchParams(window.location.search);
    const value = String(params.get('lang') || document.documentElement.lang || saved || 'en').toLowerCase().split('-')[0];
    return ['fi', 'sv', 'en'].includes(value) ? value : 'en';
  }
  // Speech recognition is a separate setting from the visual dashboard language.
  const speechStorageKey = 'respondo_voice_language_v1';
  function initialSpeechLanguage() {
    try {
      const saved = localStorage.getItem(speechStorageKey);
      if (['fi','sv','en'].includes(saved)) return saved;
    } catch {}
    const browser = String(navigator.language || '').toLowerCase().split('-')[0];
    if (browser === 'fi' || browser === 'sv') return browser;
    // Finnish business sites prefer Finnish speech, even in the English UI.
    if (window.location.hostname.toLowerCase().endsWith('.fi')) return 'fi';
    return ['fi','sv','en'].includes(browser) ? browser : language();
  }
  let activeForm = null;
  let activeController = null;

  function attach(form) {
    const input = form.querySelector('input[name="question"]');
    if (!input || input.closest('.respondo-voice-input-wrap')) return null;

    const wrap = document.createElement('span');
    wrap.className = 'respondo-voice-input-wrap';
    input.before(wrap);
    wrap.appendChild(input);
    const voiceLanguageSelect = document.createElement('select');
    voiceLanguageSelect.className = 'respondo-voice-lang-picker';
    voiceLanguageSelect.setAttribute('aria-label', 'Speech recognition language / Puheen kieli / Talspråk');
    voiceLanguageSelect.title = 'Speech recognition language / Puheen kieli / Talspråk';
    [['fi','FI'],['sv','SV'],['en','EN']].forEach(([value,label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      voiceLanguageSelect.appendChild(option);
    });
    voiceLanguageSelect.value = initialSpeechLanguage();
    wrap.appendChild(voiceLanguageSelect);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'respondo-voice-preview-btn';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>';
    button.setAttribute('aria-pressed', 'false');
    wrap.appendChild(button);
    const note = document.createElement('div');
    note.className = 'respondo-voice-preview-note';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    note.hidden = true;
    form.after(note);

    let recognition = null;
    let originalText = '';
    function showNote(message) {
      note.textContent = message || '';
      note.hidden = !message;
    }
    function resetButton() {
      input.readOnly = false;
      button.classList.remove('listening');
      button.setAttribute('aria-pressed', 'false');
      const label = translations[language()].speak;
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    function cancel() {
      const current = recognition;
      recognition = null;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        try { current.abort(); } catch {}
      }
      resetButton();
    }
    resetButton();
    voiceLanguageSelect.addEventListener('change', () => {
      cancel();
      showNote('');
      delete input.dataset.respondoVoiceLang;
      try { localStorage.setItem(speechStorageKey, voiceLanguageSelect.value); } catch {}
    });

    button.addEventListener('click', () => {
      const words = translations[language()];
      if (recognition) {
        showNote(words.processing);
        try { recognition.stop(); } catch { cancel(); }
        return;
      }
      if (input.disabled) return;
      let current;
      try { current = new SpeechRecognitionClass(); }
      catch { showNote(words.unavailable); return; }
      recognition = current;
      originalText = input.value.trim();
      let transcript = '';
      let failed = false;
      current.lang = { fi: 'fi-FI', sv: 'sv-SE', en: 'en-US' }[voiceLanguageSelect.value];
      current.continuous = false;
      current.interimResults = true;
      current.maxAlternatives = 1;
      current.onresult = event => {
        if (recognition !== current) return;
        let finalText = '', interimText = '';
        for (let i = 0; i < event.results.length; i++) {
          const text = String(event.results[i]?.[0]?.transcript || '').trim();
          if (event.results[i].isFinal) finalText += (finalText ? ' ' : '') + text;
          else interimText += (interimText ? ' ' : '') + text;
        }
        transcript = [finalText, interimText].filter(Boolean).join(' ').trim();
        input.value = [originalText, transcript].filter(Boolean).join(' ');
        if (transcript) input.dataset.respondoVoiceLang = voiceLanguageSelect.value;
      };
      current.onerror = event => {
        if (recognition !== current) return;
        failed = true;
        const error = String(event?.error || '');
        const message = error === 'not-allowed' || error === 'service-not-allowed' ? words.permission
          : error === 'audio-capture' ? words.microphone
          : error === 'no-speech' ? words.noSpeech
          : error === 'network' || error === 'language-not-supported' ? words.unavailable
          : words.failed;
        if (error !== 'aborted') showNote(message);
      };
      current.onend = () => {
        if (recognition !== current) return;
        recognition = null;
        resetButton();
        if (!transcript) {
          input.value = originalText;
          delete input.dataset.respondoVoiceLang;
        }
        if (!failed) showNote(transcript ? words.review : words.noSpeech);
      };
      input.readOnly = true;
      button.classList.add('listening');
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('aria-label', words.stop);
      button.title = words.stop;
      showNote(words.listening + ' ' + words.privacy);
      try { current.start(); } catch { cancel(); showNote(words.unavailable); }
    });

    // The existing chat form handles user-reviewed transcribed text unchanged.
    form.addEventListener('submit', () => {
      cancel();
      showNote('');
    }, { capture: true });
    return { cancel };
  }

  function scan() {
    const nextForm = document.querySelector('#previewForm');
    if (nextForm === activeForm) return;
    if (activeController) activeController.cancel();
    activeForm = nextForm;
    activeController = nextForm ? attach(nextForm) : null;
  }
  function init() {
    const root = document.getElementById('app') || document.body;
    if (!root) return;
    new MutationObserver(scan).observe(root, { childList: true, subtree: true });
    scan();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('pagehide', () => { if (activeController) activeController.cancel(); });
})();
