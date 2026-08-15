/* remove-remote-link: removes the React-rendered "(remote)" breadcrumb anchor
 * (a.whitespace-pre-wrap[href^="/jobs/remote/"]) — it duplicates the
 * "(remote)" suffix that visitor-location.js already appends to the location
 * text. Only the breadcrumb anchor is removed; the main-nav "/jobs/remote/"
 * menu link is untouched. Runs after hydration (idempotent, retries). */
(function () {
  function remove() {
    var changed = 0;
    var links = document.querySelectorAll('a.whitespace-pre-wrap[href^="/jobs/remote/"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.parentNode) a.parentNode.removeChild(a);
      changed++;
    }
    if (changed) console.log('[remove-remote-link] removed ' + changed + ' duplicate (remote) breadcrumb link(s)');
    return changed;
  }
  var tries = 0;
  var timer = window.setInterval(function () {
    tries++;
    if (remove() || tries >= 60) window.clearInterval(timer);
  }, 250);
})();
