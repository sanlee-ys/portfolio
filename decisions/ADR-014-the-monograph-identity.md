# ADR-014: The MONOGRAPH identity

**Status:** Accepted
**Date:** 2026-08-31
**Deciders:** San Lee

---

## Context

The July identity pass drew this site as a published lab journal. That pass was
cut for a prose-first site: prose in one measure, metadata in the margin, and
figures as occasional guests on a wide track. The site changed underneath it.
[`ADR-013`](ADR-013-diagram-led-narrative.md) made the record diagram-led:
figures with two-slot captions, verdict strips, generated plots, a stepped
frame reader, and plates on every page. The identity had to catch up or the
figures would stay tenants in a layout built for paragraphs.

Five prototype directions were built on `explore/*` branches, each as an
override stylesheet over two pages, under twelve program laws (PL-1 to PL-12).
Three judges scored the field. The owner picked one.

**The ruling, verbatim: "MONOGRAPH, run it."**

The reference implementation is the worktree `sep-monograph`, branch
`explore/september-monograph` at `e101d07`, file
`public/assets/september-monograph.css`. That override sheet never ships. This
record covers its integration into `public/assets/style.css`, plus four grafts
the landing program ordered from the other prototype worktrees.

**The sequencing law this program ran under, verbatim from the integrated
plan:** "Editorial lands first at the contract level; identity and edited pages
can then ship together. Lock hierarchy, page destinations, copy lengths, and
component roles before reskinning." Every Phase 1 editorial PR merged before
this identity PR opened (#264 to #269). The reason is mechanical: a reskin of
copy that still moves produces two unstable layers at once, and neither can be
verified against the other.

## Decision

**The site reprints as a monograph: the same record, with gallery space for
its figures, larger display moments, and fewer, stronger rules.** The deliberate
sacrifice: full-width strong rules become rare and page-level, cells take 2rem
ticks, and whitespace does the separation.

### 1. The choice, and its reasons

MONOGRAPH won on DNA continuity. It keeps the oxide doubled-rule reversal
family, the cool-paper palette family, and the two Geist faces, and it grows
the identity where the ruling demanded growth: at display level and in the
figure layer, at every viewport. The judges scored EVIDENCE ATLAS higher on
figure identity, and the owner declined its frame chrome on taste. Judge B
recorded the fallback for exactly that case: MONOGRAPH with the strongest
figure ideas grafted in. That is what this record lands.

### 2. The July reasons this supersedes, rewritten

The July reasons are not erased. Each one is restated here with what replaced
it, so the record shows a decision and not an accident.

- **"Prose-first: figures are guests on the wide track."** True in July.
  ADR-013 made the figures carry the argument, so the figure layer is now a
  first-class identity concern: a gallery ladder (`--fig-plate`,
  `--fig-plate-compact`, `--fig-plot`), in-flow labels, one caption grammar,
  and a lifted dark figure ground.
- **"Hierarchy lives in full-width rules."** The July de-boxing moved
  hierarchy from cards into rules, and every cell list then took a full-width
  rule. The rule law replaces it: **a cell takes a tick, a section takes a
  rule.** Full-width 2px rules survive on flow architecture only.
- **"Rhythm is per-block margins."** The article grids add margins and never
  collapse them (PL-2), so per-block margins produced sums nobody stated. The
  spacing ladder (`--space-section/figure/block/tight`) now owns every gap
  inside the grids: one owned top margin per block, no bottom margins, no late
  override, no `!important`.
- **"The display scale stops at 4rem."** The masthead, the section titles, and
  the article h1 step up; h2 down is near-unchanged. The phone masthead steps
  from 2.06rem to 2.25rem, and the phone budget was re-measured in the landing
  PR.
- **"Metrics are mono at every size."** The display-metric threshold is native
  law: a metric at 1.5rem or larger renders in Geist 500 with tabular figures;
  below that it stays in the mono data voice. The `.stat-value` exception
  class dissolves into the law, and the proof band becomes the homepage's
  first display moment.
- **"The h2 folio is a margin tenant at desktop."** The section head is now
  one folio-plus-title construction at every width, with the folio at 1.25rem
  in flow. The kickers, tags, and ledger numerals keep their marginalia. A
  label off a wide figure's edge lands in the outer gutter, so figure labels
  are in-flow at all widths too (amendment A1).
- **"`--accent-quiet` names the quiet blue."** The token had one consumer
  left. It is retired: the consumers read `--muted`, and the token is deleted.
- **"`--border` is a solid hex per theme."** The hairline is alpha ink now
  (light `rgba(30,28,27,0.14)`, dark `rgba(236,228,213,0.17)`, a designed
  asymmetry), so it keeps one temperature on every ground it crosses,
  including the lifted dark figure ground.

### 3. The four grafts, and their sources

Each graft adapts exact CSS from a prototype worktree. The source branches are
deleted after lane INT, so the source is named here.

| Graft | Source | What landed |
|---|---|---|
| Folio-plus-title section heads; the five-kind tag vocabulary (Plate, Strip, Plot, Map, Frame); named widths via `data-place="spine\|sheet"` | `explore/september-title-block`, `public/assets/september-titleblock.css` | One section-head construction at all widths; kind tags as real spans (PL-3); width policy by attribute, with per-kind defaults |
| Display typography on the homepage proof band | `explore/september-sharpen`, `public/assets/september-sharpen.css` | `.proof a strong` crosses the display-metric threshold: Geist 500 tabular at 1.5rem |
| Plate numbering and caption grammar; the Contents device inline at section boundaries | `explore/september-evidence-atlas`, `public/assets/september-atlas.css` | `.tt-rail-no` folio spans beside the reader labels; `.toc-figs` comma-run figure entries in the Contents; no fixed or floating index key |
| The lifted dark figure ground and the dark rule ranks | `explore/september-readout`, `public/assets/september-readout.css` | `--fig-ground` dark `#322a1e` (~1.3:1 over `--bg`); `--bg` scoped inside dark figures so knockout rects track the lifted ground; `--muted` stepped up inside dark figures; no mono chrome register, no rails |

### 4. The figure-layer dark ranks (PL-10)

`--stroke-figure` carries every strong plate stroke inside the figure layer:
light `#423f3c` (byte-equal to `--rule-strong`), dark `#b0a591`. The rank
ink > strong > quiet holds inside a plate in both themes, and the July dark
`--rule-strong` is untouched outside the figure layer. The reversal wash
`--accent-warm-soft` steps up to 0.16 light and 0.22 dark so a washed cell
reads at gallery scale; the PL-11 sweep checks every SVG fill site in both
themes, and no text sits on the raised fill.

### 5. The 9px microtext floor (from PR #265)

`CLAUDE.md` carries the rule: **no SVG text may render under 9px at a 320px
viewport.** This record is the ADR line the rule points at. The floor exists
because no gate can hold it: `contrast-check.cjs` exempts SVG text, so plate
text has the writer as its only control. The remedy is a unit step-up at 1:1
scale, or a geometry change where the plate's scale is the cause. The floor
binds new and edited plates now; 93 nodes across the remaining pages sit under
it, and each per-page identity lane brings its page to the floor in that
page's PR.

**Amended 2026-09-01. Two claims above are now closed, and one was wrong.**

- **The debt is paid.** The 93 nodes are gone. Each page lane cleared its own
  page, and the sweep closed on 2026-08-31. The floor binds every plate on the
  site, and no lane grandfathers one.
- **"No gate can hold it" was wrong.** The premise is a fact about
  `contrast-check.cjs`, which exempts SVG text. It is not a fact about gates. A
  rendered font size is laid-out geometry, and `hit-target.cjs` and
  `contrast-check.cjs` already measure laid-out geometry.
  `scripts/microtext-floor.cjs` holds the floor from 2026-09-01, and the QA
  check count moved from 20 to 22 with it and its adversarial suite.
- **The floor stays a rule as well.** A gate reports on what a writer already
  wrote. The rule is what the writer follows first, and the two repair shapes
  above are still the remedy.

The gate reads the plate's scale from `getScreenCTM()` rather than from a
viewBox ratio. A ratio invites a source read, and `diagram.js` rewrites the
system map's viewBox at phone widths. A source read of that plate on
2026-09-01 reported 4.08px where the reader gets 12.98px, and it proposed
repairs to a correct figure.

### 6. Integration calls this record makes

- **The caption grammar has one home in `style.css`** (OC-F closed). Thirteen
  page islands carry copies with origin comments; each page lane deletes its
  copy in its own PR. Until then the island copy wins ties by source order,
  and the rendered result is the same.
- **The tick extends to `.repo-grid li` and `.roadmap > div`.** The work order
  names three cell lists (`.proof li`, `.doors-index li`, `.stat-strip li`).
  The other two are the same auto-fit cell shape, and the rule law does not
  admit a fourth state for them.
- **The `data-place` opt-out is structural, not a specificity race.** The wide
  promotion list carries `:not([data-place="spine"])`, so a spine pin wins by
  construction. The `sheet` rule only has to beat the content default.
- **One line in `src/pages/projects/telltale.astro` changed with this record:**
  the last `--accent-quiet` consumer repointed to `--muted`. The token duty
  orders the repoint, and no other lane was open on the file.

## Downstream surfaces

- `public/assets/style.css`: the whole integration. One integrator, lane I0;
  no other lane edits the file.
- `decisions/ADR-014-the-monograph-identity.md`: this record. It rides the
  owner-sign-off PR, and the owner approves it before it merges.
- `CLAUDE.md`: the microtext-floor section points here; the two tap-target
  width claims corrected to 320/360/390/430px (routed from PR #266).
- `scripts/gates.cjs`: one comment corrected to the five hit-target widths
  (routed from PR #266). No step changed, so `qa.yml` needs no change and the
  check count stays 20.
- `src/pages/projects/telltale.astro`: the one-line `--accent-quiet` repoint.
- `src/pages/index.astro` and every page under `src/pages/projects/`: lanes
  I1 to I15 apply the system per page against this record. Their local figure
  and caption CSS copies retire page by page.
- The five `explore/september-*` branches and worktrees: deleted by lane INT
  after the last page lands.
- `scripts/figure-contract-baseline.json`: untouched. No listed figure's
  rendered values change in this integration.

## Consequences

- **Every page shifts visually, and that is the point.** The rhythm, the
  display scale, the ticks, and the dark figure ground land site-wide from one
  file. The per-page lanes then apply labels, width attributes, and stroke
  moves that CSS alone cannot.
- **The interim state is two-toned by design.** Until a page's lane deletes
  its island copies, that page renders its July figure chrome over the new
  ground. The sequencing law accepts this: the shared system lands once, in
  one hand, and the pages follow.
- **The phone pays for the display jump in height.** The masthead, the section
  titles, and the seams all grow. The landing PR states the measured deltas as
  facts; no PR claims the site got shorter.
- **The tick trades a visible rule for whitespace.** The owner liked the ruled
  look; the ruling accepts fewer, stronger rules as the cost of the monograph
  cut. The doubled reversal tick keeps the reversal family legible at cell
  scale, and the full-width doubled mark survives on full-rule hosts.

## Alternatives considered

| Option | Why not |
|---|---|
| **Ship the override sheet as-is, linked after `style.css`** | An override wins by load order, so every future rule fights a second stylesheet. The overrides also depend on island copies for half their geometry. Integration is the only end state that has one owner. |
| **EVIDENCE ATLAS (two of three judge votes)** | The owner declined the atlas frame on taste. Judge B's recorded fallback is exactly this landing: MONOGRAPH plus the atlas's figure ideas as grafts. |
| **Keep `--accent-quiet` as an alias of `--muted`** | An alias token invites new consumers, and the drift the retirement exists to stop returns. The work order says retired for real. |
| **Margin tenancy for figure labels at desktop** | Amendment A1: a label off a wide figure's edge lands in the outer gutter, on its own vertical line, and it does not fit below ~1240px. In-flow labels at all widths. |
| **A sticky section rail for long pages** | The monograph's nav is typographic and zero-JS: numbered figures, display folios, and Contents returns. A sticky rail is a viewport tax, and the July motion cut already argued against scroll chrome. |
| **A late-override rhythm block at the file's foot** | It would work by source order and lie by structure: two owners for one gap. The ladder owns the grid rhythm and the superseded per-block margins are deleted at their sites. |
