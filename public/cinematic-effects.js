(()=>{'use strict';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let initialized=false;
function init(){
 if(initialized)return;
 const hero=document.querySelector('#app .apple-home-page .apple-hero');
 if(!hero)return;
 initialized=true;
 const glow=document.createElement('div');glow.className='cinematic-glow';glow.setAttribute('aria-hidden','true');
 const grid=document.createElement('div');grid.className='cinematic-grid';grid.setAttribute('aria-hidden','true');
 const orbit=document.createElement('div');orbit.className='cinematic-orbit';orbit.setAttribute('aria-hidden','true');
 hero.prepend(orbit);hero.prepend(grid);hero.prepend(glow);
 const fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
 if(fine&&!reduced.matches){
  let raf=0;
  hero.addEventListener('pointermove',e=>{
   if(raf)return;
   const x=e.clientX,y=e.clientY;
   raf=requestAnimationFrame(()=>{raf=0;const b=hero.getBoundingClientRect();glow.style.setProperty('--glow-x',((x-b.left)/b.width*100).toFixed(1)+'%');glow.style.setProperty('--glow-y',((y-b.top)/b.height*100).toFixed(1)+'%')});
  },{passive:true});
 }
 const targets=[...document.querySelectorAll('#app .apple-home-page .apple-feature-card,#app .apple-home-page .apple-highlights-intro,#app .apple-home-page .apple-bottom-cta')];
 if('IntersectionObserver' in window&&!reduced.matches){
  const io=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}},{threshold:.08,rootMargin:'0px 0px 60px 0px'});
  for(const t of targets){t.classList.add('cinematic-reveal');io.observe(t)}
 }else for(const t of targets)t.classList.add('is-visible');
 let scrollRaf=0;
 if(!reduced.matches){
  const update=()=>{scrollRaf=0;const p=Math.min(1,Math.max(0,window.scrollY/(window.innerHeight*1.5)));orbit.style.setProperty('--orbit-rotation',(p*38).toFixed(2)+'deg')};
  window.addEventListener('scroll',()=>{if(!scrollRaf)scrollRaf=requestAnimationFrame(update)},{passive:true});update();
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
const observer=new MutationObserver(()=>{if(!initialized)init();else if(!document.querySelector('#app .apple-home-page .apple-hero'))initialized=false});
observer.observe(document.getElementById('app')||document.documentElement,{childList:true,subtree:true});
})();
