// Lesson 6 — a data-driven SVG diagram of the system.
// The picture is generated from `nodes` and `edges`; nothing is hand-drawn. It
// also adapts: a wide triangular layout on roomy screens, a taller narrow
// layout on phones, so the labels stay legible and the boxes stay tappable.
// Because three nodes form a triangle, a non-collinear arrangement keeps every
// edge off the third node, so neither layout has an edge crossing a box.

(function () {
  var svg = document.getElementById("system-diagram");
  if (!svg) return;

  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---- The data: the system as nodes + edges. No coordinates here; the active
  // layout supplies those, so the same data renders wide or stacked. Each node
  // also carries `anchor` (the decision-log entry it governs) and `adr` (the IDs
  // to surface in the caption), so clicking a box jumps to the decision behind it.
  var nodes = [
    { id: "notes-api", label: "notes-api",
      anchor: "decision-rightsized", adr: ["SYS-005"],
      desc: "FastAPI REST service. Owns the knowledge base and serves notes. On create, it runs a FastAPI BackgroundTask that calls the classifier and writes the labels back to itself as namespaced tags (PUT /notes/{id}/tags, replace semantics)." },
    { id: "classifier", label: "classifier",
      anchor: "decision-eval", adr: ["ADR-002", "SYS-002"],
      desc: "Classifies text in-process (one Sonnet call, structured output) into a category and an operational domain. A pure provider: called by the notes-api background task and by kb-agent, it knows nothing about either." },
    { id: "kb-agent", label: "kb-agent",
      anchor: "decision-contracts", adr: ["SYS-003", "SYS-006"],
      desc: "RAG and tool-use agent. Reads notes to ground its answers, and can also call the classifier synchronously." },
  ];

  var edges = [
    { from: "notes-api", to: "classifier", label: "classify (async)" },
    { from: "kb-agent",  to: "notes-api",  label: "GET /notes" },
    { from: "kb-agent",  to: "classifier", label: "POST /classify" },
  ];

  // ---- Two layouts: positions, box height, and font per breakpoint. Both are
  // non-collinear triangles, so no edge passes through a box. ----
  var LAYOUTS = {
    wide: {
      viewBox: "0 0 800 430",
      pos: { "notes-api": [170, 150], "classifier": [630, 150], "kb-agent": [400, 320] },
      h: 50, font: 15, edgeFont: 12, charW: 8.5, minW: 150,
    },
    narrow: {
      viewBox: "0 0 440 540",
      pos: { "notes-api": [130, 95], "classifier": [300, 300], "kb-agent": [130, 470] },
      h: 60, font: 18, edgeFont: 15, charW: 10.2, minW: 140,
    },
  };

  var byId = {};
  nodes.forEach(function (n) { byId[n.id] = n; });

  function el(name, attrs) {
    var e = document.createElementNS(SVG_NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // Where a line from `from` to `to` crosses `to`'s box border, so the arrow
  // lands on the edge, not the center.
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
  var detail = document.getElementById("diagram-detail");
  var active = null;

  function render(L) {
    svg.setAttribute("viewBox", L.viewBox);
    edgesG.textContent = "";
    nodesG.textContent = "";
    active = null;

    // Size + place each node from the layout.
    nodes.forEach(function (n) {
      var p = L.pos[n.id];
      n.x = p[0];
      n.y = p[1];
      n.w = Math.max(L.minW, n.label.length * L.charW + 26);
      n.h = L.h;
    });

    // ---- Edges (lines + labels) ----
    edges.forEach(function (e) {
      var a = byId[e.from], b = byId[e.to];
      var start = border(b, a);
      var end = border(a, b);
      edgesG.appendChild(el("line", {
        class: "edge", x1: start.x, y1: start.y, x2: end.x, y2: end.y,
        "marker-end": "url(#arrow)",
      }));

      var mx = (start.x + end.x) / 2;
      var my = (start.y + end.y) / 2;
      var w = e.label.length * (L.edgeFont * 0.62) + 10;
      edgesG.appendChild(el("rect", {
        class: "edge-label-bg", x: mx - w / 2, y: my - L.edgeFont / 2 - 3,
        width: w, height: L.edgeFont + 6, rx: 4,
      }));
      var t = el("text", { class: "edge-label", x: mx, y: my + L.edgeFont / 3, "text-anchor": "middle" });
      t.style.fontSize = L.edgeFont + "px";
      t.textContent = e.label;
      edgesG.appendChild(t);
    });

    // ---- Nodes (clickable, keyboard-operable boxes) ----
    nodes.forEach(function (n) {
      var g = el("g", { class: "node", tabindex: "0", role: "button", "aria-label": n.label });
      g.appendChild(el("rect", {
        x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: 9,
      }));
      var t = el("text", { x: n.x, y: n.y + L.font / 3, "text-anchor": "middle" });
      t.style.fontSize = L.font + "px";
      t.textContent = n.label;
      g.appendChild(t);

      function select() {
        if (active) active.classList.remove("active");
        g.classList.add("active");
        active = g;
        detail.textContent =
          n.label + ": " + n.desc + (n.adr ? "  ·  " + n.adr.join(", ") : "");
        // Second beat: jump to, focus, and briefly highlight the decision behind
        // this node. Focus move + the live-region caption announce it to AT.
        if (n.anchor) {
          var target = document.getElementById(n.anchor);
          if (target) {
            var reduce = window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
            target.classList.add("target");
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
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
  }

  // Pick a layout by width, and re-render when crossing the breakpoint
  // (so a phone rotation or a window resize re-lays-out cleanly).
  var mq = window.matchMedia("(max-width: 600px)");
  function apply() { render(mq.matches ? LAYOUTS.narrow : LAYOUTS.wide); }
  apply();
  if (mq.addEventListener) mq.addEventListener("change", apply);
  else if (mq.addListener) mq.addListener(apply);
})();
