/* remove-remote-link: after React hydration the job header renders the
 * " (remote)" location suffix as a link to /jobs/remote/<region>/<city>/ — a
 * route this site does not serve. This keeps the "(remote)" text but unwraps
 * that anchor into plain text. Idempotent; re-applied until stable because
 * React re-renders the location after hydration. No-ops if absent. */
(function () {
  function update() {
    var changed = 0;
    var links = document.querySelectorAll('a.whitespace-pre-wrap[href*="/jobs/remote/"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var parent = a.parentNode;
      if (!parent) continue;
      var txt = a.textContent || '';
      parent.insertBefore(document.createTextNode(txt), a);
      parent.removeChild(a);
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
