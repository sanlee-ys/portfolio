// Lesson 1 — scroll-reveal via IntersectionObserver.
// CSS owns the look (.reveal -> .reveal.is-visible). This file only flips the
// class when an element scrolls into view. It's the observer pattern: we don't
// poll scroll position, we subscribe and the browser notifies us.
(function () {
  var els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  // Graceful fallback: if the browser lacks IntersectionObserver, just show
  // everything immediately rather than leaving it invisible forever.
  if (!("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // reveal once, then stop watching
        }
      });
    },
    { threshold: 0.15 } // fire when ~15% of the element is on screen
  );

  els.forEach(function (el) { observer.observe(el); });
})();
