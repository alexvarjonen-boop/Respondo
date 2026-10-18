/* One lightweight motion director for Respondo's public pages. */
(()=>{'use strict';
const app=document.getElementById('app');if(!app)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const homeSelectors='.apple-hero,.apple-highlights,.apple-lead-calculator,.rg-growth-section,.pricing-section,.apple-bottom-cta';
const innerSelectors='.features-hero,.audience-hero,.seo-landing-hero,.r-brand-pricing-banner,.r-brand-contact-banner,.global-guide-hero,.audience-section,.seo-landing-section,.r-brand-flow,.global-guide-main';
let page=null,io=null,scheduled=false;
function refresh(){
 scheduled=false;
 const current=app.firstElementChild;
 if(current===page)return;
 page=current;
 if(io)io.disconnect();
 if(!page||reduced.matches)return;
 const scenes=[...app.querySelectorAll(homeSelectors+','+innerSelectors)].filter(el=>el.closest('.apple-home-page,.features-page,.pricing-page,.audience-page,.seo-landing-page,.global-guide-page,.contact-page'));
 if(!('IntersectionObserver'in window))return;
 io=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('um-visible');io.unobserve(entry.target)}}},{rootMargin:'0px 0px -7% 0px',threshold:0.06});
 for(const scene of scenes){scene.classList.add('um-scene');if(scene.getBoundingClientRect().top<innerHeight*.88){scene.classList.add('um-visible')}else{io.observe(scene)}}
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh)}
new MutationObserver(schedule).observe(app,{childList:true});
reduced.addEventListener?.('change',()=>{if(reduced.matches){io?.disconnect();app.querySelectorAll('.um-scene').forEach(x=>x.classList.add('um-visible'))}else schedule()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
