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
        for (const name of ['--rs-panel-x','--rs-panel-y','--rs-panel-turn','--rs-panel-scale','--rs-opacity']) card.style.removeProperty(name);
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
  // Reference-film camera: scrolling moves the camera through the orbit,
  // rings and feature scenes rather than swapping flat, stationary slides.
  // There is no continuous loop: transforms update once per native scroll frame.
  function draw() {
    raf = 0;
    if (!section || !section.isConnected || !section.classList.contains('rs-enhanced')) return;
    const rect = section.getBoundingClientRect();
    const viewport = Math.max(innerHeight, 1);
    if (rect.bottom < -70 || rect.top > viewport + 70) return;
    const mobile = coarse.matches || innerWidth < 760;
    // On iOS Safari, preserve the existing sticky-position fallback.
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
    const position = normalized * (cards.length - 1);
    const closestIndex = clamp(Math.round(position), 0, cards.length - 1);
    updateStep(closestIndex);

    // Near-camera scenes grow towards the viewer and drift out sideways.
    // Next scenes emerge small and slightly rotated from the opposite depth.
    cards.forEach((panel, index) => {
      const offset = index - position;
      const distance = Math.abs(offset);
      const visible = distance < 1.001;
      panel.classList.toggle('rs-in-scene', visible);
      if (!visible) return;
      const focus = 1 - ease(distance);
      const entering = offset >= 0;
      const zoom = entering ? .76 + .24 * focus : 1 + .30 * ease(distance);
      const shift = (mobile ? 42 : 105) * (1 - focus);
      panel.style.setProperty('--rs-panel-y', (entering ? shift : -shift).toFixed(1) + 'px');
      panel.style.setProperty('--rs-panel-x', ((entering ? 1 : -1) * (mobile ? 18 : 65) * (1 - focus)).toFixed(1) + 'px');
      panel.style.setProperty('--rs-panel-turn', ((entering ? -1 : 1) * (mobile ? 4 : 12) * (1 - focus)).toFixed(2) + 'deg');
      panel.style.setProperty('--rs-panel-scale', zoom.toFixed(3));
      panel.style.setProperty('--rs-opacity', focus.toFixed(3));
      panel.style.zIndex = index === closestIndex ? '6' : '5';
    });
    // The official arrow and its constellation travel away from the camera
    // over the first transition; the perspective grid continues across scenes.
    const opening = 1 - ease(clamp(position / 1.05, 0, 1));
    const orbitFlight = ease(clamp(position / 1.75, 0, 1));
    section.style.setProperty('--rs-intro-opacity', opening.toFixed(3));
    section.style.setProperty('--rs-logo-opacity', (.065 + .91 * opening).toFixed(3));
    section.style.setProperty('--rs-logo-scale', (1 + .56 * orbitFlight).toFixed(3));
    section.style.setProperty('--rs-arrow-turn', (-9 * orbitFlight).toFixed(2) + 'deg');
    section.style.setProperty('--rs-orbit-opacity', opening.toFixed(3));
    section.style.setProperty('--rs-orbit-scale', (1 + .95 * orbitFlight).toFixed(3));
    section.style.setProperty('--rs-orbit-spin', (-58 * orbitFlight).toFixed(2) + 'deg');
    section.style.setProperty('--rs-orbit-tilt', (22 * orbitFlight).toFixed(2) + 'deg');
    section.style.setProperty('--rs-grid-angle', (-14 * position).toFixed(2) + 'deg');
    section.style.setProperty('--rs-grid-scale', (1 + .17 * position).toFixed(3));
    section.style.setProperty('--rs-grid-shift', (-10 * position).toFixed(1) + 'px');
    section.style.setProperty('--rs-haze-scale', (1 + .1 * position).toFixed(3));
    section.style.setProperty('--rs-haze-opacity', (.9 - .06 * position).toFixed(3));
    section.style.setProperty('--rs-sweep-x', (-85 + position * 22).toFixed(1) + '%');
    section.style.setProperty('--rs-art-rotation', (-16 * position).toFixed(2) + 'deg');
    section.style.setProperty('--rs-art-scale', (1 + .075 * position).toFixed(3));
    section.style.setProperty('--rs-art-opacity', mobile ? '.30' : '.44');
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