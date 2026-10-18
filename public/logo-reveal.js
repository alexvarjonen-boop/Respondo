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
    fi: {tag:'Älykkäämpää asiakaspalvelua', aria:'Respondo AI:n animoitu logo',sound:'Toista äänellä'},
    sv: {tag:'Smartare kundservice', aria:'Respondo AI:s animerade logotyp',sound:'Spela med ljud'},
    en: {tag:'Smarter customer service', aria:'Respondo AI animated logo',sound:'Play with sound'}
  };
  var root = null, opening = null, closeTimer = 0, removeTimer = 0, watchFrame = 0;
  var introPlayed = false;
  var soundContext = null, soundStopTimer = 0;

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
  function introSeen() {
    if (introPlayed) return true;
    try { return sessionStorage.getItem('respondo-logo-reveal-20261018-sound-v1') === '1'; }
    catch (err) { return false; }
  }
  function markSeen() {
    introPlayed = true;
    try { sessionStorage.setItem('respondo-logo-reveal-20261018-sound-v1', '1'); }
    catch (err) { /* private mode */ }
  }
  // Sounds only after an explicit tap: iOS Safari blocks audible autoplay.
  // All cues are synthesized locally (no downloads, remote audio, or assets).
  function stopSound() {
    clearTimeout(soundStopTimer);
    soundStopTimer = 0;
    if (!soundContext) return;
    var old = soundContext;
    soundContext = null;
    try { if (typeof old.close === 'function') old.close().catch(function () {}); } catch (err) { /* no audio */ }
  }
  function playSound() {
    if (reduced) return;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (typeof Ctor !== 'function') return;
    stopSound();
    try {
      var context = new Ctor();
      soundContext = context;
      if (context.state === 'suspended' && context.resume) {
        context.resume().catch(function () {});
      }
      var start = context.currentTime + 0.03;
      var master = context.createGain();
      master.gain.value = 0.28; // intentionally softer than notification tones
      master.connect(context.destination);
      function tone(type, delay, duration, low, high, volume) {
        var oscillator = context.createOscillator();
        var gain = context.createGain();
        var at = start + delay;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(Math.max(1, low), at);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, high), at + duration);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.16, duration * 0.3));
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.01);
      }
      // Arrow trace: filtered airy sweep, starting with CSS trace at ~0.28s.
      var duration = 1.42;
      var noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      var channel = noiseBuffer.getChannelData(0);
      for (var i=0; i<channel.length; i++) channel[i] = Math.random() * 2 - 1;
      var sweep = context.createBufferSource();
      var filter = context.createBiquadFilter();
      var sweepGain = context.createGain();
      var startSweep = start + 0.28;
      sweep.buffer = noiseBuffer;
      filter.type = 'bandpass';
      filter.Q.value = 0.85;
      filter.frequency.setValueAtTime(450, startSweep);
      filter.frequency.exponentialRampToValueAtTime(2900, startSweep + 1.05);
      sweepGain.gain.setValueAtTime(0.0001, startSweep);
      sweepGain.gain.exponentialRampToValueAtTime(0.10, startSweep + 0.37);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, startSweep + duration);
      sweep.connect(filter); filter.connect(sweepGain); sweepGain.connect(master);
      sweep.start(startSweep);
      sweep.stop(startSweep + duration);
      // Arrow reveal: understated low impact aligned with the solid path.
      tone('sine', 1.15, 0.67, 102, 55, 0.20);
      // Brand name: a short, calm harmonic shimmer (not a loud chime).
      tone('sine', 1.62, 1.05, 392, 349, 0.16);
      tone('sine', 1.71, 1.00, 587, 523, 0.082);
      soundStopTimer = window.setTimeout(stopSound, 3350);
    } catch (err) {
      stopSound(); // unsupported devices keep the normal silent logo reveal
    }
  }
  function clearOpening(instant) {
    clearTimeout(closeTimer);
    if (!opening) { document.body.classList.remove('rl-logo-lock'); return; }
    clearTimeout(removeTimer);
    var el = opening;
    opening = null;
    if (instant || reduced) {
      stopSound();
      el.remove();
      document.body.classList.remove('rl-logo-lock');
      return;
    }
    el.classList.add('rl-is-leaving');
    // Unlock immediately so the reveal never delays normal interaction.
    document.body.classList.remove('rl-logo-lock');
    removeTimer = window.setTimeout(function () { el.remove(); }, 860);
  }
  function playIntro(force, withSound) {
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
      '<div class="rl-intro-graphic"><div class="rl-intro-burst" aria-hidden="true"></div>', svg(), '</div>',
      '<div class="rl-intro-name">RESPONDO AI</div>',
      '<p class="rl-intro-caption">',t.tag,'</p>',
      '</div>',
      '<button class="rl-intro-sound" type="button" aria-label="',t.sound,'"><span aria-hidden="true">♪</span> ',t.sound,'</button>',
    ].join('');
    document.body.appendChild(layer);
    document.body.classList.add('rl-logo-lock');
    opening = layer;
    var soundButton = layer.querySelector('.rl-intro-sound');
    if (soundButton) soundButton.addEventListener('click', function (event) {
      event.preventDefault();
      // Recreate the visual intro so sound and motion start in sync.
      playIntro(true, true);
    });
    if (withSound) {
      if (soundButton) soundButton.remove();
      playSound();
    }
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRefresh, {once:true});
  else scheduleRefresh();
})();
