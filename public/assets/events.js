// Product telemetry for the site itself: which parts do readers actually use?
// Three signals — diagram node clicks, decision-card expands, résumé clicks —
// sent as Plausible custom events. Everything is a no-op if analytics is
// blocked or absent; the site never depends on this file.
//
// 2026-09-04: two of the three signals have a DOM target on main. index.html
// is the only page that loads this file. The decision-card listener binds
// `.decision > details`. No page has carried a <details> since #152
// (2026-07-26), so that block registers zero listeners. The résumé listener
// labels every non-footer click "hero". The hero has carried no résumé link
// since b77fd11 (2026-08-19). On main that branch labels the primary-nav item
// (src/components/SiteNav.astro). The value stays so the Plausible series
// stays continuous. A removal or a rename is a code change for another session.

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

  // Decision cards: count first expand per card per pageview (opens, not toggles).
  document.querySelectorAll(".decision > details").forEach(function (d) {
    var sent = false;
    d.addEventListener("toggle", function () {
      if (d.open && !sent) {
        sent = true;
        var card = d.closest(".decision");
        track("Decision expanded", { id: (card && card.id) || "unknown" });
      }
    });
  });

  // Résumé clicks, with where they came from.
  document.querySelectorAll('a[href$="resume.html"]').forEach(function (a) {
    a.addEventListener("click", function () {
      track("Resume click", { from: a.closest(".footer") ? "footer" : "hero" });
    });
  });
})();
