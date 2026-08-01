/**
 * "Run the loser" — the ADR-017 classical baseline, live in the reader's tab.
 *
 * PROVENANCE. Both model files under `assets/baseline/` are VENDORED, byte for
 * byte, from the classifier repo:
 *
 *   source repo : github.com/sanlee-ys/defense-news-classifier
 *   commit      : 7b6131552a72e45bc317b60dab72e67505b0d631  (short: 7b61315)
 *   files       : web/baseline_export.json  -> assets/baseline/baseline_export.json
 *                 web/baseline_infer.js     -> assets/baseline/baseline_infer.js
 *
 * They are a VERSIONED PAIR — `baseline_infer.js` reads the vectorizer config
 * echoed inside `baseline_export.json`, and the classifier repo's parity gate
 * asserts the JS port matches sklearn's `decision_function` to 1e-6 over the
 * same rows. Update one and you update the other, from the same commit. They are
 * vendored rather than hot-linked because raw.githubusercontent serves modules
 * as `text/plain` with no durable caching, and because a page holding one file
 * from a moving `main` and the other from a build is exactly the mismatch that
 * parity gate exists to prevent.
 *
 * THE HONEST FRAME. Only the baseline runs here. It is the arm that LOST the
 * bake-off; it is also the only arm that can run with no key, no server and no
 * spend. The gold labels and the LLM's verdicts on the curated rows are RECORDED
 * — read out of committed artifacts in the classifier repo, listed per row below
 * — never fetched, never re-inferred. This page calls no API.
 *
 * Recorded columns come from, at that same commit:
 *   gold labels : data/gold/gold.csv                 (54 hand-labeled rows)
 *   LLM verdict : evals/gold_predictions_v3.csv      (pred_category, pred_operational_domain)
 *   baseline    : evals/baseline_predictions.csv     (used only to pick the examples;
 *                                                     the number you SEE is computed live)
 */
import { classify, prepare, vectorize } from "../assets/baseline/baseline_infer.js";

const MODEL_URL = new URL("../assets/baseline/baseline_export.json", import.meta.url);

/*
 * The six curated rows. Chosen off a join of gold.csv x baseline_predictions.csv
 * x gold_predictions_v3.csv so the set covers the shape of the result rather
 * than flattering either arm: two the baseline gets right, two where it fails in
 * the characteristic lexically-loud way ADR-017 names, one BOTH arms miss, and
 * one that lands on the `industry` handicap the writeup already owns.
 *
 * `text` is the gold row verbatim. `gold` and `llm` are transcribed from the
 * committed CSVs; nothing here is inferred at render time.
 */
const EXAMPLES = [
  {
    id: "g022",
    chip: "MQ-25A hits Milestone C",
    text:
      "Following a successful first flight in April, Acting Secretary of the Navy Hung Cao announced today that the MQ-25A Stingray received Milestone C approval to move into Low-Rate Initial Production (LRIP).",
    gold: { category: "procurement", operational_domain: "air" },
    llm: { category: "procurement", operational_domain: "air" },
    note:
      "Both arms right. Contract vocabulary plus an airframe name is exactly the row a bag of words can do.",
  },
  {
    id: "g006",
    chip: "Submarine home to Groton",
    text:
      "GROTON, Conn. – The Los Angeles-class fast-attack submarine USS Hartford (SSN 768), commanded by Cmdr. Matthew Fanning, returned to its homeport at Naval Submarine Base, New London in Groton, Connecticut, July 24.",
    gold: { category: "operations", operational_domain: "sea" },
    llm: { category: "operations", operational_domain: "sea" },
    note:
      "Both arms right again. “submarine” and “homeport” are loud, and here loud happens to be correct.",
  },
  {
    id: "g047",
    chip: "DoD panel on conduct policy",
    text:
      "A panel will look into gender-integrated training and a DoD task force will look into DoD policies regarding adultery, fraternization and other privacy issues, Defense Secretary William S. Cohen announced June 7.",
    gold: { category: "policy", operational_domain: "multi" },
    llm: { category: "policy", operational_domain: "multi" },
    note:
      "The signature miss. Five of six policy rows came back operations; a treaty and a deployment share a vocabulary, and only reading tells them apart.",
  },
  {
    id: "g045",
    chip: "Policy chief visits Ramadi",
    text:
      "The under secretary of defense for policy traveled to Ramadi, Iraq, to gain a better understanding of the developing partnership between advise and assist paratroopers and their Iraqi security force counterparts, Jan. 9.",
    gold: { category: "operations", operational_domain: "land" },
    llm: { category: "operations", operational_domain: "land" },
    note:
      "The other signature miss: land collapses to air. “paratroopers” carries an aviation smell that the ground story underneath it does not.",
  },
  {
    id: "g021",
    chip: "Army IFPC letter contract",
    text:
      "On November 13, 2024, the Army awarded an Undefinitized Indefinite Delivery/Indefinite Quantity letter contract for Indirect Fire Protection Capability Inc 2 Low-Rate Initial Production, Full Rate Production, and Support Services.",
    gold: { category: "procurement", operational_domain: "air" },
    llm: { category: "procurement", operational_domain: "land" },
    note:
      "Honesty cuts both ways: BOTH arms answer land on domain. It is an Army program, and it shoots down cruise missiles — the air label lives in the second half of the sentence.",
  },
  {
    id: "g056",
    chip: "Palantir Q1 earnings",
    text:
      "Palantir Reports Q1 2026 Results. MIAMI (BUSINESS WIRE) - Palantir Technologies Inc. (NASDAQ: PLTR) announced financial results for the quarter ended March 31, 2026. Revenue grew 85% year-over-year to $1.633 billion, with U.S. revenue up 104% to $1.282 billion. GAAP net income was $871 million. The company raised full-year 2026 revenue guidance to 71% growth, said CEO Alex Karp.",
    gold: { category: "industry", operational_domain: "cyber" },
    llm: { category: "industry", operational_domain: "multi" },
    note:
      "The handicap the writeup already owns: industry had exactly one training row, so the baseline scores 0.000 on it by construction. The LLM takes the category and still misses the domain.",
  },
];

const AXES = [
  { key: "category", label: "category" },
  { key: "operational_domain", label: "operational_domain" },
];

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------------------------------------------------------------------------
 * Lazy load. 583 KB raw (~208 KB over the wire, Pages gzips it) has no business
 * in the critical path of a page most readers only read. It is fetched on the
 * first interaction, or when the demo scrolls into view — whichever happens
 * first — and parsed once.
 * ------------------------------------------------------------------------- */
let ctxPromise = null;
function getContext() {
  if (!ctxPromise) {
    ctxPromise = fetch(MODEL_URL)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((model) => prepare(model));
  }
  return ctxPromise;
}

/* ---------------------------------------------------------------------------
 * Rendering
 * ------------------------------------------------------------------------- */

function renderBars(container, axisKey, result, goldLabel) {
  container.textContent = "";
  const probs = result.probabilities;
  const rows = Object.keys(probs).sort((a, b) => probs[b] - probs[a]);
  for (const cls of rows) {
    const pct = probs[cls] * 100;
    const row = el("div", "bdemo-bar-row");
    const isTop = cls === result.label;
    const name = el("span", "bdemo-bar-name", cls);
    if (isTop) name.classList.add(goldLabel && cls !== goldLabel ? "is-wrong" : "is-top");
    const track = el("span", "bdemo-bar-track");
    const fill = el("span", "bdemo-bar-fill");
    if (isTop) fill.classList.add(goldLabel && cls !== goldLabel ? "is-wrong" : "is-top");
    fill.style.width = Math.max(pct, 0.6).toFixed(2) + "%";
    track.appendChild(fill);
    const val = el("span", "bdemo-bar-val", pct.toFixed(1) + "%");
    row.append(name, track, val);
    container.appendChild(row);
  }
  container.setAttribute(
    "aria-label",
    axisKey +
      ": " +
      rows.map((c) => c + " " + (probs[c] * 100).toFixed(1) + " percent").join(", ")
  );
}

function renderNoSignal(container, axisKey) {
  container.textContent = "";
  const p = el("p", "bdemo-nosignal", "no signal — no known terms");
  container.appendChild(p);
  container.setAttribute("aria-label", axisKey + ": no signal, no known terms");
}

function setVerdict(node, label, goldLabel, hasSignal) {
  node.textContent = hasSignal ? label : "—";
  node.classList.toggle("is-wrong", Boolean(hasSignal && goldLabel && label !== goldLabel));
  node.classList.toggle("is-right", Boolean(hasSignal && goldLabel && label === goldLabel));
}

function renderReference(example) {
  const box = $("bdemo-reference");
  box.textContent = "";

  if (!example) {
    box.appendChild(
      el(
        "p",
        "bdemo-ref-empty",
        "Free text has no recorded answer. There is no gold label for a sentence nobody graded, and the LLM is not called from this page — the only arm running in your tab is the one that lost."
      )
    );
    const p = el("p", "bdemo-ref-empty");
    p.append(document.createTextNode("To run the winner, "));
    const a = el("a", null, "clone the classifier repo");
    a.href = "https://github.com/sanlee-ys/defense-news-classifier";
    p.append(a, document.createTextNode(" and point it at your own key."));
    box.appendChild(p);
    return;
  }

  // Divs rather than a <table>: the site's table rules (sticky first column,
  // metrics alignment) are tuned for the wide comparison tables and would fight
  // this three-cell strip inside an already-narrow column.
  const grid = el("div", "bdemo-ref-grid");
  const head = el("div", "bdemo-ref-row is-head");
  head.append(
    el("span", "bdemo-ref-k", "axis"),
    el("span", "bdemo-ref-v", "human gold"),
    el("span", "bdemo-ref-v", "the LLM")
  );
  grid.appendChild(head);
  for (const axis of AXES) {
    const row = el("div", "bdemo-ref-row");
    const llmCell = el("span", "bdemo-ref-v", example.llm[axis.key]);
    if (example.llm[axis.key] !== example.gold[axis.key]) llmCell.classList.add("is-wrong");
    row.append(
      el("span", "bdemo-ref-k", axis.label),
      el("span", "bdemo-ref-v", example.gold[axis.key]),
      llmCell
    );
    grid.appendChild(row);
  }
  box.appendChild(grid);
  box.appendChild(el("p", "bdemo-ref-note", example.note));
  box.appendChild(
    el(
      "p",
      "bdemo-ref-prov",
      "Recorded, not run: row " +
        example.id +
        " of data/gold/gold.csv and evals/gold_predictions_v3.csv."
    )
  );
}

async function run(text, example) {
  const status = $("bdemo-status");
  status.textContent = "Loading the model…";
  let ctx;
  try {
    ctx = await getContext();
  } catch (err) {
    status.textContent =
      "The model file did not load, so nothing ran. Reload, or clone the repo and run it there.";
    return;
  }

  const trimmed = String(text || "").trim();
  if (!trimmed) {
    status.textContent = "Pick an example or type a sentence.";
    for (const axis of AXES) {
      $("bdemo-bars-" + axis.key).textContent = "";
      $("bdemo-verdict-" + axis.key).textContent = "—";
      $("bdemo-verdict-" + axis.key).classList.remove("is-wrong", "is-right");
    }
    renderReference(example);
    return;
  }

  const known = vectorize(trimmed, ctx).size;
  const out = classify(trimmed, ctx);

  for (const axis of AXES) {
    const bars = $("bdemo-bars-" + axis.key);
    const verdict = $("bdemo-verdict-" + axis.key);
    const goldLabel = example ? example.gold[axis.key] : null;
    if (known === 0) {
      renderNoSignal(bars, axis.key);
      setVerdict(verdict, out[axis.key].label, goldLabel, false);
    } else {
      renderBars(bars, axis.key, out[axis.key], goldLabel);
      setVerdict(verdict, out[axis.key].label, goldLabel, true);
    }
  }

  status.textContent =
    known === 0
      ? "No signal. Not one term in that sentence is in the model’s vocabulary, so it normalises to a zero vector and the “prediction” is the intercepts alone. Reporting a label here would be reporting a prior."
      : "Ran on " + known + (known === 1 ? " known term." : " known terms.");

  renderReference(example);
}

/* ---------------------------------------------------------------------------
 * Wiring
 * ------------------------------------------------------------------------- */
function init() {
  const root = $("baseline-demo");
  if (!root) return;
  const input = $("bdemo-input");
  const chipBox = $("bdemo-chips");

  EXAMPLES.forEach((ex, i) => {
    const b = el("button", "bdemo-chip", ex.chip);
    b.type = "button";
    b.dataset.index = String(i);
    b.setAttribute("aria-pressed", "false");
    chipBox.appendChild(b);
  });

  let current = null;

  function select(index) {
    current = index === null ? null : EXAMPLES[index];
    for (const b of chipBox.querySelectorAll(".bdemo-chip")) {
      const on = index !== null && Number(b.dataset.index) === index;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("is-on", on);
    }
    if (current) input.value = current.text;
    run(input.value, current);
  }

  chipBox.addEventListener("click", (e) => {
    const b = e.target.closest(".bdemo-chip");
    if (b) select(Number(b.dataset.index));
  });

  let timer = null;
  input.addEventListener("input", () => {
    // Typing detaches the row from its recorded answer: the gold and LLM columns
    // belong to that exact string, not to an edited version of it.
    if (current && input.value !== current.text) select(null);
    clearTimeout(timer);
    timer = setTimeout(() => run(input.value, current), 180);
  });

  // The 583 KB export is fetched when the demo scrolls into view, not at page
  // load — this page is mostly prose and most readers never reach the demo. The
  // first example is selected at the same moment, so the panel is populated by
  // the time anyone looks at it.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          select(0);
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(root);
  }

  renderReference(null);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
