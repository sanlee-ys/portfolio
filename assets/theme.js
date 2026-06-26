// Theme toggle: persists choice, falls back to OS preference.
// The anti-flash inline script in each page's <head> sets the initial
// data-theme before paint; this only wires the manual toggle button.
(function () {
  var root = document.documentElement;
  var KEY = "theme";

  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function wire() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = current() === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
