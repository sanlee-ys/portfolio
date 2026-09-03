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
  // to surface in the caption), so selecting a box offers a link to the decision
  // behind it. Offers — it does not travel there for you; see `select()` below.
  //
  // `away` is the same entry's address once it is no longer on the page the map
  // sits on. The eight one-row entries moved to work.html#decision-log in the
  // landing program, which took two of these three anchors off index.html; the
  // id lookup in `select()` would then have silently offered no link at all.
  // `anchor` stays the same id on both pages, so this file needs no per-page
  // branch: the lookup decides, and `away` is the fallback.
  var nodes = [
    { id: "notes-api", label: "notes-api",
      anchor: "decision-rightsized", away: "/work.html#decision-rightsized", adr: ["SYS-005"],
      desc: "FastAPI REST service. Owns the knowledge base and serves notes. On create, it runs a FastAPI BackgroundTask that calls the classifier and writes the labels back through the ORM in-process as namespaced tags with replace semantics; PUT /notes/{id}/tags is the external equivalent." },
    { id: "classifier", label: "classifier",
      anchor: "decision-eval", adr: ["ADR-002", "SYS-002"],
      desc: "Classifies text in-process (one Sonnet call, structured output) into a category and an operational domain. A pure provider: called by the notes-api background task and by kb-agent, it knows nothing about either." },
    { id: "kb-agent", label: "kb-agent",
      anchor: "decision-contracts", away: "/work.html#decision-contracts", adr: ["SYS-003", "SYS-006"],
      desc: "RAG and tool-use agent. Reads notes to ground its answers, and can also call the classifier synchronously." },
  ];

  var edges = [
    { from: "notes-api", to: "classifier", label: "classify (async)" },
    { from: "kb-agent",  to: "notes-api",  label: "GET /notes" },
    { from: "kb-agent",  to: "classifier", label: "POST /classify" },
  ];

  // ---- Two layouts: positions, box height, and font per breakpoint. Both are
  // non-collinear triangles, so no edge passes through a box. ----
  // The viewBoxes hug the drawing rather than starting at the origin. They used
  // to be "0 0 800 430" and "0 0 440 540", which left the plate roughly 45%
  // empty — 159px of blank frame above the top node and 108px below the bottom
  // one at desktop. That reads as an unfinished figure, and on a phone it is
  // ~200px of scroll spent on nothing. The boxes below are the content extent
  // (nodes plus their half-heights) with about 35px of margin, so the frame is
  // now the drawing's own bounds. Positions are untouched: they are the
  // non-collinear triangle that keeps every edge off the third node, and
  // moving them is how you get an edge through a box.
  var LAYOUTS = {
    wide: {
      viewBox: "0 90 800 290",
      pos: { "notes-api": [170, 150], "classifier": [630, 150], "kb-agent": [400, 320] },
      h: 50, font: 15, edgeFont: 12, charW: 8.5, minW: 150,
    },
    narrow: {
      viewBox: "0 45 440 470",
      pos: { "notes-api": [130, 95], "classifier": [300, 300], "kb-agent": [130, 470] },
      h: 60, font: 18, edgeFont: 15, charW: 10.2, minW: 140,
    },
  };

  // ---- Legibility floor: a viewBox font size is not a font size ----
  // The `font` and `edgeFont` numbers above are USER-SPACE units, and the plate
  // is `width: 100%` over a viewBox, so the browser scales the whole drawing to
  // fit. That scale is under 1 on every phone: at 390px the figure gets 342
  // CSS px for a 440-unit viewBox (0.777), so the 15-unit edge labels painted
  // at 11.7px, and at 320px they painted at 9.3px. Legible if you stop and
  // zoom, easy to skip past while scanning — which is exactly what issue #50
  // reported.
  //
  // Raising the constants is the wrong fix: it hard-codes one phone width and
  // still drifts on every other one. The size the reader gets is
  // `userFont * scale`, so the honest move is to solve for the user-space value
  // that lands on a floor of RENDERED pixels, and take it only when it is
  // larger than the layout's own figure. Wide screens are unaffected — their
  // scale sits at or above 1, so the floor never binds and the desktop plate
  // renders exactly as before.
  var MIN_EDGE_PX = 13;
  var MIN_NODE_PX = 15;

  // ---- The tap floor is the same problem, one axis over ----
  // `L.h` is a user-space unit under the same sub-1 scale as the type above.
  // The box therefore shrinks on a phone exactly as the labels did. The narrow
  // layout's 60 units rendered 46.4px at 390px, 42.3px at 360px, and 36.8px at
  // 320px. The contract is 44px (`CLAUDE.md`, "Mobile is a contract").
  // `hit-target.cjs` measured the tap rule at 390px alone. It read the one
  // width that passed, and it reported the plate sound.
  //
  // This file fixes one half. It solves the height against the measured scale.
  // The gate fixes the other half. It now measures 320, 360, 390, and 430.
  //
  // The box WIDTH takes no floor. `minW` is 140 user units. That measures
  // 85.9px at the tightest scale this plate renders at: 270 drawing pixels for
  // a 440-unit viewBox, at a 320px viewport. The gate measures both axes at all
  // four widths. A later change that narrows the box fails there. It does not
  // pass on a promise in this comment.
  var MIN_TAP_PX = 44;

  // ---- The scale is measured on the CONTENT box, not the border box ----
  // `.diagram` carries `border: 1px` (style.css). `getBoundingClientRect()`
  // returns the border box, and the viewBox maps onto the content box inside
  // it. Two pixels of frame therefore put every floor solved here under its own
  // target. At 320px the plate reads 272px and the drawing gets 270px, so the
  // 13px edge floor painted 12.89px. That is sub-pixel on the type. On the tap
  // box it is the difference between 44.0px and 43.7px. The gate rounds its own
  // measurement to whole pixels, and that alone hid the fail.
  //
  // This function reads the width alone. It does not take the smaller of the
  // two axes. `preserveAspectRatio` defaults to `meet`, so the true scale is
  // the smaller ratio. But `.diagram` sets `height: auto`, so the height
  // derives from this width. The two ratios then agree to five decimal places.
  // Measured at 320px: 0.613636 against 0.613617.
  //
  // A height read also runs BEFORE `render()` writes this layout's viewBox. A
  // first paint after a breakpoint cross would then solve against the previous
  // layout's aspect.
  function contentWidth() {
    var r = svg.getBoundingClientRect();
    var cs = window.getComputedStyle(svg);
    function edge(a, b) { return (parseFloat(cs[a]) || 0) + (parseFloat(cs[b]) || 0); }
    return r.width - edge("borderLeftWidth", "borderRightWidth")
      - edge("paddingLeft", "paddingRight");
  }

  function metricsFor(L) {
    var box = contentWidth();
    var vbW = parseFloat(L.viewBox.split(/\s+/)[2]);
    // A zero or negative width means the plate is not laid out yet
    // (display:none, a detached tree). Falling back to scale 1 renders the
    // layout's own sizes, which is the pre-clamp behaviour rather than a
    // division by zero.
    var scale = box > 0 && vbW > 0 ? box / vbW : 1;
    // Rounded so a one-pixel container change does not produce a "new" size and
    // trip the re-render guard in `apply()` below.
    function solve(base, floorPx) {
      return Math.round(Math.max(base, floorPx / scale) * 10) / 10;
    }
    // The tap box rounds UP. The type does not. Half a rendered pixel of type
    // is invisible. Half a rendered pixel of tap box decides whether the box
    // clears 44. A round to nearest can land under the floor it solved for.
    // The result stays quantised to 0.1, so the re-render guard is as stable
    // here as it is for the type.
    function solveUp(base, floorPx) {
      return Math.ceil(Math.max(base, floorPx / scale) * 10) / 10;
    }
    return {
      edge: solve(L.edgeFont, MIN_EDGE_PX),
      node: solve(L.font, MIN_NODE_PX),
      h: solveUp(L.h, MIN_TAP_PX),
    };
  }

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

  // ---- The second beat: the decision behind a node is OFFERED, not taken ----
  // Selecting a node used to scrollIntoView + focus the matching decision entry,
  // which carried the reader away from the figure with no way back; on a phone
  // the map went entirely off screen, so exploring a second node meant scrolling
  // up and finding it again. The caption already carries the node's full
  // description, so the jump was mostly redundant — and on the homepage it was
  // worse than redundant: two of the three anchors there are one-line ledger
  // footnotes, strictly LESS than the caption is already showing.
  //
  // What replaces it is an ordinary same-page link in the caption. Native anchor
  // navigation supplies three things the scripted jump had to fake or simply
  // lacked: the browser's own scroll (already reduced-motion-aware via
  // `html { scroll-behavior }` in the stylesheet, so no media query here), a
  // history entry — so Back IS the return path — and a hash, so where the reader
  // landed is linkable. See `decisions/ADR-010`.

  // The highlighter swipe has to still be there ON ARRIVAL. It was 1300ms timed
  // from the CLICK, and the smooth scroll to these anchors measures up to ~1000ms
  // (2,700px at 390px width), so the mark meaning "you landed here" had ~300ms
  // left by the time anyone landed. Survivable while the page jumped at you
  // unasked; not survivable now that the swipe is the whole feedback for a
  // navigation the reader chose. 2400 leaves ~1400ms after the longest travel,
  // and the full 2400 for a reduced-motion reader, whose scroll is instant.
  var MARK_MS = 2400;

  function markTarget(target) {
    // Focus follows the reader's OWN navigation, which is why it is still
    // correct here: they asked to go, so the reading position goes too.
    // preventScroll because the browser's hash navigation owns the scroll.
    target.setAttribute("tabindex", "-1");
    target.classList.add("target");
    target.focus({ preventScroll: true });
    setTimeout(function () { target.classList.remove("target"); }, MARK_MS);
  }

  function render(L, F) {
    svg.setAttribute("viewBox", L.viewBox);
    edgesG.textContent = "";
    nodesG.textContent = "";
    active = null;

    // Size + place each node from the layout. `charW` is an estimate of the
    // mono advance width AT `L.font`, so when the floor raises the node type it
    // has to travel with it — otherwise the box keeps its old width and the
    // bigger label runs out through the hairline.
    //
    // The height comes from `F`, not from `L`. `F` carries the solved tap
    // floor. The positions do not move with it. They are the non-collinear
    // triangle that keeps every edge off the third node. Each box grows around
    // its own centre, so a taller box only moves where `border()` lands an
    // arrow.
    var charW = L.charW * (F.node / L.font);
    nodes.forEach(function (n) {
      var p = L.pos[n.id];
      n.x = p[0];
      n.y = p[1];
      n.w = Math.max(L.minW, n.label.length * charW + 26);
      n.h = F.h;
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
      var w = e.label.length * (F.edge * 0.62) + 10;
      // No rx: the label knockout is a squared patch like everything else.
      edgesG.appendChild(el("rect", {
        class: "edge-label-bg", x: mx - w / 2, y: my - F.edge / 2 - 3,
        width: w, height: F.edge + 6,
      }));
      var t = el("text", { class: "edge-label", x: mx, y: my + F.edge / 3, "text-anchor": "middle" });
      t.style.fontSize = F.edge + "px";
      t.textContent = e.label;
      edgesG.appendChild(t);
    });

    // ---- Nodes (clickable, keyboard-operable boxes) ----
    nodes.forEach(function (n) {
      var g = el("g", { class: "node", tabindex: "0", role: "button", "aria-label": n.label });
      // Squared, not rounded. rx: 9 was the generator's default and was the
      // only 9px corner in a design whose largest radius is 3px.
      g.appendChild(el("rect", {
        x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h,
      }));
      var t = el("text", { x: n.x, y: n.y + F.node / 3, "text-anchor": "middle" });
      t.style.fontSize = F.node + "px";
      t.textContent = n.label;
      g.appendChild(t);

      function select() {
        if (active) active.classList.remove("active");
        g.classList.add("active");
        active = g;

        // The caption is aria-live="polite" aria-atomic="true", and THAT is what
        // announces the change to assistive tech — not the focus move that used
        // to follow it. Rebuilding it in one synchronous pass keeps it to a
        // single announcement, and an atomic region re-reads the link text too.
        detail.textContent =
          n.label + ": " + n.desc + (n.adr ? "  ·  " + n.adr.join(", ") : "");

        // Same-page first: if the entry is on this page, link to it by hash and
        // mark it on arrival. Otherwise fall back to `away`, the full path the
        // entry moved to. Two of these three entries left index.html for
        // work.html#decision-log in the landing program, and the id lookup on
        // its own would have dropped their links without a word. A node with
        // neither an id here nor an `away` path still offers nothing.
        var target = n.anchor && document.getElementById(n.anchor);
        var href = target ? "#" + n.anchor : n.away;
        if (!href) return;
        var a = document.createElement("a");
        a.className = "card-link";
        a.href = href;
        a.appendChild(document.createTextNode("The decision behind it "));
        var arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.textContent = "→";
        a.appendChild(arrow);
        // The highlighter swipe is a same-page affordance. A cross-page jump
        // gets the browser's own hash navigation and nothing else.
        if (target) a.addEventListener("click", function () { markTarget(target); });
        detail.appendChild(a);
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
  //
  // The breakpoint alone is no longer enough to know when to redraw: the type
  // sizes are now solved against the MEASURED plate width, which moves
  // continuously inside a breakpoint. So resize is watched too — but a redraw
  // clears the reader's selected node, so it is gated on the solved sizes
  // ACTUALLY changing. Everything else (a scroll that collapses the URL bar, a
  // vertical-only resize) leaves the figure alone.
  //
  // The node height now solves the same way, so the guard reads three values
  // and not two. A height change alone redraws the figure.
  var mq = window.matchMedia("(max-width: 600px)");
  var shown = null;

  function apply() {
    var L = mq.matches ? LAYOUTS.narrow : LAYOUTS.wide;
    var F = metricsFor(L);
    if (shown && shown.L === L
      && shown.F.edge === F.edge && shown.F.node === F.node && shown.F.h === F.h) return;
    shown = { L: L, F: F };
    render(L, F);
  }

  apply();
  if (mq.addEventListener) mq.addEventListener("change", apply);
  else if (mq.addListener) mq.addListener(apply);

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(apply, 150);
  });
})();
