const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Every content link and image works before these progressive enhancements load.
if (document.querySelector('#gallery')) {
 const {default:PhotoSwipeLightbox}=await import('photoswipe/lightbox');
 const box=new PhotoSwipeLightbox({gallery:'#gallery',children:'figure > a',pswpModule:()=>import('photoswipe'),showHideAnimationType:reduced?'none':'zoom'});
 box.on('uiRegister',()=>box.pswp.ui.registerElement({name:'custom-caption',order:9,isButton:false,appendTo:'root',onInit:element=>{
  box.pswp.on('change',()=>{element.textContent=box.pswp.currSlide.data.element?.closest('figure')?.querySelector('figcaption')?.textContent||'';});
 }}));box.init();
}
if (!reduced) {
 const sections=[...document.querySelectorAll('.collection-feature')].map(section=>({
  section,
  rows:[...section.querySelectorAll('.mosaic-row')]
 }));
 if(sections.length){
  let ticking=false;
  const update=()=>{
   const viewportHeight=innerHeight;
   const travel=matchMedia('(max-width: 760px)').matches?72:120;
   sections.forEach(({section,rows})=>{
    const rect=section.getBoundingClientRect();
    const progress=Math.max(0,Math.min(1,(viewportHeight-rect.top)/(viewportHeight+rect.height)))-.5;
    rows.forEach((row,index)=>{
     const direction=index%2?-1:1;
     const depth=1-index*.12;
     row.style.transform=`translate3d(${progress*travel*direction*depth}px,0,0)`;
    });
   });
   ticking=false;
  };
  const requestUpdate=()=>{if(!ticking){requestAnimationFrame(update);ticking=true;}};
  addEventListener('scroll',requestUpdate,{passive:true});
  addEventListener('resize',requestUpdate,{passive:true});
  update();
 }
}
const hero=document.querySelector('[data-hero]');
if(hero) import('./hero.js').then(m=>m.startHero(hero)).catch(()=>{/* Static artwork remains visible if enhancement is unavailable. */});
