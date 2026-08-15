/* mask-contact: masks the recruiter contact details (phone + email) on the
 * job details and apply pages so sensitive values are only partially shown.
 * Only the visible text is masked ("incomplete"); the tel:/mailto: hrefs are
 * left intact. Runs after React hydrates; no-ops when no contact links exist. */
(function () {
  function maskPhone(text) {
    var digits = text.replace(/[^\d]/g, '');
    var head = text.replace(/[\d]+.*$/, '') || '';
    var tail = digits.slice(-4);
    return head + '*** *** ' + tail;
  }
  function maskEmail(text) {
    var at = text.indexOf('@');
    if (at <= 0) return '***' + text;
    return text.charAt(0) + '***' + text.slice(at);
  }
  function mask() {
    var changed = 0;
    var links = document.querySelectorAll('.contact-details__link');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute('href') || '';
      var span = a.querySelector('span:last-child');
      if (!span) continue;
      var t = (span.textContent || '').trim();
      if (!t) continue;
      var masked = href.indexOf('tel:') === 0 ? maskPhone(t) : (href.indexOf('mailto:') === 0 ? maskEmail(t) : null);
      if (masked && masked !== t) { span.textContent = masked; changed++; }
    }
    return changed;
  }
  // React renders the contact block asynchronously; retry until masked.
  var tries = 0;
  var timer = window.setInterval(function () {
    tries++;
    if (mask() || tries >= 60) window.clearInterval(timer);
  }, 250);
})();
