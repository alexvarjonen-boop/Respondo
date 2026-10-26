/* Light, accessible showroom controls for the existing scroll-driven homepage.
   Uses the existing seven chapters; no extra chatbot, fetches or animation loop. */
(() => {
  'use strict';
  if (location.pathname !== '/') return;
  const app = document.getElementById('app');
  if (!app) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = ['support','languages','knowledge','growth','support','support','growth'];
  const groups = {support:'0',knowledge:'2',languages:'1',growth:'3'};
  let host = null;
  let watchedCounter = null;
  let counterObserver = null;
  let pending = false;
  function update() {
    if (!host || !host.isConnected) return;
    const numeric = Number.parseInt(watchedCounter?.textContent || '01', 10);
    const step = Number.isFinite(numeric) ? Math.max(0,Math.min(scenes.length-1,numeric-1)) : 0;
    host.dataset.raCurrent = String(step);
    host.dataset.raScene = scenes[step];
    host.querySelectorAll('[data-ra-tab]').forEach(button => {
      button.setAttribute('aria-current',String(button.dataset.raTab === groups[scenes[step]]));
    });
  }
  function mount() {
    pending = false;
    const next = app.querySelector('[data-ra-design="architectural"]');
    if (next === host && host?.isConnected) return;
    if (counterObserver) counterObserver.disconnect();
    counterObserver = null;
    host = next;
    watchedCounter = next?.querySelector('[data-rs-step]') || null;
    if (!host) return;
    if (watchedCounter) {
      counterObserver = new MutationObserver(update);
      counterObserver.observe(watchedCounter,{childList:true,characterData:true,subtree:true});
    }
    update();
  }
  function queueMount() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(mount);
  }
  // Deliberately do not intercept wheel, touchmove or native scroll.
  document.addEventListener('click',event => {
    const button = event.target.closest?.('[data-ra-tab]');
    if (!button) return;
    const section = button.closest('[data-ra-design="architectural"]');
    if (!section) return;
    const step = Math.max(0,Math.min(6,Number.parseInt(button.dataset.raTab || '0',10) || 0));
    if (!section.classList.contains('rs-enhanced')) {
      section.querySelectorAll('[data-rs-card]')[step]?.scrollIntoView({
        behavior: reduce.matches ? 'auto' : 'smooth', block:'start'
      });
      section.dataset.raScene=scenes[step];
      return;
    }
    const rect = section.getBoundingClientRect();
    const travel = Math.max(0,rect.height-window.innerHeight);
    // Navigate within the existing film timeline. The motion director
    // still owns which chapter is visible at every scroll position.
    window.scrollTo({
      top:window.scrollY + rect.top + travel * step/(scenes.length-1),
      behavior:reduce.matches?'auto':'smooth'
    });
  });
  new MutationObserver(queueMount).observe(app,{childList:true});
  addEventListener('respondo:languagechange',queueMount,{passive:true});
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',queueMount,{once:true});
  else queueMount();
})();
