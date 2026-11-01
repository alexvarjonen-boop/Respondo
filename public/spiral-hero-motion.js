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
  let wheelGestureUsed = false;
  let wheelLastAt = 0;
  let wheelGestureReset = 0;
  let wheelDirection = 0;
  let transitionRaf = 0;

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
    if (transitionRaf) cancelAnimationFrame(transitionRaf);
    transitionRaf = 0;
    raf = 0;
    if (section) {
      section.classList.remove('rs-enhanced', 'rs-fixed-fallback', 'rs-fixed-end', 'rs-intro-past', 'rs-first-revealed');
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
    wheelGestureUsed = false;
    wheelLastAt = 0;
    wheelDirection = 0;
    if (wheelGestureReset) clearTimeout(wheelGestureReset);
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
    icons.forEach((icon, i) => {
      icon.classList.toggle('is-active', i === index);
      icon.setAttribute('aria-pressed', String(i === index));
    });
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
      // Desktop uses the same restrained depth arc as mobile, without large
      // 3D rotations or sideways text flights that degrade laptop rendering.
      const zoom = cleanDesktop ? (entering ? .91 + .09 * focus : 1 - .12 * curve)
        : (entering ? .83 + .17 * focus : 1 - .25 * curve);
      const shiftX = cleanDesktop ? (entering ? -13 : 20) * curve : entering
        ? -(mobile ? 12 : 62) * curve
        : (mobile ? 34 : Math.min(320, innerWidth * .22)) * curve;
      const shiftY = cleanDesktop ? (entering ? 44 : -49) * curve
        : entering ? (mobile ? 62 : 95) * curve : -(mobile ? 100 : 74) * curve;
      const turn = cleanDesktop ? (entering ? -3 : 4) * curve
        : entering ? -(mobile ? 6 : 17) * curve : (mobile ? 7 : 26) * curve;
      const roll = cleanDesktop ? (entering ? 1.5 : -2) * curve : entering ? 3 * curve : -7 * curve;
      const depth = cleanDesktop ? -(entering ? 65 : 115) * curve : -(entering ? 105 : 240) * curve;
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
  // Animate one chapter over a short, finite ease instead of teleporting.
  // rAF is active only while transitioning; mobile stays native-scroll.
  function glideTo(target) {
    if (transitionRaf) cancelAnimationFrame(transitionRaf);
    const start = scrollY;
    const distance = target - start;
    if (Math.abs(distance) < 2) { scrollTo(0, target); schedule(); return; }
    const begin = performance.now();
    const duration = 540;
    function frame(now) {
      const t = clamp((now - begin) / duration, 0, 1);
      const eased = t * t * (3 - 2 * t);
      scrollTo(0, Math.round(start + distance * eased));
      schedule();
      if (t < 1) transitionRaf = requestAnimationFrame(frame);
      else transitionRaf = 0;
    }
    transitionRaf = requestAnimationFrame(frame);
  }
  // Desktop wheel and trackpad: one chapter per physical gesture, regardless
  // of how many wheel events the browser sends. Leave mobile native scrolling.
  function onWheel(event) {
    if (!section || !section.isConnected || !section.classList.contains('rs-enhanced') ||
        coarse.matches || innerWidth < 760 || event.ctrlKey ||
        (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], .respondo-chat, .respondo-widget, .rs-chat-widget'))) return;
    const rect = section.getBoundingClientRect();
    const viewport = innerHeight;
    // Do not hijack the normal page before entering or after leaving this story.
    if (rect.top > 100 || rect.bottom < viewport - 100) return;
    const travel = Math.max(1, rect.height - viewport);
    const position = clamp(-rect.top / travel, 0, 1) * (cards.length - 1);
    const direction = Math.sign(event.deltaY);
    if (!direction) return;
    const index = clamp(Math.round(position), 0, cards.length - 1);
    if ((direction < 0 && index === 0 && position < .08) ||
        (direction > 0 && index === cards.length - 1 && position > cards.length - 1 - .08)) return;
    // Prevent trackpad inertia from skipping chapters or fighting scrollTo.
    event.preventDefault();
    const now = performance.now();
    if (now - wheelLastAt > 260 || (wheelDirection && direction !== wheelDirection)) {
      wheelGestureUsed = false;
    }
    wheelLastAt = now;
    wheelDirection = direction;
    clearTimeout(wheelGestureReset);
    wheelGestureReset = setTimeout(() => { wheelGestureUsed = false; wheelDirection = 0; }, 260);
    if (wheelGestureUsed) return;
    wheelGestureUsed = true;
    // The first downward gesture reveals the complete 24/7 copy instead of
    // advancing immediately. The next separate gesture moves to chapter two.
    if (direction > 0 && index === 0 && !section.classList.contains('rs-first-revealed')) {
      section.classList.add('rs-first-revealed');
      schedule();
      return;
    }
    if (direction < 0 && index <= 1) section.classList.remove('rs-first-revealed');
    const next = clamp(index + direction, 0, cards.length - 1);
    const sectionTop = scrollY + rect.top;
    const target = sectionTop + travel * next / Math.max(1, cards.length - 1);
    // Instant positioning avoids native smooth-scroll queue buildup on trackpads.
    glideTo(Math.round(target));
  }
  // Clicking a glyph jumps to the exact same chapter position as wheel/touch
  // scrolling, so the heading, description, arrow and active icon never diverge.
  function navigateToChapter(index) {
    if (!section || !section.isConnected || !cards.length ||
        !Number.isInteger(index) || index < 0 || index >= cards.length) return;
    if (!section.classList.contains('rs-enhanced')) {
      // Reduced-motion, Save-Data and older-device fallback: all cards remain
      // in normal document flow, so navigate to the real card instead.
      const top = scrollY + cards[index].getBoundingClientRect().top;
      scrollTo({ top: Math.round(top), behavior: 'instant' });
      icons.forEach((icon, i) => {
        icon.classList.toggle('is-active', i === index);
        icon.setAttribute('aria-pressed', String(i === index));
      });
      return;
    }
    section.classList.toggle('rs-first-revealed', index === 0);
    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, rect.height - innerHeight);
    const target = scrollY + rect.top + travel * index / Math.max(1, cards.length - 1);
    // Clear the previous desktop wheel lock. The next physical scroll gesture
    // is independent from the user's click.
    wheelGestureUsed = false;
    wheelDirection = 0;
    wheelLastAt = 0;
    clearTimeout(wheelGestureReset);
    glideTo(Math.round(target));
    updateStep(index);
    schedule();
  }
  function onOrbitClick(event) {
    const icon = event.target.closest?.('[data-rs-icon]');
    if (!icon || !section || !section.contains(icon) || !icons.includes(icon)) return;
    const index = Number(icon.getAttribute('data-index'));
    if (!Number.isInteger(index)) return;
    event.preventDefault();
    navigateToChapter(index);
  }
  function queueMount() {
    if (pendingMount) return;
    pendingMount = true;
    requestAnimationFrame(setup);
  }
  // Only watch root replacement (navigation/language), not animated child styles.
  new MutationObserver(queueMount).observe(app, { childList:true });
  app.addEventListener('click', onOrbitClick);
  addEventListener('scroll', schedule, { passive:true });
  // Capture wheel events before orbit buttons/overlays consume them, regardless of pointer position.
  addEventListener('wheel', onWheel, { passive:false, capture:true });
  addEventListener('resize', () => { queueMount(); schedule(); }, { passive:true });
  addEventListener('pageshow', schedule, { passive:true });
  addEventListener('respondo:languagechange', queueMount, { passive:true });
  if (typeof motion.addEventListener === 'function') motion.addEventListener('change', () => { teardown(); queueMount(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queueMount, { once:true });
  else queueMount();
})();