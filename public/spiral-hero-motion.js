/* Respondo cinematic orbit: scroll-driven camera choreography, on-demand frames only.
   Uses a single RAF for scroll; native scrolling, reduced-motion and low-memory fallback. */
(() => {
  'use strict';
  if (location.pathname !== '/') return;
  const app = document.getElementById('app');
  if (!app) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  let section = null, cards = [], raf = 0, pendingMount = false;
  let currentStep = -1, stickyFailed = false;
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
        for (const name of ['--rs-x','--rs-y','--rs-z','--rs-scale','--rs-rot','--rs-opacity'])
          card.style.removeProperty(name);
        card.style.removeProperty('z-index');
      }
      for (const name of ['--rs-intro-opacity','--rs-orbit-turn','--rs-orbit-scale',
        '--rs-orbit-x','--rs-orbit-y','--rs-logo-scale','--rs-logo-turn','--rs-grid-shift'])
        section.style.removeProperty(name);
    }
    section = null; cards = []; currentStep = -1; stickyFailed = false;
  }
  function setup() {
    pendingMount = false;
    const next = app.querySelector('.apple-home-page .rs-spiral-section');
    if (next === section && section && section.isConnected &&
        section.classList.contains('rs-enhanced') === !safeStaticMode()) return;
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
    if (counter) counter.textContent = String(index + 1).padStart(2,'0');
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
    // iOS Safari sometimes loses sticky when an ancestor clips horizontal overflow.
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
    const raw = normalized * (cards.length - 1);
    const segment = Math.min(cards.length - 2, Math.floor(raw));
    const fraction = raw >= cards.length - 1 ? 1 : raw - segment;
    const position = mobile ? segment + ease((fraction - .06) / .88) : raw;
    const active = clamp(Math.round(position), 0, cards.length - 1);
    updateStep(active);

    // Camera tilts and glides between scenes while the official arrow anchors
    // the composition. Icons follow the orbit, cards travel in front and behind.
    section.style.setProperty('--rs-intro-opacity', (1 - ease((position - .1) / .85)).toFixed(3));
    section.style.setProperty('--rs-orbit-turn', (-12 + position * 30).toFixed(2) + 'deg');
    section.style.setProperty('--rs-orbit-scale', (1 + .12 * Math.sin(position * 1.25)).toFixed(3));
    section.style.setProperty('--rs-orbit-x', (Math.sin(position * .85) * (mobile ? 16 : 42)).toFixed(1) + 'px');
    section.style.setProperty('--rs-orbit-y', (Math.cos(position * 1.05) * (mobile ? 8 : 21)).toFixed(1) + 'px');
    section.style.setProperty('--rs-logo-scale', (1 + .09 * Math.sin(position * 1.1)).toFixed(3));
    section.style.setProperty('--rs-logo-turn', (Math.sin(position * 1.1) * 7).toFixed(2) + 'deg');
    section.style.setProperty('--rs-grid-shift', (-position * (mobile ? 16 : 30)).toFixed(1) + 'px');

    cards.forEach((card, index) => {
      const offset = index - position;
      const distance = Math.abs(offset);
      const visible = distance < 1.32;
      card.classList.toggle('rs-in-scene', visible);
      if (!visible) return;
      const x = Math.sin(offset * 1.05) * (mobile ? Math.min(innerWidth * .54, 230) : Math.min(innerWidth * .28, 390));
      const y = (1 - Math.cos(offset * 1.15)) * (mobile ? 42 : 92) + Math.sin(position * .6) * (mobile ? 5 : 15);
      const depth = -Math.min(distance * (mobile ? 105 : 210), 250);
      const scale = 1 - Math.min(.38, distance * .27);
      const opacity = 1 - ease(distance / 1.32) * .96;
      card.style.setProperty('--rs-x', x.toFixed(1) + 'px');
      card.style.setProperty('--rs-y', y.toFixed(1) + 'px');
      card.style.setProperty('--rs-z', depth.toFixed(1) + 'px');
      card.style.setProperty('--rs-scale', scale.toFixed(3));
      card.style.setProperty('--rs-rot', (-offset * (mobile ? 20 : 29)).toFixed(1) + 'deg');
      card.style.setProperty('--rs-opacity', opacity.toFixed(3));
      card.style.zIndex = String(7 - Math.round(distance * 3));
    });
  }
  function schedule() {
    if (!raf && section && section.isConnected && section.classList.contains('rs-enhanced'))
      raf = requestAnimationFrame(draw);
  }
  function queueMount() {
    if (pendingMount) return;
    pendingMount = true;
    requestAnimationFrame(setup);
  }
  new MutationObserver(queueMount).observe(app, { childList:true });
  addEventListener('scroll', schedule, { passive:true });
  addEventListener('resize', () => { queueMount(); schedule(); }, { passive:true });
  addEventListener('pageshow', schedule, { passive:true });
  addEventListener('respondo:languagechange', queueMount, { passive:true });
  if (typeof motion.addEventListener === 'function')
    motion.addEventListener('change', () => { teardown(); queueMount(); });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', queueMount, { once:true });
  else queueMount();
})();
