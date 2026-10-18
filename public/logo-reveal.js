/* Respondo AI official-arrow cinematic intro + scroll-controlled logo chapter.
   Only runs on the public homepage and never changes the existing site theme. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  if (!app || location.pathname !== '/') return;

  // Exact approved white-on-black Respondo arrow from /respondo-symbol.svg.
  var arrow = 'M 238.0 66.1 L 235.2 64.9 L 183.6 84.5 L 182.6 86.0 L 183.3 87.8 L 201.2 92.1 L 201.7 94.4 L 138.0 153.1 L 133.2 154.3 L 128.6 152.6 L 109.0 130.9 L 103.7 126.6 L 97.4 124.6 L 90.8 125.1 L 82.8 129.4 L 20.5 180.0 L 18.0 183.6 L 18.8 188.6 L 22.3 191.1 L 27.6 190.1 L 87.6 143.2 L 90.6 142.0 L 96.6 143.5 L 123.1 171.5 L 128.6 173.5 L 133.7 173.5 L 140.5 171.0 L 213.1 103.9 L 215.8 104.9 L 223.4 119.6 L 224.9 120.8 L 226.9 120.3 Z';
  var trace = 'M 23 185 L 94 134 L 132 164 L 213 94 L 232 70';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var labels = {
    fi: {tag:'Älykkäämpää asiakaspalvelua', skip:'Ohita animaatio', replay:'Katso uudelleen', scroll:'Jatka selaamista', aria:'Respondo AI:n animoitu logo'},
    sv: {tag:'Smartare kundservice', skip:'Hoppa över', replay:'Visa igen', scroll:'Fortsätt skrolla', aria:'Respondo AI:s animerade logotyp'},
    en: {tag:'Smarter customer service', skip:'Skip animation', replay:'Replay animation', scroll:'Keep scrolling', aria:'Respondo AI animated logo'}
  };
  var root = null, chapter = null, opening = null, closeTimer = 0, removeTimer = 0, frame = 0, watchFrame = 0;
  var introPlayed = false;

  function locale() {
    var qs = new URLSearchParams(location.search).get('lang');
    var raw = qs || '';
    if (!raw) {
      try { raw = localStorage.getItem('respondo_lang') || ''; } catch (err) { /* storage disabled */ }
    }
    if (!raw) raw = document.documentElement.lang || 'fi';
    raw = String(raw).toLowerCase().split('-')[0];
    return labels[raw] ? raw : 'fi';
  }
  function l() { return labels[locale()]; }
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  function svg(which) {
    var cn = which === 'intro' ? 'rl-intro' : 'rl-chapter';
    return '<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false">' +
      '<path class="' + cn + '-trace" pathLength="100" d="' + trace + '"/>' +
      '<path class="' + cn + '-solid" d="' + arrow + '"/>' +
      '</svg>';
  }
  function introSeen() {
    if (introPlayed) return true;
    try { return sessionStorage.getItem('respondo-logo-reveal-20261018') === '1'; }
    catch (err) { return false; }
  }
  function markSeen() {
    introPlayed = true;
    try { sessionStorage.setItem('respondo-logo-reveal-20261018', '1'); }
    catch (err) { /* private mode */ }
  }
  function clearOpening(instant) {
    clearTimeout(closeTimer);
    if (!opening) { document.body.classList.remove('rl-logo-lock'); return; }
    clearTimeout(removeTimer);
    var el = opening;
    opening = null;
    if (instant || reduced) {
      el.remove();
      document.body.classList.remove('rl-logo-lock');
      return;
    }
    el.classList.add('rl-is-leaving');
    // Unlock immediately so the animation never blocks the site after skip.
    document.body.classList.remove('rl-logo-lock');
    removeTimer = window.setTimeout(function () { el.remove(); }, 860);
  }
  function playIntro(force) {
    if (reduced || !root || !root.isConnected) return;
    if (!force && introSeen()) return;
    clearOpening(true);
    markSeen();
    var t = l();
    var layer = document.createElement('div');
    layer.className = 'rl-intro';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', t.aria);
    layer.innerHTML = [
      '<div class="rl-intro-lines" aria-hidden="true"></div>',
      '<div class="rl-intro-inner">',
      '<div class="rl-intro-rings" aria-hidden="true"></div>',
      '<div class="rl-intro-graphic"><div class="rl-intro-burst" aria-hidden="true"></div>', svg('intro'), '</div>',
      '<div class="rl-intro-name">RESPONDO AI</div>',
      '<p class="rl-intro-caption">',t.tag,'</p>',
      '</div>',
      '<button class="rl-intro-skip" type="button">',t.skip,' ↗</button>'
    ].join('');
    layer.querySelector('.rl-intro-skip').addEventListener('click',function () { clearOpening(false); });
    layer.addEventListener('keydown',function (event) { if (event.key === 'Escape') clearOpening(false); });
    document.body.appendChild(layer);
    document.body.classList.add('rl-logo-lock');
    opening = layer;
    closeTimer = window.setTimeout(function () { clearOpening(false); }, 3050);
  }
  function createChapter() {
    var t = l(), section = document.createElement('section');
    section.className = 'rl-chapter';
    section.setAttribute('aria-label',t.aria);
    section.innerHTML = [
      '<div class="rl-sticky">',
      '<span class="rl-chapter-meta" aria-hidden="true">RESPONDO / 01</span>',
      '<div class="rl-chapter-orbit" aria-hidden="true"></div>',
      '<div class="rl-chapter-core">',
      '<div class="rl-chapter-logo" aria-hidden="true">',svg('chapter'),'</div>',
      '<h2 class="rl-chapter-wordmark">RESPONDO AI</h2>',
      '<p class="rl-chapter-tagline">',t.tag,'</p>',
      '</div>',
      '<div class="rl-scroll-prompt" aria-hidden="true">',t.scroll,'</div>',
      '<button class="rl-replay" type="button" aria-label="',t.replay,'">↻ &nbsp;',t.replay,'</button>',
      '<div class="rl-chapter-progress" aria-hidden="true"></div>',
      '</div>'
    ].join('');
    section.querySelector('.rl-replay').addEventListener('click', function () { playIntro(true); });
    return section;
  }
  function updateScroll() {
    frame = 0;
    if (!chapter || !chapter.isConnected) return;
    var sc = chapter.getBoundingClientRect();
    var distance = Math.max(1, sc.height - window.innerHeight);
    var progress = clamp(-sc.top / distance);
    var draw = clamp((progress - .07) / .51);
    var fill = clamp((progress - .57) / .17);
    var words = clamp((progress - .68) / .24);
    var ring = .12 + .86 * clamp((progress - .10) / .42);
    var aura = clamp((progress - .38) / .38);
    if (reduced) { progress=1; draw=1; fill=1; words=1; ring=.28; aura=0; }
    var e = chapter.style;
    e.setProperty('--rl-progress', progress.toFixed(4));
    e.setProperty('--rl-fill', fill.toFixed(4));
    e.setProperty('--rl-words', words.toFixed(4));
    e.setProperty('--rl-ring', ring.toFixed(4));
    e.setProperty('--rl-aura', aura.toFixed(4));
    e.setProperty('--rl-spin', (progress * 150).toFixed(1)+'deg');
    e.setProperty('--rl-orbit-scale', (.73 + progress*.44).toFixed(3));
    e.setProperty('--rl-rise', ((1-progress)*22).toFixed(1)+'px');
    e.setProperty('--rl-scale', (.75 + progress*.4).toFixed(3));
    e.setProperty('--rl-glow', (aura*38).toFixed(1)+'px');
    e.setProperty('--rl-word-rise', ((1-words)*28).toFixed(1)+'px');
    e.setProperty('--rl-tag-rise', ((1-words)*15).toFixed(1)+'px');
    e.setProperty('--rl-prompt', clamp(1-progress*1.5).toFixed(3));
    e.setProperty('--rl-bar', (progress*100).toFixed(2)+'%');
    var line = chapter.querySelector('.rl-chapter-trace');
    if (line) line.style.strokeDashoffset = String((1-draw)*100);
  }
  function scheduleScroll() {
    if (!frame) frame = requestAnimationFrame(updateScroll);
  }
  function refresh() {
    var home = app.querySelector('.apple-home-page');
    if (!home) {
      root = null; chapter = null;
      clearOpening(true);
      return;
    }
    if (root === home && chapter && chapter.isConnected) return;
    root = home;
    var hero = home.querySelector('.apple-hero');
    if (!hero) return;
    chapter = createChapter();
    hero.insertAdjacentElement('afterend', chapter);
    var main = home.querySelector('.apple-home');
    if (main) main.classList.add('rl-logo-film-active');
    scheduleScroll();
    playIntro(false);
  }
  function scheduleRefresh() {
    if (watchFrame) return;
    watchFrame = requestAnimationFrame(function () {
      watchFrame = 0;
      refresh();
      scheduleScroll();
    });
  }
  var observer = new MutationObserver(scheduleRefresh);
  observer.observe(app,{childList:true});
  window.addEventListener('scroll', scheduleScroll, {passive:true});
  window.addEventListener('resize', scheduleScroll, {passive:true});
  window.addEventListener('respondo:languagechange', scheduleRefresh, {passive:true});
  window.addEventListener('pageshow',scheduleScroll,{passive:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRefresh, {once:true});
  else scheduleRefresh();
})();
