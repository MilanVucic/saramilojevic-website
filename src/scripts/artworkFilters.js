const normalize = value => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export const initializeArtworkFilters = () => {
  document.querySelectorAll('[data-artwork-filter-root]').forEach(root => {
    if (root.dataset.filtersReady === 'true') return;

    const section = root.closest('.all-works-page');
    const allWorks = section?.querySelector('[data-all-works]');
    const search = root.querySelector('[data-work-search]');
    const searchClear = root.querySelector('[data-clear-work-search]');
    const filterInputs = [...root.querySelectorAll('[data-work-filter-group]')];
    const filterMenus = [...root.querySelectorAll('[data-filter-menu]')];
    const clearFilters = root.querySelector('[data-clear-work-filters]');
    const mobileFilterToggle = root.querySelector('[data-mobile-filter-toggle]');
    const mobileFilterModal = root.querySelector('[data-filter-modal]');
    const mobileFilterClose = root.querySelector('[data-mobile-filter-close]');
    const mobileFilterClear = root.querySelector('[data-mobile-filter-clear]');
    const mobileFilterApply = root.querySelector('[data-mobile-filter-apply]');
    const views = [...root.querySelectorAll('[data-work-view]')];
    const count = section?.querySelector('[data-work-count]');
    const empty = section?.querySelector('[data-works-empty]');
    const emptyClear = section?.querySelector('.all-works-empty-clear');

    if (!allWorks || !search || !searchClear || !clearFilters || !mobileFilterModal || !mobileFilterClose || !mobileFilterClear || !mobileFilterApply || !count || !empty) return;

    root.dataset.filtersReady = 'true';
    const items = [...allWorks.querySelectorAll('[data-work-item]')];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileFilters = window.matchMedia('(max-width: 760px)');
    let updateVersion = 0;
    let runningAnimations = [];
    let mobileFilterSnapshot = null;
    let mobileCloseTimer = 0;
    const mobileModalHome = document.createComment('artwork-filter-modal');
    mobileFilterModal.before(mobileModalHome);
    const selectedValues = group => new Set(
      filterInputs
        .filter(input => input.dataset.workFilterGroup === group && input.checked)
        .map(input => input.value),
    );

    const mobileModalOpen = () => mobileFilters.matches && root.classList.contains('mobile-filters-open');
    const menuAnimations = new WeakMap();

    const setMenuOpen = (menu, opening, animate = mobileModalOpen()) => {
      const popup = menu.querySelector('[data-filter-popup]');
      const toggle = menu.querySelector('[data-filter-menu-toggle]');
      const currentAnimation = menuAnimations.get(popup);
      currentAnimation?.cancel();
      menuAnimations.delete(popup);
      toggle.setAttribute('aria-expanded', String(opening));

      if (opening) {
        if (!popup.hidden) return;
        popup.hidden = false;
      } else if (popup.hidden) {
        return;
      }

      if (!animate || reducedMotion.matches || typeof popup.animate !== 'function') {
        popup.hidden = !opening;
        return;
      }

      const styles = getComputedStyle(popup);
      const expanded = {
        height: `${popup.getBoundingClientRect().height}px`,
        marginTop: styles.marginTop,
        paddingTop: styles.paddingTop,
        paddingBottom: styles.paddingBottom,
        borderTopWidth: styles.borderTopWidth,
        borderBottomWidth: styles.borderBottomWidth,
        opacity: 1,
        transform: 'translateY(0)',
      };
      const collapsed = {
        height: '0px',
        marginTop: '0px',
        paddingTop: '0px',
        paddingBottom: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
        opacity: 0,
        transform: 'translateY(-6px)',
      };
      const animation = popup.animate(opening ? [collapsed, expanded] : [expanded, collapsed], {
        duration: opening ? 320 : 240,
        easing: 'cubic-bezier(.2,.75,.25,1)',
        fill: 'both',
      });
      menuAnimations.set(popup, animation);
      animation.finished
        .catch(() => {})
        .then(() => {
          if (menuAnimations.get(popup) !== animation) return;
          menuAnimations.delete(popup);
          if (!opening && toggle.getAttribute('aria-expanded') === 'false') popup.hidden = true;
          animation.cancel();
        });
    };

    const closeMenus = (except, animate = mobileModalOpen()) => {
      filterMenus.forEach(menu => {
        if (menu === except) return;
        setMenuOpen(menu, false, animate);
      });
    };

    const updateSummaries = () => {
      filterInputs.forEach(input => {
        input.closest('.all-works-filter-option')?.classList.toggle('is-selected', input.checked);
      });
      const selectedCount = filterInputs.filter(input => input.checked).length;
      root.classList.toggle('has-active-filters', selectedCount > 0);
      if (mobileFilterToggle) {
        mobileFilterToggle.setAttribute(
          'aria-label',
          selectedCount ? `Show artwork filters, ${selectedCount} selected` : 'Show artwork filters',
        );
      }
      filterMenus.forEach(menu => {
        const checked = filterInputs.filter(input =>
          input.dataset.workFilterGroup === menu.dataset.filterMenu && input.checked,
        );
        const summary = menu.querySelector('[data-filter-summary]');
        summary.textContent = checked.length === 0
          ? 'All'
          : checked.length === 1
            ? checked[0].dataset.filterLabel
            : `${checked.length} selected`;
        menu.classList.toggle('has-selection', checked.length > 0);
      });
    };

    const cancelAnimations = () => {
      runningAnimations.forEach(animation => animation.cancel());
      runningAnimations = [];
    };

    const animateItem = (item, keyframes, options) => {
      const animation = item.animate(keyframes, options);
      runningAnimations.push(animation);
      animation.finished
        .catch(() => {})
        .finally(() => {
          runningAnimations = runningAnimations.filter(candidate => candidate !== animation);
        });
      return animation;
    };

    const update = async (animate = true) => {
      const version = ++updateVersion;
      cancelAnimations();
      const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
      const collections = selectedValues('collection');
      const types = selectedValues('type');
      const years = selectedValues('year');
      const sizes = selectedValues('size');
      const matches = new Map(items.map(item => {
        const matchesSearch = terms.every(term => normalize(item.dataset.search).includes(term));
        const matchesCollection = !collections.size || collections.has(item.dataset.collection);
        const matchesType = !types.size || types.has(item.dataset.type);
        const matchesYear = !years.size || years.has(item.dataset.year);
        const matchesSize = !sizes.size || sizes.has(item.dataset.size);
        return [item, matchesSearch && matchesCollection && matchesType && matchesYear && matchesSize];
      }));
      const visible = [...matches.values()].filter(Boolean).length;

      count.textContent = String(visible);
      searchClear.hidden = !search.value;
      clearFilters.hidden = !terms.length && !filterInputs.some(input => input.checked);
      updateSummaries();

      const applyVisibility = () => {
        items.forEach(item => { item.hidden = !matches.get(item); });
        empty.hidden = visible !== 0;
      };

      if (!animate || reducedMotion.matches || typeof items[0]?.animate !== 'function') {
        applyVisibility();
        return;
      }

      const leaving = items.filter(item => !item.hidden && !matches.get(item));
      const staying = items.filter(item => !item.hidden && matches.get(item));
      const entering = items.filter(item => item.hidden && matches.get(item));
      const firstRects = new Map(staying.map(item => [item, item.getBoundingClientRect()]));

      if (leaving.length) {
        const exits = leaving.map(item => animateItem(item, [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(.975)' },
        ], { duration: 150, easing: 'ease-in', fill: 'forwards' }));
        await Promise.all(exits.map(animation => animation.finished.catch(() => {})));
        if (version !== updateVersion) return;
        exits.forEach(animation => animation.cancel());
      }

      applyVisibility();

      staying.forEach(item => {
        const first = firstRects.get(item);
        const last = item.getBoundingClientRect();
        const x = first.left - last.left;
        const y = first.top - last.top;
        if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
        animateItem(item, [
          { transform: `translate(${x}px, ${y}px)`, opacity: .78 },
          { transform: 'translate(0, 0)', opacity: 1 },
        ], { duration: 340, easing: 'cubic-bezier(.2,.75,.25,1)' });
      });

      entering.forEach((item, index) => {
        animateItem(item, [
          { opacity: 0, transform: 'translateY(16px) scale(.985)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ], {
          duration: 300,
          delay: Math.min(index * 18, 120),
          easing: 'cubic-bezier(.2,.75,.25,1)',
          fill: 'backwards',
        });
      });
    };

    const handleControlChange = () => {
      if (mobileModalOpen()) {
        searchClear.hidden = !search.value;
        updateSummaries();
        return;
      }
      update();
    };

    search.addEventListener('input', handleControlChange);
    search.addEventListener('search', handleControlChange);
    searchClear.addEventListener('click', () => {
      search.value = '';
      search.focus();
      handleControlChange();
    });
    filterInputs.forEach(input => input.addEventListener('change', handleControlChange));

    filterMenus.forEach(menu => {
      const toggle = menu.querySelector('[data-filter-menu-toggle]');
      toggle.addEventListener('click', () => {
        const opening = toggle.getAttribute('aria-expanded') !== 'true';
        closeMenus(opening ? menu : null);
        setMenuOpen(menu, opening);
      });
    });

    const openMobileFilters = () => {
      window.clearTimeout(mobileCloseTimer);
      mobileFilterSnapshot = {
        search: search.value,
        checked: new Set(filterInputs.filter(input => input.checked).map(input => `${input.dataset.workFilterGroup}:${input.value}`)),
      };
      document.body.append(mobileFilterModal);
      root.classList.add('mobile-filters-open');
      mobileFilterModal.classList.add('is-open');
      document.body.classList.add('filters-modal-open');
      mobileFilterModal.setAttribute('aria-modal', 'true');
      mobileFilterModal.setAttribute('aria-hidden', 'false');
      closeMenus(null, false);
      mobileFilterToggle?.setAttribute('aria-expanded', 'true');
      mobileFilterToggle?.setAttribute('aria-label', 'Hide artwork filters');
      window.setTimeout(() => search.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 220);
    };

    const closeMobileFilters = (restore = true) => {
      if (restore && mobileFilterSnapshot) {
        search.value = mobileFilterSnapshot.search;
        filterInputs.forEach(input => {
          input.checked = mobileFilterSnapshot.checked.has(`${input.dataset.workFilterGroup}:${input.value}`);
        });
      }
      const selectedCount = filterInputs.filter(input => input.checked).length;
      root.classList.remove('mobile-filters-open');
      mobileFilterModal.classList.remove('is-open');
      document.body.classList.remove('filters-modal-open');
      mobileFilterModal.setAttribute('aria-modal', 'false');
      mobileFilterModal.setAttribute('aria-hidden', 'true');
      mobileFilterToggle?.setAttribute('aria-expanded', 'false');
      mobileFilterToggle?.setAttribute(
        'aria-label',
        selectedCount ? `Show artwork filters, ${selectedCount} selected` : 'Show artwork filters',
      );
      mobileCloseTimer = window.setTimeout(() => {
        if (!root.classList.contains('mobile-filters-open')) {
          closeMenus();
          mobileModalHome.parentNode?.insertBefore(mobileFilterModal, mobileModalHome.nextSibling);
        }
      }, reducedMotion.matches ? 0 : 320);
      searchClear.hidden = !search.value;
      updateSummaries();
      mobileFilterSnapshot = null;
      mobileFilterToggle?.focus({ preventScroll: true });
    };

    mobileFilterToggle?.addEventListener('click', openMobileFilters);
    mobileFilterClose.addEventListener('click', () => closeMobileFilters(true));
    mobileFilterModal.addEventListener('click', event => {
      if (event.target === mobileFilterModal) closeMobileFilters(true);
    });
    mobileFilterClear.addEventListener('click', () => {
      search.value = '';
      filterInputs.forEach(input => { input.checked = false; });
      searchClear.hidden = true;
      updateSummaries();
    });
    mobileFilterApply.addEventListener('click', () => {
      closeMobileFilters(false);
      update();
    });
    mobileFilters.addEventListener('change', event => {
      if (!event.matches && root.classList.contains('mobile-filters-open')) closeMobileFilters(true);
    });

    const resetFilters = () => {
      search.value = '';
      filterInputs.forEach(input => { input.checked = false; });
      searchClear.hidden = true;
      closeMenus();
      update();
    };

    clearFilters.addEventListener('click', resetFilters);
    emptyClear?.addEventListener('click', resetFilters);

    document.addEventListener('click', event => {
      if (mobileModalOpen()) return;
      if (!event.target.closest('[data-filter-menu]')) closeMenus();
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (mobileModalOpen()) {
        closeMobileFilters(true);
        return;
      }
      const openMenu = filterMenus.find(menu => !menu.querySelector('[data-filter-popup]').hidden);
      if (!openMenu) return;
      closeMenus();
      openMenu.querySelector('[data-filter-menu-toggle]').focus();
    });

    const changeView = async button => {
      const list = button.dataset.workView === 'list';
      const version = ++updateVersion;
      cancelAnimations();
      if (allWorks.classList.contains('is-list') === list) return;
      const visibleItems = items.filter(item => !item.hidden);

      if (!reducedMotion.matches && typeof visibleItems[0]?.animate === 'function') {
        const exits = visibleItems.map((item, index) => animateItem(item, [
          { opacity: 1, transform: 'translateY(0) scale(1)' },
          { opacity: 0, transform: 'translateY(8px) scale(.99)' },
        ], {
          duration: 140,
          delay: Math.min(index * 5, 55),
          easing: 'ease-in',
          fill: 'forwards',
        }));
        await Promise.all(exits.map(animation => animation.finished.catch(() => {})));
        if (version !== updateVersion) return;
        exits.forEach(animation => animation.cancel());
      }

      allWorks.classList.toggle('is-list', list);
      views.forEach(view => {
        const active = view === button;
        view.classList.toggle('is-active', active);
        view.setAttribute('aria-pressed', String(active));
      });

      if (!reducedMotion.matches && typeof visibleItems[0]?.animate === 'function') {
        visibleItems.forEach((item, index) => {
          animateItem(item, [
            { opacity: 0, transform: 'translateY(14px) scale(.99)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
          ], {
            duration: 300,
            delay: Math.min(index * 12, 120),
            easing: 'cubic-bezier(.2,.75,.25,1)',
            fill: 'backwards',
          });
        });
      }
    };

    views.forEach(button => button.addEventListener('click', () => changeView(button)));

    window.addEventListener('pageshow', () => update(false));
    update(false);
  });
};
