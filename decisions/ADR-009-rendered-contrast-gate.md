# ADR-009: Contrast is checked on the rendered pixel, not the declared token

**Status:** Accepted
**Date:** 2026-07-28
**Deciders:** San Lee

---

## Context

During the redesign polish (PRs #166/#167) a provenance subline on the decision log — the
`EVAL · BM25`-style code-refs carrying the ADR and SYS numbers — was found rendering at
**3.80:1**, under the 4.5:1 WCAG AA floor for body text.

The colour token it used measures **5.81:1**. Both numbers were correct. `--muted` really is
5.81:1 on this ground, and the text really was failing, because a separate rule applied
`opacity: 0.8` on top of it and composited it to roughly `#827b6e`.

What makes this worth an ADR is not the bug, which is one line, but the class it belongs to:

- The **stylesheet says the right thing.** `:root` carries a comment block listing every
  token's measured contrast, and it is accurate.
- **Devtools says the right thing.** The colour picker reports the declared value's ratio.
- **Any linter that reads CSS says the right thing** — the declared colour passes.

Every tool that inspects *declared* colour agrees the text is compliant, and every one of
them is looking at the wrong number. The composite only exists on the painted page. That
makes it invisible to review as well: nobody reads a stylesheet by multiplying two rules
together, and on a warm-paper ground a 3.8:1 grey looks intentional rather than broken.

This site is public, is linked from a profile, and is read on phones in daylight. It also
argues, at length and on its own pages, that a green check is not evidence. A contrast bug
that survives because the checkers look at the wrong value is exactly the shape of failure
this repo has now shipped four times: the metrics guard blind to attribute order, the
sitemap's date-format check that could never fail, `link-check.cjs` never validating anchors,
and now this. **The failure is invisible from a green run.**

## Decision

**`scripts/contrast-check.cjs` renders the built site and measures composited colour against
WCAG AA.** It joins the QA gates, running in CI and in `npm run qa`.

For every page in `dist/`, in **both themes**, every element directly containing visible text
is measured: computed `color`, multiplied through the full `opacity` chain, composited over
the resolved background — walking up through alpha backgrounds until an opaque one is found —
against **4.5:1**, or **3:1** for large text (≥24px, or ≥18.66px at weight ≥700).

Three properties are load-bearing:

1. **Both themes, each rendered from first paint rather than toggled.** The first
   implementation flipped `data-theme` on a loaded page and measured immediately, which read
   the new ink over the old paper — `body` carries `transition: background-color 0.2s` — and
   reported **400+ phantom violations** that never existed as a rendered state. Each theme now
   gets its own browser context with the theme set before load, and transitions and animations
   are disabled outright. A contrast gate measures resting states.
2. **What cannot be resolved FAILS rather than being skipped.** Text over a `background-image`
   or gradient, an unparseable computed colour, and group `opacity` sitting above the element
   that supplies the background are all reported as findings. This arithmetic cannot represent
   them honestly, and a skip that exits 0 is how the other three gates in this repo came to
   pass without checking anything.
3. **It fails on a zero-page walk, and on any page contributing zero measured elements.**
   The first is the ADR-006 rule for every walking gate. The second is stronger and specific to
   this gate: a walker bug that silently matched nothing would otherwise report a clean sweep
   of the whole site.

**Exemptions are narrow, and each is a semantic claim rather than a convenience.** SVG text
(its backdrop is geometry, not a resolvable CSS background), pseudo-element content,
`aria-hidden="true"` subtrees, and `:disabled` controls (exempt under WCAG 1.4.3). Marking
something `aria-hidden` to quiet the gate is a claim that it is decoration and is not read;
make that claim only when it is true.

**The companion rule, in `CLAUDE.md`: opacity never dims text.** If something should be
quieter, give it a quieter colour token. `opacity` is for non-text decoration — rules,
strokes, fills, disabled controls. The gate enforces the outcome; the rule keeps authors from
writing the bug in the first place, which is cheaper than catching it.

## Downstream surfaces

- `scripts/contrast-check.cjs` — the implementation.
- `scripts/gates.cjs` — the local runner; the gate list is now **eight**, and this file must
  stay a faithful mirror of `qa.yml`.
- `.github/workflows/qa.yml` — the CI job.
- `CLAUDE.md` — carries the operative "opacity never dims text" rule and the exemption
  semantics. Canonical for *what to do*; this ADR is canonical for *why*.
- `public/assets/style.css` — `--accent-quiet` added in both themes; the two remaining
  text-opacity usages removed.
- `src/pages/projects/loop-replay.astro` — `--diff-del` added as a per-theme token; light
  `--series-c` darkened to clear AA as text.
- `public/resume.html` — the decorative contact separators marked `aria-hidden`.
- Any new page is covered automatically; the gate walks the tree rather than taking a list.

## Consequences

- **It found three real defects on its first run**, only one of which was the opacity class:
  the `.subrungs` sub-rung notes were live at **4.18:1** (the same `opacity` bug, second
  instance, shipped); `.diff-del` on the loop-replay page was a bare `#e5657a` with no
  light-theme value at all, rendering a dark-tuned pink on warm paper at **2.63:1**; and light
  `--series-c` (`#16875a`) was tuned as a chart stroke, where 3:1 is the bar, then also used
  as body text on two backgrounds it was never measured against — **3.45:1** in the
  honest-callout.
- **The last of those is the general lesson, and it is not about opacity at all.** A colour
  can be measured honestly against one background and used against another. The gate measures
  each element against the background it is actually painted on, which is the only way that
  class of error surfaces.
- **It is validated against the bug that motivated it.** Reintroducing `opacity: 0.8` on the
  code-refs makes the gate report `#827b6e` at 3.76:1 — the same composited pixel recorded in
  the stylesheet comment. A gate that has never been seen to fail is a gate nobody has checked.
- **It costs a second Playwright pass** (~20s locally, 16 pages × 2 themes, 2,506 elements
  measured). Accepted: it shares the browser dependency `mobile-qa.cjs` already requires, so
  the marginal cost is runtime, not a new dependency.
- **AA, not AAA.** AAA (7:1) would fail large parts of a design built on a warm mid-tone
  palette, including tokens deliberately tuned for the ground they sit on. AA is the legal and
  practical floor and is what the site's own token comments were already measured against.
- **It cannot see everything.** Text over images, canvas, and SVG remains outside its reach —
  it fails loudly on the first rather than guessing, but the honest statement is that this
  gate covers HTML text on CSS backgrounds. It is a floor, not a substitute for looking.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| **A CLAUDE.md convention plus a one-time sweep** (opacity reserved for non-text decoration) | This was the cheaper option and it is genuinely most of the value — the sweep is three lines, and the rule is the thing that prevents the bug rather than catching it. It was rejected as the *whole* answer for two reasons the first gate run then confirmed. A convention is enforced by the reviewer's memory, and this bug had already been introduced twice by an author who knew about it, the second instance shipping live. And it addresses one mechanism: two of the three defects found were *not* opacity — a missing per-theme token and a stroke colour reused as text. Nothing about "don't fade text" would have caught either. The convention is kept **and** written down; it is just not load-bearing on its own |
| `axe-core` or `pa11y` | Would cover far more than contrast, and pull a large dependency into a repo whose QA tooling is deliberately stdlib-plus-Playwright. Their contrast rule also skips what it cannot resolve rather than failing on it, which is the exact property this repo has been bitten by three times. A ~250-line script that fails closed on one well-understood axis is a better fit than a framework that passes open on many |
| Check declared tokens in the stylesheet | This is what already existed, in the form of a comment block listing measured ratios, and it is what the bug walked straight past. The declared value was never wrong; it was never the value on screen |
| Screenshot diffing / a visual-regression service | Catches change, not correctness. It would have flagged nothing here, because the faded text was introduced and shipped in the same pass — the baseline would have been the bug |
| Advisory (warn, exit 0) | Rejected for the reason ADR-001 gives about the mobile gate, and reinforced by the three gates found in one night passing while checking nothing. An advisory check on a solo project is skipped under time pressure, which is when it matters |
| Sample a few representative pages | The two live instances were on `autonomy-ladder.html` and `loop-replay.html`, neither of which is a page a sampling scheme would have picked. Full walks are what make new pages covered by default |
