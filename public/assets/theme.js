// Theme toggle: persists choice, falls back to OS preference.
// The anti-flash inline script in each page's <head> sets the initial
// data-theme before paint; this only wires the manual toggle button.
(function () {
  var root = document.documentElement;
  var KEY = "theme";

  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function syncButton(btn) {
    var dark = current() === "dark";
    var action = dark ? "Switch to light theme" : "Switch to dark theme";
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    btn.setAttribute("aria-label", action);
    btn.setAttribute("title", action);
  }

  function wire() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    syncButton(btn);
    btn.addEventListener("click", function () {
      var next = current() === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      syncButton(btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
