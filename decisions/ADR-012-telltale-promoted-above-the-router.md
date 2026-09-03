# ADR-012: Promote the instrument above the router, and gate its figures

**Status:** Accepted
**Date:** 2026-08-29
**Deciders:** San Lee

---

## Context

`telltale` is a terminal instrument for five coding-agent CLIs. It reads what
each CLI leaves on disk and draws one row per seat. Its one rule is that a
gauge may state a number, or it may state nothing, but it may not state a
number nobody measured.

The site had to give that project a home. Three constraints made the obvious
placements wrong.

1. The homepage router holds four doors, and
   [`ADR-007`](ADR-007-split-dont-trim.md) fixes what that router is: four
   views of one system. `telltale` is not a fifth view of that system. It is
   the instrument that measures the build capacity which produced the other
   four. A fifth door would also rewrite two count strings and an
   `aria-label` that the owner ruled on.
2. The proof band cannot take a fourth normal cell. `public/assets/style.css`
   records why: the band was built for three, and a fourth cell orphans itself
   under column one at any width that fits three.
3. Most readers arrive on a phone. A new page reachable only from `work.html`
   is two taps and one scroll away from the first screen.

A fourth constraint came from the project itself. `telltale` had already
learned that a picture a human maintains is a claim with no gate on it: its
README frames were drawn by hand, they drifted several ways at once, and they
are now emitted by its test suite. A page that argues that lesson and then
carries hand-typed counts refutes itself.

## Decision

**Three decisions, taken together.**

**1. A flagship block is promoted above a router that stays at four doors.**
`telltale` enters as a `<section class="flagship">` between the hero band and
the `.orientation` router, inside `<main id="work">`. No door is added. The
proof band, the three decision cards, the tagline, the site title, and both
router count strings do not change. `work.html` carries `telltale` as a fifth
entry in its flagship list, because that page is the complete index by its own
subtitle. The asymmetry between four doors on the homepage and five entries on
`work.html` is deliberate and is recorded here.

**2. A figure on a page may be marked `data-tt` and gated against a generated
record, and the page states which of its numbers were counted and which are
cited.** `scripts/pull-telltale-evidence.cjs` re-reads the counts from the
`telltale` repository at a pinned commit and writes
`src/data/telltale-evidence.json`.
`scripts/check-telltale-evidence.cjs` then compares the rendered page to that
record. The comparison is attribute-anchored equality, never a substring
search: a wrong number typed beside a correct one passes a page-wide search,
and this site has a page about checks that pass on work that never ran.

A figure has exactly two kinds, and the reader can tell them apart on sight. A
`counted` figure was recomputed by a command, which the record names. A `cited`
figure was measured once and recorded in the project's design document, which
the record names. There is no third kind. A figure whose source cannot be named
is dropped from the page rather than softened.

**3. Terminal evidence ships as pasted ASCII golden text, not as an image.**
Three reasons, in order. An `<img>` is invisible to the font-coverage gate and
to the contrast gate, so the newest artifact would sit behind blind gates. A
copied SVG stamped by the same generator that stamps its own provenance record
cannot detect its own drift, because both values go stale together. A
byte-for-byte golden file is stronger evidence than a picture of one, because a
reader can diff it.

Two rules follow from that choice. A pasted frame must be pure ASCII, and the
generator tests every line: an `-ascii` suffix upstream is not proof, and one
file that carries the suffix carries a non-ASCII character. A frame also needs
a page-scoped `white-space: pre` override, because the shared `.article-body
pre` rule sets `pre-wrap`, which destroys column alignment silently and worst
at 320px, and no gate fails on it.

## Downstream surfaces

- `src/pages/index.astro` — carries the flagship block above the router.
- `src/pages/work.astro` — carries the fifth flagship entry.
- `src/pages/projects/telltale.astro` — the project page.
- `src/pages/projects/product-and-program.astro` — the capacity-gate section.
- `src/data/telltale-evidence.json` — the generated record. Never hand-edit it.
- `scripts/pull-telltale-evidence.cjs` — the generator. Run by hand.
- `scripts/check-telltale-evidence.cjs` — the site gate.
- `scripts/check-telltale-evidence.test.cjs` — its adversarial suite.
- `scripts/gates.cjs` — runs both new checks.
- `.github/workflows/qa.yml` — the same two checks, in the same positions.
- `scripts/og-cover.cjs` — the `telltale` card entry.
- `CLAUDE.md` — the check counts, which this change moved from sixteen to
  eighteen.

## Consequences

- The homepage skip link lands on the flagship block rather than on the router.
  The target is still work content, so the link keeps its meaning. Amended
  2026-09-02: the skip link now lands on the proof band, above the flagship,
  so a keyboard or screen-reader user does not miss the band.
- The two halves ship as two changes. The page, the capacity-gate section, the
  generator, both checks and this record land first; the homepage block lands
  after, because it links to a page that must exist before the link gate runs.
  This record states the decision, not the state of `index.astro` on any given
  day.
- A figure and a frame are protected differently, and the difference is
  intentional. A figure is typed into the page by hand and the gate compares it
  to the record, so a mistyped count fails the build. A frame is interpolated
  from the record, so drift is impossible by construction rather than detected;
  that is the stronger guarantee for 120 columns of terminal output, where one
  retyped space is invisible to a reader and fatal to the alignment.
- The generator runs by hand and stays outside `npm run qa`, for the same
  reason `og-cover.cjs` does. It writes a source asset and it reads another
  repository, and a gate that reaches outside this repo reddens for reasons
  that have nothing to do with the site.
- A stale `pulledAt` prints a warning and never fails. A hard expiry reddens CI
  on a quiet month, and the page prints the date, so a stale figure is visible
  to the reader instead of fatal to the build.
- Two hand-drawn plates ship with no automated check, because
  `contrast-check.cjs` exempts SVG text. They are inspected by eye at 320px in
  both themes. That gap is real and is stated here rather than assumed away.
- Every `cited` figure depends on a document in another repository. If that
  document moves, the generator fails rather than writing a citation that no
  longer resolves.
- Amended 2026-09-03: the router now sits above the flagship block, on the
  owner's call after two external reviews found that the old order buried the
  proof for a 90-second reader. The flagship stays whole and stays on the
  homepage. Decision 1 above still holds: no door is added.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| A fifth router door | Rewrites the four-door ruling, two count strings, and an `aria-label`. `telltale` is also not a fifth view of the same system. |
| A fourth proof-band cell | The stylesheet records that a fourth cell orphans itself in the grid. The fix would need a shared-stylesheet change for one item. |
| A ninth homepage ledger line | Costs a copy edit on the highest-traffic page and types an ungated figure onto it. The flagship block already routes the reader. |
| `work.html` only, with no homepage change | Two taps and a scroll from the first screen a phone reader meets. |
| Figures typed by hand and proofread | The exact failure that put two-prompt-changes-stale numbers on this site and on the résumé in July 2026. A figure that is checked cannot quietly go stale. |
| A screenshot or a copied SVG of a terminal frame | Invisible to the font and contrast gates, and a generated SVG cannot detect its own drift. |
| A hard expiry on the evidence record | Reddens CI on a month when nothing changed. The warning plus a printed date puts the staleness in front of the reader instead. |
