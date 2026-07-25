# Review smoke test — disposable, do not merge

This file exists to trigger one real run of the `Claude Review` job. It is
deleted with the branch; nothing links to it and no gate reads it.

It is here because that workflow **cannot be tested by the PR that changes it**
— the Claude App refuses to run when the workflow file differs from the copy on
`main`, so the job skips itself and goes green. A green check on such a PR is
the same green the broken version produced. The only honest verification is a
PR that touches something else, opened after the change has merged.

What this run is checking, per `decisions/ADR-005-review-check-signal.md`
Amendment 4:

- The review posts a **verdict comment**. A run that ends without one is the
  silent failure the amendment was written about, whatever colour it wears.
- If anything was denied, the log and the comment name the **command** —
  `Bash: node scripts/link-check.cjs` — and not the bare tool class `Bash`,
  which is what six previous runs reported and what made the grant untunable.
