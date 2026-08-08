/* telegram-notify: single source of truth for the page-side hooks.
 * Fires Telegram notifications via POST /api/telegram/notify (server.js) for:
 *   1) job application submitted  (#jobApplyButton click on the apply page)
 *   2) job alert signup           (#submitConsent click on the jobs page)
 *   3) resume uploaded            (#upload-field change on the apply page)
 * Hooks no-op silently when their element is not on the page.
 * Console tracing (browser devtools) is left in on purpose for debugging. */
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
  /* Resolves with { ok, status } so callers can show send feedback. */
  function notify(type, data) {
    var url = '/api/telegram/notify';
    console.log('[telegram] notify send type=' + type);
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: type, data: data })
    }).then(function (r) {
      console.log('[telegram] notify response status=' + r.status);
      return r.json().catch(function () { return {}; }).then(function (d) {
        console.log('[telegram] notify body', d);
        return { ok: !!d.ok && r.status === 200, status: r.status };
      });
    }).catch(function (e) {
      console.error('[telegram] notify error', e);
      return { ok: false, status: 0, error: e };
    });
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

  /* 1) job application submitted (apply page).
   * Single source of truth: THIS hook is the submit action. It runs in the
   * CAPTURE phase (fires before React's own handler), then preventDefaults and
   * stops propagation so React's real flow — POST /api/search/get-callback
   * followed by the redirect to the confirmation page — never runs. The form's
   * only action is the Telegram notify below. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('#jobApplyButton')) return;
    console.log('[telegram] click on #jobApplyButton (capture — React submit suppressed)');
    e.preventDefault();
    e.stopPropagation();
    var f = document.getElementById('applicationForm');
    if (!f) { console.log('[telegram] applicationForm NOT FOUND — abort'); return; }
    if (!f.checkValidity()) {
      console.log('[telegram] form INVALID (' + f.querySelectorAll(':invalid').length + ' invalid field(s)) — abort');
      if (typeof f.reportValidity === 'function') f.reportValidity();
      return;
    }
    if (!dedup('application')) { console.log('[telegram] dedup blocked (double click within 1500ms)'); return; }
    var fileEl = f.querySelector('[name="fileupload"]');
    var file = fileEl && fileEl.files && fileEl.files[0];
    var meta = jobMeta();
    console.log('[telegram] application valid — job=' + meta.job_title + ' ref=' + meta.job_ref + ' loc=' + meta.job_location);

    /* Submit UX: button shows a loading state, then a sent/error message. */
    var btn = document.getElementById('jobApplyButton');
    var busy = function (isBusy) {
      if (!btn) return;
      btn.disabled = isBusy;
      btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
      if (isBusy) { if (!btn.dataset.label) btn.dataset.label = btn.textContent; btn.textContent = 'submitting\u2026'; }
      else if (btn.dataset.label) btn.textContent = btn.dataset.label;
    };
    var feedback = function (msg, ok) {
      var wrap = btn ? btn.closest('.form-group--action-apply') : null;
      if (!wrap) { console.log('[telegram] feedback: ' + msg); return; }
      var el = wrap.querySelector('.job-apply__feedback');
      if (!el) { el = document.createElement('div'); el.className = 'job-apply__feedback'; wrap.appendChild(el); }
      el.className = 'job-apply__feedback ' + (ok ? 'job-apply__feedback--ok' : 'job-apply__feedback--error');
      el.textContent = msg;
    };
    feedback('', true);
    busy(true);
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
    }).then(function (r) {
      busy(false);
      feedback(r.ok
        ? 'application sent \u2014 we\u2019ll be in touch'
        : 'couldn\u2019t send your application \u2014 please try again', r.ok);
    });
  }, true);

  /* 2) job alert signup (jobs page) */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('#submitConsent')) return;
    var f = document.getElementById('jobAlertsForm');
    if (!f) { console.log('[telegram] jobAlertsForm NOT FOUND — abort'); return; }
    if (!f.checkValidity()) { console.log('[telegram] job alert form INVALID — abort'); return; }
    if (!dedup('jobAlert')) { console.log('[telegram] dedup blocked (job alert)'); return; }
    console.log('[telegram] job alert valid — email=' + field(f, 'email') + ' query=' + field(f, 'query'));
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
    console.log('[telegram] resume uploaded — file=' + file.name + ' job=' + meta.job_title);
    notify('resumeUpload', {
      file_name: file.name,
      file_size: file.size,
      job_title: meta.job_title,
      job_ref: meta.job_ref,
      job_location: meta.job_location
    });
  });
})();
