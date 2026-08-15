/* visitor-location: single source of truth for the visitor's city/state/country.
 * Replaces the {VISITOR_LOCATION} placeholders in job description blocks with
 * the visitor's IP-based location from ipinfo.io (free, CORS-enabled).
 * ipinfo.io is used because it resolves the project's target ISPs to the correct
 * province (geojs.io mis-mapped them to another province). */
(function () {
  function applyLocation(loc) {
    window.__VISITOR_LOCATION__ = loc;
    // 1) descriptions: replace {VISITOR_LOCATION} placeholders
    document.querySelectorAll('.body-copy .content, .cards__backside-description').forEach(function (el) {
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [];
      while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach(function (tn) {
        if (tn.nodeValue.indexOf('{VISITOR_LOCATION}') !== -1) {
          tn.nodeValue = tn.nodeValue.split('{VISITOR_LOCATION}').join(loc);
        }
      });
    });
    // 2) header location breadcrumb: replace the linked city/state with visitor location
    var locLink = document.querySelector('.contact-details__link .cards__meta-item--link');
    if (locLink) locLink.textContent = loc;
    // 3) related cards' location meta: replace the hardcoded city/state text
    document.querySelectorAll('.cards__item .cards__meta-item').forEach(function (li) {
      var use = li.querySelector('use');
      var href = use ? (use.getAttribute('xlink:href') || '') : '';
      if (href.indexOf('marker') === -1) return;
      var w = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [];
      while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach(function (tn) {
        if (/fort lauderdale|florida/i.test(tn.nodeValue)) tn.nodeValue = loc;
      });
    });
  }
  fetch('https://ipinfo.io/json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var country = '';
      try { country = new Intl.DisplayNames(['en'], { type: 'region' }).of(d.country); } catch (e) {}
      var loc = [d.city, d.region, country].filter(Boolean).join(', ');
      if (loc) applyLocation(loc);
    })
    .catch(function () {});
})();
