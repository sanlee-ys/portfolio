# CLAUDE.md — working agreement for this repo

Public portfolio site — static HTML/CSS/JS, served at **sanlee.me** via GitHub
Pages. Built with **Astro** since 2026-07-26 ([`decisions/ADR-006`](decisions/ADR-006-hand-written-html-or-a-generator.md));
output is still static HTML with zero JS by default.

## The build, and the two things it changes about working here

*Reasoning and alternatives: [`decisions/ADR-006`](decisions/ADR-006-hand-written-html-or-a-generator.md).
This section is canonical for what to **do**.*

```
npm ci && npm run build      # -> dist/
npm run dev                  # local dev server with HMR
```

- **Pages live in `src/pages/*.astro`; static files live in `public/`.** Shared
  chrome — head, theme bootstrap, analytics, theme toggle — is
  `src/layouts/Base.astro`, and the site nav is `src/components/SiteNav.astro`.
  Change them once, not thirteen times. `astro.config.mjs` sets
  `build.format: 'file'`, which is what keeps URLs as `glossary.html` rather
  than `glossary/index.html`; **do not change it** — every inbound link breaks.
- **`public/resume.html` is standalone on purpose and must stay in `public/`.**
  It carries its own inline `<style>` and `@font-face` rules and links no shared
  stylesheet, because `scripts/resume-pdf.cjs` renders it offline and aborts
  every non-`file:` request. Moving it into `src/pages/` would hoist shared CSS
  into it and break `resume.pdf`.
- **Every `<script>` and `<style>` in a page needs `is:inline`.** Without it
  Astro bundles and renames the asset, breaking the `public/` paths. Literal
  `{` and `}` in page content must be written `&#123;`/`&#125;` — in `.astro`,
  `{` opens a JS expression.

**The gates now read the build, not the repo.** `npm run qa` builds and then
runs all twenty checks:

```
npm run qa
```

**The runner prints the count, so do not take the number above on trust.** It
opens with `gates: running 20 checks.` and closes with `OK - all 20 of 20 QA
checks ran and passed.` The loop exits at the first non-zero, so the closing
line is the proof that every check ran. **An unrun gate is not a pass.**

**`scripts/gates.cjs` must stay a faithful mirror of
[`.github/workflows/qa.yml`](.github/workflows/qa.yml) — add a step there, add
it here.** A local command that runs a *subset* of CI is worse than no local
command, because it reports success for a state CI will reject. That was true
until 2026-07-27: the runner had four checks and CI had seven, so an ADR could
ship without its `## Downstream surfaces` section and `npm run qa` went green
anyway.

Nine of the twenty need no build, no browser and no network — eight
`node --test` suites and the ADR linter — so they run first and redden in
seconds. The eleven that walk the built site or launch a browser run after,
slowest last. (`hit-target.test.cjs` is a `node --test` suite but is **not**
one of the cheap nine: it spawns the gate, which launches Chromium, so it sits
at the bottom with the browser work.)

`npm run gates` runs the same twenty against an existing `dist/` without
rebuilding, and the build-independent nine still run on a clone that has never
been built. `scripts/gates.cjs` is also what points the site gates at `dist/`
— **a bare `SITE_ROOT=dist` prefix inside an npm script is POSIX shell syntax
and does not work on Windows**, so the default lives in that runner rather than
in the script line. Set `SITE_ROOT` yourself to override it; run most gates
directly (`node scripts/link-check.cjs`) and they walk the repo root, which is
what makes them usable by hand.

`check-published-metrics.cjs` is the exception. It excludes `dist/` from its
walk, so a bare `node scripts/check-published-metrics.cjs` finds no HTML and
exits 1. Run it as `npm run build && SITE_ROOT=dist node
scripts/check-published-metrics.cjs`.

**The ADR linter needs a Python 3, and a missing one fails the run rather than
skipping it.** The runner probes `python3`, `python`, then `py -3` and requires
one to actually report major version 3 — which is what rejects the Windows
Store stub that answers to `python3` but is not Python. `PYTHON=<path>`
overrides the search. There is no skip flag on purpose: a skip that still exits
0 recreates the green-locally-red-in-CI bug this section exists to prevent. The
linter is stdlib-only, so the whole remediation is installing Python 3.

Aim a gate at the repo root while `dist/` and `public/` are both sitting there
and you get ~180 *phantom* broken links: root-absolute hrefs like `/assets/…`
resolve against a directory that has no `assets/`. That is the failure to
recognize before you go looking for a regression that isn't there.

Each walking gate **fails if it finds no pages**, so a gate pointed at an
unbuilt or empty directory reddens instead of passing on an empty walk.

## Navigation has two layers, and both are checked

*Reasoning: [`decisions/ADR-007`](decisions/ADR-007-split-dont-trim.md), as
amended 2026-08-20.*

`index.html` is the curated front door; `work.html` is the complete index of
current professional work. Home, Work, About, and the résumé may live in the
shared primary nav. Project depth stays out of that nav and is reached through
the Work index or a parent project.

Every non-primary content page needs the existing `.back` link to a meaningful
parent or index. Stable archived pages under `lab/` may be exempted, but an
exemption must be explicit in `scripts/navigation-check.cjs`; an unlinked page
is not silently treated as an archive. Run `npm run qa` after adding, moving, or
retiring a route. The navigation suite and built-site gate check Work-index
coverage and return links; the ordinary link gate separately checks that the
links resolve.

## Mobile is a contract, not an afterthought

*Reasoning and alternatives: [`decisions/ADR-001`](decisions/ADR-001-mobile-qa-gate.md). This
section stays canonical for what to **do** — the ADR records why.*

This site is public and most visitors arrive on a phone. **Any change that
touches HTML, CSS, or layout must be verified at mobile widths before it is
committed.** The owner should never have to QA the phone layout after the fact.

Before committing any layout / style / markup change:

1. **Build, then run the mobile QA gate** from the repo root:

   ```
   npm run build && SITE_ROOT=dist node scripts/mobile-qa.cjs
   ```

   It renders every page at **320 / 360 / 390 / 430 px** and **fails on any
   horizontal overflow**. It must be green before you commit. **It serves
   `dist/` over HTTP rather than opening files** — the layout emits
   root-absolute asset paths, which do not resolve over `file://`, and an
   unstyled page does not overflow, so a `file://` run would pass while
   measuring nothing. Running it against a stale `dist/` tests the previous
   build; rebuild first.

   **Prerequisite — a Chromium matching the pinned Playwright.** `node_modules/`
   isn't tracked, and each Playwright version maps to one browser revision, so
   the gate is unrunnable on a fresh clone *and* after every Playwright bump
   (the old revision is stranded, not upgraded). Run both, from the repo root:

   ```
   npm --prefix scripts ci
   npm --prefix scripts exec -- playwright install chromium
   ```

   Use `--prefix scripts`, not a bare `npx` — that's what resolves the version
   pinned in `scripts/package.json`, and therefore the revision CI uses. A bare
   `npx playwright install` from the root fetches whatever Playwright is newest
   and can install a revision the pin doesn't want.

   **If the gate can't launch a browser, it is not green — it is unrun.** The
   failure is loud (`Executable doesn't exist at …`) and Playwright's own message
   names the fix; do not read it as a pass and commit anyway.

2. **Hard rules** (the gate enforces overflow; you uphold the rest):
   - **No horizontal overflow at any width.** The page must never scroll
     sideways. Wide elements — tables, `pre`/code blocks, images, embeds — stay
     within the viewport. A table scrolls inside its **own** box (`display:
     block; overflow-x: auto`), it never widens the page.
   - Nav and footer link rows **wrap**, never clip.
   - Tap targets ≥ 44px. (`hit-target.cjs` enforces this at 320/360/390/430px
     for SVG controls and for standalone anchors — a link that is the only
     text of its block. A link inside a sentence keeps the WCAG 2.5.8 inline
     exception; for everything else it is still on you.)
   - If you change colors, check **both** light and dark themes.

3. **Actually look at it.** For anything visual, screenshot the affected page at
   ~390px with Playwright and inspect it — don't assume from the code. Use the
   same Chromium the gate uses: whatever `npm --prefix scripts exec -- playwright
   install chromium` put in place. Don't hard-code a browser path in new work —
   `mobile-qa.cjs` and `resume-pdf.cjs` both used to default to
   `/opt/pw-browsers/chromium`, which only ever described one Linux sandbox, and
   on a host that still had it that stale revision silently outranked the pinned
   one. They now pick their browser in two steps and no others: `PW_CHROMIUM` if
   set, else Playwright's own. So on any normal host you get Playwright's; on a
   host that ships a prebuilt Chromium, `PW_CHROMIUM` is the way to point at it —
   and if it's set to a path that doesn't exist the script fails rather than
   quietly using a different browser.

## SVG controls: `fill: none` is not clickable

**An SVG shape is a hit target only where it is PAINTED.** That is the
`visiblePainted` default, and it means `fill: none` leaves a shape untouchable
everywhere except its stroke. So **any SVG shape that carries `role="button"`,
`tabindex`, or a click handler needs `pointer-events: all` or a transparent
fill** — `fill: none` plus a hairline stroke is a control you cannot press.

The diagram's nodes shipped exactly that way. `.node rect` was `fill: none` and
`.node text` was `pointer-events: none`; each line was reasonable, and together
they left a 171×57 box with a **1.8%** hit target. Everything else about it was
correct — `role`, `tabindex`, `aria-label`, click and keydown handlers, all
attached synchronously with the shapes — so no gate and no code reading could
see it.

**It presents as a timing bug, and it is not one.** It was reported as
"couldn't click … seems to be a bit of a delay." Nothing is ever late:
`.node:hover rect` paints a fill, a painted fill *is* hit-testable, so grazing
the 1px border brings the whole box to life for as long as the pointer stays on
it. Dead, then working, with no code running late. Don't go looking for a
`DOMContentLoaded` or a `defer` — measure the geometry.

```
npm run build && SITE_ROOT=dist node scripts/hit-target.cjs
```

- It hit-tests every element that **claims to be a control** — `role="button"`,
  `role="link"`, or focusable — at 1280 and at 320/360/390/430px, and fails if
  the centre is dead, if under 60% of the box is a target, or if the box is
  under 44px at phone width.
- **`cursor: pointer` is deliberately not part of that test.** The cursor
  inherits, so decorative shapes inside a real control report it; keying on it
  failed four correct pages, including `#score-chart`, whose `.series-dot`
  markers are decoration over a `fill: transparent` hit column.
- Coverage is measured over the element's box **intersected with its `<svg>`'s**,
  because an SVG clips at its viewport and un-claimable area is not a defect.
- **Finding zero interactive SVG elements is a failure, not a clean run** — the
  figures are script-drawn, so "none found" most likely means a renderer broke.
- It also measures every **standalone anchor** at 320/360/390/430px against
  the same 44px floor. Standalone = the link is the only text of its block
  container (the homepage card links shipped at 15px tall this way). A link
  inside a sentence is exempt — WCAG 2.5.8's inline exception, adopted
  deliberately in the ToC block in `style.css`. Finding zero anchors site-wide
  is a failure too.

## The figure contract: a hand-drawn figure carries no digit

*Reasoning and alternatives: [`decisions/ADR-013`](decisions/ADR-013-diagram-led-narrative.md).
This section is canonical for what to **do**.*

A plate is markup that a person types. A count inside one is a published figure
with no producer, and no gate reads it: `contrast-check.cjs` exempts SVG text,
and `check-published-metrics.cjs` reads a `data-metric` span. So the number
lives in the caption or in the prose, where a gate already reads it.

```
npm run build && SITE_ROOT=dist node scripts/figure-contract.cjs
```

Three rules, and the gate fails the build on each one.

- **A digit inside an `<svg>` `<text>` node fails.** Two exits. A generated
  figure declares `data-fig-generated="true"` on its `<svg>`, and its
  `.fig-what` names the artifact and the commit. `scripts/build-plots.cjs`
  writes that geometry into `src/data/figures.json`, and the page interpolates
  it. The other exit is the baseline below.
- **A `<figure>` that carries `data-fig` needs both caption slots.** A
  `<figcaption>` holds a non-empty `.fig-what` and a non-empty `.fig-limit`.
  `.fig-what` states what the figure argues. `.fig-limit` states what it does
  not show. An empty `.fig-limit` fails.
- **A `<figure>` that carries no `data-fig` fails**, unless the baseline lists
  it. Without this rule a new figure escapes the caption rule. It omits the
  attribute and nothing runs.

**The gate reads `dist/` and decodes entities, and that is not a detail.** The
plate on `netops-lab` reads `wipe &#8594; cfg`. The digits belong to the entity
and the reader sees an arrow. A gate that read `src/` would fail a correct
figure, and the cheapest way to green a false failure is a deletion.

**`scripts/figure-contract-baseline.json` records what already ships.** Nine
figures on eight pages carried a digit when the gate landed, so the gate binds
new work and asks no lane to delete an existing figure. Each entry lists its
exact text values and its reason. **Two entries are permanent:** `.eval-plate`
and `.ci-plot` are frozen historical measurements, and the value list is what
freezes them. A changed value reddens the build.

**Add a baseline entry only with an ADR line.** An exemption is a rule somebody
decided to break. The gate rejects an entry that carries no reason, and it also
rejects an entry the site no longer matches, so a stale exemption cannot sit
there unread.

Re-seed the measured inventory with `node scripts/figure-contract.cjs --seed`.
It prints JSON and writes nothing. A gate that can rewrite its own baseline can
green itself.

## A figure offers the jump, it does not take it

*Reasoning and alternatives: [`decisions/ADR-010`](decisions/ADR-010-the-figure-offers-the-jump.md).
This section is canonical for what to **do**.*

**No interaction on this site moves the reader's viewport on its behalf.** A
figure, a chart, or a control may change what it says about itself; it may not
scroll the page away from itself. Selecting a diagram node used to
`scrollIntoView` the matching decision entry, which on a phone put the map
entirely off screen with nothing offering a way back, so exploring a second node
meant scrolling up and finding it again.

Where a control should lead somewhere on the page, **write an ordinary
`<a href="#id">` and let the browser navigate.** That is not a stylistic
preference — it is three behaviours you otherwise have to build and will get
wrong:

- a **history entry**, so Back is the return path;
- a **hash**, so where the reader landed is linkable;
- **reduced-motion-aware scrolling for free**, because
  `html { scroll-behavior: smooth }` already sits inside a
  `prefers-reduced-motion: no-preference` query. A script that calls
  `scrollIntoView` has to re-derive that for itself, and a second copy of a
  media query is a second thing to keep in step.

`tabindex="-1"` + `focus({ preventScroll: true })` on the destination stays
correct **on the reader's own click** — focus should follow a navigation they
asked for. It is not correct as an unrequested side effect of selecting
something.

**Do not remove a focus move on the theory that it is the scroll.** The two are
separable, and the announcement to assistive tech usually is not coming from
focus at all: the diagram's caption is `aria-live="polite" aria-atomic="true"`,
so an atomic region re-reads its whole contents — including any link text —
on every change. Check where the announcement actually comes from before
deleting anything, and keep an AT-equivalent announcement either way.

## Contrast: opacity never dims text

*Reasoning and alternatives: [`decisions/ADR-009`](decisions/ADR-009-rendered-contrast-gate.md).
This section is canonical for what to **do**.*

**If something should be quieter, give it a quieter colour token. Never fade text with
`opacity`.** `opacity` is for non-text decoration — rules, strokes, fills, disabled
controls. A 5.81:1 token under `opacity: 0.8` paints at 3.80:1, and the declared value
still reads as compliant in the stylesheet, in devtools, and to any linter that inspects
CSS. The bug is invisible everywhere except the rendered page, which is why it shipped
twice.

`scripts/contrast-check.cjs` enforces the outcome: it renders every built page in **both
themes** and fails any text under **4.5:1** (or 3:1 for large text — ≥24px, or ≥18.66px at
weight ≥700), measuring the composited pixel rather than the declared token.

```
npm run build && SITE_ROOT=dist node scripts/contrast-check.cjs
```

Two things to know before you argue with it:

- **A colour is only compliant against the background it is painted on.** Tokens tuned for
  bare paper get reused inside code blocks and washed callouts, which are darker. Check the
  value where the text actually sits — that is how a chart colour tuned to a 3:1 stroke bar
  ended up as 3.45:1 body text.
- **"Unresolvable" is a failure, not a skip.** Text over a `background-image`, an
  unparseable colour, or a group `opacity` above the element supplying the background all
  fail. The gate refuses to guess; fix the construction or make the exemption explicit.

Exemptions are narrow and each one is a claim: SVG text, pseudo-element content,
`aria-hidden="true"` subtrees, and `:disabled` controls. **Marking something `aria-hidden`
to quiet the gate asserts it is decoration that no one reads.** Only do that when it is
true — the résumé's `·` separators qualify; a label does not.

## Fonts: one script owns `public/assets/fonts/`

Every woff2 in that directory is cut by `scripts/subset-fonts.py` from pinned
upstream sources. **Do not hand-place a font file there** — the coverage gate
can only vouch for what that script recorded, and it fails on a stray file.

The rule that catches the real bug: **a character with no self-hosted glyph
still renders.** The browser borrows it from a platform face, so it looks
correct on the machine that wrote it, survives every other gate, and changes
shape on someone else's laptop. `U+2192` shipped that way for months, with the
proof figures and the card links drawing two different arrows on one page.
`scripts/font-coverage.cjs` fails the build on any such character.

```
npm run build && SITE_ROOT=dist node scripts/font-coverage.cjs
```

- It reads `scripts/font-coverage.json` (written by the subsetter) rather than
  parsing woff2, which is what lets it run in CI with no font toolchain — and
  it **re-hashes every woff2**, so a manifest that no longer describes the
  files fails instead of being believed.
- **Re-cut the fonts and you must refresh the manifest.** If the fonts
  themselves are unchanged, use `--manifest-only`: cutting is not
  byte-reproducible, so a full re-cut rewrites every binary for nothing.
  **Removing** a font is that case too — delete the woff2, run
  `--manifest-only`, and the diff is deletions only.
- **An unrecognised HTML entity is a failure, not a skip** — otherwise the gate
  goes silently blind on new copy. Add it to `ENTITIES` in the gate.
- Uncovered characters are recorded in `EXPECTED` with a reason, not waved
  through. Three qualify (`κ`, and the toggle's `☀`/`☽`), because no upstream
  face here has them at all.

The site ships **exactly two faces now, Geist and Geist Mono** — four woff2
files from two upstream sources. The serif came out on 2026-07-28 (see the "NO
SERIF" block at the top of `style.css`), and with it went `geist-arrows.woff2`,
which had existed only to lend Newsreader an arrow glyph it does not have
upstream. `fonts/OFL-Newsreader.txt` went too: an OFL notice travels with the
glyphs that ship, and none do.

**There is no `--serif` token and no italic anywhere.** Geist ships no italic
cut, so `font-style: italic` renders as a synthetic oblique — the upright,
sheared. Emphasis is **weight**: 600 for inline `<em>`, 500 for the note voice
that whole italic blocks (standfirsts, captions, the footer imprint) used to
carry. The `em, i, cite` rule near `body` is also what neutralises the
BROWSER's own default italic on those three elements. **Adding `font-style:
italic` anywhere puts a sheared face back on the page and no gate will catch
it** — that block records why, and a one-off check is
`getComputedStyle(el).fontStyle !== 'normal'` over every element on every page.

When subsetting, **narrow the codepoint set only.** The subsetter's default
feature list drops `tnum`, and this site sets `font-variant-numeric:
tabular-nums` in fifteen places — a default cut leaves every metric and proof
figure quietly failing to align. `subset-fonts.py` keeps all features and
asserts `tnum` survived.

## Why 320px matters

430px ≈ the largest iPhone in CSS pixels, but many people run **Display Zoom**,
which drops the effective width to ~375px or less. Test **down to 320px**, not
just 430 — a layout that only works at 430 will still clip for a real user.

### The microtext floor: no SVG text renders under 9px at 320px

*Recorded in [`decisions/ADR-014`](decisions/ADR-014-the-monograph-identity.md),
section 5. This section is canonical for what to **do**.*

**No `<text>` node inside an `<svg>` may render under 9px at a 320px
viewport.** The floor binds the RENDERED size, not the declared one. A plate
scales, so the rendered size is the computed `font-size` times the plate's
render scale. The render scale is the rendered CSS width divided by the viewBox
width.

Three decisions this rule records, and the reason for each:

- **The floor is a rule because no gate can be one.** `contrast-check.cjs`
  skips every node inside an `<svg>`, so a plate nobody can read passes all
  twenty checks. On plate text the writer is the only control, and a rule is
  what a writer can follow.
- **Raise the declared units. Do not scale the plate.** A plate that grows only
  under a phone breakpoint renders its text smaller again above that
  breakpoint, which is the opposite of a floor. At 1:1 a declared 9px is a
  rendered 9px at every width, so the floor becomes a code review instead of a
  measurement.
- **The floor costs height, and the plate pays it.** Bigger microtext needs
  more room, so a dense cell wraps or a viewBox grows. Take the height. A cell
  that fits only at 7.5px does not fit.

Keep the site's plate discipline and the arithmetic stays trivial. A 260-unit
viewBox under `max-width: 260px` renders at scale 1.000 down to 320px. **Break
that discipline and you owe a measurement**, because the scale then decides the
answer. Measure with the same pinned Playwright the gates use.

**Measured state, 2026-08-31, so a later reader can weigh this section.** The
**whole site meets the floor** — the sweep the previous note called outstanding
closed with the per-page identity lanes (PRs #272 to #286). Measured over the
built site at a 320px viewport: 400 `<svg>` `<text>` nodes across 22 pages,
zero under 9px, and the smallest rendered size on the site is 9.00px
(`projects/the-system.html`). The former worst case,
`projects/loop-replay.html` `.axis-label` at 4.25px, now renders at 10px —
lane I11 redrew that chart at 1:1 rather than scaling the plate, which is the
remedy this section names. **The floor binds new and edited plates**, and it is
now a floor the site is standing on rather than climbing to.

Re-measure it the way this state was measured: build, then walk every
`svg text` at 320px and compare the computed `font-size` times the plate's
render scale (rendered CSS width over viewBox width) against 9. There is no
gate for it on purpose — see the first bullet above.

## AI-use posture: method, not confession (voice rule)

Decided 2026-07-11. Copy that references the AI assist states it as directed
work, in the colophon's framing (which is canonical): **San sets the
direction, the contracts, and the bar; Claude does most of the typing; the
evals and postmortems are the proof.** Two failure modes to avoid:

- **Apologetic** ("full disclosure", "disclaimer", "I have to admit") — the
  assist is a competency being demonstrated, not a caveat to preempt.
- **Label-y** ("agentic orchestration" or similar as a self-description) —
  describe the practice; the skeptical-senior-engineer reader credits
  artifacts, not vocabulary.

Honesty is unchanged by this rule: Claude is named plainly on every surface
that makes a "who built this" claim. Surfaces aligned 2026-07-11: GitHub
bio, profile README intro, this colophon (already canonical).

## Private repos: never mention, never link

This site is public and indexed. **Never name, link to, or describe the
content of private repos** anywhere on this site — not even a generic
acknowledgment like "plus some private repos." Even confirming a private repo
exists is a disclosure San doesn't want; the bar is omission, not
genericization.

Before publishing anything that lists or surveys San's repos, check every
repo name and every count/scope claim ("all my repos," a specific number)
against the actual public list (`gh repo list sanlee-ys --visibility
public`) — if a claim wouldn't be true restricted to just the public repos,
drop it rather than soften it.

First codified as a standing rule 2026-07-01 (adversarial round,
`ROADMAP.md`); promoted here 2026-07-03 after the same leak recurred in a
cross-repo write-up in the `architecture` repo.

## Career-story ceiling: short, not a memoir (voice rule)

*Reasoning: [`decisions/ADR-011`](decisions/ADR-011-career-story-ceiling.md).
This section is canonical for what to write.*

Public career copy stays at résumé facts plus the locked About tell. Do not
add Army color, employer internals, or a claim that the seat was rare.

Locked About tell (2026-08-17):

> Seven years in infra and operations at the same firm, then a product seat
> on a collaboration platform. I was one person in a large machine. I built
> the public system to own a full loop I did not own at work.

Hard stops:

- Army: résumé facts only. No unit, no mission color, no implied special
  operations.
- Employer: title, platform, firm-wide scale, and the résumé's
  merchant-command line. No team names, no feature list, no "I uniquely
  did X."
- `about.html` is the one permitted career page. Keep it short; do not add a
  timeline, photo essay, or extra paragraphs that thicken the biography. The
  homepage may carry only a short version of the same tell.
- Longer stories stay in the private narrative bank. They are spoken, not
  indexed.

A later session that expands this "to help a hiring manager" is out of
bounds. The résumé and the room hold the rest.

## Reading the Claude Review check

How to interpret the `Claude Review` check on a PR — it runs only when you comment
`@claude`, it reports tooling health rather than a verdict, and editing its workflow
file disables it on that same PR — lives in the `claude-review-check` skill
(`.claude/skills/claude-review-check/SKILL.md`). Reasoning:
[`decisions/ADR-005`](decisions/ADR-005-review-check-signal.md).

## Deploy note

After merging, GitHub Pages + its CDN can serve **cached** CSS for a few
minutes. If a fix "doesn't work," hard-refresh (or wait for the cache to expire)
before concluding it failed — the source may already be correct.

<!-- shared:links-verify v1 -->
## Links — verify before sending (hard rule)

Links given in chat must resolve: **full `github.com/<owner>/<repo>/blob/<ref>/<path>` URLs only**, **verify the path exists on the ref before sending** (unverified → say so), and **branch links are perishable** (prefer `main` once merged). Full rule + rationale: [agent-ops `conventions/links-verify.md`](https://github.com/sanlee-ys/agent-ops/blob/main/conventions/links-verify.md).
<!-- /shared:links-verify -->
