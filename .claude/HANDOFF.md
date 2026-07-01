# Handoff — portfolio voice cleanup

**Branch:** `claude/portfolio-perception-ai-vfvlbs` (all work here; not yet a PR)
**Last commit at handoff:** `4f09d36`
**Context:** a working session that (1) reordered a project page to lead with evidence and
(2) rewrote prose across the site to remove "generic AI voice" tells, because the site's
credibility rests on the judgment being San's, and uniformly aphoristic prose reads as the
giveaway even though the AI collaboration is openly disclosed in the colophon.

This file is committed to a **public** repo. It is process notes, not site content, and lives
in `.claude/` so it is not linked from the site. Delete it or move it out of git if you'd
rather it not be public.

---

## Status: the voice pass is COMPLETE

All 26 lines from the original tic inventory are resolved — either rewritten in San's own
words (chosen line-by-line) or, for the final batch, rewritten in plain voice San can still
veto. The four patterns hunted: (A) "not X, it's Y" negation scaffolding, (B) clipped
one-line punch fragments, (C) bracketed noun-lists standing in for explanation, (D)
self-referential winks at the prose's own credibility. Plus cross-file verbatim reuse.

### Done, in order
- Reordered `projects/the-system.html` so the real request/response payloads + example run
  come *before* the essay-style decision prose (a skimmer hits evidence first).
- P0/P1/P2 line rewrites across `index.html`, `colophon.html`, `projects/the-system.html`,
  `projects/defense-news-classifier.html`, `projects/product-and-program.html`, `glossary.html`.
- Final batch (commit `4f09d36`): 10 remaining tics, drafted + adversarially verified via a
  workflow, then applied with two human-directed overrides (see below).

### Deliberately left as-is (confirm you agree)
- **`colophon.html`** — "this page is me saying so out loud" and "evidence over assertion."
  That page's subject *is* honesty-about-the-build, so self-awareness reads as on-topic there.
- **`index.html` About** — "It's a small system, but I took the process seriously." San's
  own chosen wording; not second-guessed.

### Overrides applied over the workflow's drafts (so a future run doesn't "fix" them back)
- `the-system.html` paragraph 2: the auto-draft reintroduced **"a senior engineer will point
  out that..."** — the exact preempt-the-reader framing deliberately removed earlier in the
  session. Rejected; kept San's approved opening, only replaced the "The point was never X.
  It is that Y" ending.
- `index.html` decision-rightsized: auto-draft also de-tricolon'd the Kafka sentence but
  dropped "offset management." Rejected; just cut the opening aphorism, kept the accurate
  technical sentence.

---

## OPEN THREADS — need San or the source repos (NOT resolvable from portfolio repo alone)

GitHub access this session was scoped to only `sanlee-ys/portfolio` and `sanlee-ys/architecture`.
The code repos below were **not reachable**, so nothing in them was checked or edited.

1. **Verify factual claims against the classifier repo** (`sanlee-ys/defense-news-classifier`):
   - **BM25 origin** — pages say "I added BM25 lexical retrieval..." San recalled he likely
     approved it rather than originated the idea. Current wording doesn't claim origination,
     so this is low-risk, but confirm the framing is honest. (Was flagged mid-session.)
   - **"Metrics by hand" (ADR-004 card in `defense-news-classifier.html`)** — the card still
     states "Precision, recall, F1, and confusion matrices are computed directly with pandas
     and arithmetic, no ML framework." San did not remember writing metrics by hand. The
     *rationale* was already softened this session (now "hold off on ML tooling until it earns
     its place / keep the dependency surface small" rather than a personal-craft claim), but
     the underlying factual claim (metrics genuinely hand-computed, no sklearn) should be
     verified against the actual code. If it's not true, the ADR-004 card needs revisiting.

2. **Same-tic sweep of sibling repos not done** — `kb-agent`, `notes-api`, `learning-notes`,
   and the `architecture` repo's own READMEs/ADRs likely carry the same voice patterns and the
   same recurring phrases (e.g. "articulated, not built"; "the workstreams are real, the org is
   not"). Only `portfolio` was cleaned. If you want consistency, run the same inventory →
   priority → rewrite pass on those, with their repos in scope.

---

## How to resume
1. `git fetch origin claude/portfolio-perception-ai-vfvlbs && git checkout claude/portfolio-perception-ai-vfvlbs`
2. Confirm HEAD is at or after `4f09d36`.
3. Decide on the two open threads above; nothing else in the portfolio voice pass is pending.
4. No PR has been opened. Open one only if/when San asks.
