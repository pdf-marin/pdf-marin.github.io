(() => {
  const button = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (!button || !nav) return;
  document.documentElement.classList.add('js');
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
