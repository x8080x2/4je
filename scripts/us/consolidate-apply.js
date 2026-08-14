/* consolidate-apply: removes the mis-rendered "zip code" form group on the
 * apply page. The React app renders the required zip field with the phone
 * input's attributes (id="phone", name="phone", phone mask), producing a
 * stray duplicate phone input inside a "zip code" group. This script removes
 * only that broken group and leaves the real "phone number" field untouched.
 * It only runs on the apply page and no-ops otherwise. */
(function () {
  function consolidate() {
    var groups = document.querySelectorAll('.form-group');
    var removed = 0;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var label = g.querySelector('label');
      var inp = g.querySelector('input');
      if (label && inp && /zip code/i.test(label.textContent.trim()) && inp.id === 'phone') {
        g.remove();
        removed++;
      }
    }
    if (removed) console.log('[consolidate-apply] removed ' + removed + ' mis-rendered zip code field');
    return removed;
  }

  // The React app renders the form asynchronously; retry until it exists.
  var tries = 0;
  var timer = window.setInterval(function () {
    tries++;
    if (consolidate() || tries >= 60) window.clearInterval(timer);
  }, 250);
})();
