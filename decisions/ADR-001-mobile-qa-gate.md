# ADR-001: The mobile QA gate is a contract, enforced in CI

**Status:** Accepted
**Date:** 2026-07 (recorded as an ADR 2026-07-18)
**Deciders:** San Lee

---

## Context

This site is public and most visitors arrive on a phone. Mobile layout regressions are cheap
to introduce — a table gains a column, a nav row gains a link, a code block gains a long
line — and expensive to notice, because the person shipping the change is almost always
looking at a desktop viewport.

The failure mode is specific and it recurred: a change looks correct at 1280px, ships, and
the page scrolls sideways on a phone. The owner then discovers it as a reader rather than as
an author. That is QA landing on the wrong person, after the fact.

The rule was written into `CLAUDE.md` early and has been enforced since. This ADR records the
reasoning; the operative instruction stays in `CLAUDE.md` where agents read it.

## Decision

**Mobile correctness is a contract, not a review preference.** Concretely:

1. **`scripts/mobile-qa.cjs` is the gate.** It renders every page at **320 / 360 / 390 /
   430 px** and **fails on any horizontal overflow**. It must be green before any layout,
   style, or markup change is committed, and it runs in CI (`.github/workflows/qa.yml`).
2. **Test down to 320px, not just 430.** 430px is roughly the largest iPhone in CSS pixels,
   but Display Zoom drops the effective width to ~375px or less on a real device. A layout
   that only works at 430 still clips for a real user.
3. **The page never scrolls sideways.** Wide elements — tables, `pre` blocks, images, embeds
   — stay within the viewport. A table scrolls inside **its own box**
   (`display: block; overflow-x: auto`), it never widens the page.
4. **Nav and footer link rows wrap, never clip.** Tap targets stay ≥ 44px.
5. **Look at it.** For anything visual, screenshot the affected page at ~390px and inspect —
   the gate catches overflow, not ugliness, and the two are not the same failure.

## Downstream surfaces

- `CLAUDE.md` — carries the operative instruction and the pre-commit checklist. Canonical for
  *what to do*; this ADR is canonical for *why*.
- `scripts/mobile-qa.cjs` — the implementation.
- `.github/workflows/qa.yml` — the CI job.
- Any new page added to the site is covered automatically; the script walks the tree rather
  than taking a page list, so nothing needs registering.

## Consequences

- **The gate has caught real regressions.** Both a six-column metrics table and a nav row
  gaining an item were verified against it before shipping; neither overflowed, and knowing
  that took seconds rather than a device check.
- **It only catches overflow.** It says nothing about whether text is readable, contrast
  holds, or a sticky element covers something. Hence rule 5 — the gate is a floor, not a
  substitute for looking.
- **It costs a Playwright + Chromium dependency** in a repo that otherwise has no build step.
  Accepted: the alternative is a manual device check that will not happen reliably.
- **It runs on every layout change**, which is a real few-seconds tax on trivial edits. That
  is the correct trade for a public site where the author is not the typical reader.
- **A table that needs more columns than a phone fits is now a design constraint, not a
  surprise.** When the metrics table reached six columns the gate stayed green because the
  table scrolls in its own box — but the *current* numbers ended up off-screen by default,
  which the gate cannot see. That kind of finding is what rule 5 exists to surface.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| Manual device testing before shipping | Depends on remembering, on a solo project, for a check that is boring and easy to skip. The regression it prevents is exactly the one you introduce when you are not thinking about mobile |
| Rely on responsive CSS and trust it | The failures are emergent — a table gains a column, a nav row gains an item — and no amount of correct CSS written earlier prevents a later addition from overflowing |
| A visual-regression / screenshot-diff service | Far more signal, and far more maintenance: baselines to update on every intentional change, and a paid dependency. Overflow is the failure that actually recurs here; a binary check on it is most of the value for a fraction of the cost |
| Only test 390px (a typical phone) | Misses Display Zoom users entirely, who are effectively at ~320–375px. 320 is the honest floor |
| Make it advisory rather than a hard gate | An advisory check on a solo project is a check that gets skipped under time pressure, which is precisely when layout regressions ship |
