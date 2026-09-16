import * as THREE from 'three';

const HOLD_MS = 6000;
const TRANSITION_MS = 1300;

function startImageSlideshow(host, sources) {
  if (sources.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const first = host.querySelector('img');
  if (!first) return;
  const second = document.createElement('img');
  second.alt = '';
  second.setAttribute('aria-hidden', 'true');
  second.className = 'hero-slide';
  second.decoding = 'async';
  second.style.opacity = '0';
  host.insertBefore(second, host.querySelector('.hero-shade'));

  let front = first;
  let back = second;
  let index = 0;
  let timer = 0;
  let disposed = false;
  const schedule = () => {
    clearTimeout(timer);
    if (disposed || document.hidden) return;
    timer = window.setTimeout(showNext, HOLD_MS);
  };
  const showNext = () => {
    if (disposed || document.hidden) return schedule();
    const nextIndex = (index + 1) % sources.length;
    back.onload = () => {
      if (disposed) return;
      requestAnimationFrame(() => { back.style.opacity = '1'; });
      timer = window.setTimeout(() => {
        front.style.opacity = '0';
        [front, back] = [back, front];
        index = nextIndex;
        schedule();
      }, TRANSITION_MS);
    };
    back.onerror = schedule;
    back.src = sources[nextIndex];
  };
  const onVisibility = () => {
    if (!document.hidden) schedule();
    else clearTimeout(timer);
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => {
    disposed = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    second.remove();
  }, { once: true });
  schedule();
}

export async function startHero(host) {
  const fallback = host.querySelector('img');
  const sources = JSON.parse(host.dataset.heroSources || '[]').filter(Boolean);
  if (!sources.length && fallback) sources.push(fallback.currentSrc || fallback.src);
  if (!sources.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    startImageSlideshow(host, sources);
    return;
  }

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const loadTexture = async source => {
    const texture = await loader.loadAsync(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  let currentTexture;
  try {
    currentTexture = await loadTexture(sources[0]);
  } catch {
    renderer.dispose();
    startImageSlideshow(host, sources);
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  camera.position.z = 1;
  const uniforms = {
    mapA: { value: currentTexture },
    mapB: { value: currentTexture },
    blend: { value: 0 },
    pointer: { value: new THREE.Vector2(.5, .5) },
    strength: { value: 0 },
    ratioA: { value: new THREE.Vector2(1, 1) },
    ratioB: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1);}',
    fragmentShader: `
      uniform sampler2D mapA; uniform sampler2D mapB; uniform float blend;
      uniform vec2 pointer; uniform vec2 ratioA; uniform vec2 ratioB; uniform float strength;
      varying vec2 vUv;
      vec2 uvFor(vec2 ratio) {
        vec2 uv=(vUv-.5)*ratio+.5;
        float d=distance(vUv,pointer);
        return uv+sin(d*14.)*exp(-d*5.)*strength*(vUv-pointer);
      }
      void main(){
        vec4 first=texture2D(mapA,uvFor(ratioA));
        vec4 second=texture2D(mapB,uvFor(ratioB));
        gl_FragColor=mix(first,second,blend);
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  host.prepend(renderer.domElement);
  renderer.domElement.style.zIndex = '1';

  let activeIndex = 0;
  let visible = true;
  let disposed = false;
  let slideTimer = 0;
  let motionFrame = 0;
  let transitionFrame = 0;
  const target = new THREE.Vector2(.5, .5);
  let force = 0;
  const setRatio = (texture, targetRatio) => {
    const hostRatio = host.clientWidth / host.clientHeight;
    const imageRatio = texture.image.width / texture.image.height;
    const ratio = imageRatio / hostRatio;
    targetRatio.set(ratio > 1 ? 1 / ratio : 1, ratio > 1 ? 1 : ratio);
  };
  const paint = () => renderer.render(scene, camera);
  const scheduleMotion = () => {
    if (motionFrame || transitionFrame || disposed || !visible || document.hidden) return;
    motionFrame = requestAnimationFrame(() => {
      motionFrame = 0;
      uniforms.pointer.value.lerp(target, .09);
      uniforms.strength.value += (force - uniforms.strength.value) * .08;
      paint();
      if (Math.abs(force - uniforms.strength.value) > .0001 || uniforms.pointer.value.distanceTo(target) > .001) scheduleMotion();
    });
  };
  const scheduleSlide = () => {
    clearTimeout(slideTimer);
    if (sources.length < 2 || disposed || !visible || document.hidden) return;
    slideTimer = window.setTimeout(showNext, HOLD_MS);
  };
  const showNext = async () => {
    if (disposed || !visible || document.hidden) return scheduleSlide();
    const nextIndex = (activeIndex + 1) % sources.length;
    let nextTexture;
    try {
      nextTexture = await loadTexture(sources[nextIndex]);
    } catch {
      return scheduleSlide();
    }
    if (disposed || !visible || document.hidden) {
      nextTexture.dispose();
      return scheduleSlide();
    }
    uniforms.mapB.value = nextTexture;
    setRatio(nextTexture, uniforms.ratioB.value);
    const start = performance.now();
    const transition = now => {
      if (disposed) return;
      uniforms.pointer.value.lerp(target, .09);
      uniforms.strength.value += (force - uniforms.strength.value) * .08;
      uniforms.blend.value = Math.min((now - start) / TRANSITION_MS, 1);
      paint();
      if (uniforms.blend.value < 1) {
        transitionFrame = requestAnimationFrame(transition);
        return;
      }
      currentTexture.dispose();
      currentTexture = nextTexture;
      activeIndex = nextIndex;
      uniforms.mapA.value = currentTexture;
      uniforms.ratioA.value.copy(uniforms.ratioB.value);
      uniforms.mapB.value = currentTexture;
      uniforms.blend.value = 0;
      transitionFrame = 0;
      scheduleSlide();
    };
    transitionFrame = requestAnimationFrame(transition);
  };

  const resize = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    setRatio(currentTexture, uniforms.ratioA.value);
    if (uniforms.mapB.value) setRatio(uniforms.mapB.value, uniforms.ratioB.value);
    scheduleMotion();
  });
  resize.observe(host);
  host.parentElement.addEventListener('pointermove', event => {
    const bounds = host.getBoundingClientRect();
    target.set((event.clientX - bounds.left) / bounds.width, 1 - (event.clientY - bounds.top) / bounds.height);
    force = .055;
    scheduleMotion();
  });
  host.parentElement.addEventListener('pointerleave', () => {
    force = 0;
    scheduleMotion();
  });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      scheduleMotion();
      scheduleSlide();
    } else {
      clearTimeout(slideTimer);
    }
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      scheduleMotion();
      scheduleSlide();
    } else {
      clearTimeout(slideTimer);
    }
  });
  scheduleSlide();
  window.addEventListener('pagehide', () => {
    disposed = true;
    clearTimeout(slideTimer);
    cancelAnimationFrame(motionFrame);
    cancelAnimationFrame(transitionFrame);
    resize.disconnect();
    observer.disconnect();
    geometry.dispose();
    material.dispose();
    currentTexture.dispose();
    renderer.dispose();
  }, { once: true });
}
