/* related-jobs: single source of truth for the "related jobs" cards on job
 * pages. The React app re-renders this section from its own build data, so a
 * static HTML edit is overwritten after hydration. This script rebuilds the
 * cards with the OTHER positions (from window.JOBEM_JOBS, injected by the
 * server from the same route table) after React finishes, and re-asserts them
 * whenever the section changes. Descriptions mirror each job page's body copy. */
(function () {
  var SALARY = '$28 - $35 per hour';
  var DATE = 'posted july 18, 2026';
  var DESC = {"/jobs/308/AB_4976816/administrative-assistant_fort-lauderdale/":"Now hiring Customer Service Representatives (we will train). Join our team in {VISITOR_LOCATION} and work in a safe, collaborative, highly productive environment. This is a fully remote position — you will work from home. If you enjoy helping people, resolving issues, and providing great service, read on for the requirements and apply today!<br /><br /><strong>Location:</strong> {VISITOR_LOCATION}<br /><br /><strong>Work hours:</strong> Variable<br /><br /><strong>Dress code:</strong> Gray plain T-Shirt, Jeans (no rips/no holes) and Safety shoes.<br /><br /><strong>Job Summary:</strong> As a Customer Service Representative, you will assist customers by answering questions, providing information, processing requests, and resolving concerns in a timely and professional manner. This role includes training to support you in learning company procedures and customer support processes.<br /><br /><strong>Key Responsibilities:</strong><br /><ul><li>Answer inbound calls and/or respond to customer inquiries</li><li>Provide accurate information and support services</li><li>Document customer interactions and follow up when necessary</li><li>Resolve customer issues or route concerns to the appropriate team</li><li>Maintain a positive, professional customer experience</li></ul><br /><br /><strong>Requirements:</strong><br /><ul><li>Previous customer service experience preferred, not required (training provided)</li><li>Strong communication skills</li><li>Ability to follow procedures and work with a team</li><li>Reliable attendance and a positive attitude</li></ul><br /><br /><strong>Equal Opportunity Employer:</strong><br />Race, Color, Religion, Sex, Sexual Orientation, Gender Identity, National Origin, Age, Genetic Information, Disability, Protected Veteran Status, or any other legally protected group status.","/jobs/309/ab_4979675/administrative-assistance_fort-lauderdale/":"Now hiring Administrative Assistants (we will train). Join our team in {VISITOR_LOCATION} and work in a safe, collaborative, highly productive environment. This is a fully remote position — you will work from home. If you enjoy organizing, supporting teams, and keeping things running smoothly, read on for the requirements and apply today!<br /><br /><strong>Location:</strong> {VISITOR_LOCATION}.<br /><br /><strong>Work hours:</strong> Variable.<br /><br /><strong>Dress code:</strong> Business casual (button-down shirt or polo and dress pants or khakis).<br /><br /><strong>Job Summary:</strong> As an Administrative Assistant, you will support daily office operations by answering phones, managing schedules, preparing documents, and assisting the team in a professional manner. This role includes training to support you in learning office procedures and systems.<br /><br /><strong>Key Responsibilities:</strong><br /><ul><li>Answer phones and respond to customer inquiries</li><li>Manage calendars, schedules, and appointments</li><li>Prepare and organize documents and correspondence</li><li>Assist with data entry and record keeping</li><li>Support the team and maintain a professional environment. This is a fully remote position — you will work from home.</li></ul><br /><br /><strong>Requirements:</strong><br /><ul><li>Previous administrative or office experience preferred, not required (training provided)</li><li>Strong organizational and communication skills</li><li>Proficiency with basic computer applications</li><li>Reliable attendance and a positive attitude.</li></ul><br /><br /><strong>Equal Opportunity Employer:</strong><br />Race, Color, Religion, Sex, Sexual Orientation, Gender Identity, National Origin, Age, Genetic Information, Disability, Protected Veteran Status, or any other legally protected group status.","/jobs/310/1142422-8/sales-representative_fort-lauderdale/":"Now hiring Sales Representatives (we will train). Join our team in {VISITOR_LOCATION} and work in a safe, collaborative, highly productive environment. This is a fully remote position — you will work from home. If you enjoy helping customers, building relationships, and closing sales, read on for the requirements and apply today!<br /><br /><strong>Location:</strong> {VISITOR_LOCATION}.<br /><br /><strong>Work hours:</strong> Variable.<br /><br /><strong>Dress code:</strong> Business casual (button-down shirt or polo and dress pants or khakis).<br /><br /><strong>Job Summary:</strong> As a Sales Representative, you will engage customers, present products and services, answer questions, and process sales in a professional manner. This role includes training to support you in learning our products, sales processes, and customer relationship tools.<br /><br /><strong>Key Responsibilities:</strong><br /><ul><li>Answer inbound calls and/or respond to customer inquiries</li><li>Provide accurate product information and support</li><li>Process orders and follow up with customers as needed</li><li>Meet sales goals while maintaining a positive customer experience</li><li>Document customer interactions and update records.</li></ul><br /><br /><strong>Requirements:</strong><br /><ul><li>Previous sales or customer service experience preferred, not required (training provided)</li><li>Strong communication and interpersonal skills</li><li>Ability to follow procedures and work with a team</li><li>Reliable attendance and a positive attitude.</li></ul><br /><br /><strong>Equal Opportunity Employer:</strong><br />Race, Color, Religion, Sex, Sexual Orientation, Gender Identity, National Origin, Age, Genetic Information, Disability, Protected Veteran Status, or any other legally protected group status.","/jobs/311/AB_9031852/warehouse-inventory-coordinator_fort-lauderdale/":"Now hiring Warehouse/Inventory Coordinators (we will train). Join our team in {VISITOR_LOCATION} and work in a safe, collaborative, highly productive environment. This is a fully remote position — you will work from home. If you enjoy organizing, supporting teams, and keeping things running smoothly, read on for the requirements and apply today!<br /><br /><strong>Location:</strong> {VISITOR_LOCATION}.<br /><br /><strong>Work hours:</strong> Variable.<br /><br /><strong>Dress code:</strong> Business casual (button-down shirt or polo and dress pants or khakis).<br /><br /><strong>Job Summary:</strong> As a Warehouse/Inventory Coordinator, you will monitor stock levels, process incoming and outgoing shipments, and keep inventory records accurate in a professional manner. This role includes training to support you in learning our systems and warehouse procedures.<br /><br /><strong>Key Responsibilities:</strong><br /><ul><li>Answer phones and respond to customer inquiries</li><li>Manage calendars, schedules, and appointments</li><li>Prepare and organize documents and correspondence</li><li>Assist with data entry and record keeping</li><li>Support the team and maintain a professional environment. This is a fully remote position — you will work from home.</li></ul><br /><br /><strong>Requirements:</strong><br /><ul><li>Previous warehouse or inventory experience preferred, not required (training provided)</li><li>Strong organizational and communication skills</li><li>Proficiency with basic computer applications</li><li>Reliable attendance and a positive attitude.</li></ul><br /><br /><strong>Equal Opportunity Employer:</strong><br />Race, Color, Religion, Sex, Sexual Orientation, Gender Identity, National Origin, Age, Genetic Information, Disability, Protected Veteran Status, or any other legally protected group status."};

  function norm(p) {
    var s = String(p).split('#')[0].split('?')[0];
    if (s.length > 1 && s.charAt(s.length - 1) === '/') s = s.slice(0, -1);
    return s;
  }
  function currentUrl() { return norm(window.location.pathname); }
  // The related-jobs list is the first .cards__list on a job page (the layout
  // differs between page variants, so do not assume it lives inside #jobAlerts).
  function findList() {
    return document.querySelector('#jobAlerts ul.cards__list') || document.querySelector('ul.cards__list');
  }

  function cardHtml(j) {
    return '<li class="cards__item bg-brand--white" data-rs-card="" data-rs-carousel-card="" data-rs-active-state="cards__item--active">'
      + '<div class="cards__header"><div class="cards__logo-title-container"><h3 class="cards__title"><a class="cards__link" href="' + j.url + '">' + j.title + '</a></h3></div></div>'
      + '<ul class="cards__meta">'
      + '<li class="cards__meta-item"><span class="icon icon--inline"><svg aria-label="location of role"><use xlink:href="/themes/custom/bluex/dist/assets/image/icons.svg#marker"></use></svg></span></li>'
      + '<li class="cards__meta-item"><span class="icon icon--inline"><svg aria-label="job type of role"><use xlink:href="/themes/custom/bluex/dist/assets/image/icons.svg#briefcase"></use></svg></span>' + j.type + '</li>'
      + '<li class="cards__meta-item"><span class="icon icon--inline"><svg aria-label="renumeration indication of role"><use xlink:href="/themes/custom/bluex/dist/assets/image/icons.svg#salary"></use></svg></span>' + SALARY + '</li>'
      + '</ul>'
      + '<div class="cards__footer"><div class="cards__time-info"><span class="cards__date text--alternative">' + DATE + '</span></div>'
      + '<div class="cards__info-wrapper" tabindex="0" data-rs-card-show-backside="" aria-label="more information about this job"><span class="cards__info-button text--alternative" role="presentation"><span class="icon icon--inline"><svg><use xlink:href="/themes/custom/bluex/dist/assets/image/icons.svg#info"></use></svg></span></span></div></div>'
      + '<div class="cards__backside-card"><div class="cards__backside-description" lang="en">' + (DESC[j.url] || '') + '</div>'
      + '<div class="cards__backside-footer"><a href="' + j.url + '" class="cards__backside-footer__button cards__backside-footer--job-link" tabindex="-1"><span class="icon icon--inline"><svg><use xlink:href="/themes/custom/bluex/dist/assets/image/icons.svg#eye"></use></svg></span>view job</a>'
      + '<div data-rs-card-hide-backside="" class="cards__backside-footer__button cards__backside-footer--close-backside" tabindex="-1" aria-label="close"><span class="icon icon--inline"><svg><use xlink:href="/themes/custom/bluex/dist/assets/image/icons.svg#close"></use></svg></span></div></div></div></li>';
  }

  function bindFlips(li) {
    var show = li.querySelector('[data-rs-card-show-backside]');
    var hide = li.querySelector('[data-rs-card-hide-backside]');
    if (show && !show.getAttribute('data-jobem-bound')) {
      show.setAttribute('data-jobem-bound', '1');
      show.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); li.classList.add('cards__item--backside-active'); });
    }
    if (hide && !hide.getAttribute('data-jobem-bound')) {
      hide.setAttribute('data-jobem-bound', '1');
      hide.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); li.classList.remove('cards__item--backside-active'); });
    }
  }
  function bindAll(ul) {
    var lis = ul.querySelectorAll('.cards__item');
    for (var i = 0; i < lis.length; i++) bindFlips(lis[i]);
  }

  function expectedUrls(JOBS) {
    return JOBS.filter(function (j) { return norm(j.url) !== currentUrl(); }).map(function (j) { return norm(j.url); });
  }
  function needsRebuild(JOBS, ul) {
    if (!ul) return true;
    var expected = expectedUrls(JOBS);
    var links = ul.querySelectorAll('a.cards__link');
    if (links.length !== expected.length) return true;
    for (var i = 0; i < links.length; i++) {
      if (norm(links[i].getAttribute('href')) !== expected[i]) return true;
    }
    return false;
  }

  function build(JOBS) {
    var ul = findList();
    if (!ul) return false;
    var expected = expectedUrls(JOBS);
    if (expected.length < 2) return false;
    var html = expected.map(function (u) {
      return cardHtml(JOBS.filter(function (j) { return norm(j.url) === u; })[0]);
    }).join('');
    if (ul.innerHTML !== html) {
      ul.innerHTML = html;
      ul.setAttribute('data-jobem-cards', String(expected.length));
    }
    bindAll(ul);
    return true;
  }

  function onReady() {
    // The server injects window.JOBEM_JOBS before </body>, so it is only
    // guaranteed to exist by DOMContentLoaded (like JOBEM_REAL_ROUTES).
    var JOBS = window.JOBEM_JOBS;
    if (!JOBS || JOBS.length < 2) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries++;
      if (build(JOBS) || tries >= 80) window.clearInterval(timer);
    }, 250);
    if (typeof MutationObserver !== 'undefined' && document.body) {
      new MutationObserver(function () {
        if (needsRebuild(JOBS, findList())) build(JOBS);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
