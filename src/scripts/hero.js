const HOLD_MS = 4000;
const TRANSITION_MS = 1300;

export function startHero(host) {
  const fallback = host.querySelector('img');
  const mobileQuery = matchMedia('(max-width: 760px)');
  const desktopSources = JSON.parse(host.dataset.heroDesktopSources || '[]').filter(Boolean);
  const desktopLinks = JSON.parse(host.dataset.heroDesktopLinks || '[]').filter(Boolean);
  const mobileSources = JSON.parse(host.dataset.heroMobileSources || '[]').filter(Boolean);
  const mobileLinks = JSON.parse(host.dataset.heroMobileLinks || '[]').filter(Boolean);
  const sources = (mobileQuery.matches && mobileSources.length ? mobileSources : desktopSources).slice();
  const links = (mobileQuery.matches && mobileLinks.length ? mobileLinks : desktopLinks).slice();
  const artworkLink = host.closest('.hero')?.querySelector('.hero-artwork-cta');
  if (!sources.length && fallback) sources.push(fallback.currentSrc || fallback.src);
  if (artworkLink && links[0]) artworkLink.href = links[0];
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
  let transitioning = false;
  let disposed = false;

  const setImageSource = (image, src) => {
    image.closest('picture')?.querySelectorAll('source').forEach(source => {
      source.srcset = src;
    });
    image.src = src;
  };

  const schedule = () => {
    clearTimeout(timer);
    if (disposed || transitioning || document.hidden) return;
    timer = window.setTimeout(showNext, HOLD_MS);
  };

  const showNext = () => {
    if (disposed || document.hidden) return schedule();
    if (transitioning) return;
    transitioning = true;
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
        if (artworkLink && links[activeIndex]) artworkLink.href = links[activeIndex];
        transitioning = false;
        schedule();
      }, TRANSITION_MS);
    };
    backImage.onerror = () => {
      backShell.classList.add('is-loaded', 'has-error');
      backShell.style.zIndex = '0';
      frontShell.style.zIndex = '1';
      transitioning = false;
      schedule();
    };
    setImageSource(backImage, sources[nextIndex]);
  };

  const onVisibility = () => {
    if (document.hidden) {
      clearTimeout(timer);
    } else {
      schedule();
    }
  };
  const onPageShow = event => {
    if (!event.persisted) return;
    disposed = false;
    schedule();
  };
  const onPageHide = event => {
    clearTimeout(timer);
    if (event.persisted) {
      clearTimeout(transitionTimer);
      backImage.onload = null;
      backImage.onerror = null;
      if (transitioning) {
        backShell.style.opacity = '0';
        backShell.style.zIndex = '0';
        frontShell.style.opacity = '1';
        frontShell.style.zIndex = '1';
        transitioning = false;
      }
      return;
    }
    disposed = true;
    clearTimeout(transitionTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
    secondShell.remove();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('pagehide', onPageHide);
  schedule();
}
