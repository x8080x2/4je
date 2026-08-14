/* consolidate-contact: single source of truth for the page layout change that
 * merges the "get in touch" block into the "related jobs" section.
 * The React app renders them as two stacked full-width sections; this script
 * moves the get-in-touch content (heading + contact card) into the related
 * jobs banner (after the job cards) and removes the now-empty block, so the
 * page has one section instead of two.
 * It only runs on pages that render these blocks and no-ops otherwise. */
(function () {
  function consolidate() {
    var jobDetails = document.getElementById('job-details');
    if (!jobDetails) return false;
    // Already consolidated on a previous run.
    if (jobDetails.getAttribute('data-contact-consolidated') === '1') return true;

    // 1) the "get in touch" block: a direct child of #job-details containing the heading.
    var contactBlock = null;
    var children = jobDetails.children;
    for (var i = 0; i < children.length; i++) {
      if (/get in touch/i.test(children[i].textContent)) { contactBlock = children[i]; break; }
    }
    // 2) the "related jobs" section: the #jobAlerts banner containing the heading.
    var rjBanner = null;
    var banners = jobDetails.querySelectorAll('#jobAlerts');
    for (var j = 0; j < banners.length; j++) {
      if (/related jobs/i.test(banners[j].textContent)) { rjBanner = banners[j]; break; }
    }
    if (!contactBlock || !rjBanner) return false;

    var banner = rjBanner.querySelector('.banner');
    var content = contactBlock.querySelector('.block__wrapper');
    if (!banner || !content) return false;

    // Move the get-in-touch content into the related jobs banner (after the job cards).
    banner.appendChild(content);
    contactBlock.remove();
    jobDetails.setAttribute('data-contact-consolidated', '1');
    console.log('[consolidate-contact] get in touch merged into related jobs section');
    return true;
  }

  // The React app renders these blocks asynchronously; retry until they exist.
  var tries = 0;
  var timer = window.setInterval(function () {
    tries++;
    if (consolidate() || tries >= 60) window.clearInterval(timer);
  }, 250);
})();
