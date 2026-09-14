const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Every content link and image works before these progressive enhancements load.
if (document.querySelector('#gallery')) {
 const {default:PhotoSwipeLightbox}=await import('photoswipe/lightbox');
 const box=new PhotoSwipeLightbox({gallery:'#gallery',children:'figure > a',pswpModule:()=>import('photoswipe'),showHideAnimationType:reduced?'none':'zoom'});
 box.on('uiRegister',()=>box.pswp.ui.registerElement({name:'custom-caption',order:9,isButton:false,appendTo:'root',onInit:element=>{
  box.pswp.on('change',()=>{element.textContent=box.pswp.currSlide.data.element?.closest('figure')?.querySelector('figcaption')?.textContent||'';});
 }}));box.init();
}
if (!reduced && matchMedia('(pointer:fine)').matches) {
 const { gsap } = await import('gsap');
 document.querySelectorAll('.collection-feature').forEach(section=>{
  const setters=[...section.querySelectorAll('.mosaic-row')].map((row,i)=>({set:gsap.quickTo(row,'x',{duration:1.1+i*.2,ease:'power3.out'}),direction:i%2?-1:1}));
  section.addEventListener('pointermove',event=>{const rect=section.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width-.5;setters.forEach(({set,direction})=>set(x*180*direction));});
  section.addEventListener('pointerleave',()=>setters.forEach(({set})=>set(0)));
 });
}
const hero=document.querySelector('[data-hero]');
if(hero) import('./hero.js').then(m=>m.startHero(hero)).catch(()=>{/* Static artwork remains visible if enhancement is unavailable. */});
