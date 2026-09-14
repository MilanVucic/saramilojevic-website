import * as THREE from 'three';
export async function startHero(host){
 const source=host.querySelector('img');
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});}catch{return;}
 let texture;
 try{texture=await new THREE.TextureLoader().loadAsync(source.currentSrc||source.src);}catch{renderer.dispose();return;}
 texture.colorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
 const uniforms={map:{value:texture},pointer:{value:new THREE.Vector2(.5,.5)},strength:{value:0},ratio:{value:new THREE.Vector2(1,1)}};
 const material=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D map; uniform vec2 pointer; uniform vec2 ratio; uniform float strength; varying vec2 vUv; void main(){vec2 uv=(vUv-.5)*ratio+.5; float d=distance(vUv,pointer); uv+=sin(d*14.)*exp(-d*5.)*strength*(vUv-pointer); gl_FragColor=texture2D(map,uv); #include <colorspace_fragment> }`.replace('#include <colorspace_fragment>','\n#include <colorspace_fragment>\n')});
 const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));host.prepend(renderer.domElement);
 // Canvas overlays the fallback image but stays beneath the shading and text.
 renderer.domElement.style.zIndex='1';
 let frame=0;const target=new THREE.Vector2(.5,.5);let force=0,visible=true;
 const render=()=>{frame=0;if(!visible||document.hidden)return;uniforms.pointer.value.lerp(target,.09);uniforms.strength.value+=(force-uniforms.strength.value)*.08;renderer.render(scene,camera);if(Math.abs(force-uniforms.strength.value)>.0001||uniforms.pointer.value.distanceTo(target)>.001)frame=requestAnimationFrame(render);};
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(w,h);const r=(texture.image.width/texture.image.height)/(w/h);uniforms.ratio.value.set(r>1?1/r:1,r>1?1:r);schedule();});resize.observe(host);
 host.parentElement.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();target.set((e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height);force=.055;schedule();});
 host.parentElement.addEventListener('pointerleave',()=>{force=0;schedule();});
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)schedule();});observer.observe(host);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();geometry.dispose();material.dispose();texture.dispose();renderer.dispose();},{once:true});
}
