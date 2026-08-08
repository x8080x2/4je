/* telegram-notify: single source of truth for the page-side hooks.
 * Fires Telegram notifications via POST /api/telegram/notify (server.js) for:
 *   1) job application submitted  (#jobApplyButton click on the apply page)
 *   2) job alert signup           (#submitConsent click on the jobs page)
 *   3) resume uploaded            (#upload-field change on the apply page)
 * Hooks no-op silently when their element is not on the page. */
(function () {
  function jobMeta() {
    var rd = (typeof window.__ROUTE_DATA__ !== 'undefined' && window.__ROUTE_DATA__) || {};
    var jd = rd.jobData || {};
    var loc = jd.jobLocation || {};
    return {
      job_title: jd.title || '',
      job_ref: jd.atsReference || '',
      job_location: [loc.city, loc.stateAbbreviation || loc.state].filter(Boolean).join(', ')
    };
  }
  function notify(type, data) {
    try {
      fetch('/api/telegram/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Notify-Secret': (typeof window.__NOTIFY_SECRET__ !== 'undefined' ? window.__NOTIFY_SECRET__ : '')
        },
        body: JSON.stringify({ type: type, data: data })
      }).catch(function () {});
    } catch (e) {}
  }
  function field(f, name) {
    var el = f ? f.querySelector('[name="' + name + '"]') : null;
    return el ? el.value : '';
  }
  /* dedup: ignore repeated clicks on the same event within 1500ms */
  var lastSent = {};
  function dedup(type) {
    var now = Date.now();
    if (now - (lastSent[type] || 0) < 1500) return false;
    lastSent[type] = now;
    return true;
  }
  /* last locally-selected resume (survives React clearing the file input) */
  var lastResume = { name: '', size: 0 };

  /* 1) job application submitted (apply page) */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('#jobApplyButton')) return;
    var f = document.getElementById('applicationForm');
    if (!f || !f.checkValidity()) return; // only notify real submissions
    if (!dedup('application')) return;
    var fileEl = f.querySelector('[name="fileupload"]');
    var file = fileEl && fileEl.files && fileEl.files[0];
    var meta = jobMeta();
    notify('application', {
      first_name: field(f, 'first_name'),
      last_name: field(f, 'last_name'),
      email: field(f, 'email'),
      phone: field(f, 'phone'),
      address1: field(f, 'address1'),
      address2: field(f, 'address2'),
      city: field(f, 'city'),
      state: field(f, 'state'),
      textAlerts: !!((f.querySelector('[name="textAlerts"]') || {}).checked),
      resume_name: file ? file.name : lastResume.name,
      resume_size: file ? file.size : lastResume.size,
      job_title: meta.job_title,
      job_ref: meta.job_ref,
      job_location: meta.job_location
    });
  });

  /* 2) job alert signup (jobs page) */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('#submitConsent')) return;
    var f = document.getElementById('jobAlertsForm');
    if (!f || !f.checkValidity()) return; // only notify real signups
    if (!dedup('jobAlert')) return;
    notify('jobAlert', {
      email: field(f, 'email'),
      query: field(f, 'query'),
      location: field(f, 'location'),
      frequency: field(f, 'frequency'),
      consent: !!((f.querySelector('[name="consent"]') || {}).checked)
    });
  });

  /* 3) resume uploaded (apply page) */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.id !== 'upload-field') return;
    var file = t.files && t.files[0];
    if (!file) return;
    lastResume = { name: file.name, size: file.size };
    var meta = jobMeta();
    notify('resumeUpload', {
      file_name: file.name,
      file_size: file.size,
      job_title: meta.job_title,
      job_ref: meta.job_ref,
      job_location: meta.job_location
    });
  });
})();
