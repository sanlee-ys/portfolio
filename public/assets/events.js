// Product telemetry for the site itself: which parts do readers actually use?
// Two signals go out as Plausible custom events: diagram node clicks and
// résumé clicks. Every call is a no-op if analytics is blocked or absent.
// The site never depends on this file.
//
// index.html is the only page that loads this file.
//
// 2026-09-09: this file no longer sends "Decision expanded". The old
// listener bound `.decision > details`. No page has carried a <details>
// since #152 (2026-07-26). A ledger row and a hash jump are not an expand.
// If this file sent the old name for either, it would pretend the control
// still exists.
//
// Résumé `from` is nav, footer, hero, or other. The value comes from the
// live DOM. SiteNav (`nav.doors`) holds the primary-nav item. The footer
// holds the other. The hero has carried no résumé link since b77fd11
// (2026-08-19). The old binary (footer vs hero) labeled the nav item
// "hero". The click listener sits on document, so it still counts the
// footer that Base.astro emits after this script.

(function () {
  function track(name, props) {
    if (typeof window.plausible === "function") {
      window.plausible(name, props ? { props: props } : undefined);
    }
  }

  // Diagram: delegate on the SVG so we hook the nodes diagram.js generates.
  var svg = document.getElementById("system-diagram");
  if (svg) {
    var lastNode = null;
    function nodeOf(target) {
      var g = target && target.closest ? target.closest("g.node") : null;
      return g ? g.getAttribute("aria-label") : null;
    }
    svg.addEventListener("click", function (e) {
      var n = nodeOf(e.target);
      if (n && n !== lastNode) { lastNode = n; track("Diagram node", { node: n }); }
    });
    svg.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var n = nodeOf(e.target);
      if (n && n !== lastNode) { lastNode = n; track("Diagram node", { node: n }); }
    });
  }

  function resumeFrom(a) {
    if (a.closest(".footer")) return "footer";
    if (a.closest(".doors")) return "nav";
    if (a.closest(".hero")) return "hero";
    return "other";
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href$="resume.html"]') : null;
    if (!a) return;
    track("Resume click", { from: resumeFrom(a) });
  });
})();
