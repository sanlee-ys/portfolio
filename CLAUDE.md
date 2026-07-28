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
runs all four:

```
npm run qa
```

`npm run gates` runs them against an existing `dist/` without rebuilding. Both
go through `scripts/gates.cjs`, which is what points the gates at `dist/`
— **a bare `SITE_ROOT=dist` prefix inside an npm script is POSIX shell syntax
and does not work on Windows**, so the default lives in that runner rather than
in the script line. Set `SITE_ROOT` yourself to override it; run a gate
directly (`node scripts/link-check.cjs`) and it walks the repo root, which is
what makes each one usable by hand.

Aim a gate at the repo root while `dist/` and `public/` are both sitting there
and you get ~180 *phantom* broken links: root-absolute hrefs like `/assets/…`
resolve against a directory that has no `assets/`. That is the failure to
recognize before you go looking for a regression that isn't there.

Each walking gate **fails if it finds no pages**, so a gate pointed at an
unbuilt or empty directory reddens instead of passing on an empty walk.

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
   - Tap targets ≥ 44px.
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

## Why 320px matters

430px ≈ the largest iPhone in CSS pixels, but many people run **Display Zoom**,
which drops the effective width to ~375px or less. Test **down to 320px**, not
just 430 — a layout that only works at 430 will still clip for a real user.

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

Links given in chat must resolve: **full `github.com/<owner>/<repo>/blob/<ref>/<path>` URLs only**, **verify the path exists on the ref before sending** (unverified → say so), and **branch links are perishable** (prefer `main` once merged). Full rule + rationale: [claude-ops `conventions/links-verify.md`](https://github.com/sanlee-ys/claude-ops/blob/main/conventions/links-verify.md).
<!-- /shared:links-verify -->
