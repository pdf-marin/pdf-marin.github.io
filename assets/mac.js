(() => {
  const button = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (!button || !nav) return;
  document.documentElement.classList.add('js');
  button.hidden = false;
  const close = () => {
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'メニューを開く');
    nav.classList.remove('is-open');
  };
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    nav.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      close();
      button.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.header-inner')) close();
  });
  const wide = window.matchMedia('(min-width: 761px)');
  wide.addEventListener('change', event => { if (event.matches) close(); });
})();
