/* visitor-location: single source of truth for the visitor's city/state/country.
 * Replaces the {VISITOR_LOCATION} placeholders in job description blocks with
 * the visitor's IP-based location from ipinfo.io (free, CORS-enabled).
 * ipinfo.io is used because it resolves the project's target ISPs to the correct
 * province (geojs.io mis-mapped them to another province).
 *
 * React re-renders the header location and the related-job card location meta
 * after hydration, so the location is re-applied on a short interval until it
 * sticks (idempotent — same pattern as the other post-hydration scripts). */
(function () {
  /* Is the current job remote? Read from the inline __ROUTE_DATA__ script —
   * the single source of truth for the job — so the "(remote)" suffix is kept
   * when the visitor location replaces the display text. */
  var jobIsRemote = false;
  try {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var txt = scripts[i].textContent || '';
      var m = txt.indexOf('window.__ROUTE_DATA__');
      if (m === -1) continue;
      var seg = txt.slice(txt.indexOf('{', m));
      var d = 0, e = -1;
      for (var j = 0; j < seg.length; j++) {
        if (seg[j] === '{') d++;
        else if (seg[j] === '}') { d--; if (d === 0) { e = j + 1; break; } }
      }
      if (e !== -1) {
        var parsed = JSON.parse(seg.slice(0, e));
        jobIsRemote = !!(parsed && parsed.jobData && parsed.jobData.isRemote);
      }
      break;
    }
  } catch (err) {}
  function withRemote(loc) {
    return jobIsRemote ? loc + ' (remote)' : loc;
  }
  function applyLocation(loc) {
    window.__VISITOR_LOCATION__ = loc;
    var changed = 0;
    // 1) descriptions: replace {VISITOR_LOCATION} placeholders
    document.querySelectorAll('.body-copy .content, .cards__backside-description').forEach(function (el) {
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [];
      while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach(function (tn) {
        if (tn.nodeValue.indexOf('{VISITOR_LOCATION}') !== -1) {
          tn.nodeValue = tn.nodeValue.split('{VISITOR_LOCATION}').join(loc);
          changed++;
        }
      });
    });
    // 2) header location breadcrumb: replace the linked city/state with visitor location
    var locLink = document.querySelector('.contact-details__link .cards__meta-item--link');
    if (locLink && locLink.textContent !== withRemote(loc)) {
      locLink.textContent = withRemote(loc);
      changed++;
    }
    // 3) location meta items: identified by the marker icon — replace whatever
    //    location text the item ships with (job summary + related cards, no
    //    hardcoded city names)
    document.querySelectorAll('.cards__meta-item').forEach(function (li) {
      var use = li.querySelector('use');
      var href = use ? (use.getAttribute('xlink:href') || '') : '';
      if (href.indexOf('marker') === -1) return;
      var w = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [];
      while (w.nextNode()) nodes.push(w.currentNode);
      if (!nodes.length) return;
      // Fill the first text node — even when the static HTML ships it empty.
      // The visitor's location is the only source (no hardcoded fallback).
      var target = nodes[0];
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeValue && nodes[i].nodeValue.trim()) { target = nodes[i]; break; }
      }
      var prev = target.nodeValue;
      target.nodeValue = withRemote(loc);
      for (var j = 0; j < nodes.length; j++) {
        if (nodes[j] !== target) nodes[j].nodeValue = '';
      }
      if (target.nodeValue !== prev) changed++;
    });
    return changed;
  }
  fetch('https://ipinfo.io/json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var country = '';
      try { country = new Intl.DisplayNames(['en'], { type: 'region' }).of(d.country); } catch (e) {}
      var loc = [d.city, d.region, country].filter(Boolean).join(', ');
      if (!loc) return;
      // React re-renders these blocks after hydration, so re-apply idempotently
      // until the location is stable (3 clean passes) or the retry budget runs out.
      var stable = 0, tries = 0;
      var timer = window.setInterval(function () {
        tries++;
        var c = applyLocation(loc);
        stable = c === 0 ? stable + 1 : 0;
        if (stable >= 3 || tries >= 60) window.clearInterval(timer);
      }, 250);
      applyLocation(loc);
    })
    .catch(function () {});
})();
