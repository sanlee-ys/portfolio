# ADR-005: A red review check means the tooling broke, not that the PR is bad

**Status:** Accepted
**Date:** 2026-07-23
**Deciders:** San Lee

---

## Context

The Claude code-review workflow landed on 2026-07-13 (#81) as a pilot: one
automated pass when a PR opens, plus an `@claude` mention flow. It has run on
every PR since.

It has never reviewed anything.

That is not a figure of speech. Across every run from #81 to #101, the review
job posted **zero** comments on **zero** PRs. The only `claude[bot]` comments
this repo has ever received came from the *mention* job, on #82. Everything the
review job produced went into a step log that `show_full_output: false` keeps
hidden, and then the runner was torn down.

The mechanism is in the action, and it is not a bug in the action — it is a
default this workflow never overrode. `anthropics/claude-code-action@v1`
auto-detects **agent mode** whenever a `prompt` is supplied, and agent mode
grants nothing on its own:

- **No Bash.** The action's own docs: *"Claude does not have access to execute
  arbitrary Bash commands by default."* So `gh pr diff` — the only way to learn
  what a PR changed — was denied. The checkout is the merge result, so the file
  tree shows the PR's *outcome* and never its *diff*.
- **No publishing channel.** `src/mcp/install-mcp-server.ts` gates the comment
  servers on the tool list: `shouldIncludeCommentServer = !isAgentMode ||
  hasGitHubCommentTools`, and the inline-comment server needs
  `hasGitHubMcpTools || hasInlineCommentTools`. With an empty `--allowedTools`,
  agent mode installs **neither**. The agent had no way to say anything, to
  anyone, ever.

So each run was an agent that could not see the change and could not report on
it, spending turns discovering that. The observable outcome was a coin flip on
how long it took to give up:

| Run | PR | Result | Turns | Denials | Comments posted |
|---|---|---|---|---|---|
| 29699311581 | #97 | green | 21 | 8 | 0 |
| 29712665156 | #100 | green | 6 | 3 | 0 |
| 30059826570 | #101 | **red** | 26 (cap 25) | 11 | 0 |

The green rows and the red row describe the same non-event. Nine of the twenty
most recent runs were red.

This is the second attempt at this. On 2026-07-19, #96 raised `--max-turns` from
8 to 25 and recorded the right diagnosis in a commit comment — *"the ceiling
surfaced as a REVIEW VERDICT... a check that reports red without a finding
trains you to ignore it."* That diagnosis was correct and the fix did not follow
from it: raising a ceiling treats budget as the scarce resource. The scarce
resource was **permission**. Four days later #101 — a 21-file migration, but a
small one: 133 lines added, 142 removed, four of the files pure renames with no
content change at all — exhausted 26 turns, 11 of them on denied calls, and went
red. It was merged past the red check, which is the exact behaviour a
meaningless gate trains. Note what the diff size does *not* explain: this PR was
smaller than several the job had already gone green on.

There is a compounding detail worth recording, because it is why #96's change
was never observed to fail: the Claude App **refuses to run when the workflow
file differs from the copy on the default branch**. Any PR that edits this
workflow gets a green, skipped review. #96 changed the review workflow, so #96's
own review skipped. The change shipped un-exercised and the next PR was the
first real test.

## Decision

**Separate the two signals this check was conflating, and give the review the
permissions it needs to produce either one.**

1. **Grant the review its tools.** `--allowedTools` now names
   `Bash(gh pr diff:*)`, `Bash(gh pr view:*)`, `Bash(gh pr comment:*)`, and
   `mcp__github_inline_comment__create_inline_comment`, mirroring the action's
   own `examples/pr-review-comprehensive.yml`. A review that cannot read the
   diff is not a review, and a review with no channel to publish on is not a
   gate. This is the root cause; everything below is about reporting.

2. **The PR comment is the signal channel. The check colour reports tooling
   health only.** Red means *this job could not do its work* — auth failed, the
   action crashed. Green means *the job ran*; what it concluded is in the
   comment it posted. The check colour was never able to carry a review verdict,
   and it was only ever asked to because no comment was being posted.

3. **Turn exhaustion is inconclusive, and inconclusive is not failure.** On
   `error_max_turns` the job posts a comment that says, in as many words, that
   **nothing in the PR was reviewed** and the check should be read as *absent* —
   not passed, not failed — and it does not go red. "I found problems" and "I ran
   out of road" are different claims; only the first is a verdict, and the second
   is not the author's fault. A red X the author is expected to merge past is
   worse than no check at all, because it still reads as coverage.

4. **The ceiling stays at 25.** Deliberately not raised. Of #101's 26 turns, 11
   were denials; productive turns across observed runs were 13–15. Removing the
   denials returns more headroom than any plausible bump, and it is the headroom
   the comment-posting turns in the new prompt will spend. If 25 still exhausts,
   Decision 3 now says so honestly and the next adjustment can be made against a
   measured number instead of a guess. **The ceiling was never the binding
   constraint, and one more bump would have hidden that for a third time.**

5. **A permission denial is a defect in this workflow, and it is reported as
   one.** Any run with `permission_denials_count > 0` raises a warning
   annotation naming the count, on green runs too. Denied calls consume budget
   and return nothing — that is the failure mode that hid here for ten days, and
   it is now visible without turning the transcript on.

6. **Review scope is narrowed to content.** The prompt tells the agent to start
   from `gh pr diff --name-only`, to skip files whose diff is a pure rename, and
   to post findings incrementally rather than saving everything for a final turn
   it may not reach. Link integrity across a move is already enforced by
   `scripts/link-check.cjs` in the QA job; the review should not re-derive it by
   hand.

The mention job gets Decision 1's read-only subset for the same reason — it
could always *post* (tag mode installs the comment server unconditionally, which
is why #82 worked) but it was answering questions about PRs without being able
to see their diffs.

## Downstream surfaces

- **`.github/workflows/claude-review.yml`** — carries all six decisions. Both
  jobs gain `--allowedTools`; the review job gains `continue-on-error: true` on
  the action step plus a `Classify the review outcome` step that owns the job's
  exit code. That step is inline in the workflow **on purpose**: the
  workflow-validation check covers this file only, so a `.github/scripts/*.sh`
  helper would be an unvalidated input to a job holding a `pull-requests: write`
  token.
- **`CLAUDE.md`** — gains the operative rule (how to read the check, and the
  self-skip gotcha below), per this tier's `ADR records the why, CLAUDE.md keeps
  the rule` split. The reasoning stays here.
- **This PR cannot test its own change.** It edits the workflow, so the review
  job will skip itself with a green check, exactly as #96's did. The classify
  step handles that path explicitly (no execution file + a successful step = a
  legitimate skip, exit 0). **First real exercise is the PR after this one
  merges**, and it should be checked for a posted comment rather than a green
  check — a green check is what the broken version produced too.
- **`scripts/link-check.cjs`, `scripts/mobile-qa.cjs`** — unchanged, and now
  named in the review prompt as the checks the agent should not duplicate. If
  either is renamed or retired, the prompt's scoping paragraph goes stale.
- **`decisions/README.md`** — index row.
- **Commit `3b1c8e3` (#96)** — its rationale comment is superseded by this
  record and was removed from the workflow. Its *diagnosis* was right and is
  quoted in *Context*; only its fix is reversed.
- **Not governed here:** the `pull_request: [opened]`-only trigger and the
  `cancel-in-progress: false` concurrency rule. Both are cost-incident
  mitigations recorded in the workflow's own comments and neither is touched.

## Consequences

- **An inconclusive review can be merged past without a red X.** This is the
  cost of Decision 3 and it is accepted deliberately: the check is advisory (it
  fires once, on open, and is not a required status), so its power was always
  persuasive rather than mechanical. A comment that says *nothing here was
  reviewed* persuades more honestly than a red X that says nothing at all. If
  the review is ever made a required check, this decision needs revisiting —
  that is the condition under which it flips.
- **The gate now depends on the agent choosing to post.** Decision 2 moves the
  signal into a comment, and a comment is something the agent has to decide to
  write. That is a weaker guarantee than an exit code. It is mitigated by the
  prompt's explicit instruction to post incrementally and to post early when
  short on turns, and it is monitorable: a run that ends `success` with no
  comment on the PR is the new silent-failure shape to watch for.
- **The review will cost more, because it will do more.** #101 cost $0.55 to
  review nothing. A run that actually reads the diff and posts findings will cost
  at least that. The bound is unchanged (one run per PR open, cheap tier, 25
  turns); what changes is that the money buys something.
- **The false-clean risk is now real, and it was not before.** A review that
  never posted could not tell you a broken PR was fine. One that posts can. This
  is a genuine new exposure and it is the correct trade — the QA job's
  deterministic checks (links, mobile overflow, private-repo names, published
  metrics) remain the enforcing gate, and the Claude review remains advisory on
  top of them.
- **Two failures of this workflow are now indistinguishable from success at a
  glance.** The self-skip on workflow edits and a genuine clean review both show
  green with no comment. The classify step logs which one happened; the check
  list does not. Accepted as the cost of keeping the self-skip non-fatal.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| Raise `--max-turns` again (25 → 40) | The third time would be the second time it did not work. 11 of #101's 26 turns were denials; the budget was not the constraint. Fixing the ceiling without fixing permission just moves the exhaustion point |
| Keep turn exhaustion red, only fix the tools | Fixing the tools makes exhaustion *rarer*, not impossible — a large PR will still hit it, and the red X would still be a non-verdict the author is expected to merge past. The training effect is the harm, and it survives a lower failure rate |
| Emit a genuine `neutral` check conclusion via the Checks API | The honest representation, and GitHub Actions cannot set a job to neutral from a step. It needs `checks: write` and a separately created check run — real machinery, a wider token, and a second check in the list — to encode what one sentence in a comment already says. Revisit if the review ever becomes a required check |
| Make the review a required status check | Would make the red X mean something. It would also block merges on a probabilistic reviewer that had just been demonstrated to produce nothing for ten days. Earn it first: this decision is what makes the check trustworthy enough to have that conversation later |
| Turn on `show_full_output` to see which tools were denied | Would have identified the 11 denials in minutes, and dumps every tool result into a public Actions log. The action's own input description warns it "may contain secrets, API keys, or other sensitive information." Decision 5 surfaces the count instead, which is the part that was actually needed |
| Grant broad `Bash` rather than four `gh` prefixes | The job holds `pull-requests: write` and runs on same-repo PRs, so the blast radius is not theoretical. Narrow prefixes cost nothing here — the review needs to read a diff and leave a comment, and that is exactly what is granted |
| Drop the automated review; keep only `@claude` on demand | Defensible, and it was the real status quo — an on-demand flow that worked plus an automated one that did not. Rejected because the automated pass is the one that catches what you did not think to ask about, which is the entire value of a review-on-open. It deserved one attempt at working before being judged |
| Fix the workflow and skip the record | Rejected on `ADR-003`'s history and `ADR-004`'s: the last attempt put its reasoning in a commit-message comment, and four days later the same failure recurred with the diagnosis sitting unread in the file it described. A decision that lives only in a diff is not reviewable as a decision |

---

## Amendment — 2026-07-24: the ceiling was a constraint too, and the escape hatch was broken

This record's *Alternatives Considered* rejected "Raise `--max-turns` again (25 →
40)" on the grounds that "the budget was not the constraint." That reasoning was
sound on the evidence it had — 11 of PR #101's 26 turns were denials — and it
invited its own test. The test ran and came back the other way.

**What was observed.** PR #105 was the first PR to exercise the fixed workflow. It
is a 2-file, 123-line diff, far smaller than #101. The review job hit
`error_max_turns` at 26 turns with **`permission_denials_count: 0`**. Decision 1's
tool grant worked exactly as intended; the run still ran out of road.

So both halves were constraints, not one. With permission fixed, a *small* diff
still exceeds 25 turns to read, judge, and publish. `--max-turns` is now **40** on
the review job, sized from that measurement rather than guessed at, and the
classify step still reports honestly if 40 exhausts.

**The more serious defect: the documented remediation could not work.** Decision 3
tells the reader to re-run an inconclusive review by commenting `@claude`, and
`CLAUDE.md` repeats it. That routes to the **mention** job — which was capped at
**8** turns, one third of the ceiling the review job had just exhausted doing the
same work. Confirmed on #105: the re-run died at 8 turns having posted only a
checklist of what it intended to review.

The mention job's cap was reasoned as "a deliberate hard cap on an owner-triggered,
**conversational** flow." That was correct for the flow it described. This record
then quietly changed what that path is for — making it the recovery route for a
full review — without re-examining a limit sized for chat. **A remediation that
routes heavier work to a smaller budget is not a remediation.** The mention job is
now matched to the review job at 40; it stays owner-only, so the cost guard there
is the trigger, not the turn count.

**The general lesson, which is why this is an amendment and not a commit message:**
when a decision repurposes an existing path, its limits must be re-derived for the
new load. The bug was not in either number on its own — 25 was defensible, 8 was
defensible — it was in changing the job of the `@claude` path while leaving the
budget that was sized for its old job.

**Downstream surfaces for this amendment:**
- `.github/workflows/claude-review.yml` — both `--max-turns` values, and the
  superseded rationale comments on each.
- `CLAUDE.md`'s "Reading the Claude Review check" section — its `@claude`
  remediation instruction is now true; it was not before.
- **This change cannot test itself, for the same reason the original could not:**
  editing the workflow makes the review job self-skip. First real exercise is the
  PR after this merges, and it must be judged by a posted comment, not a green
  check.
