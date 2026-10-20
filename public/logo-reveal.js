/* Respondo AI official-arrow cinematic intro.
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
    fi: {tag:'Älykkäämpää asiakaspalvelua', aria:'Respondo AI:n animoitu logo'},
    sv: {tag:'Smartare kundservice', aria:'Respondo AI:s animerade logotyp'},
    en: {tag:'Smarter customer service', aria:'Respondo AI animated logo'}
  };
  var root = null, opening = null, closeTimer = 0, removeTimer = 0, watchFrame = 0;
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
  function svg() {
    var cn = 'rl-intro';
    return '<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false">' +
      '<path class="' + cn + '-trace" pathLength="100" d="' + trace + '"/>' +
      '<path class="' + cn + '-solid" d="' + arrow + '"/>' +
      '</svg>';
  }
  // Replay on every new homepage navigation, including arrivals from Google.
  // Guard only within the current document so language redraws don't restart it.
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
    // Unlock immediately so the reveal never delays normal interaction.
    document.body.classList.remove('rl-logo-lock');
    removeTimer = window.setTimeout(function () { el.remove(); }, 860);
  }
  function playIntro(force) {
    if (reduced || !root || !root.isConnected) return;
    if (!force && introPlayed) return;
    clearOpening(true);
    introPlayed = true;
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
      '<div class="rl-intro-graphic"><div class="rl-intro-burst" aria-hidden="true"></div>', svg(), '</div>',
      '<div class="rl-intro-name">RESPONDO AI</div>',
      '<p class="rl-intro-caption">',t.tag,'</p>',
      '</div>',
    ].join('');
    document.body.appendChild(layer);
    document.body.classList.add('rl-logo-lock');
    opening = layer;
    closeTimer = window.setTimeout(function () { clearOpening(false); }, 3050);
  }
  function refresh() {
    var home = app.querySelector('.apple-home-page');
    if (!home) {
      root = null;
      clearOpening(true);
      return;
    }
    if (root === home || !home.querySelector('.apple-hero')) return;
    root = home;
    playIntro(false);
  }
  function scheduleRefresh() {
    if (watchFrame) return;
    watchFrame = requestAnimationFrame(function () {
      watchFrame = 0;
      refresh();
    });
  }
  var observer = new MutationObserver(scheduleRefresh);
  observer.observe(app,{childList:true});
  window.addEventListener('respondo:languagechange', scheduleRefresh, {passive:true});
  // Back/forward cache restores the old document rather than loading a new one.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted && root && root.isConnected) playIntro(true);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRefresh, {once:true});
  else scheduleRefresh();
})();
