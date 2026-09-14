# Deferred findings from the 2026-09-09 live walk

Origin: filed 2026-09-09, repo `portfolio` at `2cf5ce5`, worktree
`portfolio-wt-critique` on `fix/live-walk-top1pct`. Evidence: Playwright
walk of `dist/` at 320 / 390 / 1280 in both themes, live `https://sanlee.me/`
at 200, and `impeccable detect --json` on `src/pages` + `src/layouts`.

P0–P2 of this walk landed on the same branch. This file holds P3 only.
Do not fold these into a mid-session question. Re-verify against live
`main` before you act.

Blast radius if a later session picks one up: name the files in that
session's chip. Nothing below is in flight.

Resolved on `main` and dropped from this file, 2026-09-14: the 320×568
first screen (#356, #369), the JSON-LD `jobTitle` (#364 made it Technical
Program Manager), and the flagship-order comment (corrected in this pass).

## P3 — lightbox empty `src`

`src/pages/lab/gallery.astro` ships `<img class="lb-img" id="lb-img"
alt="" />` with no `src` until a thumbnail opens. `impeccable detect`
flags `broken-image`. The overlay is `hidden` on load. A later session
can set a 1×1 data-URI if detect becomes a gate. Do not add a real
photo as the default.

## P3 — side-tab detect hits

`impeccable detect` flags `border-left: 3px` on
`src/pages/projects/defense-news-classifier.astro` and
`src/pages/projects/loop-replay.astro` as AI-slop side-tabs. Those
rules are monograph marks, not cards. Do not remove them to quiet
detect.

## P3 — desktop pointer chrome

Primary nav links render ~20px tall at 1280. Standalone `.card-link`
renders ~15px tall at 1280. The 44px floor is phone-only
(`scripts/hit-target.cjs` TAP_WIDTHS). Phone already pads both. Do not
inflate the desktop first screen to match a thumb.

## P3 — Home is not in the primary nav

ADR-007 says Home, Work, About, and the résumé *may* live in the
shared primary nav. The nav is Work, About, Résumé, Contact. Interior
pages return through `.back`. Adding Home is an owner taste call.

## P3 — demo idle verdict is an em-dash

`#bdemo-verdict-category` starts as `&mdash;` until a chip runs. That
is the site's absence grammar, not a missing result. Do not seed a
sample verdict on load without an owner call.

## P3 — Work ADR rows and field notes

`src/pages/work.astro` is owned by another session. Do not edit it
here. Owner ruling 2026-09-06 keeps the three site ADR rows at the
foot of Work.

## Unverified

- `ROOT_FONT_PX=20` overflow after the hero padding change is checked
  by `npm run qa`, not by a separate walk.
- Live Pages can lag `main` by minutes. The live fetch matched the
  local tree at walk time.
