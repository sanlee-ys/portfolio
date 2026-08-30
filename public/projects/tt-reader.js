/*
 * The frame reader on projects/telltale.html.
 *
 * WHAT IT DOES. The page ships every frame as a `<pre>` in the served HTML. This
 * script only REDUCES that set to one and adds the two step controls. It never
 * adds a frame, and it never fetches one.
 *
 * WHY IT ONLY REDUCES, AND WHY THAT IS RECORDED (ADR-013, RULE D2).
 * `scripts/mobile-qa.cjs` loads a page, measures `scrollWidth - clientWidth`
 * once, and never clicks. A frame that a script swapped in after load would be
 * measured by nothing. The site's known silent failure is a `.tt-frame` that
 * loses on CSS specificity, wraps, shears every column, and turns the mobile
 * gate GREEN, because a wrapped frame cannot overflow. Shipping every frame
 * un-enhanced is what puts all seven inside the overflow gate's single
 * measurement. A later change that server-renders one frame reopens that hole in
 * silence, so it is a decision and not an optimisation.
 *
 * WHY IT NEVER SCROLLS (ADR-010). A reader-controlled view updates what it says
 * about itself and stops. It does not move the reader's viewport. Selection sets
 * `data-current`, rewrites the fragment with `replaceState`, and moves focus with
 * `preventScroll`. Focus follows a navigation the reader asked for, which is the
 * case ADR-010 keeps.
 *
 * WHY `replaceState` AND NOT `pushState`. Stepping through seven frames would
 * otherwise bury the page under seven history entries, and Back would walk them
 * one at a time instead of leaving the page.
 *
 * WHY THE BUTTONS ARE BUILT HERE. A previous and a next control are useless with
 * no script, so writing them into the markup would ship two dead controls that
 * `hit-target.cjs` still measures. The rail links are real anchors and work with
 * no script, so they stay in the markup.
 *
 * NO TRANSITION AND NO ANIMATION, so `prefers-reduced-motion` has nothing to
 * disable. A frame swap is instant. Do not add one.
 */
(function () {
  'use strict';

  var section = document.querySelector('.tt-reader');
  if (!section) return;

  var figures = Array.prototype.slice.call(
    section.querySelectorAll('figure[id^="frame-"]')
  );
  if (figures.length < 2) return;

  var keys = figures.map(function (fig) {
    return fig.id;
  });

  var railLinks = Array.prototype.slice.call(
    section.querySelectorAll('.tt-reader-rail a[href^="#frame-"]')
  );

  var index = 0;

  /*
   * A rail link is matched to its frame BY ITS href, never by its position in
   * the rail. The two lists are written by hand in the same order today, and a
   * later edit that reorders one and not the other would silently select the
   * wrong frame. An href cannot drift that way.
   */
  function railFor(i) {
    for (var n = 0; n < railLinks.length; n += 1) {
      if (indexOfHash(railLinks[n].getAttribute('href')) === i) return railLinks[n];
    }
    return null;
  }

  function label(i) {
    var link = railFor(i);
    return link ? link.textContent.trim() : String(i + 1);
  }

  /*
   * The state region is announced, so the reader is told which frame is showing
   * without being moved to it. This mirrors `#system-diagram`, whose caption is
   * the announcement rather than the focus move.
   */
  var status = document.createElement('p');
  status.className = 'tt-reader-status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  var prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'tt-reader-step';
  prev.textContent = 'Previous frame';

  var next = document.createElement('button');
  next.type = 'button';
  next.className = 'tt-reader-step';
  next.textContent = 'Next frame';

  // The two buttons sit together and the status follows. At 390px the row
  // wraps, and a status between the buttons would put "Next frame" on a line
  // of its own, below the sentence that describes the current frame.
  var controls = document.createElement('div');
  controls.className = 'tt-reader-controls';
  controls.appendChild(prev);
  controls.appendChild(next);
  controls.appendChild(status);

  /*
   * `opts.writeHash` — rewrite the fragment. `opts.moveFocus` — focus the
   * figure without scrolling to it.
   *
   * THE FRAGMENT IS WRITTEN ON SELECTION ONLY, NEVER ON LOAD, AND THAT IS
   * MEASURED. An earlier version rewrote it on load so a shared link would
   * always name the visible frame. Measured at 390px: a plain visit with no
   * fragment landed at scrollY 12298 of a 21582px page, deep inside the
   * reader. Writing a fragment during load puts the browser's own
   * scroll-to-fragment behaviour back in play, and the page then moves the
   * reader's viewport without being asked. ADR-010 forbids exactly that.
   *
   * It also destroyed a legitimate deep link: `#see-it` was rewritten to
   * `#frame-usage` before the browser had navigated to the heading.
   *
   * A pointer link from elsewhere on the page does not write the fragment
   * either. The browser is about to navigate to it, and letting it do so is
   * what buys the history entry and the reduced-motion-aware scroll.
   */
  function show(i, opts) {
    var o = opts || {};
    if (i < 0) i = 0;
    if (i > figures.length - 1) i = figures.length - 1;
    index = i;

    figures.forEach(function (fig, n) {
      if (n === index) fig.setAttribute('data-current', 'true');
      else fig.removeAttribute('data-current');
    });
    railLinks.forEach(function (link) {
      if (indexOfHash(link.getAttribute('href')) === index) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    prev.disabled = index === 0;
    next.disabled = index === figures.length - 1;
    status.textContent = 'Frame ' + (index + 1) + ' of ' + figures.length
      + ': ' + label(index) + '.';

    // No history entry: stepping seven frames would otherwise bury the page
    // under seven of them and Back would walk them one at a time.
    if (o.writeHash && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + keys[index]);
    }

    if (o.moveFocus) figures[index].focus({ preventScroll: true });
  }

  function indexOfHash(hash) {
    if (!hash) return -1;
    return keys.indexOf(hash.replace(/^#/, ''));
  }

  railLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      // Let a modified click open a new tab: the anchor is real and the target
      // renders on its own with no script.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var at = indexOfHash(link.getAttribute('href'));
      if (at === -1) return; // an unknown target: let the browser have it
      event.preventDefault();
      show(at, { moveFocus: true, writeHash: true });
    });
  });

  /*
   * A POINTER LINK FROM ELSEWHERE ON THE PAGE MUST NOT LAND ON A HIDDEN FRAME.
   *
   * Sections above the reader carry ordinary anchors such as
   * `<a href="#frame-usage">`. With the enhancement on, that figure is
   * `display: none` unless it is the current one, and an element with no box is
   * a destination the browser cannot scroll to. Worse, when the fragment is
   * ALREADY `#frame-usage` the click changes nothing, no `hashchange` fires,
   * and the link is simply dead.
   *
   * So select the frame first, synchronously, and then let the browser do the
   * navigation itself. That is ADR-010: an ordinary `<a href="#id">` gives a
   * history entry, a linkable hash, and reduced-motion-aware scrolling for
   * free, and the reader asked for this jump.
   */
  document.addEventListener('click', function (event) {
    var el = event.target;
    if (!el || typeof el.closest !== 'function') return;
    var link = el.closest('a[href^="#frame-"]');
    if (!link || link.closest('.tt-reader-rail')) return;
    var at = indexOfHash(link.getAttribute('href'));
    // No `writeHash`: the browser is about to set the fragment itself, and
    // letting it navigate is what buys the history entry and the scroll.
    if (at !== -1) show(at, {});
  });

  prev.addEventListener('click', function () {
    show(index - 1, { moveFocus: true, writeHash: true });
  });
  next.addEventListener('click', function () {
    show(index + 1, { moveFocus: true, writeHash: true });
  });

  window.addEventListener('hashchange', function () {
    var at = indexOfHash(window.location.hash);
    if (at !== -1 && at !== index) show(at, {});
  });

  figures[0].parentNode.insertBefore(controls, figures[0]);

  // Last, so a script that throws before this point leaves every frame visible
  // rather than leaving the page with nothing on it.
  section.setAttribute('data-enhanced', 'true');

  // On load: select, and do nothing else. No fragment write and no focus move.
  // A shared link that names a frame opens on that frame, and a visit with no
  // fragment opens on the first one and stays where the reader is.
  var start = indexOfHash(window.location.hash);
  show(start === -1 ? 0 : start, {});
}());
