// Freshness stamp: renders "Site last updated <date>" from the page's
// Last-Modified header (GitHub Pages sets it on deploy), so the date can
// never go stale by hand. Skips rendering if the header is absent —
// document.lastModified falls back to "now", which would be a lie.
(function () {
  function wire() {
    var raw = document.lastModified;
    if (!raw) return;
    var d = new Date(raw);
    // A parse failure or a "right now" timestamp means no real header.
    if (isNaN(d.getTime()) || Date.now() - d.getTime() < 60 * 1000) return;
    var text = "Site last updated " + d.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
    var p = document.createElement("p");
    p.className = "last-updated";
    p.textContent = text;
    var host = document.querySelector(".footer .wrap") || document.querySelector("main");
    if (host) host.appendChild(p);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
