/* neutralize-links: single source of truth for what counts as a real page.
 * The server injects window.JOBEM_REAL_ROUTES (an array of path strings derived
 * from server.js JOB_PAGES/APPLY_PAGES + lock/health/apis) before </body>, so it
 * is only guaranteed to exist by DOMContentLoaded. Any internal <a href="/...">
 * whose normalized path is NOT on that list is template chrome (mega-menu,
 * breadcrumb, footer) pointing at a route this project does not serve —
 * clicking it is a no-op instead of opening a redirect/404 route. External
 * links and real-page links are untouched. */
(function () {
  function norm(p) {
    var s = String(p).split('#')[0].split('?')[0];
    if (s.length > 1 && s.charAt(s.length - 1) === '/') s = s.slice(0, -1);
    return s;
  }

  // Breadcrumb nav (home / jobs / …) is React-rendered template chrome that
  // only links to dead routes — remove it whenever it appears (the React app
  // re-inserts it after hydration, hence the observer).
  function removeBreadcrumb() {
    var nodes = document.querySelectorAll('nav.breadcrumb, nav[aria-label="breadcrumb"]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n && n.parentNode) n.parentNode.removeChild(n);
    }
  }

  function onReady() {
    // Breadcrumb removal works even if the allowlist is missing.
    removeBreadcrumb();
    if (document.body && typeof MutationObserver !== 'undefined') {
      new MutationObserver(removeBreadcrumb).observe(document.body, { childList: true, subtree: true });
    }
    var real = window.JOBEM_REAL_ROUTES;
    if (!real || !real.length) return; // no allowlist -> nothing to neutralize
    var set = {};
    for (var i = 0; i < real.length; i++) set[norm(real[i])] = 1;
    document.addEventListener('click', function (e) {
      var t = e.target;
      var a = t && t.closest ? t.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href) return;
      if (/^(https?:)?\/\//i.test(href)) return;        // external — leave
      if (href.charAt(0) !== '/' || href === '/') {      // '#'/relative/root
        if (href === '/') e.preventDefault();           // root 302s elsewhere
        return;
      }
      if (!set[norm(href)]) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
