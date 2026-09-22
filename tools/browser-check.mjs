// Optional local check, using an installed Chrome and Node's built-in WebSocket.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const profile=await mkdtemp(path.join(tmpdir(),'sara-browser-'));
const baseUrl=process.env.TEST_BASE_URL||'http://localhost:4321';
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--remote-debugging-port=9334',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;const pending=new Map();let id=0;const errors=[];
try{
 let tabs;for(let n=0;n<40;n++){try{tabs=await (await fetch('http://127.0.0.1:9334/json')).json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
 if(!tabs)throw Error('Chrome did not start');
 socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text+': '+msg.params.exceptionDetails.exception?.description);});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 await call('Page.enable');await call('Runtime.enable');
 const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 for(const width of [390,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
  for(const route of ['/','/about/','/collections/','/all-works/','/contact/','/collection/cinematic-stills/','/artwork/dont-look/']){
   await call('Page.navigate',{url:`${baseUrl}${route}`});await new Promise(r=>setTimeout(r,1500));
   const result=await evaluate(`({title:document.title,overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>i.hasAttribute('src')&&i.complete&&!i.naturalWidth).length})`);
   if(result.overflow||result.broken)throw Error(`${width} ${route}: ${JSON.stringify(result)}`);
   if(!await evaluate(`[...document.querySelectorAll('main section:not(.hero)')].every(section=>section.hasAttribute('data-reveal'))`)){
    const state=await evaluate(`({enabled:document.documentElement.classList.contains('reveal-enabled'),missing:[...document.querySelectorAll('main section:not(.hero):not([data-reveal])')].map(section=>section.className)})`);
    throw Error(`${width} ${route}: section reveal was not registered: ${JSON.stringify(state)}${errors.length?`\n${errors.join('\n')}`:''}`);
   }
   if(route==='/') {
    if(!await evaluate(`!!document.querySelector('[data-hero] .hero-slide-loader')&&!document.querySelector('[data-hero] canvas')`))throw Error(`${width} homepage: timed hero did not initialize`);
    if(!await evaluate(`document.documentElement.classList.contains('reveal-enabled')`))throw Error(`${width} homepage: section reveals did not initialize`);
    if(!await evaluate(`document.querySelector('#selected .section-heading .button')?.getAttribute('href')==='/all-works/'&&[...document.querySelectorAll('[data-selected-group]')].every(group=>group.querySelectorAll('.work-card').length<=3)&&document.querySelector('[data-selected-group].is-active')?.querySelectorAll('.work-card').length===3`))throw Error(`${width} homepage: Selected Works groups or CTA are incorrect`);
    if(width===1440){
     const selectedCollection=await evaluate(`document.querySelector('[data-selected-group].is-active').dataset.collection`);
     await new Promise(r=>setTimeout(r,4500));
     if(!await evaluate(`!!document.querySelector('[data-hero] .hero-slide-loader img')?.getAttribute('src')`))throw Error('1440 homepage: timed hero did not advance');
     if(await evaluate(`document.querySelector('[data-selected-group].is-active').dataset.collection`)===selectedCollection)throw Error('1440 homepage: Selected Works did not rotate after five seconds');
    }
    const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(profile,`home-${width}.png`),Buffer.from(data,'base64'));
   }
   if(route==='/about/'){
    await evaluate(`document.querySelector('[data-carousel-next]').click()`);
    if(!await evaluate(`document.querySelector('[data-carousel-current]').textContent==='02'&&document.querySelectorAll('[data-carousel-slide].is-active').length===1`))throw Error(`${width} about: portrait carousel did not advance`);
   }
   if(route==='/collections/'){
    if(!await evaluate(`!document.querySelector('main>section.page-intro')&&document.querySelectorAll('.collection-archive-row').length>1&&document.querySelectorAll('.collection-archive-copy .button').length===document.querySelectorAll('.collection-archive-row').length&&document.querySelectorAll('.collection-archive-row')[1].classList.contains('is-reversed')`))throw Error(`${width} collections: alternating archive layout is incomplete`);
    const carouselBefore=await evaluate(`(()=>{const row=document.querySelector('.collection-archive-row');const viewport=row.querySelector('.collection-archive-viewport').getBoundingClientRect();const nav=row.querySelector('.collection-carousel-navigation').getBoundingClientRect();const previous=row.querySelector('[data-carousel-previous]').getBoundingClientRect();const next=row.querySelector('[data-carousel-next]').getBoundingClientRect();const caption=row.querySelector('.collection-carousel-caption').getBoundingClientRect();return{viewportBottom:viewport.bottom,navTop:nav.top,previousLeft:previous.left,nextLeft:next.left,captionWidth:caption.width,title:row.querySelector('[data-carousel-title]:not([hidden])').textContent,background:getComputedStyle(row.querySelector('.collection-archive-viewport')).backgroundColor}})()`);
    if(carouselBefore.navTop<carouselBefore.viewportBottom||carouselBefore.background!=='rgba(0, 0, 0, 0)')throw Error(`${width} collections: navigation is not below a transparent image stage`);
    await evaluate(`document.querySelector('.collection-archive-row [data-carousel-next]')?.click()`);
    const carouselAfter=await evaluate(`(()=>{const row=document.querySelector('.collection-archive-row');const previous=row.querySelector('[data-carousel-previous]').getBoundingClientRect();const next=row.querySelector('[data-carousel-next]').getBoundingClientRect();const caption=row.querySelector('.collection-carousel-caption').getBoundingClientRect();return{previousLeft:previous.left,nextLeft:next.left,captionWidth:caption.width,title:row.querySelector('[data-carousel-title]:not([hidden])').textContent,current:row.querySelector('[data-carousel-current]').textContent,active:row.querySelectorAll('[data-carousel-slide].is-active').length}})()`);
    if(carouselAfter.current!=='02'||carouselAfter.active!==1||carouselAfter.title===carouselBefore.title||Math.abs(carouselAfter.previousLeft-carouselBefore.previousLeft)>.5||Math.abs(carouselAfter.nextLeft-carouselBefore.nextLeft)>.5||Math.abs(carouselAfter.captionWidth-carouselBefore.captionWidth)>.5)throw Error(`${width} collections: caption navigation shifted or did not advance`);
   }
   if(route==='/all-works/'){
    if(!await evaluate(`document.querySelectorAll('[data-work-item]').length>1&&document.querySelector('[data-work-count]').textContent===String(document.querySelectorAll('[data-work-item]').length)&&[...document.querySelectorAll('[data-work-view]')].every(button=>button.querySelector('svg')&&button.getAttribute('aria-label'))`))throw Error(`${width} all works: archive or icon view controls did not initialize`);
    await evaluate(`document.querySelector('[data-work-search]').value='dance through';document.querySelector('[data-work-search]').dispatchEvent(new Event('input',{bubbles:true}))`);
    if(!await evaluate(`document.querySelectorAll('[data-work-item]:not([hidden])').length===1`))throw Error(`${width} all works: search did not filter to one result`);
    await evaluate(`document.querySelector('[data-work-search]').value='';document.querySelector('[data-work-search]').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-work-filter]:not([data-work-filter="all"])').click()`);
    if(!await evaluate(`document.querySelectorAll('[data-work-item]:not([hidden])').length>0&&document.querySelectorAll('[data-work-item][hidden]').length>0`))throw Error(`${width} all works: collection filter did not narrow results`);
    await evaluate(`document.querySelector('[data-work-view="list"]').click()`);
    if(!await evaluate(`document.querySelector('[data-all-works]').classList.contains('is-list')&&[...document.querySelectorAll('[data-work-item]')].every(item=>item.querySelector('.all-work-year')?.textContent.trim())`))throw Error(`${width} all works: list view or artwork years are missing`);
   }
   if(route==='/contact/'){
    if(!await evaluate(`(()=>{const heading=document.querySelector('.contact-page h1').getBoundingClientRect();const panel=document.querySelector('.contact-panel').getBoundingClientRect();return !(heading.left<panel.right&&heading.right>panel.left&&heading.top<panel.bottom&&heading.bottom>panel.top)})()`))throw Error(`${width} contact: heading overlaps the form panel`);
    if(!await evaluate(`document.querySelector('[data-contact-form]')?.getAttribute('action')==='https://api.web3forms.com/submit'&&document.querySelector('input[name="access_key"]')?.value==='8b8c138f-4f4c-47e9-920f-59cfbd559db5'`))throw Error(`${width} contact: Web3Forms configuration is missing`);
    if(!await evaluate(`document.querySelector('input[name="inquiry_type"][value="General inquiry"]').checked&&document.querySelector('[data-artwork-field]').hidden&&document.querySelector('[data-artwork-search]').disabled`))throw Error(`${width} contact: general inquiry is not the default`);
    await evaluate(`document.querySelector('input[name="inquiry_type"][value="Specific artwork"]').click()`);
    if(!await evaluate(`!document.querySelector('[data-artwork-field]').hidden&&!document.querySelector('[data-artwork-search]').disabled&&document.querySelector('[data-artwork-search]').required&&document.querySelectorAll('[data-artwork-option]').length>1`))throw Error(`${width} contact: artwork inquiry controls did not activate`);
    await evaluate(`document.querySelector('[data-artwork-search]').click()`);
    const dropdown=await evaluate(`(()=>{const panel=document.querySelector('[data-artwork-options]');const input=document.querySelector('[data-artwork-search]');const p=panel.getBoundingClientRect();const i=input.getBoundingClientRect();return{hidden:panel.hidden,hasImage:!!panel.querySelector('img'),background:getComputedStyle(panel).backgroundColor,panelWidth:p.width,inputWidth:i.width,panelTop:p.top,inputBottom:i.bottom}})()`);
    if(dropdown.hidden||!dropdown.hasImage||dropdown.background!=='rgb(255, 255, 255)'||Math.abs(dropdown.panelWidth-dropdown.inputWidth)>=1||dropdown.panelTop<dropdown.inputBottom)throw Error(`${width} contact: artwork dropdown styling or placement is incorrect ${JSON.stringify(dropdown)}`);
    await evaluate(`const input=document.querySelector('[data-artwork-search]');input.value='dance ache';input.dispatchEvent(new Event('input',{bubbles:true}))`);
    if(!await evaluate(`document.querySelectorAll('[data-artwork-option]:not([hidden])').length===1&&document.querySelector('[data-artwork-option]:not([hidden]) [data-image-loader]')`))throw Error(`${width} contact: partial artwork search with thumbnails is broken`);
    await evaluate(`document.querySelector('[data-artwork-option]:not([hidden])').click()`);
    if(!await evaluate(`document.querySelector('[data-artwork-options]').hidden&&!document.querySelector('[data-artwork-preview]').hidden&&!document.querySelector('[data-artwork-clear]').hidden&&getComputedStyle(document.querySelector('[data-artwork-clear]')).backgroundColor==='rgb(0, 0, 0)'&&!!document.querySelector('[data-artwork-preview] img').getAttribute('src')&&!!document.querySelector('[data-preview-title]').textContent`))throw Error(`${width} contact: selected artwork preview or black clear button is incorrect`);
    await evaluate(`document.querySelector('[data-artwork-clear]').click()`);
    if(!await evaluate(`document.querySelector('[data-artwork-search]').value===''&&document.querySelector('[data-artwork-preview]').hidden&&document.querySelector('[data-artwork-clear]').hidden`))throw Error(`${width} contact: artwork clear button did not remove the selection`);
   }
   if(!await evaluate(`document.querySelector('.footer-social a[aria-label="Sara Milojević on Behance"]')?.getAttribute('href')==='https://www.behance.net/Sarami'`))throw Error(`${width} ${route}: Behance footer link is missing`);
   if(route.startsWith('/artwork')){
    if(!await evaluate(`document.querySelector('.artwork-info .button')?.getAttribute('href')==='/contact/?artwork=dont-look'&&document.querySelector('.section-heading .button')?.getAttribute('href')==='/all-works/'&&!document.body.textContent.includes('Click or tap any image to explore')&&!document.body.textContent.includes('Swipe or use arrow keys in the viewer')`))throw Error(`${width} artwork: enquiry or archive route is incorrect`);
    const related=await evaluate(`[...document.querySelectorAll('.artwork-page+section .work-card')].map(link=>link.getAttribute('href'))`);
    if(JSON.stringify(related)!==JSON.stringify(['/artwork/neither-do-i-want-to-travel-without-you/','/artwork/i-feel-like-im-in-a-movie/','/artwork/the-blue-clips/']))throw Error(`${width} artwork: incorrect wrapped related sequence ${JSON.stringify(related)}`);
    if(!await evaluate(`[...document.querySelectorAll('.artwork-info dt')].some(dt=>dt.textContent==='Year'&&dt.nextElementSibling?.textContent==='2026')`))throw Error(`${width} artwork: year is missing from artwork information`);
    await evaluate(`document.querySelector('.gallery-trigger').scrollIntoView({block:'center'})`);await new Promise(r=>setTimeout(r,150));
    const point=await evaluate(`(()=>{const r=document.querySelector('.gallery-trigger').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    if(width<500){
     await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});
     await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{
     await call('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
     await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
    }
    await new Promise(r=>setTimeout(r,650));
    if(!await evaluate(`!!document.querySelector('.artwork-viewer.is-open')`)){
     const state=await evaluate(`({url:location.href,viewer:[...document.querySelectorAll('.artwork-viewer')].map(el=>el.className),gallery:!!document.querySelector('#gallery')})`);
     throw Error(`Lightbox did not open: ${JSON.stringify(state)}${errors.length ? `\n${errors.join('\n')}` : ''}`);
    }
    await evaluate(`document.querySelector('.viewer-close').click()`);
   }
   console.log(`PASS ${width}px ${route}`);
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log(`Screenshots: ${profile}`);
}finally{socket?.close();chrome.kill();}
