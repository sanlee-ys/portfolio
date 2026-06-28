// Lesson 6 — a data-driven SVG diagram of the system.
// The whole picture is generated from the `nodes` and `edges` data below.
// Change the data and the diagram changes; nothing is hand-drawn. That is the
// core idea behind D3 and dataviz generally: bind data to visual elements.

(function () {
  var svg = document.getElementById("system-diagram");
  if (!svg) return;

  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---- The data: the system as nodes + edges ----
  // Each node carries `anchor` (the decision-log entry it governs) and `adr`
  // (the decision IDs to surface in the caption), so clicking a box jumps to the
  // decision behind it — the map and the log are two views of one dataset.
  var nodes = [
    { id: "notes-api",  label: "notes-api",  x: 170, y: 150,
      anchor: "decision-rightsized", adr: ["SYS-005"],
      desc: "FastAPI REST service. Owns the knowledge base and serves notes. On create, it runs a FastAPI BackgroundTask that calls the classifier and writes the labels back to itself as namespaced tags (PUT /notes/{id}/tags, replace semantics)." },
    { id: "classifier", label: "defense-news-classifier", x: 630, y: 150,
      anchor: "decision-eval", adr: ["ADR-002", "SYS-002"],
      desc: "Classifies text in-process (one Sonnet call, structured output) into a category and an operational domain. A pure provider: called by the notes-api background task and by kb-agent, it knows nothing about either." },
    { id: "kb-agent",   label: "kb-agent",   x: 400, y: 320,
      anchor: "decision-contracts", adr: ["SYS-003", "SYS-006"],
      desc: "RAG and tool-use agent. Reads notes to ground its answers, and can also call the classifier synchronously." },
  ];

  var edges = [
    { from: "notes-api",  to: "classifier", label: "classify (async)" },
    { from: "kb-agent",   to: "notes-api",  label: "GET /notes" },
    { from: "kb-agent",   to: "classifier", label: "POST /classify" },
  ];

  // Box size per node (width scales a little with the label length).
  var H = 50;
  nodes.forEach(function (n) {
    n.w = Math.max(150, n.label.length * 8.5 + 26);
    n.h = H;
    n.byId = n.id;
  });
  var byId = {};
  nodes.forEach(function (n) { byId[n.id] = n; });

  // Small helper: create an SVG element with attributes.
  function el(name, attrs) {
    var e = document.createElementNS(SVG_NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // Where does a line from `from` to `to` cross `to`'s box border?
  // (a little coordinate math, so the arrow lands on the edge, not the center)
  function border(from, to) {
    var dx = from.x - to.x;
    var dy = from.y - to.y;
    var sx = (to.w / 2) / (Math.abs(dx) || 1);
    var sy = (to.h / 2) / (Math.abs(dy) || 1);
    var s = Math.min(sx, sy);
    return { x: to.x + dx * s, y: to.y + dy * s };
  }

  var edgesG = document.getElementById("diagram-edges");
  var nodesG = document.getElementById("diagram-nodes");

  // ---- Render edges (lines + labels) from the data ----
  edges.forEach(function (e) {
    var a = byId[e.from], b = byId[e.to];
    var start = border(b, a); // point on A's border facing B
    var end = border(a, b);   // point on B's border facing A
    edgesG.appendChild(el("line", {
      class: "edge", x1: start.x, y1: start.y, x2: end.x, y2: end.y,
      "marker-end": "url(#arrow)",
    }));

    var mx = (start.x + end.x) / 2;
    var my = (start.y + end.y) / 2;
    var w = e.label.length * 6.6 + 10;
    edgesG.appendChild(el("rect", {
      class: "edge-label-bg", x: mx - w / 2, y: my - 10, width: w, height: 18, rx: 4,
    }));
    var t = el("text", { class: "edge-label", x: mx, y: my + 3, "text-anchor": "middle" });
    t.textContent = e.label;
    edgesG.appendChild(t);
  });

  // ---- Render nodes (clickable boxes) from the data ----
  var detail = document.getElementById("diagram-detail");
  var active = null;

  nodes.forEach(function (n) {
    var g = el("g", { class: "node", tabindex: "0", role: "button" });
    g.appendChild(el("rect", {
      x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: 9,
    }));
    var t = el("text", { x: n.x, y: n.y + 5, "text-anchor": "middle" });
    t.textContent = n.label;
    g.appendChild(t);

    function select() {
      if (active) active.classList.remove("active");
      g.classList.add("active");
      active = g;
      detail.textContent =
        n.label + " — " + n.desc + (n.adr ? "  ·  " + n.adr.join(", ") : "");
      // Second beat: jump to and briefly highlight the decision behind this node.
      if (n.anchor) {
        var target = document.getElementById(n.anchor);
        if (target) {
          var reduce =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
          target.classList.add("target");
          setTimeout(function () { target.classList.remove("target"); }, 1300);
        }
      }
    }
    g.addEventListener("click", select);
    g.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(); }
    });

    nodesG.appendChild(g);
  });
})();
