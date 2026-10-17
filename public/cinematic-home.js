/* Progressive enhancement for public cinematic marketing sections.
   No wheel hijacking, no network calls, no mutation of checkout, dashboard or bot state. */
(() => {
  'use strict';
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function bindHome(home) {
    if (home.dataset.cinematicBound === '1') return;
    home.dataset.cinematicBound = '1';

    const rail = home.querySelector('.apple-highlights-grid');
    const previous = home.querySelector('.cinematic-rail-prev');
    const next = home.querySelector('.cinematic-rail-next');
    if (rail && previous && next) {
      const card = () => rail.querySelector('.apple-feature-card');
      const stepWidth = () => {
        const target = card();
        if (!target) return rail.clientWidth;
        const gap = Number.parseFloat(getComputedStyle(rail).columnGap || '0') || 0;
        return target.getBoundingClientRect().width + gap;
      };
      const updateControls = () => {
        previous.disabled = rail.scrollLeft <= 3;
        next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 3;
      };
      const move = (direction) => rail.scrollBy({
        left: direction * stepWidth(),
        behavior: reduceMotion() ? 'auto' : 'smooth'
      });
      previous.addEventListener('click', () => move(-1));
      next.addEventListener('click', () => move(1));
      rail.addEventListener('scroll', updateControls, { passive:true });
      window.addEventListener('resize', updateControls, { passive:true });
      updateControls();
    }

    const chapters = [...home.querySelectorAll('[data-cinematic-step]')];
    const scenes = [...home.querySelectorAll('[data-cinematic-scene]')];
    const stage = home.querySelector('.cinematic-sticky-stage');
    function activateStep(index) {
      if (!stage) return;
      const safeIndex = clamp(index, 0, 2);
      if (stage.dataset.currentStep === String(safeIndex)) return;
      stage.dataset.currentStep = String(safeIndex);
      stage.style.setProperty('--cinematic-step', String(safeIndex));
      const counter = stage.querySelector('.cinematic-stage-number');
      if (counter) counter.textContent = String(safeIndex + 1).padStart(2, '0') + ' — 03';
      chapters.forEach((chapter) => chapter.classList.toggle('is-current', Number(chapter.dataset.cinematicStep) === safeIndex));
      scenes.forEach((scene) => scene.classList.toggle('is-current', Number(scene.dataset.cinematicScene) === safeIndex));
    }
    activateStep(0);
    if ('IntersectionObserver' in window && chapters.length) {
      const observer = new IntersectionObserver((entries) => {
        if (!stage?.isConnected) { observer.disconnect(); return; }
        const visible = entries.filter(entry => entry.isIntersecting);
        if (!visible.length) return;
        visible.sort((a, b) => Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - innerHeight / 2) -
                                Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - innerHeight / 2));
        activateStep(Number(visible[0].target.dataset.cinematicStep));
      }, {rootMargin:'-22% 0px -30% 0px',threshold:0});
      chapters.forEach(chapter => observer.observe(chapter));
    }

    if (!reduceMotion() && 'IntersectionObserver' in window) {
      const revealTargets = [...home.querySelectorAll(
        '.apple-highlights-intro, .apple-feature-card, .cinematic-scrolly-heading, .cinematic-finale-content, .apple-bottom-cta'
      )];
      revealTargets.forEach((el) => el.setAttribute('data-cinematic-reveal', ''));
      document.documentElement.classList.add('cinematic-motion');
      const reveals = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('cinematic-shown');
          reveals.unobserve(entry.target);
        });
      }, {rootMargin:'0px 0px 35px 0px',threshold:0.08});
      revealTargets.forEach(el => reveals.observe(el));
    }

    const hero = home.querySelector('.apple-hero');
    if (hero && !reduceMotion()) {
      let ticking = false;
      const update = () => {
        ticking = false;
        if (!hero.isConnected) return;
        const amount = clamp(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight), 0, 1);
        hero.style.setProperty('--cinematic-hero-progress', amount.toFixed(3));
      };
      const request = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      };
      window.addEventListener('scroll', request, { passive:true });
      window.addEventListener('resize', request, { passive:true });
      request();
    }
  }

  function initialize() {
    const home = document.querySelector('#app .apple-home-page');
    if (home) bindHome(home);
  }

  function start() {
    initialize();
    const root = document.getElementById('app');
    if (!root) return;
    // SPA routes replace the children of #app. Bind to each newly rendered homepage once.
    const observer = new MutationObserver(initialize);
    observer.observe(root, {childList:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
