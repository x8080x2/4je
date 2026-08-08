/* visitor-location: single source of truth for the visitor's city/state/country.
 * Replaces the {VISITOR_LOCATION} placeholders in job description blocks with
 * the visitor's IP-based location from geojs.io (free, HTTPS, CORS-enabled). */
(function () {
  function applyLocation(loc) {
    window.__VISITOR_LOCATION__ = loc;
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
  }
  fetch('https://get.geojs.io/v1/ip/geo.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var loc = [d.city, d.region, d.country].filter(Boolean).join(', ');
      if (loc) applyLocation(loc);
    })
    .catch(function () {});
})();
