# ADR-005: A red review check means the tooling broke, not that the PR is bad

**Status:** Accepted; Decision 4 amended 2026-07-23 on first measurement (see *Amendment*)
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

4. **The ceiling stays at 25.** *(Amended 2026-07-23 — see the Amendment at the
   end. The reasoning below was wrong, and it is left standing unedited because
   how it was wrong is the useful part.)* Deliberately not raised. Of #101's 26
   turns, 11 were denials; productive turns across observed runs were 13–15.
   Removing the denials returns more headroom than any plausible bump, and it is
   the headroom the comment-posting turns in the new prompt will spend. If 25
   still exhausts,
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
- **`decisions/README.md`** — index row, and the open-verification note added by
  #104. That note is now **closed**: #104's own review posted a comment
  (`turns=22 denials=0`), which is the proof the note was waiting for.
- **The Amendment below touches `--max-turns` only.** No other decision here
  changes with it; Decisions 1–3, 5 and 6 stand as written.
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
| Raise `--max-turns` again (25 → 40) *at the same time as the permission fix* | The third time would be the second time it did not work. 11 of #101's 26 turns were denials; the budget was not the constraint, and raising the ceiling alongside the real fix would have made it impossible to tell which one worked. **Chosen a day later, once measured** — see *Amendment* |
| Keep turn exhaustion red, only fix the tools | Fixing the tools makes exhaustion *rarer*, not impossible — a large PR will still hit it, and the red X would still be a non-verdict the author is expected to merge past. The training effect is the harm, and it survives a lower failure rate |
| Emit a genuine `neutral` check conclusion via the Checks API | The honest representation, and GitHub Actions cannot set a job to neutral from a step. It needs `checks: write` and a separately created check run — real machinery, a wider token, and a second check in the list — to encode what one sentence in a comment already says. Revisit if the review ever becomes a required check |
| Make the review a required status check | Would make the red X mean something. It would also block merges on a probabilistic reviewer that had just been demonstrated to produce nothing for ten days. Earn it first: this decision is what makes the check trustworthy enough to have that conversation later |
| Turn on `show_full_output` to see which tools were denied | Would have identified the 11 denials in minutes, and dumps every tool result into a public Actions log. The action's own input description warns it "may contain secrets, API keys, or other sensitive information." Decision 5 surfaces the count instead, which is the part that was actually needed |
| Grant broad `Bash` rather than four `gh` prefixes | The job holds `pull-requests: write` and runs on same-repo PRs, so the blast radius is not theoretical. Narrow prefixes cost nothing here — the review needs to read a diff and leave a comment, and that is exactly what is granted |
| Drop the automated review; keep only `@claude` on demand | Defensible, and it was the real status quo — an on-demand flow that worked plus an automated one that did not. Rejected because the automated pass is the one that catches what you did not think to ask about, which is the entire value of a review-on-open. It deserved one attempt at working before being judged |
| Fix the workflow and skip the record | Rejected on `ADR-003`'s history and `ADR-004`'s: the last attempt put its reasoning in a commit-message comment, and four days later the same failure recurred with the diagnosis sitting unread in the file it described. A decision that lives only in a diff is not reviewable as a decision |

## Amendment: the ceiling goes to 40 (2026-07-23)

Decision 4 said 25 stays and gave a reason. The reason was wrong, and it is
worth recording *how* it was wrong, because the mistake is subtler than the one
this ADR was written to fix.

The argument was: observed runs used 13–15 productive turns, so removing the
denials returns more headroom than any bump. **Those runs were not reviews.**
Every one of them was an agent that could not see the diff and had no channel to
report on — so 13–15 measured *what giving up costs*, not what reviewing costs.
The number was real; it was a measurement of the broken system, used to predict
the fixed one. Decision 4 reasoned carefully from a baseline that did not exist.

The first working run settled it. #104 (run `30061618828`) reviewed a
**one-paragraph markdown diff** — the smallest reviewable change this repo can
produce — and spent `turns=22 denials=0`, 88% of the ceiling, for $0.45. That is
the floor, not the typical case: reviewing is turn-expensive because it is real
work (read the diff, read the ADR it cites, read `CLAUDE.md`, verify each claim,
post). A PR with several files and actual HTML has nowhere to go.

**`--max-turns` is therefore 25 → 40.** What makes this different from #96's
bump, which this record criticises at length:

- **#96 raised the ceiling instead of diagnosing.** The binding constraint was
  permission, and no measurement was taken. This raise comes *after* the
  diagnosis, with denials confirmed at 0.
- **#96 had no number.** 40 is ~2x a measured floor of 22.
- **#96 could not tell whether it worked.** Decision 5's classify step now
  reports `turns`, `denials` and `cost` on every run, green ones included, so the
  next adjustment is another measurement rather than another guess.

Raising it in the same change as the permission fix was rejected deliberately —
it would have confounded the two, and the confounding is exactly why the #96
lesson took two attempts to learn. Fix one thing, measure, then tune.

Unchanged by this amendment: turn exhaustion still posts *"nothing in this PR was
reviewed"* and still does not go red. A higher ceiling makes that path rarer; it
does not make it wrong. If 40 exhausts on a real PR, the comment will say so with
the numbers attached, and the answer may be a narrower review scope rather than a
third raise — a ceiling that keeps climbing is a scope problem wearing a budget
costume.
