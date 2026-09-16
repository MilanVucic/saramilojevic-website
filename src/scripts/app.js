import { startHero } from './hero.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Every content link and image works before these progressive enhancements load.
const galleryItems=[...document.querySelectorAll('.gallery-trigger')];
if (galleryItems.length) {
 const viewer=document.createElement('div');
 viewer.className='artwork-viewer';
 viewer.hidden=true;
 viewer.setAttribute('role','dialog');
 viewer.setAttribute('aria-modal','true');
 viewer.setAttribute('aria-label','Artwork image viewer');
 viewer.innerHTML='<div class="viewer-backdrop"></div><button class="viewer-close" type="button" aria-label="Close fullscreen image">×</button><button class="viewer-nav viewer-prev" type="button" aria-label="Previous image">←</button><div class="viewer-frame"><img alt=""><p class="viewer-caption"></p></div><button class="viewer-nav viewer-next" type="button" aria-label="Next image">→</button>';
 document.body.append(viewer);
 const image=viewer.querySelector('img');
 const caption=viewer.querySelector('.viewer-caption');
 const closeButton=viewer.querySelector('.viewer-close');
 const previousButton=viewer.querySelector('.viewer-prev');
 const nextButton=viewer.querySelector('.viewer-next');
 let activeIndex=0;
 let lastTrigger;
 let touchStart=0;
 const update=()=>{
  const item=galleryItems[activeIndex];
  const preview=item.querySelector('img');
  image.src=item.dataset.fullSrc;
  image.alt=preview?.alt||'';
  caption.textContent=item.closest('figure')?.querySelector('figcaption')?.textContent||'';
 };
 const open=index=>{
  activeIndex=index;
  lastTrigger=galleryItems[index];
  update();
  viewer.hidden=false;
  document.body.classList.add('viewer-active');
  requestAnimationFrame(()=>viewer.classList.add('is-open'));
  closeButton.focus({preventScroll:true});
 };
 const close=()=>{
  viewer.classList.remove('is-open');
  document.body.classList.remove('viewer-active');
  window.setTimeout(()=>{viewer.hidden=true;image.removeAttribute('src');lastTrigger?.focus({preventScroll:true});},reduced?0:300);
 };
 const move=direction=>{activeIndex=(activeIndex+direction+galleryItems.length)%galleryItems.length;update();};
 galleryItems.forEach((item,index)=>item.addEventListener('click',()=>open(index)));
 closeButton.addEventListener('click',close);
 viewer.querySelector('.viewer-backdrop').addEventListener('click',close);
 previousButton.addEventListener('click',()=>move(-1));
 nextButton.addEventListener('click',()=>move(1));
 viewer.addEventListener('keydown',event=>{
  if(event.key==='Escape')close();
  if(event.key==='ArrowLeft')move(-1);
  if(event.key==='ArrowRight')move(1);
 });
 image.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX;},{passive:true});
 image.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchStart;if(Math.abs(distance)>45)move(distance>0?-1:1);},{passive:true});
 if(galleryItems.length<2){previousButton.hidden=true;nextButton.hidden=true;}
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
if(hero) startHero(hero);
