# ADR-004: Retire the lab as the vehicle; interactive work belongs wherever it argues best

**Status:** Accepted; migration executed 2026-07-23 (see *Migration record*)
**Date:** 2026-07-19
**Deciders:** San Lee

---

## Context

The site has carried a two-surface split since 2026-06-26: the front page stays
"tasteful and sales-ready," and a labeled `/lab` sandbox holds the front-end
experiments, so curiosity never compromises the showcase. The lab climbed a tier
progression on purpose — Tier 1 CSS craft, Tier 2 Canvas, Tier 3 SVG/dataviz,
Tier 4 WebGL — and was sharpened on 2026-07-04 into **front-end craft only**:
project demos were explicitly barred from it, because the craft sandbox and the
systems showcase were meant to stay distinct.

That split was right for its moment and it is wrong now, for two reasons that
arrived from different directions.

**1. The lab stopped being fed, and a stalled sandbox is worse than no sandbox.**
The lab only pays off if experiments keep landing. Against a full-time schedule
there is not enough time to *learn* and *build* in parallel; something gives, and
it has been the lab. A learning sandbox that stops updating does not read as
neutral — it timestamps the month the author stopped.

**2. The framing was actively discounting the site's strongest evidence.**
`lab/loop-replay.html` is a recorded-replay viewer for the prompt-optimization
loop's run log. It is the **only interactive proof of the L3 rung** of the
autonomy ladder (`classifier/ADR-006`), and it is where the Goodhart argument —
that the loop improves against the split it can see while giving back ground on
held-out gold — becomes something a reader can *watch* rather than take on
faith. Both project pages now link into it as supporting evidence.

It was filed under a section whose own index says *"expect rough edges; that's
the point."* A skeptical senior engineer is being told, on arrival, to grade the
site's best artifact on a curve. When a lab experiment becomes load-bearing for
two project pages, it is not an experiment.

The deeper defect is in the tier framing itself. Sorting work into "fancy UI =
learning exercise" and "prose = real work" was never true, and loop-replay is the
counterexample: the interactive artifact turned out to carry the argument better
than the paragraphs around it.

There is a related failure this record should name, because it is the same
mistake in a different costume. The project pages have grown dense with prose,
and some of that prose is doing a job a picture does better — a four-row table
describing a state machine, confidence intervals written out as numbers, a
paragraph explaining a three-way data split. That text is not load-bearing; it is
a visual that was never drawn, because drawing it would have meant "lab work."

## Decision

**Retire `/lab` as a section, and stop confining interactive work to it.**

1. **The lab is retired as the vehicle.** Front-end learning as a *goal*
   survives; the separate wing that has to be fed does not. Learning happens
   inside real work from here.
2. **The tier progression is dropped.** Tier 1–4 as a ladder to climb, and the
   Tier badges on lab pages, are retired with it. This reverses the "climb the
   tiers deliberately" approach and the 2026-07-04 "craft ONLY" sharpening.
   Both are superseded, not deleted — see *Alternatives Considered*.
3. **Interactive work lives wherever it argues best.** There is no surface where
   a visual is off-limits because it would be "too fancy for the showcase," and
   none where a project demo is barred for being a demo.
4. **Pages that earn their place move into the portfolio proper.**
   `lab/loop-replay.html` is the first and clearest case: it is evidence for the
   classifier's L3 claim and should sit where that claim is made.
5. **The uplift trims prose doing a visual's job — and nothing else.** Text that
   *is* the substance (ADR reasoning, negative results, what was measured and did
   not pay) is what makes these pages survive a skeptical read per
   [`ADR-002`](ADR-002-ai-use-posture.md)'s "artifacts, not vocabulary" standard.
   It is not trimmed for visual breathing room. **A prettier site that argues
   less well is a net loss.**

Named candidates for visual treatment, as scope for the migration that follows:

| Currently | Wants to be |
|---|---|
| The autonomy-ladder four-row table | A state diagram — the rungs are a progression, drawn as a list |
| Scaled-eval accuracy + Wilson CIs in prose | A plot; the whole point of a CI is that it is a *width* |
| The A/B/C split explained in a paragraph | One diagram; it is three boxes and two arrows |

## Downstream surfaces

Nothing below is changed by this record — this ADR is the contract the migration
follows, per `system/SYS-009`.

- **`lab/loop-replay.html`** — the page that forced this decision. Moves into the
  portfolio proper; drops its Tier 3 badge and lab framing. Its decision blocks
  and "How this reads a run log" section are portfolio-voice writing and survive
  the move intact.
- **`lab/index.html`, `lab/gallery.html`, `lab/scroll-storytelling.html`** — the
  remaining lab pages. Their disposition (fold in, keep at a stable URL, or
  retire) is migration scope, not settled here.
- **`index.html`** — the `doors` nav (line ~85) and the footer nav (line ~321)
  both link `lab/index.html`; the About section (line ~304) links
  `lab/gallery.html` for photos. All three need a decision at migration time.
- **`projects/defense-news-classifier.html`, `projects/the-system.html`** — both
  deep-link into `lab/loop-replay.html` as evidence. These links must not break;
  they are the reason the page is being promoted.
- **`README.md`, `ROADMAP.md`, `learning/README.md`,
  `learning/05-scroll-driven-storytelling.md`** — describe the lab and/or the
  tier progression as live structure.
- **`404.html`** — links the lab.
- **`decisions/ADR-002`** — references the lab; check the reference still reads
  true after migration.
- **`CLAUDE.md`** — carries no lab or tier rule today, so nothing to amend there.
  The mobile QA gate ([`ADR-001`](ADR-001-mobile-qa-gate.md)) applies to every
  page the migration touches, and any promoted page must pass it at 320–430px.
- **Not governed here:** `classifier/ADR-006` and its living spec own the
  autonomy ladder itself. This record moves where the *evidence* is displayed; it
  makes no claim about the ladder's rungs or their state.

## Consequences

- **The site loses its designated place to be scrappy.** The lab existed so
  experiments had somewhere to fail publicly without denting the showcase. That
  pressure valve is gone: from here, anything shipped is on a page that sells.
  Accepted, because in practice the valve stopped being used.
- **The Tier 1→3 progression, which was itself a story, ends.** "Watch someone
  with no front-end background climb from CSS to data-driven SVG" was a real
  narrative, and loop-replay was its capstone. Pulling it leaves the lab topping
  out at a photo gallery, which is why the lab is retired rather than left
  standing with its best page removed.
- **Front-end learning loses its explicit container and must be defended
  elsewhere,** or it quietly stops. This is the honest risk of the decision:
  "learning happens inside real work" is exactly what someone says right before
  it stops happening. The mitigation is that the work itself now demands visual
  technique, rather than routing it to a sandbox.
- **The migration is a link-integrity problem before it is a design problem.**
  Two project pages cite the lab as evidence, and `sanlee.me` is linked publicly
  (LinkedIn, Instagram). Moved pages need their inbound links updated in the same
  change, and the QA gate's internal-link check is the backstop.
- **Trimming has a stated floor, and it is enforceable by reading.** "Prose doing
  a visual's job" is a narrower target than "too much text." If a proposed trim
  removes reasoning, a negative result, or a measured caveat, it is out of scope
  by this record regardless of how much cleaner the page gets.
- **Decision and execution are deliberately split.** This ADR was written before
  the migration precisely because the 2026-07-04 sharpening it reverses was made
  the other way around — as a rule, then applied — and the reversal deserves a
  reviewable record rather than a diff.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| Keep the lab; promote only `loop-replay.html` out of it | Fixes the immediate misfiling but leaves the tier story ending on a photo gallery, and leaves the rule that caused the misfiling ("craft ONLY, no project demos") in force to misfile the next one |
| Keep the lab and relax the craft-only rule | Preserves the section that is not being fed. The capacity problem is the primary driver; a rule change does not create time |
| Leave `loop-replay.html` where it is and link harder from the project pages | Already the status quo, and it is what exposed the problem: both project pages cite it, and the reader still lands on a page framed as a rough-edged experiment |
| Embed the viewer inline in `projects/defense-news-classifier.html` | Strongest narrative — claim then immediate evidence — but the page's decision blocks and run-log walkthrough are good standalone writing that would have to be cut to embed cleanly. Left open as a migration-time choice rather than foreclosed here |
| Delete the lab pages outright | Loses real work with no benefit. Retirement is about the *section* and its framing, not the artifacts |
| Do the migration now and record the decision after | Rejected on the same grounds as `ADR-003`'s history: a decision that lives only in a diff is not reviewable as a decision. This one reverses two written rules, so it needed the record first |
| Trim prose generally to make room for visuals | Rejected explicitly in Decision 5. The dense reasoning is the credibility; a site that reads faster and argues worse is the wrong trade for a portfolio whose pitch is measured honesty |

## Migration record

Executed 2026-07-23. Everything above is the decision as written on 2026-07-19 and is
left unedited; this section records the calls that section deliberately left open.

**1. `loop-replay.html` was promoted standalone, not embedded.** It moves to
`projects/loop-replay.html` (with `loop-replay.js` and `data/` alongside it), keeping
its decision blocks and "How this reads a run log" section intact. The inline-embed
alternative was left open in *Alternatives Considered* and is now closed: embedding
would have cost that standalone writing, which is the thing worth keeping. It is
reached from the two project pages that cite it, not from the top-level nav — the
evidence sits where the claim is made rather than competing with the projects.

**2. The two remaining lab pages keep their URLs; the section does not.**
`lab/gallery.html` and `lab/scroll-storytelling.html` stay where they are — both are
indexed and publicly linked, and GitHub Pages has no redirect mechanism, so moving
them would break live URLs to no benefit. What goes is the framing: `lab/index.html`
is deleted, the Tier badges and "Back to the lab" links are gone, and the Lab door is
removed from the homepage nav, the footer, and `404.html`. The gallery keeps its
inbound link from About (reworded "the lab" → "the gallery"); the storytelling demo is
now reached from the learning log. This is the "retirement is about the *section* and
its framing, not the artifacts" line applied literally.

**3. The learning log moved to `colophon.html`.** It lived on `lab/index.html`, which
is deleted. The colophon already owns the how-this-was-built story, so the seven
lesson links land where a reader already goes, and the section states plainly that
the lab is retired and why. `learning/README.md` drops the tier ladder and the Tier
column per Decision 2, keeping a short note that records the retirement rather than
silently erasing it.

**4. `sitemap.xml` was missing from *Downstream surfaces*.** It listed all three lab
URLs. Corrected during the migration (dropped `lab/index.html`, added
`projects/loop-replay.html`), and noted here because the omission is the exact failure
mode `system/SYS-009` exists to catch — the checklist was the contract, and it had a
hole. Also swept, beyond the original list: `decisions/README.md` (carried a
"migration has not been carried out" note) and the header comment in
`loop-replay.js`. `decisions/ADR-002` was checked and needed no change; its apparent
"lab" hits were the word *label*.

**Not done in the structural migration:** the visual-treatment candidates in the
Decision section were left untouched by it — that pass moved pages and fixed links,
and every candidate is a design change to a project page.

**Candidate 1 landed 2026-07-23.** The autonomy-ladder four-row table on
`projects/defense-news-classifier.html` is now a vertical spine, built on the same
CSS construction as the colophon's `.timeline` rather than a new SVG vocabulary.
Vertical is the composition, not a mobile concession: a ladder is climbed, and the
table rendered four levels as equal peers side by side. Two things the table
structurally could not draw are now visible — L2's climbed-then-retired arc (a
struck spine marker plus a "then retired" chip) and L4's backward critic edge (a
small inline SVG of triage → classify → critic with the return edge drawn). L3's
half-ness is literal: a half-filled marker and two sub-rung entries, one checked.
State is encoded three ways — marker shape, marker fill, and chip text — so no
reading depends on color alone.

Decision 5's floor held and cost something: a `.rung-note` restating L2's measured
numbers was written and then cut, because those numbers already appear twice on the
page ("The grounding that did not pay", and the paragraph below the ladder). The
visual carries the shape; the prose keeps the reasoning. Nothing the table said was
lost — every level still carries gains, who-drives, and state.

**Candidate 3 landed 2026-07-24.** The three-sentence description of the A/B/C
split on `projects/loop-replay.html` is now a small inline SVG. The composition
turns on one asymmetry: all three sets are scored every iteration, but only A's
arrow comes back. A feeds the prompt rewrite and is re-scored; B stops the run; C
is reported only. **The absence of a return edge on B and C is the argument** —
that separation is the overfitting guard, and prose made the reader assemble it.

The set boxes borrow `--series-a/b/c` from the score chart further down the same
page, so the reader learns the colour code here and carries it into the chart.
That is why the CSS is page-scoped rather than in `assets/style.css`: the
variables it depends on are page-scoped, and the coupling is deliberate.

Scope discipline, applied twice:

- **Only the topology prose was replaced.** The lead's closing sentence — "that
  separation is the whole point… so the gap between improved on A and improved on
  C is something you can see" — is the argument, not a description, and stays
  verbatim per Decision 5. The three sentences the diagram replaced were pure
  topology.
- **The sizes and sources were left out.** `classifier/docs/specs/prompt-optimization-loop.md`
  §5.2 gives ~210/~90/n≈54 and names the source files, and it was tempting to put
  them in the diagram. The page never stated them. Adding them would have been the
  same defect as Candidate 1's cut `.rung-note`, in the opposite direction —
  inflating a visual with detail its prose never carried.

One correctness fix rode along: the old lead said the loop "never reads set C
until the run is over." Per §5.2, C is *scored* every iteration; it is the **agent**
that never sees it, and C is never used for any decision. The new caption says
that precisely.

**Accepted overlap:** the chart legend below still names each set's role in one
clause, because it is load-bearing for reading the chart's three lines. The map
shows the feedback topology, which the legend cannot. Judged complementary rather
than duplicated — but named here so the next reader knows it was weighed.

**Still open:** the Wilson-CI plot.
