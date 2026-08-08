/* inert-share: single source of truth for disabling clickable-but-inert UI items.
 * Loaded by both pages. No-ops silently when the elements are absent.
 *   1) "send via e-mail" meta item     (li.cards__meta-item containing the #email icon)
 *   2) social share links              (a[href] pointing to facebook / linkedin / twitter share)
 * Runs in the capture phase so it fires before React's own handlers. */
(function () {
  function isShareHref(h) {
    return h.indexOf('facebook.com/sharer') !== -1 ||
           h.indexOf('linkedin.com/cws/share') !== -1 ||
           h.indexOf('twitter.com/intent/tweet') !== -1;
  }
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var li = e.target.closest('li.cards__meta-item');
    if (li) {
      var use = li.querySelector('use');
      var href = use ? (use.getAttribute('xlink:href') || '') : '';
      if (href.indexOf('#email') !== -1) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    var a = e.target.closest('a[href]');
    if (a && isShareHref(a.getAttribute('href') || '')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
