# ADR-008: A breakout grid — two deliberate edges, not one honest column

**Status:** Accepted 2026-07-27. Implemented in the same PR as this record, because
the thing it overturns is a comment in `public/assets/style.css` and leaving the
two out of sync for even one merge would put a rule and its reversal on the site
simultaneously.
**Date:** 2026-07-27
**Deciders:** San Lee

---

## Context

`public/assets/style.css` has carried a block comment titled *"One content
column"* since the 2026-07-26 design pass. It is a real decision, argued
carefully, and it is the thing this record overturns. Its case, fairly stated:

1. An earlier attempt capped prose at a ~70-character measure and left tables and
   diagrams at the container width. That produced **two right edges 86px apart**.
2. Measuring then found the homepage had grown **six distinct right edges** at a
   1920px viewport (1053 / 1091 / 1099 / 1264 / 1376 / 1400), three of which
   predated that change.
3. *"A ragged stack of near-miss edges reads as sloppiness long before anyone
   notices the line length is comfortable."*
4. This site's content is prose **interleaved** with six-column metrics tables and
   diagrams. The tables are the argument, not decoration. Squeezing them into a
   509px prose measure wrapped every header onto three lines.
5. Therefore: one column at 720px, prose runs long, and *"the way to buy the
   measure back is to make the tables narrower (shorter column headers), not to
   re-introduce a second edge."*

Every one of those observations is correct. The conclusion does not follow, and
the escape hatch in (5) is worse than the problem it avoids.

### What the column actually costs, measured

The comment states prose runs *"~91 characters"* and calls that a deliberate
trade. Measured on the built site at a 1920px viewport — line-box width divided
by the mean character advance of each paragraph's own text at its own font, over
every paragraph in `<main>` long enough to wrap three times:

| Page | n | median chars/line | max |
|---|---|---|---|
| `projects/netops-lab.html` | 24 | **96.4** | 102.7 |
| `projects/defense-news-classifier.html` | 30 | **96.1** | 101.1 |
| `index.html` | 10 | **94.3** | 100.5 |
| `projects/the-system.html` | 15 | **93.9** | 99.8 |

So the site is running 94–96 characters, not 91, and the worst paragraphs cross
100. The comfortable band is 65–75. This is not a near miss; it is roughly
**forty percent over**, on every paragraph of a site whose entire pitch is that
someone will read the reasoning.

### Why the escape hatch is the wrong direction

Point (5) says: shorten the table column headers. The current headers are `v1
synthetic`, `v2 real (Sonnet 4.6)`, `v2 + Sonnet 5`, `v2 + prompt fix`,
`v3 three-axis (current)`. Those names are the argument — they say *which
eval, on what data, against which model*, and the whole point of the table is
that the reader can see which change moved which number. Abbreviating them to fit
a prose measure would degrade the evidence to protect a layout rule. **When the
layout rule and the evidence disagree, the rule loses.**

Measured, the metrics table's `max-content` width is **877px**. At 720px it is
already being compressed; at a real 65–75 character prose measure (~544px) it
would be crushed. The table does not want the prose column. It never did.

### The premise that was never separated

The old comment treats *"one column"* and *"no ragged edges"* as the same claim.
They are not. The six near-miss edges it measured were **accidents** — a section
sub at container width next to a `.measure` at 720 next to a diagram at something
else. Nobody designed 1053 and 1091 to be 38px apart; they fell out of components
sized independently.

Two edges that are *designed*, used consistently on every page, and separated far
enough that the relationship reads as intentional are not the same object as six
accidental ones. A printed report has a text measure and a plate width, and nobody
reads that as sloppiness. The failure mode was **unmanaged** edges, and the fix
that was reached for — collapse to one — also happens to be the fix that costs the
most, because it is the only one that cannot serve both objects.

## Decision

**Replace the single content column with a named-line breakout grid.** `<main>`
(and `.article-body`, and the homepage's `.measure` sections) become CSS grids
whose columns are named `full`, `wide` and `content`. Children default to
`content`. A small, enumerated set of wide artifacts is promoted to `wide`.

### 1. Two tracks, concentric, and both of them designed

```
--content: 34rem;   /* 544px — measured at ~71 characters in Geist */
--wide:    57rem;   /* 912px — the metrics table's 877px max-content, plus air */
```

`content` is centered inside `wide`, so the breakout is **symmetric**: a wide
artifact extends the same 184px past the prose on both sides. The page therefore
has exactly two left edges and two right edges, they are the same two on every
page, and they are 184px apart — far enough that no reader mistakes it for a
misalignment. That is the direct answer to the old comment's objection: it was
right that near-miss edges read as sloppiness, and the answer to a near miss is a
clear miss, not one edge.

**`34rem`, not `65ch`.** The obvious way to write "65 characters" in CSS is
`65ch`, and it is wrong here. The `ch` unit is the advance of the digit `0`, and
Geist's `0` is much wider than its mean lowercase glyph — a `65ch` track measures
**~94 real characters** in this typeface, which is exactly the width being fixed.
The token is set in `rem` and the character count is verified by measurement, not
by unit arithmetic. Written down because the `65ch` version looks more correct and
would have changed nothing.

### 2. What gets promoted, and the rule for deciding

Promoted to `wide`, as direct children of a grid container:

| Artifact | Why |
|---|---|
| `table` | The metrics tables. 877px `max-content`; the reason this record exists |
| `figure.diagram-wrap`, `.diagram` | The interactive system diagram (800-unit viewBox) and the replay page's score chart (640) |
| `.stat-strip` | Three figures read as a ruled row across the page, not stacked |
| `.repo-grid` | An `auto-fit` grid with a 210px minimum track — three columns, not two |
| `.roadmap` | Same: Now / Next / Later is three columns or it is not a roadmap |
| `.notes-list` | Same, twelve short titles on a 210px track |
| `.toc` | `columns: 300px`. At the content measure it collapses to one column and the nine-item map becomes a nine-row list |
| `.wide` | Escape hatch for page-local artifacts (the gallery's masonry columns) |

**The rule:** an object is `wide` if its *content* has an intrinsic width — a
table with columns, a diagram with a viewBox, a grid with a minimum track. Prose
never is; prose is only ever as wide as you let it be, which is why it is the
thing that should be constrained.

### 3. Three artifacts the obvious reading would promote, and does not

- **The autonomy ladder** (`.ladder`) stays at content width. It was on the
  promote list until it was rendered: a ladder is *tall*, not wide, and its
  content is short prose next to a rail. Breaking it out put the rail 184px left
  of every paragraph around it, and because the rung text is set at the same size
  as body copy the result read as a slipped block rather than a plated one. §2's
  rule agrees and was the tiebreaker — a vertical list has no intrinsic width. The
  chips it carries already wrap onto their own line by design, so the content
  measure costs it nothing.

- **The confidence-interval plot** (`.ci-plot`) stays at content width, inside its
  decision card. Its own CSS comment records why it is capped at 232px: that is
  the card's inner width at a 320px viewport, and rendering it 1:1 there is what
  keeps its 12px tick labels at 12px instead of scaling to ~10. Widening it would
  reverse a decision made for a measured reason, on a phone, to gain nothing on a
  desktop. **It also cannot be promoted** — it is nested inside a `.decision`,
  which is not a grid container.
- **`<pre>` blocks inside `.example-run`** stay at content width. Every `pre` on
  this site is a step in a numbered trace, not a standalone artifact: step 2's
  prose introduces step 2's JSON. Pulling the JSON 184px wider than the sentence
  that introduces it breaks the step apart to serve a rule about code blocks. A
  top-level `pre` would be promoted; there aren't any.

### 4. Chrome aligns on `wide`; the hero aligns on `content`

The hero's inner `.wrap` is the `content` width, so the hero copy starts on the
same vertical line as every paragraph below it. The **doors nav and the footer**
sit on the `wide` width instead. The reason is measured rather than aesthetic: the
nav is seven links totalling ~664px of set text, so a 544px container wraps it to
two centered lines at every desktop size. It is chrome, not prose — it has no
measure to protect — and putting it on `wide` keeps it sharing an edge with the
tables and the diagram rather than inventing a third one.

### 5. The mobile contract is unchanged

Below roughly 960px the two breakout tracks shrink toward zero and everything
collapses into one padded column with the same 24px gutters as before.
[`ADR-001`](ADR-001-mobile-qa-gate.md) is untouched and its gate is the acceptance
bar: no horizontal overflow at 320 / 360 / 390 / 430px. Nothing here introduces a
minimum width — the `content` track is `min(100% - 2 * gutter, 34rem)`, so it
tracks the viewport when the viewport is the smaller of the two.

## Downstream surfaces

- **`public/assets/style.css`** — the *"One content column"* comment block is
  **rewritten, not deleted**. It describes the new system and points here. Deleting
  it would erase the record of a decision that was made for good reasons and
  reversed for better ones, which is precisely the thing this repo claims not to
  do. `--col` / `--maxw` are replaced by `--content` / `--wide` / `--gutter`.
- **`.measure`** (homepage only, four sections) — stops being a width and becomes
  a nested grid re-establishing the same track list, so that the stat strip inside
  it can reach `wide`. Its comment already noted it had become "a semantic
  grouping rather than a width"; that is now literally true.
- **`.article-body`** — loses its horizontal padding to the grid's gutter tracks.
  Vertical padding is unchanged.
- **Page markup** — three `class="wide"` additions, all to page-local artifacts
  the shared stylesheet has no business naming: the gallery's masonry container,
  and the replay page's stat grid and chart legend. No copy changes anywhere.
  Everything else is promoted by element-level rules, so artifacts do not have to
  be tagged one by one and a new table on a new page is wide automatically.
- **`scripts/mobile-qa.cjs`** — no change. It is the acceptance bar for §5, not a
  thing this record modifies.
- **`scripts/check-published-metrics.cjs`** — no change and no risk: this record
  touches no `data-metric` span. The three on the homepage sit inside `.stat-strip`
  and move as a unit with it.
- **`CLAUDE.md`** — no operative rule changes. The mobile contract still governs.
- **[`ADR-007`](ADR-007-split-dont-trim.md)** — not amended, and worth naming: it
  fixed the *length* of the default path and explicitly said the next lever, if
  the density complaint survived, was editorial rather than structural. This is
  neither; it is the *legibility* of what is already there. A 96-character line
  makes 900 words feel like 1,400.
- **[`ADR-004`](ADR-004-retire-the-lab-as-the-vehicle.md)** — its content floor is
  untouched. Not one word is removed by this record.

## Consequences

- **The site now has two left edges, forever.** Every future component has to be
  ruled on: content or wide. That is a standing cost, and it is the honest price of
  serving prose and tables from the same page. The rule in §2 is the answer, and it
  is checkable by reading — does the thing have an intrinsic width?
- **Prose gets noticeably narrower**, from 720px to 544px. Pages get taller as a
  result. That is a real trade against `ADR-007`'s whole project, and it is made
  knowingly: a taller page of readable lines beats a shorter page nobody finishes.
  If the height turns out to matter more than the measure, the lever is `--content`,
  one token, and this paragraph is the reason to think twice first.
- **The old comment's warning is now load-bearing.** Six accidental edges really
  did read as sloppiness, and the only thing standing between this design and that
  one is discipline about §2. If components start landing on their own widths
  again, this record failed and the single column was the safer engineering call.
- **Nothing is verified about "readability" except line length.** 71 characters is
  a typographic convention with reasonable evidence behind it, not something
  measured on this site with real readers. It is a better-supported default than
  96, and that is the whole claim.
- **The metrics table now renders at its `max-content` width** with every header on
  one line for the first time. The escape hatch in the old comment — shorten the
  headers — is not merely avoided; the outcome it was proposed to achieve is
  delivered without touching the evidence.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| **Keep the single 720px column** | The status quo, and it is a coherent position — one edge, no discipline required, nothing can drift. It is rejected on the measurement: 94–96 characters is not a near miss, and the site's only asset is that someone reads it |
| **Shorten the table headers to fit a prose measure** | The old comment's own prescribed fix. Rejected: those headers name which eval, which data, which model — they are the argument. Degrading evidence to satisfy a layout rule inverts what this site is for |
| **Cap prose only, leave wide things at container width (the pre-2026-07-26 state)** | This is what produced the ragged edges the old comment measured. The difference here is that `wide` is a *defined track* every wide object lands on, not "whatever that component happens to be" |
| **Asymmetric breakout — prose and artifacts share a left edge, artifacts extend right** | Only one left edge, which is tempting. Rejected: it makes every wide artifact look accidentally overhanging rather than deliberately plated, and it puts the page's optical centre in a different place for prose than for tables |
| **`65ch` for the content track** | The literal reading of "65 characters", and wrong in this typeface — `ch` is the width of `0`, and Geist's `0` is wide, so `65ch` measures ~94 real characters. Recorded in §1 rather than silently corrected, because it is the version that looks right |
| **Scroll the tables horizontally at desktop instead of widening the page** | Already what happens below 560px, and correct there. At 1920px it hides evidence behind a gesture on a viewport with 1,000px to spare |
| **Subgrid for `.measure` and `.example-run`** | Would let nested artifacts reach `wide` without re-declaring the track list. Not chosen for `.measure` because a token holding the track list is one line and readable by anyone; not chosen for `.example-run` because §3 decided its `pre` blocks *should* stay with their steps |
| **A per-page layout, tuned to each page's widest object** | Maximal fit, and it re-creates the exact defect the old comment measured. Two tracks for the whole site, or none |
