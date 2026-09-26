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
 }),{threshold:0,rootMargin:'0px 0px -8%'});
 revealElements.forEach(element=>revealObserver.observe(element));
}
// Every content link and image works before these progressive enhancements load.
const galleryItems=[...document.querySelectorAll('.gallery-trigger')];
if (galleryItems.length) {
 const dataSource=galleryItems.map(item=>{
  const preview=item.querySelector('img');
  return {
   src:item.dataset.fullSrc,
   width:Number(preview?.getAttribute('width'))||preview?.naturalWidth||1,
   height:Number(preview?.getAttribute('height'))||preview?.naturalHeight||1,
   alt:preview?.alt||'',
   msrc:preview?.currentSrc||preview?.src,
   element:item
  };
 });
 let lightboxPromise;
 let lastTrigger;
 const syncCarousel=index=>{
  const item=galleryItems[index];
  if(!item)return;
  const carousel=item.closest('[data-image-carousel]');
  if(!carousel)return;
  const slides=[...carousel.querySelectorAll('[data-carousel-slide]')];
  const slideIndex=slides.findIndex(slide=>slide.contains(item));
  if(slideIndex<0)return;
  carousel.dispatchEvent(new CustomEvent('carousel:show',{detail:{index:slideIndex}}));
  lastTrigger=item;
 };
 const getLightbox=()=>{
  if(!lightboxPromise){
   lightboxPromise=Promise.all([import('photoswipe/lightbox'),import('photoswipe/style.css')]).then(([module])=>{
    const lightbox=new module.default({
     dataSource,
     pswpModule:()=>import('photoswipe'),
     showHideAnimationType:reduced?'none':'fade',
     initialZoomLevel:'fit',
     secondaryZoomLevel:zoomLevels=>window.matchMedia('(max-width: 760px)').matches?zoomLevels.initial*2:2.5,
     maxZoomLevel:zoomLevels=>zoomLevels.fit*4,
     zoom:false,
     counter:false,
     pinchToClose:false,
     closeOnVerticalDrag:false,
     allowPanToNext:false,
     bgOpacity:.96,
     preload:[1,2],
     closeTitle:'Close fullscreen image',
     arrowPrevTitle:'Previous image',
     arrowNextTitle:'Next image',
     errorMsg:'This image could not be loaded.'
    });
    lightbox.on('uiRegister',()=>{
     lightbox.pswp.ui.registerElement({
      name:'swipeHint',
      className:'pswp__swipe-hint',
      order:19,
      isButton:false,
      html:'&larr; swipe &rarr;',
      onInit:(element,pswp)=>{
       element.setAttribute('aria-hidden','true');
       const update=({slide}={})=>{
        const currentSlide=slide||pswp.currSlide;
        const zoomed=currentSlide&&currentSlide.currZoomLevel>currentSlide.zoomLevels.initial+.01;
        element.classList.toggle('is-zoomed',Boolean(zoomed));
       };
       pswp.on('zoomPanUpdate',update);
       pswp.on('change',update);
      }
     });
     lightbox.pswp.ui.registerElement({
      name:'imageCaption',
      className:'pswp__image-caption',
      order:9,
      appendTo:'root',
      isButton:false,
      onInit:(element,pswp)=>{
       const update=()=>{
        const item=galleryItems[pswp.currIndex];
        element.textContent=item?.closest('figure')?.querySelector('figcaption')?.textContent||'';
       };
       pswp.on('change',update);
       update();
      }
     });
    });
    lightbox.on('beforeOpen',()=>document.body.classList.add('viewer-active'));
    lightbox.on('change',()=>syncCarousel(lightbox.pswp.currIndex));
    lightbox.on('close',()=>{
     document.body.classList.remove('viewer-active');
     lastTrigger?.focus({preventScroll:true});
    });
    lightbox.init();
    return lightbox;
   }).catch(error=>{
    lightboxPromise=undefined;
    throw error;
   });
  }
  return lightboxPromise;
 };
 galleryItems.forEach((item,index)=>item.addEventListener('click',async event=>{
  event.preventDefault();
  lastTrigger=item;
  try{
   const lightbox=await getLightbox();
   lightbox.loadAndOpen(index);
  }catch(error){
   console.error('Unable to open the artwork viewer.',error);
  }
 }));
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
 contactForm.noValidate=true;
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
 const validationFields=[
  {control:contactForm.querySelector('#contact-name'),container:contactForm.querySelector('#contact-name').parentElement,missing:'Please enter your name.'},
  {control:contactForm.querySelector('#contact-email'),container:contactForm.querySelector('#contact-email').parentElement,missing:'Please enter your email address.',invalid:'Please enter a valid email address.'},
  {control:contactForm.querySelector('#contact-message'),container:contactForm.querySelector('#contact-message').parentElement,missing:'Please write a message.'},
  {control:artworkInput,container:artworkField,missing:'Please choose an artwork or switch to a general enquiry.'}
 ].map(field=>{
  const error=document.createElement('p');
  error.className='contact-field-error';
  error.id=`${field.control.id}-error`;
  error.setAttribute('aria-live','polite');
  error.hidden=true;
  field.container.append(error);
  field.control.setAttribute('aria-describedby',error.id);
  return {...field,error};
 });
 let validationAttempted=false;
 const validateField=field=>{
  const {control,error}=field;
  if(control.disabled||!control.required||control.validity.valid){
   error.classList.remove('is-visible');
   window.setTimeout(()=>{if(!error.classList.contains('is-visible')){error.hidden=true;error.textContent='';}},220);
   control.removeAttribute('aria-invalid');
   return true;
  }
  error.textContent=control.validity.typeMismatch&&field.invalid?field.invalid:field.missing;
  error.hidden=false;
  requestAnimationFrame(()=>error.classList.add('is-visible'));
  control.setAttribute('aria-invalid','true');
  return false;
 };
 validationFields.forEach(field=>{
  field.control.addEventListener('input',()=>{if(validationAttempted)validateField(field);});
  field.control.addEventListener('change',()=>{if(validationAttempted)validateField(field);});
 });
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
  validationAttempted=true;
  const invalidFields=validationFields.filter(field=>!validateField(field));
  if(invalidFields.length){
   status.dataset.state='error';
   status.textContent='A couple of details need your attention before we send this.';
   invalidFields[0].control.focus();
   return;
  }
  const originalLabel=submitButton.textContent;
  submitButton.disabled=true;
  submitButton.textContent='Sending…';
  status.textContent='';
  delete status.dataset.state;
  try{
   const response=await fetch(contactForm.action,{method:'POST',body:new FormData(contactForm),headers:{Accept:'application/json'}});
   const result=await response.json();
   if(!response.ok||!result.success)throw Error(result.message||'Unable to send your message.');
   contactForm.reset();
   updateInquiryType();
   validationAttempted=false;
   validationFields.forEach(validateField);
   status.dataset.state='success';
   status.textContent='Thank you. Your enquiry has been sent.';
  }catch(error){
   status.dataset.state='error';
   status.textContent=error instanceof Error?error.message:'Unable to send your message. Please try again.';
  }finally{
   submitButton.disabled=false;
   submitButton.textContent=originalLabel;
  }
 });
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
   let viewportHeight=innerHeight;
   const measureSections=()=>{
    viewportHeight=innerHeight;
    sections.forEach(state=>{
     const rect=state.section.getBoundingClientRect();
     state.top=rect.top+scrollY;
     state.height=rect.height;
    });
   };
   const updateFromScroll=()=>{
    const scrollTop=scrollY;
    sections.forEach(state=>{
     const sectionTop=state.top-scrollTop;
     const progress=Math.max(0,Math.min(1,(viewportHeight-sectionTop)/(viewportHeight+state.height)))-.5;
     state.target=progress*144;
    });
    requestRender();
   };
   addEventListener('scroll',updateFromScroll,{passive:true});
   addEventListener('resize',()=>{measureSections();updateFromScroll();},{passive:true});
   measureSections();
   updateFromScroll();
  }
 }
}
const hero=document.querySelector('[data-hero]');
const mobileHeroAutoplayDisabled=hero?.dataset.heroMobileAutoplay==='false'&&matchMedia('(max-width: 760px)').matches;
if(hero&&!mobileHeroAutoplayDisabled)import('./hero.js').then(({startHero})=>startHero(hero)).catch(()=>{/* Static artwork remains visible if enhancement is unavailable. */});
