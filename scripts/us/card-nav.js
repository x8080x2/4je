/* card-nav: single source of truth for clicking a related-job card.
 * A click anywhere on a card navigates to that job's page. Clicks on the
 * card's own controls (title link, backside "view job" link, info-flip,
 * close button, carousel arrows) are left to their native behaviour. */
(function () {
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    // leave interactive controls alone (links, buttons, flip/close, arrows)
    if (t.closest('a, button, [data-rs-card-show-backside], [data-rs-card-hide-backside], .slick-arrow')) return;
    var card = t.closest('.cards__item');
    if (!card) return;
    var link = card.querySelector('a.cards__link');
    if (link && link.href) window.location.href = link.href;
  });
})();
