const HOLD_MS = 6000;
const TRANSITION_MS = 1300;

export function startHero(host) {
  const sources = JSON.parse(host.dataset.heroSources || '[]').filter(Boolean);
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
    if (document.hidden) clearTimeout(timer);
    else schedule();
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
