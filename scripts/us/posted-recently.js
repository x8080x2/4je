/* posted-recently: replaces hardcoded "posted <date>" labels with
 * "posted recently". Handles:
 *   - the apply-page date label  (.meta-content__created)
 *   - related-job card dates     (.cards__date)
 * React re-renders some labels from job data, so this runs after hydration
 * (idempotent, retries until applied). No-ops if absent. */
(function () {
  function update() {
    var changed = 0;
    var els = document.querySelectorAll('.meta-content__created, .cards__date');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/posted/i.test(t)) continue;
      if (/posted recently/i.test(t)) continue;
      el.textContent = 'posted recently';
      changed++;
    }
    return changed;
  }
  var tries = 0;
  var timer = window.setInterval(function () {
    tries++;
    if (update() || tries >= 60) window.clearInterval(timer);
  }, 250);
})();
