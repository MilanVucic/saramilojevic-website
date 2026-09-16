// Optional local check, using an installed Chrome and Node's built-in WebSocket.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const profile=await mkdtemp(path.join(tmpdir(),'sara-browser-'));
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
  for(const route of ['/','/collection/cinematic-stills/','/artwork/dont-look/']){
   await call('Page.navigate',{url:`http://localhost:4321${route}`});await new Promise(r=>setTimeout(r,1500));
   const result=await evaluate(`({title:document.title,overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>i.hasAttribute('src')&&i.complete&&!i.naturalWidth).length})`);
   if(result.overflow||result.broken)throw Error(`${width} ${route}: ${JSON.stringify(result)}`);
   if(route==='/') { const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(profile,`home-${width}.png`),Buffer.from(data,'base64')); }
   if(route.startsWith('/artwork')){
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
