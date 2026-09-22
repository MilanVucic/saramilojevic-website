const HOLD_MS = 4000;
const TRANSITION_MS = 1300;

export function startHero(host) {
  const fallback = host.querySelector('img');
  const sources = JSON.parse(host.dataset.heroSources || '[]').filter(Boolean);
  if (!sources.length && fallback) sources.push(fallback.currentSrc || fallback.src);
  if (!fallback || sources.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const firstShell = fallback.closest('[data-image-loader]');
  if (!firstShell) return;
  const secondShell = document.createElement('span');
  const secondImage = document.createElement('img');
  secondShell.className = 'loading-image hero-slide-loader';
  secondShell.dataset.imageLoader = '';
  secondShell.style.opacity = '0';
  secondShell.style.zIndex = '1';
  secondImage.alt = '';
  secondImage.setAttribute('aria-hidden', 'true');
  secondImage.decoding = 'async';
  secondShell.append(secondImage);
  host.insertBefore(secondShell, host.querySelector('.hero-shade'));
  firstShell.style.zIndex = '0';

  let frontShell = firstShell;
  let frontImage = fallback;
  let backShell = secondShell;
  let backImage = secondImage;
  let activeIndex = 0;
  let timer = 0;
  let transitionTimer = 0;
  let disposed = false;

  const schedule = () => {
    clearTimeout(timer);
    if (disposed || document.hidden) return;
    timer = window.setTimeout(showNext, HOLD_MS);
  };

  const showNext = () => {
    if (disposed || document.hidden) return schedule();
    const nextIndex = (activeIndex + 1) % sources.length;
    backShell.classList.remove('is-loaded', 'has-error');
    backShell.style.opacity = '0';
    backShell.style.zIndex = '1';
    frontShell.style.zIndex = '0';
    backImage.onload = () => {
      if (disposed) return;
      backShell.classList.add('is-loaded');
      requestAnimationFrame(() => { backShell.style.opacity = '1'; });
      transitionTimer = window.setTimeout(() => {
        frontShell.style.opacity = '0';
        [frontShell, backShell] = [backShell, frontShell];
        [frontImage, backImage] = [backImage, frontImage];
        activeIndex = nextIndex;
        schedule();
      }, TRANSITION_MS);
    };
    backImage.onerror = () => {
      backShell.classList.add('is-loaded', 'has-error');
      backShell.style.zIndex = '0';
      frontShell.style.zIndex = '1';
      schedule();
    };
    backImage.src = sources[nextIndex];
  };

  const onVisibility = () => {
    if (document.hidden) {
      clearTimeout(timer);
      clearTimeout(transitionTimer);
    } else {
      schedule();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => {
    disposed = true;
    clearTimeout(timer);
    clearTimeout(transitionTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    secondShell.remove();
  }, { once: true });
  schedule();
}
