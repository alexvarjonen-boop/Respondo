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
      section.classList.remove('rs-enhanced');
      for (const card of cards) {
        card.classList.remove('rs-in-scene');
        card.removeAttribute('aria-hidden');
        for (const name of ['--rs-x','--rs-y','--rs-scale','--rs-opacity']) card.style.removeProperty(name);
        card.style.removeProperty('z-index');
      }
    }
    section = null;
    cards = [];
    currentStep = -1;
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
    const travel = Math.max(1, rect.height - viewport);
    const normalized = clamp(-rect.top / travel, 0, 1);
    const position = normalized * (cards.length - 1);
    const closestIndex = clamp(Math.round(position), 0, cards.length - 1);
    updateStep(closestIndex);
    const mobile = coarse.matches || innerWidth < 760;
    const radius = mobile ? Math.min(innerWidth * 0.32, 170) : Math.min(innerWidth * 0.24, 325);
    const frontY = viewport < 660 ? 86 : mobile ? Math.min(105,viewport * .14) : Math.min(115,viewport * .135);
    // Increasing angle sends the current card counterclockwise toward the
    // left and behind the fixed center logo; the next appears from the right.
    cards.forEach((card, index) => {
      const delta = position - index;
      const near = Math.abs(delta) < (mobile ? 1.04 : 1.20);
      card.classList.toggle('rs-in-scene', near);
      if (!near) return;
      const angle = delta * 2.15;
      const depth = (Math.cos(angle) + 1) / 2;
      const x = -Math.sin(angle) * radius;
      const y = frontY - (1 - depth) * (mobile ? 88 : 136) - Math.sin(angle * .65) * (mobile ? 13 : 23);
      const scale = (mobile ? .74 : .69) + depth * (mobile ? .24 : .31);
      const opacity = clamp(.12 + .88 * depth, 0, 1);
      card.style.setProperty('--rs-x', x.toFixed(1) + 'px');
      card.style.setProperty('--rs-y', y.toFixed(1) + 'px');
      card.style.setProperty('--rs-scale', scale.toFixed(3));
      card.style.setProperty('--rs-opacity', opacity.toFixed(3));
      card.style.zIndex = depth > .62 ? '6' : '2';
    });
    section.style.setProperty('--rs-logo-scale', (1 + ease(normalized) * .04).toFixed(3));
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