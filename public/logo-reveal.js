// Animate the approved arrow already rendered in the homepage orbit.
(() => {
  const app = document.getElementById('app');
  if (!app || location.pathname !== '/') return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let previousArrow;

  function reveal(replay = false) {
    const arrow = app.querySelector('.apple-home-page .rs-axis > svg');
    if (!arrow || (!replay && arrow === previousArrow)) return;
    previousArrow = arrow;
    if (reducedMotion.matches || !arrow.animate) return;
    arrow.animate(
      [{opacity:.4, scale:.92}, {opacity:1, scale:1}],
      {duration:620, easing:'cubic-bezier(.19,.75,.22,1)'}
    );
  }

  new MutationObserver(() => reveal()).observe(app, {childList:true});
  addEventListener('pageshow', event => { if (event.persisted) reveal(true); });
  reveal();
})();
