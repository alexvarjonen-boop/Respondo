/* Home-page navigation is conversational: the hero talks to the EXISTING
   first-party Respondo site assistant. No parallel chatbot or API path is created.
   One delegated listener survives language switches and SPA redraws. */
(() => {
  'use strict';
  if (location.pathname !== '/') return;

  const ui = (fi, sv, en) => {
    const lang = (document.documentElement.lang || 'fi').toLowerCase().slice(0, 2);
    return lang === 'sv' ? sv : lang === 'en' ? en : fi;
  };
  function notice(node, message) {
    const panel = node?.closest('.rs-chat-entry') || document.querySelector('#app .rs-chat-entry');
    const status = panel?.querySelector('[data-respondo-ask-status]');
    if (status) status.textContent = message;
  }
  function forwardToRespondo(question, source) {
    const clean = String(question || '').trim();
    if (!clean) {
      notice(source, ui('Kirjoita kysymys, niin vastaan chatissa.','Skriv en fråga så svarar jag i chatten.','Type your question to get an answer in chat.'));
      return false;
    }
    const launch = document.querySelector('.fx-assistant-launch');
    const panel = document.getElementById('respondo-site-chat');
    const form = panel?.querySelector('.fx-assistant-form');
    const message = form?.elements?.namedItem('message');
    if (!launch || !panel || !form || !message) {
      notice(source, ui('Chat käynnistyy. Kokeile uudelleen hetken päästä.','Chatten startar. Försök igen om en stund.','Chat is starting. Please try again shortly.'));
      return false;
    }
    if (message.disabled) {
      notice(source, ui('Odota edellistä vastausta ja kysy sitten uudelleen.','Vänta på föregående svar och fråga igen.','Please wait for the current answer before asking again.'));
      if (!panel.classList.contains('open')) launch.click();
      return false;
    }
    if (!panel.classList.contains('open')) launch.click();
    message.value = clean;
    notice(source, '');
    // The existing assistant handles history, request validation, and
    // first-party navigation action buttons. Trigger its ordinary form handler.
    form.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
    return true;
  }
  document.addEventListener('submit', event => {
    const form = event.target.closest?.('[data-respondo-ask-form]');
    if (!form) return;
    event.preventDefault();
    const input = form.elements?.namedItem('question');
    if (forwardToRespondo(input?.value, form) && input) input.value = '';
  });
  document.addEventListener('click', event => {
    const action = event.target.closest?.('[data-respondo-ask-question]');
    if (!action) return;
    event.preventDefault();
    forwardToRespondo(action.getAttribute('data-respondo-ask-question'), action);
  });
})();
