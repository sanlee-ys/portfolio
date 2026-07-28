// Render engine for the loop-replay viewer (projects/loop-replay.html).
//
// The page ships each run log as a plain JS string (window.LOOP_REPLAY_JSONL
// for rung 1, window.LOOP_REPLAY_RUN2_JSONL for rung 2, set by the files in
// projects/data/) so it renders the same over file:// and https:// -- a
// fetch() of a local .jsonl file hits Chromium's CORS restriction on local
// files, a plain <script src> doesn't. This file:
//   1. registers the available runs and normalizes their two log dialects
//      (rung 1 tags records with `type` and ships unified prompt diffs;
//      rung 2 tags with `record` and ships one-line experiment diffs) into
//      one shape: { metadata, iterations, summary },
//   2. draws the score chart as a hand-built SVG (same createElementNS
//      pattern as assets/diagram.js -- no chart library),
//   3. wires the run tabs + iteration nav (prev/next/slider) to a detail
//      panel showing that iteration's scores, rationale, edit summary, and
//      colored diff.
//
// Vanilla JS, no framework, no build step -- matches the rest of the site.

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------------
  // 1. The run registry
  // ---------------------------------------------------------------------
  // Each entry: which global holds the JSONL, how to label the edit pane,
  // and the one-line intro under the tabs. isDryRun mirrors the old
  // IS_DRY_RUN flag per run: true = amber "demo data" banner. Both shipped
  // runs are real, so both are false; the flag exists so a mock can never
  // be shown without its warning banner.
  var RUNS = [
    {
      label: "Rung 1 · prompt loop",
      raw: window.LOOP_REPLAY_JSONL,
      isDryRun: false,
      diffHeading: "Prompt diff",
      metricLine: "Category macro-F1 per split, per iteration.",
      intro:
        "The agent rewrites the classifier prompt each iteration. " +
        "Stopped on the threshold done-signal; its scar is the A–C gap.",
    },
    {
      label: "Rung 2 · ML loop",
      raw: window.LOOP_REPLAY_RUN2_JSONL,
      isDryRun: false,
      diffHeading: "Experiment change",
      metricLine:
        "Mean macro-F1 across both axes (category + domain) per split, per iteration.",
      intro:
        "The agent does error-driven feature engineering on a trained TF-IDF " +
        "baseline. Stopped on plateau; B rose +6.0 while held-out C fell 8.6 " +
        "— the negative transfer recorded in ADR-018’s amendment.",
    },
  ].filter(function (r) { return typeof r.raw === "string"; });

  // ---------------------------------------------------------------------
  // 2. Parse + normalize a run log
  // ---------------------------------------------------------------------

  // Append-only JSONL: one JSON object per line, no wrapping array. Rung 1
  // buckets by `.type`, rung 2 by `.record` -- accept either, then fill the
  // summary fields the older viewer relied on when a dialect lacks them.
  function parseRunLog(raw) {
    var metadata = null;
    var iterations = [];
    var summary = null;

    raw.split("\n").forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;
      var record = JSON.parse(trimmed);
      var kind = record.type || record.record;
      if (kind === "run_metadata") metadata = record;
      else if (kind === "iteration") iterations.push(record);
      else if (kind === "run_summary") summary = record;
    });

    // Iterations should already be in order, but sort defensively -- the
    // chart and nav both assume iteration N is at index N.
    iterations.sort(function (a, b) { return a.iteration - b.iteration; });

    // Normalize the per-iteration edit text: rung 1 ships a unified
    // prompt_diff; rung 2 ships a comma-joined experiment_diff one-liner,
    // which reads best one change per line (and its "+group" lines pick up
    // the diff-add coloring for free).
    iterations.forEach(function (it) {
      it._diff = it.prompt_diff ||
        (it.experiment_diff && it.experiment_diff !== "(baseline)"
          ? it.experiment_diff.split(", ").join("\n")
          : "");
    });

    // Normalize the summary: rung 2's trailer has no final_iteration,
    // delta_macro_f1, or overfitting gap -- derive them from the records so
    // the honesty callout works identically for both dialects.
    if (summary && iterations.length) {
      if (summary.final_iteration == null) {
        summary.final_iteration = iterations[iterations.length - 1].iteration;
      }
      if (summary.total_tokens_spent == null && summary.tokens_spent != null) {
        summary.total_tokens_spent = summary.tokens_spent;
      }
      var best = iterations[summary.best_iteration] || iterations[0];
      var base = iterations[0];
      if (!summary.delta_macro_f1) {
        summary.delta_macro_f1 = {
          A: best.scores.A.macro_f1 - base.scores.A.macro_f1,
          B: best.scores.B.macro_f1 - base.scores.B.macro_f1,
          C: best.scores.C.macro_f1 - base.scores.C.macro_f1,
        };
      }
      if (summary.overfitting_gap_a_vs_c == null) {
        summary.overfitting_gap_a_vs_c =
          summary.delta_macro_f1.A - summary.delta_macro_f1.C;
      }
    }

    return { metadata: metadata, iterations: iterations, summary: summary };
  }

  // ---------------------------------------------------------------------
  // 3. Small helpers
  // ---------------------------------------------------------------------

  function el(name, attrs) {
    var e = document.createElementNS(SVG_NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function fmtScore(v) {
    return (v * 100).toFixed(1) + "%";
  }

  function fmtDelta(v) {
    var sign = v > 0 ? "+" : "";
    return sign + (v * 100).toFixed(1) + " pt";
  }

  // Diffs are untrusted-shaped content (they're just text pulled from a run
  // log San could point at any file), so escape before wrapping lines in
  // coloring spans -- never trust it as HTML.
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Unified-diff line -> a span with the class that colors it in CSS
  // (#iter-diff .diff-add/.diff-del/.diff-hunk/.diff-meta). Rung 2's
  // "+keyword_features.x" / "-keyword_features.x" lines match the same
  // prefixes, so added/removed feature groups color like a diff too.
  function diffLineClass(line) {
    if (line.indexOf("@@") === 0) return "diff-hunk";
    if (line.indexOf("---") === 0 || line.indexOf("+++") === 0) return "diff-meta";
    if (line.indexOf("+") === 0) return "diff-add";
    if (line.indexOf("-") === 0) return "diff-del";
    return null;
  }

  function renderDiff(diffText) {
    if (!diffText) return "";
    return diffText.split("\n").map(function (line) {
      var cls = diffLineClass(line);
      var safe = escapeHtml(line);
      return cls ? '<span class="' + cls + '">' + safe + "</span>" : safe;
    }).join("\n");
  }

  // ---------------------------------------------------------------------
  // 4. Boot: bail loudly if there's nothing to show
  // ---------------------------------------------------------------------

  var svg = document.getElementById("score-chart");
  if (!svg || !RUNS.length) return;

  // Per-run state, reassigned by loadRun().
  var activeRun = 0;
  var log, iterations, summary, bestIteration, selected;

  // ---------------------------------------------------------------------
  // 5. Run tabs + banner + per-run copy
  // ---------------------------------------------------------------------

  function renderTabs() {
    var tabsEl = document.getElementById("run-tabs");
    if (!tabsEl) return;
    tabsEl.querySelectorAll("button").forEach(function (btn, i) {
      if (i >= RUNS.length) { btn.hidden = true; return; }
      btn.textContent = RUNS[i].label;
      btn.setAttribute("aria-pressed", i === activeRun ? "true" : "false");
    });
  }

  function renderRunCopy() {
    var run = RUNS[activeRun];
    var introEl = document.getElementById("run-intro");
    if (introEl) introEl.textContent = run.intro;
    var metricEl = document.getElementById("chart-metric-line");
    if (metricEl) metricEl.textContent = run.metricLine;
    var diffHeadingEl = document.getElementById("iter-diff-heading");
    if (diffHeadingEl) diffHeadingEl.textContent = run.diffHeading;
  }

  function renderBanner() {
    var badge = document.getElementById("demo-badge");
    var text = document.getElementById("demo-badge-text");
    var label = document.getElementById("demo-badge-label");
    if (!badge || !text) return;
    var run = RUNS[activeRun];
    if (run.isDryRun) {
      badge.classList.remove("real-run");
      // The state is carried by a WORD, not by a coloured dot. The oxide rule
      // reinforces it; it is never the only thing saying so.
      if (label) label.textContent = "Demo data";
      // The label now carries the state, so the sentence no longer opens by
      // repeating it -- it says what the state MEANS, which is its whole job.
      text.textContent = "A labeled dry-run mock, not a measured result.";
      return;
    }
    badge.classList.add("real-run");
    if (label) label.textContent = "Real run";
    var bits = [log.metadata ? log.metadata.model : "live backend"];
    if (summary && summary.total_tokens_spent != null) {
      bits.push(summary.total_tokens_spent.toLocaleString() + " tokens");
    }
    if (summary && summary.done_signal) {
      bits.push("stopped on the " + summary.done_signal + " done-signal");
    }
    text.textContent = bits.join(", ") + ". Numbers below are a measured result, not a demo.";
  }

  // ---------------------------------------------------------------------
  // 6. Run summary tiles + honesty callout
  // ---------------------------------------------------------------------

  // A cell of the site's .stat-strip. Figure first, then label -- that order is
  // the component's construction, not a preference: the ink rule sits over the
  // figure and the hairline under the label, which is how a column head sits
  // over a column in a printed results table. Emitting label-first would draw
  // both rules against the wrong elements.
  function statTile(cls, label, value, sub) {
    return (
      '<li class="' + cls + '">' +
        '<span class="stat-value">' + value + "</span>" +
        '<span class="stat-label">' + label + "</span>" +
        (sub ? '<span class="stat-sub">' + sub + "</span>" : "") +
      "</li>"
    );
  }

  function renderSummary() {
    var statsEl = document.getElementById("summary-stats");
    var calloutEl = document.getElementById("honest-callout");
    if (!statsEl || !summary || !iterations.length) return;

    var best = iterations[bestIteration];
    var tiles = "";
    tiles += statTile("stat-a", "Best A (training)", fmtScore(best.scores.A.macro_f1), "iteration " + bestIteration);
    tiles += statTile("stat-b", "Best B (held-back)", fmtScore(best.scores.B.macro_f1), "stop signal");
    tiles += statTile("stat-c", "Best C (gold held-out)", fmtScore(best.scores.C.macro_f1), "the honest number");
    tiles += statTile("", "Iterations run", String(summary.final_iteration), "done: " + summary.done_signal);
    statsEl.innerHTML = tiles;

    if (calloutEl) {
      // The gap is a delta-of-deltas: how much A MOVED from baseline to the
      // best iteration, minus how much C moved over the same span. It is not
      // the distance between A's and C's final scores -- those can sit far
      // apart on a run that generalized perfectly, and close together on one
      // that didn't. Say "improved more than", never "finished ahead of".
      var gap = summary.overfitting_gap_a_vs_c;
      var gapAbs = Math.abs(gap * 100).toFixed(1);
      var deltas = summary.delta_macro_f1 || {};
      var spans =
        deltas.A != null && deltas.C != null
          ? " (A " + fmtDelta(deltas.A) + ", C " + fmtDelta(deltas.C) + ")"
          : "";
      var direction = gap > 0
        ? "A improved " + gapAbs + " pts more than C did" + spans +
          " — some of that A gain didn't transfer to real gold text."
        : "C improved " + gapAbs + " pts more than A did" + spans +
          " — no sign of overfitting to the training split.";
      calloutEl.innerHTML =
        "Overfitting gap (A gain − C gain), baseline to best iteration: <strong>" +
        fmtDelta(gap) + "</strong>. " + direction;
    }
  }

  // ---------------------------------------------------------------------
  // 7. Score chart (SVG, hand-built)
  // ---------------------------------------------------------------------

  // Layout constants for the 640x280 viewBox declared in the HTML. Padding
  // leaves room for axis labels on the left/bottom.
  var CHART = { w: 640, h: 280, padL: 42, padR: 16, padT: 16, padB: 30 };

  function chartX(i) {
    var n = iterations.length - 1 || 1;
    return CHART.padL + (i / n) * (CHART.w - CHART.padL - CHART.padR);
  }

  function chartY(v) {
    // v is a macro-F1 in [0, 1]; y grows downward in SVG.
    var top = CHART.padT, bottom = CHART.h - CHART.padB;
    return bottom - v * (bottom - top);
  }

  var selectListeners = [];
  function notifySelect(i) {
    selected = i;
    selectListeners.forEach(function (fn) { fn(i); });
  }

  function renderChart() {
    svg.textContent = "";
    if (!iterations.length) return;

    // ---- Gridlines + Y axis labels (0, 0.25, 0.5, 0.75, 1.0) ----
    [0, 0.25, 0.5, 0.75, 1.0].forEach(function (v) {
      var y = chartY(v);
      svg.appendChild(el("line", {
        class: "gridline", x1: CHART.padL, y1: y, x2: CHART.w - CHART.padR, y2: y,
      }));
      var label = el("text", { class: "axis-label", x: CHART.padL - 6, y: y + 3, "text-anchor": "end" });
      label.textContent = v.toFixed(2);
      svg.appendChild(label);
    });

    // ---- X axis labels (one per iteration, thinned if it'd get crowded) ----
    var xLabelStep = iterations.length > 10 ? Math.ceil(iterations.length / 10) : 1;
    iterations.forEach(function (it, i) {
      if (i % xLabelStep !== 0 && i !== iterations.length - 1) return;
      var label = el("text", { class: "axis-label", x: chartX(i), y: CHART.h - 8, "text-anchor": "middle" });
      label.textContent = String(it.iteration);
      svg.appendChild(label);
    });

    // ---- Shaded gap band between the A line and the C line -- the visual
    // point of the whole chart, so it's drawn first (under everything else).
    var topPath = iterations.map(function (it, i) {
      return (i === 0 ? "M" : "L") + chartX(i) + " " + chartY(it.scores.A.macro_f1);
    }).join(" ");
    var bottomPath = iterations.slice().reverse().map(function (it, i) {
      var idx = iterations.length - 1 - i;
      return "L" + chartX(idx) + " " + chartY(it.scores.C.macro_f1);
    }).join(" ");
    svg.appendChild(el("path", { class: "gap-fill", d: topPath + " " + bottomPath + " Z" }));

    // ---- The three score lines ----
    ["A", "B", "C"].forEach(function (split) {
      var d = iterations.map(function (it, i) {
        return (i === 0 ? "M" : "L") + chartX(i) + " " + chartY(it.scores[split].macro_f1);
      }).join(" ");
      svg.appendChild(el("path", { class: "series-line series-" + split.toLowerCase(), d: d }));
    });

    // ---- Cursor line for the selected iteration (drawn before the dots and
    // hit-columns so it sits behind them) ----
    var cursor = el("line", {
      class: "cursor-line", id: "chart-cursor",
      x1: chartX(selected), y1: CHART.padT, x2: chartX(selected), y2: CHART.h - CHART.padB,
    });
    svg.appendChild(cursor);

    // ---- Dots per split per iteration ----
    ["A", "B", "C"].forEach(function (split) {
      iterations.forEach(function (it, i) {
        svg.appendChild(el("circle", {
          class: "series-dot " + split.toLowerCase(),
          cx: chartX(i), cy: chartY(it.scores[split].macro_f1), r: i === selected ? 4.5 : 3,
        }));
      });
    });

    // ---- Best-iteration marker: a small ring around the C dot at the
    // best iteration, so the chart itself points at run_summary.best_iteration
    // without a legend entry to explain. ----
    if (bestIteration != null && iterations[bestIteration]) {
      svg.appendChild(el("circle", {
        class: "series-dot c", cx: chartX(bestIteration),
        cy: chartY(iterations[bestIteration].scores.C.macro_f1),
        r: 7, fill: "none", stroke: "var(--series-c)", "stroke-width": 1.5,
      }));
    }

    // ---- Transparent full-height hit columns, one per iteration, for
    // hover/click selection -- drawn last so they're on top. ----
    var colWidth = (CHART.w - CHART.padL - CHART.padR) / (Math.max(iterations.length - 1, 1) || 1);
    iterations.forEach(function (it, i) {
      var cx = chartX(i);
      svg.appendChild(el("rect", {
        class: "hit-col",
        x: cx - colWidth / 2, y: CHART.padT, width: colWidth, height: CHART.h - CHART.padT - CHART.padB,
        tabindex: "0", role: "button",
        "aria-label": "Iteration " + it.iteration,
      }));
    });

    // Wire up the hit columns after they exist in the DOM.
    var hitCols = svg.querySelectorAll(".hit-col");
    hitCols.forEach(function (col, i) {
      col.addEventListener("mouseenter", function () { notifySelect(i); });
      col.addEventListener("click", function () { notifySelect(i); });
      col.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); notifySelect(i); }
        else if (ev.key === "ArrowRight") { ev.preventDefault(); notifySelect(Math.min(i + 1, iterations.length - 1)); }
        else if (ev.key === "ArrowLeft") { ev.preventDefault(); notifySelect(Math.max(i - 1, 0)); }
      });
    });
  }

  function updateCursor() {
    var cursor = document.getElementById("chart-cursor");
    if (!cursor) return;
    var x = chartX(selected);
    cursor.setAttribute("x1", x);
    cursor.setAttribute("x2", x);

    // Re-emphasize the selected iteration's dot on each series (skip the
    // best-iteration ring, which is an unfilled circle with a stroke).
    ["a", "b", "c"].forEach(function (cls) {
      var dots = svg.querySelectorAll(".series-dot." + cls);
      dots.forEach(function (dot, i) {
        if (dot.hasAttribute("stroke")) return;
        dot.setAttribute("r", i === selected ? 4.5 : 3);
      });
    });
  }

  // ---------------------------------------------------------------------
  // 8. Iteration nav (prev/next/slider) + detail panel
  // ---------------------------------------------------------------------

  var prevBtn = document.getElementById("iter-prev");
  var nextBtn = document.getElementById("iter-next");
  var slider = document.getElementById("iter-slider");
  var label = document.getElementById("iter-label");
  var statsEl = document.getElementById("iter-stats");
  var baselineNote = document.getElementById("iter-baseline");
  var editBlock = document.getElementById("iter-edit-block");
  var rationaleEl = document.getElementById("iter-rationale");
  var summaryEl = document.getElementById("iter-summary");
  var diffEl = document.getElementById("iter-diff");
  var metaEl = document.getElementById("iter-meta");

  function renderIterDetail() {
    var it = iterations[selected];
    if (!it) return;

    if (slider) {
      slider.max = String(iterations.length - 1);
      slider.value = String(selected);
    }
    if (label) label.textContent = "Iteration " + selected + " / " + (iterations.length - 1);
    if (prevBtn) prevBtn.disabled = selected === 0;
    if (nextBtn) nextBtn.disabled = selected === iterations.length - 1;

    if (statsEl) {
      var tiles = "";
      tiles += statTile("stat-a", "A macro-F1", fmtScore(it.scores.A.macro_f1));
      tiles += statTile("stat-b", "B macro-F1", fmtScore(it.scores.B.macro_f1));
      tiles += statTile("stat-c", "C macro-F1", fmtScore(it.scores.C.macro_f1));
      statsEl.innerHTML = tiles;
    }

    var isBaseline = it.iteration === 0;
    if (baselineNote) baselineNote.hidden = !isBaseline;
    if (editBlock) editBlock.hidden = isBaseline;

    if (!isBaseline) {
      if (rationaleEl) rationaleEl.textContent = it.agent_rationale || "";
      if (summaryEl) summaryEl.textContent = it.edit_summary || "";
      if (diffEl) diffEl.innerHTML = renderDiff(it._diff || "");
    }

    if (metaEl) {
      var bits = ["Tokens spent so far: " + it.tokens_spent.toLocaleString()];
      if (it.iteration === bestIteration) bits.push("best iteration (by " + (summary ? summary.done_signal : "stop signal") + ")");
      if (it.done_signal) bits.push('done signal: "' + it.done_signal + '"');
      metaEl.textContent = bits.join("  ·  ");
    }

    updateCursor();
  }

  selectListeners.push(renderIterDetail);

  if (prevBtn) prevBtn.addEventListener("click", function () { if (selected > 0) notifySelect(selected - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { if (selected < iterations.length - 1) notifySelect(selected + 1); });
  if (slider) slider.addEventListener("input", function () { notifySelect(parseInt(slider.value, 10)); });

  // ---------------------------------------------------------------------
  // 9. Load a run and render everything
  // ---------------------------------------------------------------------

  function loadRun(i) {
    activeRun = i;
    log = parseRunLog(RUNS[i].raw);
    iterations = log.iterations;
    summary = log.summary;
    bestIteration = summary ? summary.best_iteration : null;
    selected = bestIteration != null ? bestIteration : 0;

    renderTabs();
    renderRunCopy();
    renderBanner();
    renderSummary();
    renderChart();
    renderIterDetail();
  }

  var tabsEl = document.getElementById("run-tabs");
  if (tabsEl) {
    tabsEl.querySelectorAll("button").forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        if (i !== activeRun && i < RUNS.length) loadRun(i);
      });
    });
  }

  loadRun(0);
})();
