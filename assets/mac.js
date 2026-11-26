(() => {
  const button = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (!button || !nav) return;
  document.documentElement.classList.add('js');
  const header = document.querySelector('.site-header');
  const measureHeader = () => {
    if (header) document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
  };
  measureHeader();
  if ('ResizeObserver' in window && header) new ResizeObserver(measureHeader).observe(header);
  else window.addEventListener('resize', measureHeader);
  button.hidden = false;
  const setOpen = open => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    nav.classList.toggle('is-open', open);
  };
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  button.addEventListener('click', () => setOpen(!isOpen()));
  nav.addEventListener('click', event => {
    if (isOpen() && event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });
  const closeOutside = event => {
    if (isOpen() && !button.contains(event.target) && !nav.contains(event.target)) setOpen(false);
  };
  document.addEventListener('focusin', closeOutside);
  document.addEventListener('click', closeOutside);
  const wide = window.matchMedia('(min-width: 761px)');
  wide.addEventListener('change', event => { if (event.matches) setOpen(false); });
})();

// Keep the original image link working when dialogs or JavaScript are unavailable.
(() => {
  const opener = document.querySelector('.preview-open');
  const dialog = document.getElementById('screen-detail');
  if (!opener || !dialog || typeof dialog.showModal !== 'function') return;
  const stage = dialog.querySelector('.screen-stage');
  const zoom = dialog.querySelector('.screen-zoom');
  const original = stage.querySelector('img');
  const close = dialog.querySelector('.screen-close');
  const hint = dialog.querySelector('.screen-hint');
  const route = '#screen-detail';
  let returnFocus = opener;
  let awaitingBack = false;
  let pushedEntry = false;
  let returnToPreview = false;

  const setZoom = expanded => {
    stage.classList.toggle('is-zoomed', expanded);
    zoom.setAttribute('aria-pressed', String(expanded));
    zoom.textContent = expanded ? '全体を表示' : '細部を拡大';
    hint.textContent = expanded ? '拡大中：画像の上を左右・上下にスクロールできます' : '全体を表示しています';
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  };
  const show = (focusTarget = document.activeElement) => {
    if (dialog.open || awaitingBack) return;
    returnFocus = focusTarget;
    if (!original.getAttribute('src')) original.src = original.dataset.src;
    setZoom(false);
    dialog.showModal();
    document.documentElement.classList.add('preview-is-open');
  };
  const hide = () => {
    if (dialog.open) dialog.close();
  };
  const requestClose = () => {
    if (awaitingBack) return;
    if (pushedEntry && history.state?.pdfMarinScreen === true && location.hash === route) {
      awaitingBack = true;
      history.back();
    } else {
      // A shared/reloaded preview URL has no local entry to go Back to.
      if (location.hash === route) {
        const state = { ...history.state };
        delete state.pdfMarinScreen;
        try { history.replaceState(state, '', '#preview'); } catch { /* Closing still works without history access. */ }
        returnToPreview = true;
      }
      hide();
    }
  };

  opener.setAttribute('aria-label', 'Windows版の参考画面をページ内で拡大して見る');
  opener.setAttribute('aria-haspopup', 'dialog');
  opener.setAttribute('aria-controls', dialog.id);
  opener.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (dialog.open || awaitingBack) return;
    show();
    // The browser Back gesture closes the preview and returns to the same page position.
    try {
      history.pushState({ ...history.state, pdfMarinScreen: true }, '', route);
      pushedEntry = true;
    } catch { pushedEntry = false; }
  });
  zoom.addEventListener('click', () => setZoom(zoom.getAttribute('aria-pressed') !== 'true'));
  close.addEventListener('click', requestClose);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) requestClose(); });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('preview-is-open');
    setZoom(false);
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    if (returnToPreview) {
      document.getElementById('preview').scrollIntoView({ block: 'start' });
      returnToPreview = false;
    }
  });
  if (location.hash === route) show(opener);
  window.addEventListener('popstate', () => {
    awaitingBack = false;
    if (history.state?.pdfMarinScreen === true && location.hash === route) {
      pushedEntry = true;
      show();
    } else {
      pushedEntry = false;
      hide();
    }
  });
})();
