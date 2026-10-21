/* Scroll-driven Respondo helix: ONE on-demand animation frame, at most 3 visible cards.
   Preserves native scroll, supports old iPhones, and leaves all other pages untouched. */
(() => {
  'use strict';
  if (location.pathname !== '/') return;
  const app = document.getElementById('app');
  if (!app) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  let section = null;
  let cards = [];
  let raf = 0;
  let pendingMount = false;
  let currentStep = -1;
  let stickyFailed = false;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  function safeStaticMode() {
    return motion.matches ||
      Boolean(navigator.connection && navigator.connection.saveData) ||
      (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2) ||
      innerHeight < 430;
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (section) {
      section.classList.remove('rs-enhanced', 'rs-fixed-fallback', 'rs-fixed-end');
      for (const card of cards) {
        card.classList.remove('rs-in-scene');
        card.removeAttribute('aria-hidden');
        for (const name of ['--rs-panel-y','--rs-panel-scale','--rs-opacity']) card.style.removeProperty(name);
        card.style.removeProperty('z-index');
      }
    }
    section = null;
    cards = [];
    currentStep = -1;
    stickyFailed = false;
  }
  function setup() {
    pendingMount = false;
    const next = app.querySelector('.apple-home-page .rs-spiral-section');
    if (next === section && section && section.isConnected && section.classList.contains('rs-enhanced') === !safeStaticMode()) return;
    teardown();
    if (!next) return;
    section = next;
    cards = Array.from(next.querySelectorAll('[data-rs-card]'));
    if (cards.length < 2 || safeStaticMode()) return;
    section.classList.add('rs-enhanced');
    draw();
  }
  function updateStep(index) {
    if (index === currentStep) return;
    currentStep = index;
    const counter = section.querySelector('[data-rs-step]');
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    const announced = section.querySelector('[data-rs-announcement]');
    if (announced) announced.textContent = cards[index].querySelector('h2')?.textContent || '';
    cards.forEach((card, i) => card.setAttribute('aria-hidden', String(i !== index)));
  }
  function draw() {
    raf = 0;
    if (!section || !section.isConnected || !section.classList.contains('rs-enhanced')) return;
    const rect = section.getBoundingClientRect();
    const viewport = Math.max(innerHeight, 1);
    if (rect.bottom < -70 || rect.top > viewport + 70) return;
    const mobile = coarse.matches || innerWidth < 760;
    // iOS Safari can treat overflow-x:hidden as a scrolling ancestor, preventing
    // position:sticky from pinning the scene. Only fix-position if it actually fails.
    if (mobile) {
      const stage = section.querySelector('.rs-spiral-stage');
      if (!stickyFailed && rect.top < -32 && rect.bottom > viewport + 32 &&
          stage && stage.getBoundingClientRect().top < -32) stickyFailed = true;
      const fallbackActive = stickyFailed && rect.top < -1;
      section.classList.toggle('rs-fixed-fallback', fallbackActive);
      section.classList.toggle('rs-fixed-end', fallbackActive && rect.bottom <= viewport);
    }
    const travel = Math.max(1, rect.height - viewport);
    const normalized = clamp(-rect.top / travel, 0, 1);
    const rawPosition = normalized * (cards.length - 1);
    // A short mobile reading hold followed by a broad smooth transition.
    // With a ~400px segment, one swipe reveals the next feature without
    // trapping native scroll. The sequence is reversible in both directions.
    const segment = Math.min(cards.length - 2, Math.floor(rawPosition));
    const fraction = rawPosition >= cards.length - 1 ? 1 : rawPosition - segment;
    const position = mobile ? segment + ease((fraction - .42) / .58) : rawPosition;
    const closestIndex = clamp(Math.round(position), 0, cards.length - 1);
    updateStep(closestIndex);
    // Full-viewport feature chapters: one story at a time, with a short
    // reversible crossfade between adjacent chapters. No floating cards.
    cards.forEach((panel, index) => {
      const offset = index - position;
      const distance = Math.abs(offset);
      const visible = distance < 1.001;
      panel.classList.toggle('rs-in-scene', visible);
      if (!visible) return;
      const focus = 1 - ease(distance);
      const movement = Math.min(viewport * .12, mobile ? 66 : 115);
      panel.style.setProperty('--rs-panel-y', (offset * movement).toFixed(1) + 'px');
      panel.style.setProperty('--rs-panel-scale', (.965 + focus * .035).toFixed(3));
      panel.style.setProperty('--rs-opacity', focus.toFixed(3));
      panel.style.zIndex = index === closestIndex ? '6' : '5';
    });
    // The large hero statement belongs to chapter one; after that, leave
    // the entire viewport to the next feature instead of repeating a header.
    section.style.setProperty('--rs-intro-opacity',
      (1 - ease(position * 1.17)).toFixed(3));
    section.style.setProperty('--rs-logo-scale',
      (1 + ease(normalized) * .035).toFixed(3));
  }
  function schedule() {
    if (!raf && section && section.isConnected && section.classList.contains('rs-enhanced')) raf = requestAnimationFrame(draw);
  }
  function queueMount() {
    if (pendingMount) return;
    pendingMount = true;
    requestAnimationFrame(setup);
  }
  // Only watch root replacement (navigation/language), not animated child styles.
  new MutationObserver(queueMount).observe(app, { childList:true });
  addEventListener('scroll', schedule, { passive:true });
  addEventListener('resize', () => { queueMount(); schedule(); }, { passive:true });
  addEventListener('pageshow', schedule, { passive:true });
  addEventListener('respondo:languagechange', queueMount, { passive:true });
  if (typeof motion.addEventListener === 'function') motion.addEventListener('change', () => { teardown(); queueMount(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queueMount, { once:true });
  else queueMount();
})();