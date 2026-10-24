// Native details keeps its normal keyboard behavior; reveal bookmarked history.
(() => {
  function revealRelease() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id.startsWith('release-')) return;
    const target = document.getElementById(id);
    if (!target || !target.matches('details.release-entry')) return;
    for (let item = target; item; item = item.parentElement) {
      if (item.tagName === 'DETAILS') item.open = true;
    }
    requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
  }
  addEventListener('hashchange', revealRelease);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revealRelease, {once:true});
  else revealRelease();
})();
