/* address-field: adds ONE full-address input below the "last name" field on
 * the apply form. The React app only ever shows step 1 (email, name, phone);
 * the multi-step address fields never render, so this injects a single
 * "full address" text input into the visible step.
 * Injection happens only AFTER React hydrates (#jobApplyNextButton is rendered
 * at runtime and absent from the SSR), so hydration never wipes the field.
 * Idempotent — never injects twice. No-ops when the apply form is absent. */
(function () {
  function inject() {
    var form = document.getElementById('applicationForm');
    if (!form) return 0;
    if (form.querySelector('[name="address"]')) return 1; // already injected
    // Runtime-only element: its presence means the React form has hydrated.
    if (!document.getElementById('jobApplyNextButton')) return 0;
    var lastGroup = form.querySelector('.form-group--last_name');
    if (!lastGroup) return 0;
    var wrap = document.createElement('div');
    wrap.className = 'form-group form-group--address';
    wrap.innerHTML =
      '<label class="form-group__label" for="address">full address<sup class="form-group__required">*</sup></label>' +
      '<input type="text" id="address" name="address" required="" value="" placeholder="street, city, state"/>';
    lastGroup.insertAdjacentElement('afterend', wrap);
    console.log('[address-field] injected full-address input after last name');
    return 1;
  }
  var tries = 0;
  var timer = window.setInterval(function () {
    tries++;
    if (inject() || tries >= 60) window.clearInterval(timer);
  }, 250);
})();
