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
  let icons = [];
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
      section.classList.remove('rs-enhanced', 'rs-fixed-fallback', 'rs-fixed-end', 'rs-intro-past');
      for (const key of ['--rs-progress','--rs-orbit-fill','--rs-light-shift','--rs-light-scale','--rs-light-strength']) section.style.removeProperty(key);
      for (const icon of icons) icon.classList.remove('is-active');
      for (const card of cards) {
        card.classList.remove('rs-in-scene');
        card.removeAttribute('aria-hidden');
        for (const name of ['--rs-panel-x','--rs-panel-y','--rs-panel-turn','--rs-panel-roll','--rs-panel-depth','--rs-panel-scale','--rs-opacity']) card.style.removeProperty(name);
        card.style.removeProperty('z-index');
      }
    }
    section = null;
    cards = [];
    icons = [];
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
    icons = Array.from(next.querySelectorAll('[data-rs-icon]'));
    if (cards.length < 2 || safeStaticMode()) return;
    section.classList.add('rs-enhanced');
    draw();
  }
  function updateStep(index) {
    if (index === currentStep) return;
    currentStep = index;
    section.classList.toggle('rs-intro-past', index > 0);
    const counter = section.querySelector('[data-rs-step]');
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    // One active-chapter caption shares its index and language with the visible
    // feature. This text is decorative; the card heading is still accessible.
    const orbitIndex = section.querySelector('[data-rs-orbit-index]');
    if (orbitIndex) orbitIndex.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
    const orbitTitle = section.querySelector('[data-rs-orbit-title]');
    if (orbitTitle) orbitTitle.textContent = cards[index].querySelector('h2')?.textContent || '';
    const nextCue = section.querySelector('[data-rs-next]');
    if (nextCue) nextCue.textContent = cards[index].getAttribute('data-rs-next-label') || '';
    const announced = section.querySelector('[data-rs-announcement]');
    if (announced) announced.textContent = cards[index].querySelector('h2')?.textContent || '';
    cards.forEach((card, i) => card.setAttribute('aria-hidden', String(i !== index)));
    // The orbit and story share the same index. Highlight only the icon
    // corresponding to the panel currently nearest the scroll position.
    icons.forEach((icon, i) => icon.classList.toggle('is-active', i === index));
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
      const curve = ease(distance);
      // A feature passes inward towards the Respondo arrow as it leaves.
      // The next chapter rises from the outer edge of the orbit. The smaller
      // mobile arc avoids moving text under Safari's floating chat launcher.
      const cleanDesktop = !mobile && innerWidth >= 1100;
      const zoom = cleanDesktop ? 1 : (entering ? .83 + .17 * focus : 1 - .25 * curve);
      const shiftX = cleanDesktop ? 0 : entering
        ? -(mobile ? 12 : 62) * curve
        : (mobile ? 34 : Math.min(320, innerWidth * .22)) * curve;
      const shiftY = cleanDesktop ? (entering ? 24 : -24) * curve : entering ? (mobile ? 62 : 95) * curve : -(mobile ? 100 : 74) * curve;
      const turn = cleanDesktop ? 0 : entering ? -(mobile ? 6 : 17) * curve : (mobile ? 7 : 26) * curve;
      const roll = entering ? 3 * curve : -7 * curve;
      const depth = -(entering ? 105 : 240) * curve;
      const alpha = entering ? Math.pow(focus, 1.2) : Math.pow(focus, .9);
      panel.style.setProperty('--rs-panel-y', shiftY.toFixed(1) + 'px');
      panel.style.setProperty('--rs-panel-x', shiftX.toFixed(1) + 'px');
      panel.style.setProperty('--rs-panel-turn', turn.toFixed(2) + 'deg');
      panel.style.setProperty('--rs-panel-roll', roll.toFixed(2) + 'deg');
      panel.style.setProperty('--rs-panel-depth', depth.toFixed(1) + 'px');
      panel.style.setProperty('--rs-panel-scale', zoom.toFixed(3));
      panel.style.setProperty('--rs-opacity', alpha.toFixed(3));
      panel.style.zIndex = index === closestIndex ? '6' : '5';
    });
    // The official arrow and its constellation travel away from the camera
    // over the first transition; the perspective grid continues across scenes.
    const opening = 1 - ease(clamp(position / 1.05, 0, 1));
    const orbitFlight = ease(clamp(position / 1.75, 0, 1));
    section.style.setProperty('--rs-intro-opacity', opening.toFixed(3));
    section.style.setProperty('--rs-logo-opacity', (.24 + .72 * opening).toFixed(3));
    section.style.setProperty('--rs-logo-scale', (1 + .09 * orbitFlight).toFixed(3));
    section.style.setProperty('--rs-arrow-turn', (-9 * orbitFlight).toFixed(2) + 'deg');
    // Keep the icon sphere in view throughout all chapters; formerly it
    // faded out after chapter one, so later icons could not track the story.
    section.style.setProperty('--rs-orbit-opacity', (.96 - .035 * orbitFlight).toFixed(3));
    // Avoid the old 1.95x zoom that pushed half the constellation off
    // iPhone screens. Small camera breathing makes all ten icons visible.
    const breathing = Math.sin(position * .65) * (mobile ? .035 : .055);
    section.style.setProperty('--rs-orbit-scale', (1 + .09 * orbitFlight + breathing).toFixed(3));
    // Each successive icon occupies one equally spaced sector of the sphere.
    // Counter-rotation keeps SVG glyphs upright as the active one reaches top.
    const iconAngle = 360 / cards.length;
    section.style.setProperty('--rs-orbit-spin', (-iconAngle * position).toFixed(2) + 'deg');
    section.style.setProperty('--rs-icon-upright', (iconAngle * position).toFixed(2) + 'deg');
    section.style.setProperty('--rs-orbit-tilt', ((mobile ? 8 : 14) * orbitFlight).toFixed(2) + 'deg');
    section.style.setProperty('--rs-grid-angle', (-14 * position).toFixed(2) + 'deg');
    section.style.setProperty('--rs-grid-scale', (1 + .17 * position).toFixed(3));
    section.style.setProperty('--rs-grid-shift', (-10 * position).toFixed(1) + 'px');
    section.style.setProperty('--rs-haze-scale', (1 + .1 * position).toFixed(3));
    section.style.setProperty('--rs-haze-opacity', (.9 - .06 * position).toFixed(3));
    // One static radial-light layer changes only compositor-friendly transforms,
    // making each chapter feel photographed from a new camera angle.
    section.style.setProperty('--rs-light-shift', (Math.sin(position * .82) * (mobile ? 20 : 72)).toFixed(1) + 'px');
    section.style.setProperty('--rs-light-scale', (1 + Math.sin(position * .54) * .065).toFixed(3));
    section.style.setProperty('--rs-light-strength', (.68 + .13 * Math.cos(position * .72)).toFixed(3));
    section.style.setProperty('--rs-sweep-x', (-85 + position * 22).toFixed(1) + '%');
    section.style.setProperty('--rs-art-rotation', (-16 * position).toFixed(2) + 'deg');
    section.style.setProperty('--rs-art-scale', (1 + .075 * position).toFixed(3));
    section.style.setProperty('--rs-art-opacity', mobile ? '.19' : '.26');
    section.style.setProperty('--rs-progress', normalized.toFixed(4));
    // A single stroke around the orbit shows progress without an animated loop,
    // scroll interception, or an extra painted full-screen overlay.
    section.style.setProperty('--rs-orbit-fill', (normalized * 100).toFixed(2));
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