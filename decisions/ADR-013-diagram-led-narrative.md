# ADR-013: A diagram-led narrative, and a gate under every figure

**Status:** Accepted
**Date:** 2026-08-30
**Deciders:** San Lee

---

## Context

This site argues that a published number must name the artifact it came from.
Two gates enforce that rule on prose. `check-published-metrics.cjs` compares a
`data-metric` span to the classifier's generated artifact.
`check-telltale-evidence.cjs` compares a `data-tt` span and a `data-tt-frame`
block to a record pulled at a pinned commit.

The site's figures obeyed neither. A plate is an inline SVG that a person types,
so a count inside one is a published figure with no producer. Nothing read it.
`contrast-check.cjs:170` reads `if (el.closest('svg')) continue;`, so every
plate ships with no automated contrast check in either theme.
`font-coverage.cjs` reads the codepoints and says nothing about the claim. The
only control was a reading by eye.

The gap was not theoretical. The `telltale` project learned the same lesson one
repository over: its README frames were drawn by hand, they drifted several ways
at once, and its test suite now emits them. [`ADR-012`](ADR-012-telltale-promoted-above-the-router.md)
recorded that lesson and gated one page's figures. This record gates the rest.

Two measurements decided the shape of the answer, and both were taken on
2026-08-30 against a fresh build.

1. **30 SVG `<text>` nodes already carry a digit, across 9 pages.** The doctrine
   was right and the site did not obey it. A gate with no baseline therefore
   reddens nine pages on the day it lands.
2. **One of those 30 renders no digit at all.** The plate on `netops-lab` reads
   `wipe &#8594; cfg`. The digits belong to the entity reference. A gate that
   read `src/` would fail a correct figure.

## Decision

**Nine decisions. Together they are one system: every figure carries a claim,
and every claim carries a control.**

### 1. Four figure kinds, and one generating rule

A figure is a PLATE, a STRIP, a MAP, or a PLOT. A PLATE states one claim as
geometry. A STRIP re-lays existing text nodes in a grid. A MAP shows how parts
connect. A PLOT interpolates its geometry from a generator. A FRAME is verbatim
terminal output and a TABLE is a table, and neither is a figure.

**The generating rule: a hand-drawn figure carries no digit. A generated figure
carries its digits, and it names its artifact and its commit.** Every other
digit lives in prose or in a caption, where a gate already reads it.

**A STRIP is preferred over a PLATE whenever N items repeat one shape.** A strip
is HTML, so its text stays inside `contrast-check.cjs`, its `data-metric` and
`data-tt` spans travel intact, and it cannot break claim parity. A plate escapes
all three. Use a plate only when the claim is a shape that words cannot draw.

### 2. At most four new SVG figures per page

Strips, tables, and frames are uncapped, because they carry existing text and
add no unguarded claim. The cap stops a page from becoming an infographic. A
page that needs a fifth plate needs a split, and a split is an owner call under
[`ADR-007`](ADR-007-split-dont-trim.md).

### 3. The caption contract, in two slots

A caption runs 30 to 60 words and holds two spans. `.fig-what` states what the
figure argues and, for a PLOT or a FRAME, the artifact, the line range, and the
commit. `.fig-limit` states what the figure does not reproduce, and why.

**`.fig-limit` is the decision here, and it is not a style rule.** ADR-007's
rider says that claim, evidence, and caveat travel together. A figure sequence
that ends on a win, with the caveat left in body prose, breaks that rider even
though no text moved. The site already writes this slot by hand. The gate makes
it unavoidable.

A FRAME also names its render profile. In the ASCII profile an em dash renders
as `-`. The telltale page states that a reading renders as an em dash and never
as a zero. A frame that does not name its profile contradicts the prose above
it.

### 4. The caption-spine test, run by reading

Read a page's `h1`, its standfirst, and its figure captions in order, and
nothing else. The result must be claim, then evidence, then caveat. **The last
caption on a page carries a limit, not a win.** A spine that reads claim, claim,
claim means one figure is missing, or one caption states a fact instead of a
claim.

No gate can run this. It is recorded because a reading is the only enforcement
ADR-007 says exists, and an unwritten reading is not a control.

### 5. The transmute test, five questions, before prose becomes a figure

**T1.** Is the prose topology, sequence, set membership, or magnitude? Reasoning,
a negative result, a ruling, and a measured caveat all stay as prose.
**T2.** Does every claim land in geometry, in a word inside the figure, in a
caption span, or in kept prose?
**T3.** Do the exact numbers survive, and does the figure add no number the prose
never carried? Either direction fails.
**T4.** Does the SVG hold zero digits?
**T5.** Is it legible at 320px in both themes, with every state dual-encoded by a
word plus a shape?

Any "no" means the prose stays. **T1 outranks the wish to draw.** A paragraph
that mixes registers splits at the sentence: the topology half converts, and the
argument half stays where it is.

T5 exists because no gate reads a plate. `contrast-check.cjs` exempts SVG text,
so colour alone must never carry a state. `false-green.astro` already records
the matching constraint: Geist has no glyph for the symbols a lane would reach
for, so a state is a word plus a geometry.

### 6. `scripts/figure-contract.cjs` fails the build on three rules

**R-D, the digit rule.** A `<text>` node inside an `<svg>` in the page's content
region fails if its decoded text carries a digit. Two exits: the `<svg>`
declares `data-fig-generated="true"`, or the figure sits in the baseline.

**R-C, the caption rule.** Every `<figure>` that carries `data-fig` must hold a
`<figcaption>` with a non-empty `.fig-what` and a non-empty `.fig-limit`.

**R-N, the declaration rule.** Every `<figure>` in the content region that the
baseline does not list must carry `data-fig`. Without R-N the caption rule is
opt-in: a lane omits the attribute and R-C never runs.

**The gate reads `dist/` and decodes entities.** The rule is about what a reader
sees, and the source and the screen disagree on `netops-lab`. A source-reading
gate fails a correct figure, and the cheapest way to green a false failure is a
deletion.

**An entity the gate cannot resolve stops the run.** It cannot say what that
text renders, and the guess is wrong in both directions: `&frac12;` spells a
digit and renders none, `&#52;` spells none and renders one.
`font-coverage.cjs` made the same call for the same reason.

### 7. The baseline exists so the gate never asks a lane to delete a figure

`scripts/figure-contract-baseline.json` records the nine figures that already
carried a digit when the gate landed, with their exact values and a reason each.

**This is the load-bearing decision in this record.** A gate that reddens nine
pages on day one has one cheap remedy, and it is deletion.
[`ADR-004`](ADR-004-retire-the-lab-as-the-vehicle.md) and ADR-007 forbid that:
substance is never deleted, and text may be replaced only by a visual that
carries the same claims on the same page. **A gate that forces a deletion is a
substance deletion with a build failure in front of it.** So the gate binds new
work, and the baseline records the debt with its reasons rather than hiding it.

The baseline cannot rot. The gate fails when a stored value is no longer on the
page, and when an entry names a figure that is gone. That is what freezes
`.eval-plate` and `.ci-plot`, which are frozen historical measurements: a change
to either one now reddens the build instead of shipping as an ordinary diff.
**A new baseline entry needs a line in this record.** An exemption is a rule
somebody decided to break, and the gate rejects an entry that carries no reason.

The gate cannot write its own baseline. `--seed` prints the measured inventory
and writes nothing. A gate that can rewrite its own baseline can green itself.

### 8. RULE D2: a frame reader ships every frame in the served HTML

`scripts/mobile-qa.cjs:84-86` loads at `waitUntil: 'domcontentloaded'`,
evaluates `scrollWidth - clientWidth` once, and never clicks. **A frame that a
script swaps in after load is never measured by the overflow gate.** The site's
known silent failure is a `.tt-frame` that loses on CSS specificity, wraps,
shears every column, and turns the mobile gate green, because a wrapped frame
cannot overflow.

So the reader ships un-enhanced. Every frame sits in the served HTML, and
JavaScript only reduces the set. **It never adds a frame.** The puller asserts
that every line in one window has the same column count, and it fails rather
than write a ragged window. Before merge, a lane steps through every state by
hand at 320px.

**This is recorded rather than left as a property of the code.** The immunity is
accidental and it is fragile. A later change that server-renders one frame
reopens the hole in silence, and the gate stays green while it does.

### 9. ASCII purity is retired as the frame-admission test

Nine of the eighteen files named `*-ascii.txt` in the upstream corpus are not
pure ASCII. In every case the contaminant is `U+00B7`, `U+2013`, `U+2014`, or
`U+2192`, and this site already ships all four. **Purity rejects renderable
frames, and it detects nothing about column shear, which is the failure that
actually breaks a frame.**

Three tests replace it, in `scripts/pull-telltale-evidence.cjs`. Glyph coverage:
every codepoint in the window has a glyph in the shipped subset. Advance width:
every line in the window has the same column count. Boundary content: a denylist
that includes the per-vendor sandbox posture vocabulary, which a denylist built
from dollar signs and adoption rates does not match.

A Playwright check of `columns x ch` per rendered line was considered and is not
taken. A per-line pixel assertion is likely to be flaky, and a flaky gate trains
the habit of ignoring red.

## Downstream surfaces

- `scripts/figure-contract.cjs` — the gate. Decisions 6 and 7.
- `scripts/figure-contract.test.cjs` — its adversarial suite. It pins the entity
  decode in both directions, the baseline anti-rot rules, and the inert-gate
  check.
- `scripts/figure-contract-baseline.json` — the measured debt, nine entries.
  **Two are permanent:** `.eval-plate` and `.ci-plot`.
- `scripts/gates.cjs` and `.github/workflows/qa.yml` — two new steps in each.
  The count goes from 18 to 20. `CLAUDE.md` records that the runner must stay a
  faithful mirror of the workflow.
- `CLAUDE.md` — a new operative section, "The figure contract", plus every gate
  count.
- `scripts/build-plots.cjs` and `src/data/figures.json` — the PLOT generator and
  its record. Decision 1. The generator stays outside `npm run qa`, because it
  reads sibling repositories and a gate that reaches outside this repository
  reddens for reasons unrelated to the site. `pull-telltale-evidence.cjs` and
  `og-cover.cjs` sit outside for the same reason.
- `scripts/pull-telltale-evidence.cjs` — decision 9's three admission tests, and
  the new frame windows. **Not implemented by this record's pull request.**
- `public/projects/tt-reader.js` and `src/pages/projects/telltale.astro` —
  decision 8. **Not implemented by this record's pull request.**
- Every page under `src/pages/projects/` — decisions 1 to 5 bind each figure a
  later pull request adds. No page changed here.
- `public/assets/style.css` — **not touched.** Every new caption rule is
  page-scoped, inside the page's own `<Fragment slot="head">`, with `is:inline`.
  A concurrent session owns that file, and a generated shared surface cannot
  take a second writer. The cost is a repeated caption block per page, and each
  copy names its origin page and commit. Consolidation is deferred.

## Consequences

**The site does not get shorter, and no pull request may claim that it does.**
A figure plus a caption costs 150 to 350 rendered pixels, and the substance
floor forbids the deletion that would pay for it. The claim this system makes is
a comprehension claim: fewer paragraphs over 120 words, and no section where the
reader performs arithmetic the page could draw.

**Two gates now stand between a lane and a published figure, and neither reads
meaning.** R-D checks a digit. R-C checks that two spans hold text. **A caption
can satisfy both and still be wrong**, and the claim-parity ledger and the
caption-spine test are readings, not checks. This record does not pretend
otherwise.

**Nine exemptions ship with the gate.** Every one is a rule this site breaks, in
writing, with a reason. That is worse than a clean site and better than an
unenforced doctrine, and it is the only version of this gate that does not push
a lane toward deletion.

**The baseline adds friction to an edit of an old plate.** That is the intent for
`.eval-plate` and `.ci-plot`. For the other seven it is a side effect, and the
remedy is one line in the baseline plus one line here.

## Alternatives considered

| Option | Why not |
|---|---|
| **A digit gate with no baseline** | It reddens nine pages on day one. The cheapest remedy is deletion, which ADR-004 and ADR-007 forbid. This was the judge round's blocking finding, and the measurement confirmed it. |
| **A gate that reads `src/`** | It fails a correct figure. `netops-lab` reads `wipe &#8594; cfg`, which is digits in the source and an arrow on the screen. |
| **A caption rule on every figure** | Six figures predate the contract, including two archived lab and photo figures. The rule binds figures that carry `data-fig`, and R-N stops a new figure from opting out. |
| **A convention in `CLAUDE.md` and no gate** | ADR-009 already settled this shape. A rule that only a reader enforces shipped the same defect twice. |
| **Extract the caption CSS into `public/assets/style.css`** | A concurrent session owns that file for the tap-target work, and two writers on one generated surface cannot be merged. Deferred, with the cost recorded above. |
| **A self-hosted terminal-recording player** | About 250 KB of JavaScript on a site whose posture is zero JavaScript by default. It renders into a canvas that the contrast gate and the font gate cannot read. No recording exists, and one would be a publication needing a per-frame review. |
| **An animated SVG of the frames** | SVG text is exempt from the contrast gate. The generated markup layers frames with opacity toggles, and ADR-009 forbids `opacity` on text. Its colours bake in, so a theme toggle leaves a light terminal on a dark page. |
| **Progressive disclosure of prose** | ADR-007 Decision 5 is absolute. No `<details>`, no accordion, no tab strip over prose. The one permitted case is a reader-controlled view over a data artifact, and every panel ships in the served HTML. |
| **A bar figure for third-party survey percentages** | No marker, no gate, and no artifact in this repository can source them. A picture of ungated third-party numbers is the defect ADR-012 named. |
