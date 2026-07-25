# Smoke test — disposable, do not merge

This file exists only to open a PR that does **not** edit
`.github/workflows/claude-review.yml`, so the Claude App will actually run the
review instead of self-skipping it.

It verifies [ADR-005 Amendment 5](decisions/ADR-005-review-check-signal.md): the
review job now receives the PR number in its prompt, because the merge-ref
checkout is detached and `gh` cannot infer a PR from a branch.

**Pass looks like:** a posted verdict comment, and `denials=0` in the classify
step's log line.

**Fail looks like:** a red check saying the review was denied into silence — now
with the denied commands named, per Amendment 4.

Close this PR once it has been read. Nothing here ships.
