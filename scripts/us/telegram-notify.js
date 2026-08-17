/* telegram-notify: single source of truth for the page-side hooks.
 * Fires Telegram notifications via POST /api/telegram/notify (server.js) for:
 *   1) job application sent — #jobApplyNextButton click on the apply page
 *      (the step-1 "continue to address" button; React's step-advance is
 *      suppressed, so this hook is the form's only action — no fallback)
 *   2) job alert signup           (#submitConsent click on the jobs page)
 * Text-only: no resume/file data is read from the UI.
 * Hooks no-op silently when their element is not on the page.
 * Console tracing (browser devtools) is left in on purpose for debugging. */
(function () {
  /* Job context — single source of truth. The JobApply React chunk deletes
   * window.__ROUTE_DATA__ on mount, and the chunk scripts are async, so by the
   * time this script runs the global is usually gone. Instead, parse the
   * inline __ROUTE_DATA__ script tag directly — it is always present and is
   * the canonical source for job title/ref/location. */
  var routeJobData = null;
  (function () {
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
        if (e === -1) continue;
        var parsed = JSON.parse(seg.slice(0, e));
        if (parsed && parsed.jobData) {
          routeJobData = parsed.jobData;
          console.log('[telegram] job context captured: ' + (routeJobData.title || '?') + ' / ' + (routeJobData.atsReference || '?'));
        }
        break;
      }
      if (!routeJobData) console.log('[telegram] job context NOT available at load');
    } catch (e) {
      console.error('[telegram] job context capture error', e);
    }
  })();

  function jobMeta() {
    var jd = routeJobData || {};
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
        return { ok: !!d.ok && r.status === 200, status: r.status, error: d.error };
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
  /* 1) job application sent (apply page).
   * Single source of truth: THIS hook is the send action. It runs in the
   * CAPTURE phase on the step-1 "continue to address" button, then
   * preventDefaults and stops propagation so React's step-advance flow never
   * runs. Only the currently-visible text fields are validated (the resume
   * file input and hidden later-step fields are ignored). The form's only
   * action is the Telegram notify below. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('#jobApplyNextButton')) return;
    console.log('[telegram] click on #jobApplyNextButton (capture — React step-advance suppressed)');
    e.preventDefault();
    e.stopPropagation();
    var f = document.getElementById('applicationForm');
    if (!f) { console.log('[telegram] applicationForm NOT FOUND — abort'); return; }
    var invalids = f.querySelectorAll(':invalid');
    var bad = 0;
    var firstBad = null;
    for (var i = 0; i < invalids.length; i++) {
      var el = invalids[i];
      if (el.type === 'file') continue;      // resume upload — not checked (text only)
      if (el.offsetParent === null) continue; // hidden later-step fields — not checked
      if (!firstBad) firstBad = el;
      bad++;
    }
    if (bad > 0) {
      console.log('[telegram] form INVALID (' + bad + ' visible field(s)) — abort');
      if (firstBad && typeof firstBad.reportValidity === 'function') firstBad.reportValidity();
      return;
    }
    if (!dedup('application')) { console.log('[telegram] dedup blocked (double click within 1500ms)'); return; }
    var meta = jobMeta();
    console.log('[telegram] application valid — job=' + meta.job_title + ' ref=' + meta.job_ref + ' loc=' + meta.job_location);

    /* Submit UX: button shows a loading state, then a sent/error message. */
    var btn = document.getElementById('jobApplyNextButton');
    var busy = function (isBusy) {
      if (!btn) return;
      btn.disabled = isBusy;
      btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
      if (isBusy) { if (!btn.dataset.label) btn.dataset.label = btn.textContent; btn.textContent = 'submitting\u2026'; }
      else if (btn.dataset.label) btn.textContent = btn.dataset.label;
    };
    var feedback = function (msg, ok) {
      var wrap = btn ? (btn.closest('.form-group--action-apply') || btn.parentElement) : null;
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
      address: field(f, 'address'),
      textAlerts: !!((f.querySelector('[name="textAlerts"]') || {}).checked),
      job_title: meta.job_title,
      job_ref: meta.job_ref,
      job_location: meta.job_location
    }).then(function (r) {
      busy(false);
      var msg = 'couldn\u2019t send your application \u2014 please try again';
      if (r.error === 'already-applied') msg = 'this access code has already submitted an application';
      else if (r.error === 'locked') msg = 'session expired \u2014 unlock again with a new code';
      feedback(r.ok ? 'application sent \u2014 we\u2019ll be in touch' : msg, r.ok);
      /* Successful application = logged out server-side (session deleted +
       * cookie cleared). Bounce to /lock so a fresh code is needed to continue. */
      if (r.ok) window.setTimeout(function () { window.location.href = '/lock/'; }, 2000);
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
})();
