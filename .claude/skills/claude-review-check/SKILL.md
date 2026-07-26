---
name: claude-review-check
description: How to read the Claude Review check on a portfolio PR — that it runs only when you comment @claude, what red / green+comment / green+"review inconclusive" / green+no-comment each mean, why the review reads main rather than your PR's tree, and why editing .github/workflows/claude-review.yml disables the review on its own PR. Use when looking at a PR's checks, triggering or interpreting a Claude review, or changing the review workflow.
---

# Reading the Claude Review check

*Reasoning: [`decisions/ADR-005`](../../../decisions/ADR-005-review-check-signal.md). This
skill is the operative rule.*

**It runs only when you ask.** Since 2026-07-26 (ADR-005 Amendment 7) there is no
automatic review: opening a PR fires nothing. Comment `@claude` on the PR to get
one. Only the repo owner can trigger it — on a public repo that guard is the only
thing between a stranger's comment and this repo's API key.

Two consequences worth holding on to:

- **No check appears unless you asked for one.** A PR with no `Claude Review` check
  has not been reviewed and is not failing — the lane simply never fired. Do not
  read its absence as a pass.
- **The review reads `main`, not your PR's tree.** A comment-triggered run checks
  out the default branch, so the agent sees your change through `gh pr diff` only.
  It can still read the repo for context; it cannot open a file you changed and see
  your version of it. Reviews of self-contained diffs are unaffected; a change whose
  meaning lives in the surrounding file is worth describing in the comment you
  trigger it with.

The `Claude Review` check reports **tooling health, not a verdict**. The verdict
is whatever the review posted as a PR comment.

- **Red** — the job could not do its work: auth, a crash, or the review was
  **denied a tool it needed and posted no verdict** (a `--allowedTools` gap —
  the comment lists the denied calls verbatim). Fix CI; it says nothing about
  the PR.
- **Green + a comment** — the review ran; the comment is the result, read it. If
  the Actions log also carries a "denied N tool call(s)" warning, the verdict
  still stands — the agent reached for an ungranted tool, completed anyway, and
  the warning names the calls so you can widen the grant to quiet it.
- **Green + "review inconclusive"** — it hit the turn ceiling and reviewed
  **nothing**. Treat the check as absent. Re-run with `@claude`.
- **Green + no comment at all** — either a genuinely clean review or the
  self-skip below. (A denial that *silenced* the review goes **red**; one the
  review *survived* stays green with the warning above — neither lands here.)
  Check the job log before assuming the first.

Both denial paths print the **command**, not just the tool name — `Bash: env`,
not `Bash`. Not every denied call deserves a grant: the agent reaches
speculatively, so a call it never needed is a prompt problem, not a permissions
one.

**Editing `.github/workflows/claude-review.yml` disables the review on that
same PR.** The Claude App refuses to run when the workflow file differs from the
copy on `main`, so the job skips itself and goes green. A workflow change is
therefore never validated by its own PR — verify it on the next one, and verify
by *a posted comment*, not by a green check. Shipping unverified on a green
check is how the workflow stayed broken from 2026-07-13 to 2026-07-23.
