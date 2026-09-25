const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const header=document.querySelector('.header');
const menuToggle=header?.querySelector('.mobile-menu-toggle');
const mobileNav=header?.querySelector('[data-mobile-nav]');
if(header&&menuToggle&&mobileNav){
 const setMenuOpen=open=>{
  header.classList.toggle('is-menu-open',open);
  menuToggle.setAttribute('aria-expanded',String(open));
  menuToggle.setAttribute('aria-label',open?'Close menu':'Open menu');
 };
 menuToggle.addEventListener('click',()=>setMenuOpen(menuToggle.getAttribute('aria-expanded')!=='true'));
 mobileNav.addEventListener('click',event=>{if(event.target.closest('a'))setMenuOpen(false);});
 document.addEventListener('click',event=>{if(!header.contains(event.target))setMenuOpen(false);});
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||menuToggle.getAttribute('aria-expanded')!=='true')return;
  setMenuOpen(false);
  menuToggle.focus();
 });
 matchMedia('(min-width: 761px)').addEventListener('change',event=>{if(event.matches)setMenuOpen(false);});
}
const initializeImageLoader=shell=>{
 const image=shell.querySelector('img');
 if(!image||shell.dataset.loaderReady)return;
 shell.dataset.loaderReady='true';
 const finish=()=>shell.classList.add('is-loaded');
 image.addEventListener('load',finish);
 image.addEventListener('error',()=>shell.classList.add('is-loaded','has-error'));
 if(image.complete)requestAnimationFrame(finish);
};
document.querySelectorAll('[data-image-loader]').forEach(initializeImageLoader);
if (!reduced) {
 document.documentElement.classList.add('reveal-enabled');
 const revealElements=[...document.querySelectorAll('main section:not(.hero)')];
 revealElements.forEach(element=>element.setAttribute('data-reveal',''));
 const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}
 }),{threshold:.12,rootMargin:'0px 0px -8%'});
 revealElements.forEach(element=>revealObserver.observe(element));
}
// Every content link and image works before these progressive enhancements load.
const galleryItems=[...document.querySelectorAll('.gallery-trigger')];
if (galleryItems.length) {
 const viewer=document.createElement('div');
 viewer.className='artwork-viewer';
 viewer.hidden=true;
 viewer.setAttribute('role','dialog');
 viewer.setAttribute('aria-modal','true');
 viewer.setAttribute('aria-label','Artwork image viewer');
 viewer.innerHTML='<div class="viewer-backdrop"></div><p class="viewer-swipe-hint" aria-hidden="true">&larr; swipe &rarr;</p><button class="viewer-close" type="button" aria-label="Close fullscreen image">&times;</button><button class="viewer-nav viewer-prev" type="button" aria-label="Previous image">&#8592;</button><div class="viewer-frame"><span class="loading-image viewer-image-loader" data-image-loader><img alt=""></span><p class="viewer-caption"></p></div><button class="viewer-nav viewer-next" type="button" aria-label="Next image">&#8594;</button>';
 document.body.append(viewer);
 const image=viewer.querySelector('img');
 const imageLoader=viewer.querySelector('[data-image-loader]');
 initializeImageLoader(imageLoader);
 const caption=viewer.querySelector('.viewer-caption');
 const closeButton=viewer.querySelector('.viewer-close');
 const previousButton=viewer.querySelector('.viewer-prev');
 const nextButton=viewer.querySelector('.viewer-next');
 const backdrop=viewer.querySelector('.viewer-backdrop');
 const mobileViewer=window.matchMedia('(max-width: 760px)');
 let activeIndex=0;
 let lastTrigger;
 let touchStart=0;
 let suppressBackgroundTap=false;
 let viewerTransitioning=false;
 const syncCarousel=()=>{
  const item=galleryItems[activeIndex];
  const carousel=item.closest('[data-image-carousel]');
  if(!carousel)return;
  const slides=[...carousel.querySelectorAll('[data-carousel-slide]')];
  const slideIndex=slides.findIndex(slide=>slide.contains(item));
  if(slideIndex<0)return;
  carousel.dispatchEvent(new CustomEvent('carousel:show',{detail:{index:slideIndex}}));
  lastTrigger=item;
 };
 const update=()=>{
  const item=galleryItems[activeIndex];
  const preview=item.querySelector('img');
  imageLoader.classList.remove('is-loaded','has-error');
  image.src=item.dataset.fullSrc;
  image.alt=preview?.alt||'';
  if(image.complete)requestAnimationFrame(()=>imageLoader.classList.add('is-loaded'));
  caption.textContent=item.closest('figure')?.querySelector('figcaption')?.textContent||'';
 };
 const open=index=>{
  activeIndex=index;
  lastTrigger=galleryItems[index];
  imageLoader.getAnimations().forEach(animation=>animation.cancel());
  viewerTransitioning=false;
  update();
  viewer.hidden=false;
  document.body.classList.add('viewer-active');
  requestAnimationFrame(()=>viewer.classList.add('is-open'));
  closeButton.focus({preventScroll:true});
 };
 const close=()=>{
  imageLoader.getAnimations().forEach(animation=>animation.cancel());
  viewerTransitioning=false;
  viewer.classList.remove('is-open');
  document.body.classList.remove('viewer-active');
  window.setTimeout(()=>{viewer.hidden=true;image.removeAttribute('src');lastTrigger?.focus({preventScroll:true});},reduced?0:300);
 };
 const waitForImage=()=>image.complete
  ? Promise.resolve()
  : new Promise(resolve=>{
    const finish=()=>resolve();
    image.addEventListener('load',finish,{once:true});
    image.addEventListener('error',finish,{once:true});
    window.setTimeout(finish,1200);
   });
 const move=async direction=>{
  if(viewerTransitioning||galleryItems.length<2)return;
  if(reduced){
   activeIndex=(activeIndex+direction+galleryItems.length)%galleryItems.length;
   syncCarousel();
   update();
   return;
  }
  viewerTransitioning=true;
  const distance=Math.min(window.innerWidth*.16,160);
  try{
   await imageLoader.animate([
    {opacity:1,transform:'translate3d(0,0,0)'},
    {opacity:0,transform:`translate3d(${-direction*distance}px,0,0)`}
   ],{duration:220,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'}).finished;
   activeIndex=(activeIndex+direction+galleryItems.length)%galleryItems.length;
   syncCarousel();
   update();
   await waitForImage();
   await imageLoader.animate([
    {opacity:0,transform:`translate3d(${direction*distance}px,0,0)`},
    {opacity:1,transform:'translate3d(0,0,0)'}
   ],{duration:320,easing:'cubic-bezier(.2,.75,.25,1)',fill:'forwards'}).finished;
  }catch{
   update();
  }finally{
   imageLoader.getAnimations().forEach(animation=>animation.cancel());
   viewerTransitioning=false;
  }
 };
 galleryItems.forEach((item,index)=>item.addEventListener('click',()=>open(index)));
 closeButton.addEventListener('click',close);
 viewer.addEventListener('click',event=>{
  if(event.target===backdrop){close();return;}
  if(!mobileViewer.matches||suppressBackgroundTap||event.target===image||event.target.closest('button'))return;
  close();
 });
 previousButton.addEventListener('click',()=>move(-1));
 nextButton.addEventListener('click',()=>move(1));
 viewer.addEventListener('keydown',event=>{
  if(event.key==='Escape')close();
  if(event.key==='ArrowLeft')move(-1);
  if(event.key==='ArrowRight')move(1);
 });
 viewer.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX;},{passive:true});
 viewer.addEventListener('touchend',event=>{
  const distance=event.changedTouches[0].clientX-touchStart;
  if(Math.abs(distance)<=45)return;
  suppressBackgroundTap=true;
  window.setTimeout(()=>{suppressBackgroundTap=false;},400);
  move(distance>0?-1:1);
 },{passive:true});
 if(galleryItems.length<2){previousButton.hidden=true;nextButton.hidden=true;}
}
document.querySelectorAll('[data-image-carousel]').forEach(carousel=>{
 const slides=[...carousel.querySelectorAll('[data-carousel-slide]')];
 const titles=[...carousel.querySelectorAll('[data-carousel-title]')];
 const current=carousel.querySelector('[data-carousel-current]');
 let activeIndex=0;
 let touchStart=0;
 const show=index=>{
  activeIndex=(index+slides.length)%slides.length;
  slides.forEach((slide,slideIndex)=>{
   const active=slideIndex===activeIndex;
   slide.classList.toggle('is-active',active);
   slide.setAttribute('aria-hidden',String(!active));
  });
  titles.forEach((title,titleIndex)=>{title.hidden=titleIndex!==activeIndex;});
  if(current)current.textContent=String(activeIndex+1).padStart(2,'0');
 };
 const move=direction=>show(activeIndex+direction);
 carousel.addEventListener('carousel:show',event=>show(event.detail.index));
 carousel.querySelector('[data-carousel-previous]')?.addEventListener('click',()=>move(-1));
 carousel.querySelector('[data-carousel-next]')?.addEventListener('click',()=>move(1));
 carousel.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
  if(event.key==='ArrowRight'){event.preventDefault();move(1);}
 });
 carousel.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX;},{passive:true});
 carousel.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchStart;if(Math.abs(distance)>45)move(distance>0?-1:1);},{passive:true});
});
const contactForm=document.querySelector('[data-contact-form]');
if(contactForm){
 const inquiryTypes=[...contactForm.querySelectorAll('input[name="inquiry_type"]')];
 const artworkField=contactForm.querySelector('[data-artwork-field]');
 const artworkCombobox=contactForm.querySelector('[data-artwork-combobox]');
 const artworkInput=contactForm.querySelector('#contact-artwork');
 const artworkClear=contactForm.querySelector('[data-artwork-clear]');
 const artworkOptionsPanel=contactForm.querySelector('[data-artwork-options]');
 const artworkOptions=[...contactForm.querySelectorAll('[data-artwork-option]')];
 const artworkEmpty=contactForm.querySelector('[data-artwork-empty]');
 const artworkPreview=contactForm.querySelector('[data-artwork-preview]');
 const previewLoader=artworkPreview.querySelector('[data-image-loader]');
 const previewImage=artworkPreview.querySelector('img');
 const previewTitle=artworkPreview.querySelector('[data-preview-title]');
 const previewCollection=artworkPreview.querySelector('[data-preview-collection]');
 const status=contactForm.querySelector('[data-form-status]');
 const submitButton=contactForm.querySelector('[type="submit"]');
 const setArtworkOptionsOpen=open=>{
  const shouldOpen=open&&!artworkInput.disabled;
  artworkOptionsPanel.hidden=!shouldOpen;
  artworkInput.setAttribute('aria-expanded',String(shouldOpen));
 };
 const normalizeArtworkSearch=value=>value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
 const filterArtworkOptions=()=>{
  const terms=normalizeArtworkSearch(artworkInput.value.trim()).split(/\s+/).filter(Boolean);
  let visible=0;
  artworkOptions.forEach(option=>{
   const haystack=normalizeArtworkSearch(option.dataset.search);
   const matches=terms.every(term=>haystack.includes(term));
   option.hidden=!matches;
   if(matches)visible++;
  });
  artworkEmpty.hidden=visible!==0;
 };
 const updateArtworkPreview=()=>{
  const option=artworkOptions.find(item=>item.dataset.value===artworkInput.value.trim());
  artworkClear.hidden=!artworkInput.value;
  artworkPreview.hidden=!option;
  artworkInput.setCustomValidity(artworkInput.value.trim()&&!option?'Please select an artwork from the list.':'');
  artworkOptions.forEach(item=>item.setAttribute('aria-selected',String(item===option)));
  if(!option){previewImage.removeAttribute('src');return;}
  previewLoader.classList.remove('is-loaded','has-error');
  previewLoader.style.aspectRatio=`${option.dataset.width}/${option.dataset.height}`;
  previewImage.width=Number(option.dataset.width);
  previewImage.height=Number(option.dataset.height);
  previewImage.alt=option.dataset.alt||option.value;
  previewImage.src=option.dataset.image;
  previewTitle.textContent=option.dataset.value;
  previewCollection.textContent=option.dataset.collection||'';
  if(previewImage.complete)requestAnimationFrame(()=>previewLoader.classList.add('is-loaded'));
 };
 const updateInquiryType=()=>{
  const specific=contactForm.querySelector('input[name="inquiry_type"]:checked')?.value==='Specific artwork';
  artworkField.hidden=!specific;
  artworkInput.disabled=!specific;
  artworkInput.required=specific;
  if(!specific)artworkInput.value='';
  if(!specific)setArtworkOptionsOpen(false);
  filterArtworkOptions();
  updateArtworkPreview();
 };
 inquiryTypes.forEach(input=>input.addEventListener('change',updateInquiryType));
 artworkInput.addEventListener('focus',()=>{filterArtworkOptions();setArtworkOptionsOpen(true);});
 artworkInput.addEventListener('click',()=>{filterArtworkOptions();setArtworkOptionsOpen(true);});
 artworkInput.addEventListener('input',()=>{filterArtworkOptions();updateArtworkPreview();setArtworkOptionsOpen(true);});
 artworkInput.addEventListener('keydown',event=>{
  const visibleOptions=artworkOptions.filter(option=>!option.hidden);
  if(event.key==='Escape'){setArtworkOptionsOpen(false);return;}
  if(event.key==='ArrowDown'){
   event.preventDefault();
   setArtworkOptionsOpen(true);
   visibleOptions[0]?.focus();
  }
 });
 artworkOptions.forEach(option=>option.addEventListener('keydown',event=>{
  const visibleOptions=artworkOptions.filter(item=>!item.hidden);
  const current=visibleOptions.indexOf(option);
  if(event.key==='ArrowDown'){event.preventDefault();visibleOptions[(current+1)%visibleOptions.length]?.focus();}
  if(event.key==='ArrowUp'){event.preventDefault();(current?visibleOptions[current-1]:artworkInput).focus();}
  if(event.key==='Escape'){setArtworkOptionsOpen(false);artworkInput.focus();}
 }));
 artworkOptions.forEach(option=>option.addEventListener('click',()=>{
 artworkInput.value=option.dataset.value;
  updateArtworkPreview();
  artworkInput.focus();
  setArtworkOptionsOpen(false);
 }));
 artworkClear.addEventListener('click',()=>{
  artworkInput.value='';
  filterArtworkOptions();
  updateArtworkPreview();
  artworkInput.focus();
  setArtworkOptionsOpen(false);
 });
 document.addEventListener('click',event=>{if(!artworkCombobox.contains(event.target))setArtworkOptionsOpen(false);});
 const requestedArtwork=new URLSearchParams(location.search).get('artwork');
 if(requestedArtwork){
  const option=artworkOptions.find(item=>item.dataset.slug===requestedArtwork);
  const specific=contactForm.querySelector('input[value="Specific artwork"]');
  if(option&&specific){specific.checked=true;artworkInput.value=option.dataset.value;}
 }
 updateInquiryType();
 contactForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const originalLabel=submitButton.textContent;
  submitButton.disabled=true;
  submitButton.textContent='Sending…';
  status.textContent='';
  try{
   const response=await fetch(contactForm.action,{method:'POST',body:new FormData(contactForm),headers:{Accept:'application/json'}});
   const result=await response.json();
   if(!response.ok||!result.success)throw Error(result.message||'Unable to send your message.');
   contactForm.reset();
   updateInquiryType();
   status.textContent='Thank you. Your enquiry has been sent.';
  }catch(error){
   status.textContent=error instanceof Error?error.message:'Unable to send your message. Please try again.';
  }finally{
   submitButton.disabled=false;
   submitButton.textContent=originalLabel;
  }
 });
}
const allWorks=document.querySelector('[data-all-works]');
if(allWorks){
 const items=[...allWorks.querySelectorAll('[data-work-item]')];
 const search=document.querySelector('[data-work-search]');
 const filters=[...document.querySelectorAll('[data-work-filter]')];
 const views=[...document.querySelectorAll('[data-work-view]')];
 const count=document.querySelector('[data-work-count]');
 const empty=document.querySelector('[data-works-empty]');
 let activeFilter='all';
 const update=()=>{
  const query=search.value.trim().toLowerCase();
  let visible=0;
  items.forEach(item=>{
   const matchesCollection=activeFilter==='all'||item.dataset.collection===activeFilter;
   const matchesSearch=!query||item.dataset.search.includes(query);
   item.hidden=!(matchesCollection&&matchesSearch);
   if(!item.hidden)visible++;
  });
  count.textContent=String(visible);
  empty.hidden=visible!==0;
 };
 search.addEventListener('input',update);
 filters.forEach(button=>button.addEventListener('click',()=>{
  activeFilter=button.dataset.workFilter;
  filters.forEach(filter=>{const active=filter===button;filter.classList.toggle('is-active',active);filter.setAttribute('aria-pressed',String(active));});
  update();
 }));
 views.forEach(button=>button.addEventListener('click',()=>{
  const list=button.dataset.workView==='list';
  allWorks.classList.toggle('is-list',list);
  views.forEach(view=>{const active=view===button;view.classList.toggle('is-active',active);view.setAttribute('aria-pressed',String(active));});
 }));
}
const selectedWorks=document.querySelector('[data-selected-works]');
if(selectedWorks){
 const groups=[...selectedWorks.querySelectorAll('[data-selected-group]')];
 let activeIndex=0;
 let leaveTimer=0;
 const showSelectedGroup=index=>{
  const previous=groups[activeIndex];
  activeIndex=(index+groups.length)%groups.length;
  const next=groups[activeIndex];
  if(previous===next)return;
  window.clearTimeout(leaveTimer);
  previous.classList.remove('is-active');
  previous.classList.add('is-leaving');
  previous.setAttribute('aria-hidden','true');
  previous.inert=true;
  next.classList.remove('is-leaving');
  next.classList.add('is-active');
  next.setAttribute('aria-hidden','false');
  next.inert=false;
  leaveTimer=window.setTimeout(()=>previous.classList.remove('is-leaving'),700);
 };
 groups.forEach((group,index)=>{group.inert=index!==0;});
 if(groups.length>1)window.setInterval(()=>showSelectedGroup(activeIndex+1),5000);
}
if (!reduced) {
 const sections=[...document.querySelectorAll('.collection-feature')].map(section=>({
  section,
  rows:[...section.querySelectorAll('.mosaic-row')],
  target:0,
  current:0
 }));
 if(sections.length){
  let motionFrame=0;
  const render=()=>{
   let moving=false;
   sections.forEach(state=>{
    state.current+=(state.target-state.current)*.09;
    if(Math.abs(state.target-state.current)>.08)moving=true;
    state.rows.forEach((row,index)=>{
     const direction=index%2?-1:1;
     const depth=1-index*.12;
     row.style.transform=`translate3d(${state.current*direction*depth}px,0,0)`;
    });
   });
   motionFrame=moving?requestAnimationFrame(render):0;
  };
  const requestRender=()=>{if(!motionFrame)motionFrame=requestAnimationFrame(render);};
  if(matchMedia('(hover: hover) and (pointer: fine)').matches){
   sections.forEach(state=>{
    state.section.addEventListener('pointermove',event=>{
     const rect=state.section.getBoundingClientRect();
     const horizontal=(event.clientX-rect.left)/rect.width-.5;
     const vertical=(event.clientY-rect.top)/rect.height-.5;
     state.target=horizontal*220+vertical*70;
     requestRender();
    });
    state.section.addEventListener('pointerleave',()=>{state.target=0;requestRender();});
   });
  }else{
   const updateFromScroll=()=>{
    const viewportHeight=innerHeight;
    sections.forEach(state=>{
     const rect=state.section.getBoundingClientRect();
     const progress=Math.max(0,Math.min(1,(viewportHeight-rect.top)/(viewportHeight+rect.height)))-.5;
     state.target=progress*144;
    });
    requestRender();
   };
   addEventListener('scroll',updateFromScroll,{passive:true});
   addEventListener('resize',updateFromScroll,{passive:true});
   updateFromScroll();
  }
 }
}
const hero=document.querySelector('[data-hero]');
if(hero) import('./hero.js').then(({startHero})=>startHero(hero)).catch(()=>{/* Static artwork remains visible if enhancement is unavailable. */});
