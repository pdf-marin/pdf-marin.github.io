'use strict';

// Progressive enhancement: downloads and the contact form also work without JavaScript.
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const menu = $('.menu-toggle');
  const nav = $('#navigation');
  function closeMenu() {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'メニューを開く');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });

  // Open the installation instructions before following the in-page link.
  const warning = $('#keikoku');
  function expandHashTarget() { if (location.hash === '#keikoku') warning.open = true; }
  expandHashTarget();
  window.addEventListener('hashchange', expandHashTarget);
  $$('a[href="#keikoku"]').forEach(link => link.addEventListener('click', () => { warning.open = true; }));

  const screens = {
    edit: {src:'assets/shots/home.jpg', alt:'PDF MARINの注釈画面。活動レポートにペンで書き込み、右側のパネルで色や太さを調整できます。'},
    organize: {src:'assets/shots/organize.jpg', alt:'PDF MARINのページ整理画面。ページのサムネイルを一覧で確認し、並べ替えや回転などの操作ができます。'},
    redact: {src:'assets/shots/redact-ai.jpg', alt:'PDF MARINの墨消し画面。サンプル文書内で処理する箇所を指定しています。'}
  };
  const tabs = $$('[data-screen]');
  const productScreen = $('#product-screen');
  function selectScreen(tab) {
    const screen = screens[tab.dataset.screen];
    if (!screen) return;
    productScreen.src = screen.src;
    productScreen.alt = screen.alt;
    tabs.forEach(item => {
      item.setAttribute('aria-selected', String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    });
    $('#screen-panel').setAttribute('aria-labelledby', tab.id);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectScreen(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectScreen(tabs[next]); tabs[next].focus(); }
    });
  });

  const dialog = $('#media-dialog');
  const dialogImage = $('#dialog-image');
  const video = $('#dialog-video');
  let mediaTrigger;
  function showMedia(trigger) {
    mediaTrigger = trigger;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
  $$('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    const image = document.getElementById(button.dataset.zoom);
    dialogImage.src = image.currentSrc || image.src;
    dialogImage.alt = image.alt;
    dialogImage.hidden = false; video.hidden = true;
    $('#dialog-title').textContent = 'PDF MARIN — ' + tabs.find(tab => tab.getAttribute('aria-selected') === 'true').textContent.trim();
    showMedia(button);
  }));
  $$('[data-video]').forEach(button => button.addEventListener('click', () => {
    dialogImage.hidden = true; video.hidden = false;
    video.poster = 'assets/shots/basics-poster.jpg';
    video.src = 'assets/shots/basics.mp4';
    $('#dialog-title').textContent = 'PDF MARIN — 基本操作のデモ（音声なし）';
    showMedia(button);
    video.play().catch(() => { /* Native controls remain available. */ });
  }));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    video.pause(); video.removeAttribute('src'); video.load();
    document.body.style.overflow = '';
    mediaTrigger?.focus();
  });

  if (!/Windows/.test(navigator.userAgent) || /Windows Phone/.test(navigator.userAgent)) $('#pcnote').hidden = false;
  $('#copylink').addEventListener('click', async () => {
    const url = 'https://pdf-marin.github.io/';
    try {
      await navigator.clipboard.writeText(url);
      $('#copydone').hidden = false;
    } catch { window.prompt('このリンクをコピーしてください。', url); }
  });
  function validUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:'; } catch { return false; }
  }
  if (/^https?:$/.test(location.protocol)) {
    fetch('version.json', {cache:'no-store'})
      .then(response => { if (!response.ok) throw new Error('Version information unavailable'); return response.json(); })
      .then(version => {
        if (validUrl(version.url)) $$('[data-download]').forEach(link => { link.href = version.url; });
        if (typeof version.version === 'string') $$('[data-version]').forEach(el => { el.textContent = 'v' + version.version; });
        if (typeof version.size === 'string') $$('[data-size]').forEach(el => { el.textContent = version.size; });
        if (validUrl(version.sponsorUrl)) $$('a.support').forEach(link => { link.href = version.sponsorUrl; });
      }).catch(() => { /* Keep the working download links already present in the HTML. */ });
  }

  const form = $('.feedback-form');
  const textarea = $('textarea', form);
  const counter = $('#character-count');
  textarea.addEventListener('input', () => {
    counter.textContent = textarea.value.length.toLocaleString('ja-JP') + ' / 4,000';
    textarea.setCustomValidity('');
  });
  // Keep the original multipart POST contract. Let the endpoint render its response.
  form.addEventListener('submit', event => {
    if (!textarea.value.trim()) {
      event.preventDefault();
      textarea.setCustomValidity('内容をご記入ください。');
      textarea.reportValidity();
    }
  });
  const input = $('#attachments');
  const dropzone = $('#dropzone');
  const list = $('#filelist');
  const note = $('#filenote');
  const maximum = 8;
  let selected = [];
  function announce(message) { note.textContent = message; note.hidden = !message; }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  if (typeof DataTransfer !== 'undefined') {
    function sync() {
      const data = new DataTransfer();
      selected.forEach(file => data.items.add(file));
      input.files = data.files;
      list.replaceChildren();
      selected.forEach((file, index) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = file.name + '（' + formatSize(file.size) + '）';
        const remove = document.createElement('button');
        remove.type = 'button'; remove.textContent = '削除';
        remove.setAttribute('aria-label', file.name + ' を添付から削除');
        remove.addEventListener('click', () => {
          selected.splice(index, 1); announce('添付ファイルを削除しました。'); sync();
          const remaining = list.querySelectorAll('button');
          (remaining[Math.min(index, remaining.length - 1)] || input).focus();
        });
        item.append(name, remove); list.append(item);
      });
    }
    function add(files) {
      let duplicate = 0, excess = 0;
      [...files].forEach(file => {
        if (selected.some(other => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified)) { duplicate++; return; }
        if (selected.length >= maximum) { excess++; return; }
        selected.push(file);
      });
      const messages = [];
      if (excess) messages.push('添付は8件までです。' + excess + '件は追加されませんでした。');
      if (duplicate) messages.push('同じファイル' + duplicate + '件の重複を除きました。');
      announce(messages.join(' ')); sync();
    }
    input.addEventListener('change', () => add(input.files));
    ['dragenter','dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('is-drag'); }));
    ['dragleave','drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('is-drag'); }));
    dropzone.addEventListener('drop', event => { if (event.dataTransfer?.files.length) add(event.dataTransfer.files); });
    form.addEventListener('reset', () => { selected = []; setTimeout(() => { sync(); counter.textContent = '0 / 4,000'; announce(''); }, 0); });
  } else {
    input.addEventListener('change', () => input.setCustomValidity(input.files.length > maximum ? '添付ファイルは8件まで選択してください。' : ''));
  }
})();
