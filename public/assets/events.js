// Product telemetry for the site itself: which parts do readers actually use?
// Three signals — diagram node clicks, decision-card expands, résumé clicks —
// sent as Plausible custom events. Everything is a no-op if analytics is
// blocked or absent; the site never depends on this file.

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
