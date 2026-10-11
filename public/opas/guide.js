import {bindPublicMenu} from '/apple-nav.js';
function init(){
  bindPublicMenu();
  // Guides are Finnish-only articles. Select another site's language on a fully translated page.
  for(const button of document.querySelectorAll('[data-guide-lang]')){
    button.addEventListener('click',()=>{
      const lang=button.getAttribute('data-guide-lang');
      try{localStorage.setItem('respondo_lang',lang)}catch{}
      if(lang!=='fi') window.location.assign('/ominaisuudet?lang='+encodeURIComponent(lang));
    });
  }
  const toc=document.querySelector('.guide-toc-nav');
  if(!toc)return;
  const headings=[...document.querySelectorAll('.guide-article>h2:not(.guide-related-title)')];
  headings.forEach((heading,i)=>{
    heading.id='kohta-'+(i+1);
    const anchor=document.createElement('a');
    anchor.href='#'+heading.id;
    anchor.textContent=heading.textContent.trim();
    toc.appendChild(anchor);
  });
  if('IntersectionObserver'in window){
    const links=[...toc.querySelectorAll('a')];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        for(const link of links){
          if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');
          else link.removeAttribute('aria-current');
        }
      }
    },{rootMargin:'-120px 0px -65% 0px'});
    headings.forEach(heading=>observer.observe(heading));
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
