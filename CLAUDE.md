# CLAUDE.md — working agreement for this repo

Public portfolio site — static HTML/CSS/JS, served at **sanlee.me** via GitHub
Pages. No build step; every page links `assets/style.css`.

## Mobile is a contract, not an afterthought

*Reasoning and alternatives: [`decisions/ADR-001`](decisions/ADR-001-mobile-qa-gate.md). This
section stays canonical for what to **do** — the ADR records why.*

This site is public and most visitors arrive on a phone. **Any change that
touches HTML, CSS, or layout must be verified at mobile widths before it is
committed.** The owner should never have to QA the phone layout after the fact.

Before committing any layout / style / markup change:

1. **Run the mobile QA gate** from the repo root:

   ```
   node scripts/mobile-qa.cjs
   ```

   It renders every page at **320 / 360 / 390 / 430 px** and **fails on any
   horizontal overflow**. It must be green before you commit.

2. **Hard rules** (the gate enforces overflow; you uphold the rest):
   - **No horizontal overflow at any width.** The page must never scroll
     sideways. Wide elements — tables, `pre`/code blocks, images, embeds — stay
     within the viewport. A table scrolls inside its **own** box (`display:
     block; overflow-x: auto`), it never widens the page.
   - Nav and footer link rows **wrap**, never clip.
   - Tap targets ≥ 44px.
   - If you change colors, check **both** light and dark themes.

3. **Actually look at it.** For anything visual, screenshot the affected page at
   ~390px (Playwright + Chromium at `/opt/pw-browsers/chromium`) and inspect it —
   don't assume from the code.

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

*Reasoning: [`decisions/ADR-005`](decisions/ADR-005-review-check-signal.md). This
section is the operative rule.*

The `Claude Review` check reports **tooling health, not a verdict**. The verdict
is whatever the review posted as a PR comment.

- **Red** — the job could not do its work (auth, crash). Fix CI; it says nothing
  about the PR.
- **Green + a comment** — the review ran. The comment is the result. Read it.
- **Green + "review inconclusive"** — it hit the turn ceiling and reviewed
  **nothing**. Treat the check as absent. Re-run with `@claude`; if the comment
  reports denied tool calls, fix `--allowedTools` first, or it will exhaust the
  same way.
- **Green + no comment at all** — either a genuinely clean review or the
  self-skip below. Check the job log before assuming the first.

**Editing `.github/workflows/claude-review.yml` disables the review on that
same PR.** The Claude App refuses to run when the workflow file differs from the
copy on `main`, so the job skips itself and goes green. A workflow change is
therefore never validated by its own PR — verify it on the next one, and verify
by *a posted comment*, not by a green check. Shipping unverified on a green
check is how the workflow stayed broken from 2026-07-13 to 2026-07-23.

## Deploy note

After merging, GitHub Pages + its CDN can serve **cached** CSS for a few
minutes. If a fix "doesn't work," hard-refresh (or wait for the cache to expire)
before concluding it failed — the source may already be correct.

<!-- shared:links-verify v1 -->
## Links — verify before sending (hard rule)

Links given in chat must resolve: **full `github.com/<owner>/<repo>/blob/<ref>/<path>` URLs only**, **verify the path exists on the ref before sending** (unverified → say so), and **branch links are perishable** (prefer `main` once merged). Full rule + rationale: [claude-ops `conventions/links-verify.md`](https://github.com/sanlee-ys/claude-ops/blob/main/conventions/links-verify.md).
<!-- /shared:links-verify -->
