# Review pipeline smoke test

Disposable PR. It exists only to exercise the automated `review` job after
[ADR-005 Amendment 2](decisions/ADR-005-review-check-signal.md) granted that job
`Read`/`Grep`/`Glob` and made a denied tool call redden the check instead of
passing silently.

Expected outcome: the review posts a summary comment — a real verdict with
`denials=0`. This branch is **closed, not merged**; nothing here lands on `main`.
