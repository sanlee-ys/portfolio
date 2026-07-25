# ADR-005: A red review check means the tooling broke, not that the PR is bad

**Status:** Accepted; amended twice on 2026-07-24 — Decision 4 reversed and the
remediation path resized on first measurement (see *Amendment*); then Decision 1's
tool grant completed and Decision 5's denial signal fixed and escalated to red
(see *Amendment 2*)
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

4. **The ceiling stays at 25.** *(Reversed 2026-07-24 — it is now 40; see the
   Amendment at the end. The reasoning below was wrong, and it is left standing
   unedited because how it was wrong is the useful part.)* Deliberately not
   raised. Of #101's 26 turns, 11 were denials; productive turns across observed
   runs were 13–15. Removing the denials returns more headroom than any plausible
   bump, and it is the headroom the comment-posting turns in the new prompt will
   spend. If 25 still exhausts, Decision 3 now says so honestly and the next
   adjustment can be made against a measured number instead of a guess. **The
   ceiling was never the binding constraint, and one more bump would have hidden
   that for a third time.**

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
- **The Amendment below touches both `--max-turns` values.** It reverses Decision
  4 (review job 25 → 40) and resizes the mention job (8 → 40) that Decision 3
  names as the remediation path. Decisions 1, 2, 5 and 6 stand as written.
- **Amendment 2 below** adds `Read,Grep,Glob` to the review job's `--allowedTools`
  (Decision 1's grant was one capability short) and rewrites the classify step's
  denial handling: it counts `(.permission_denials | length)` instead of the
  absent `.permission_denials_count`, and escalates any denial from a warning to
  a red job failure that pre-empts the subtype case. Decision 1 is extended and
  Decision 5 is amended (warning → red); Decisions 2, 4 and 6 are untouched.
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

---

## Amendment — 2026-07-24: the ceiling was a constraint too, and the escape hatch was broken

This record's *Alternatives Considered* rejected "Raise `--max-turns` again (25 →
40)" on the grounds that "the budget was not the constraint." That reasoning was
sound on the evidence it had — 11 of PR #101's 26 turns were denials — and it
invited its own test. The test ran and came back the other way.

**Why the original number was junk.** Decision 4 argued from "productive turns
across observed runs were 13–15." **Those runs were not reviews.** Every one of
them was an agent that could not see the diff and had no channel to report on, so
13–15 measured *what giving up costs*, not what reviewing costs. The number was
real; it was a measurement of the broken system, used to predict the fixed one.
Decision 4 reasoned carefully from a baseline that did not exist — which is a
subtler failure than the one this ADR was written to fix, and the reason Decision
4 is left standing unedited above.

**What was observed.** Two runs bracket it, and they agree:

- **The floor.** #104 (run `30061618828`) was the first working review — a
  **one-paragraph markdown diff**, the smallest reviewable change this repo can
  produce. It spent `turns=22 denials=0` for $0.45: 88% of the ceiling on the
  cheapest possible case. Reviewing is turn-expensive because it is real work —
  read the diff, read the ADR it cites, read `CLAUDE.md`, verify each claim, post.
- **The exhaustion.** PR #105 is a 2-file, 123-line diff, far smaller than #101.
  The review job hit `error_max_turns` at 26 turns with
  **`permission_denials_count: 0`**. Decision 1's tool grant worked exactly as
  intended; the run still ran out of road.

So both halves were constraints, not one. With permission fixed, even a *small*
diff exceeds 25 turns to read, judge, and publish — and a PR with several files
and actual HTML has nowhere to go. `--max-turns` is now **40** on the review job,
sized from those measurements rather than guessed at, and the classify step still
reports honestly if 40 exhausts.

**What makes this different from #96's bump, which this record criticises at
length:**

- **#96 raised the ceiling instead of diagnosing.** The binding constraint was
  permission, and no measurement was taken. This raise comes *after* the
  diagnosis, with denials confirmed at 0.
- **#96 had no number.** 40 is ~2x a measured floor of 22.
- **#96 could not tell whether it worked.** Decision 5's classify step now
  reports `turns`, `denials` and `cost` on every run, green ones included, so the
  next adjustment is another measurement rather than another guess.

Raising it in the same change as the permission fix was rejected deliberately —
it would have confounded the two, and that confounding is exactly why the #96
lesson took two attempts to learn. Fix one thing, measure, then tune.

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
- `decisions/README.md` — the open verification item #104 recorded there is now
  **closed**. #104's own review posted a comment (`turns=22 denials=0`), which is
  the proof that note was waiting for.

Unchanged by this amendment: turn exhaustion still posts *"nothing in this PR was
reviewed"* and still does not go red. A higher ceiling makes that path rarer; it
does not make it wrong. If 40 exhausts on a real PR, the comment will say so with
the numbers attached, and the answer may be a narrower review scope rather than a
third raise — **a ceiling that keeps climbing is a scope problem wearing a budget
costume.**

---

## Amendment 2 — 2026-07-24: an ungranted tool and an unread instrument hid each other

Decision 1 fixed two of the review's three missing capabilities and stopped one
short. It correctly diagnosed that plain agent mode grants *nothing* on its own —
no Bash to read the diff, no MCP server to publish a finding — and it granted
both. It did not grant the third: **the ability to read the code being reviewed.**
`Read`, `Grep`, and `Glob` were never in the list, so the review could fetch
`gh pr diff` but could not open a changed file for full context, grep for a leaked
private-repo name, or glob to find one.

The tool list was copied from the action's `examples/pr-review-comprehensive.yml`,
which grants no `Read` either — but that example runs in `track_progress` mode,
which installs tools this plain-agent-mode job never receives. Copying a tool list
across a mode boundary carried a wrong assumption about what was already provided.
The `@claude` mention job never showed the gap because tag mode installs the
default toolset (including `Read`), which is why the mention reviews on #105 and
#108 could open files and verify geometry by hand while the automated job on the
same PRs could not.

**What #108 did.** #108 was an inline-SVG + CSS change — exactly the kind of diff
you cannot review without reading the file, because the geometry is in the markup.
The review agent tried five file reads, all were denied, it burned most of its
eight turns discovering that, and it posted nothing. `subtype: success`,
`permission_denials_count: 5`, zero comments — **green.** The same non-event this
ADR was written to end, in a new costume: last time the agent could not see the
diff *or* publish; this time it could see the diff and publish but could not read
the files, and the observable outcome — a green check with no review — was
identical.

**The instrument that should have caught it was blind.** Decision 5 promised that
any run with denials raises a warning "on green runs too." It never has — on any
run. The classify step read `.permission_denials_count`, but that key does not
exist in the execution log. The saved log is the raw SDK message stream, whose
result message carries the **array** `permission_denials`;
`permission_denials_count` is a field the action derives only for its own stdout
summary (`base-action/src/run-claude-sdk.ts`:
`permission_denials_count: resultMsg.permission_denials?.length ?? 0`). Reading the
absent key returned 0 every time, defaulted by `// 0`. On #108 the proof is
unambiguous: the classify step logged `denials=0` while `turns` (8) and `cost`
(0.1447) matched the action's summary to the digit — the same result object, one
field silently misread. Decision 5's `turns` and `cost` were right because those
fields are in the log; its denial count was structurally always zero.

So the two defects concealed each other. The ungranted tool produced denials; the
instrument meant to surface denials was reading a field that was never there. Each
made the other invisible, which is why a review that did nothing looked exactly
like a review that found nothing — the precise failure this record exists to
prevent, reconstituted one layer down.

**The fixes.**

1. **Grant the third capability.** `--allowedTools` on the review job now leads
   with `Read,Grep,Glob` before the four `gh`/inline tools. Still no broad `Bash`
   — the Alternatives table's reasoning ("the job holds `pull-requests: write`;
   narrow prefixes cost nothing") is unchanged, and file-read tools are read-only,
   so the blast radius does not widen. This is Decision 1 finished, not reversed.

2. **Count the array.** The classify step reads `(.permission_denials | length)`.
   The `turns` and `cost` extractions were correct and are untouched; only the
   denial field was wrong.

3. **A denial reddens the check.** This is the one reversal. Decision 5 made
   denials a *warning* that did not change colour; Amendment 2 makes them a job
   **failure**. The reasoning is Decision 2's own colour model taken literally:
   colour reports tooling health, the posted comment carries the verdict. A
   permission denial is, in Decision 5's exact words, "a bug in the
   `--allowedTools` line, not a finding about the PR" — which is the **red**
   category ("the job could not do its work; fix CI"), not the inconclusive one.
   Turn exhaustion stays non-red because it is genuinely inconclusive — the review
   ran out of road and there is no config to fix. A denial is a config defect with
   a concrete fix, so it gets the colour that means "fix the config." The denial
   check now runs *before* the subtype case and takes precedence over it: a run
   blocked from tools it needed produced an untrustworthy outcome however it
   terminated. It also posts a PR comment, because the #108 lesson is that a signal
   living only in the Actions log is invisible — the warning it replaces was proof
   of exactly that.

**Why red, when Decision 3 argued against a red X the author merges past.** The two
are different categories, and the difference is whether there is anything to fix.
Turn exhaustion is not the author's fault and has no config remedy, so a red X
there is a dead end that only trains merge-past behaviour. A denial *is* a fixable
workflow defect, and its red is **self-extinguishing**: widen the grant and it goes
green and stays green. After this amendment's own grant, denials should be near
zero, so the red is a tripwire that is normally silent and fires only when the
agent reaches for a tool the workflow genuinely withholds — which is exactly when a
maintainer should look.

**The accepted sharp edge.** "Any denial reddens" also reddens a PR whose review
*was* posted but that hit one stray denial — a real review, now wearing a red X.
Accepted, for three reasons: it is rare after the grant; the posted verdict comment
is right there on the PR, so the two-channel model still reads correctly (comment =
the review, red = a tooling nit to fix); and the precise alternative — redden only
when denials coincide with *no verdict posted* — requires the classify step to
parse the SDK message log for a successful comment-posting tool call, which is
fragile across action versions and is exactly the kind of logic this record kept
out of a `pull-requests: write` step on purpose. If the sharp edge ever bites, that
narrower rule is the documented next step; until then, simple-and-slightly-eager
beats fragile-and-precise. (One visible side effect: with denials now pre-empting
the subtype case, the `error_max_turns` comment's "if tool calls denied is
non-zero, fix `--allowedTools`" line is unreachable — a denied run never reaches
it. Left in place rather than widen the diff into a well-tuned comment.)

**The general lesson.** Decision 1 treated "can it review" as one capability, and it
is three — see the diff, read the code, publish the finding — so a fix that grants
two of three leaves a hole shaped exactly like the one it closed. And an instrument
you never watch fire is not evidence of health: Decision 5's warning was trusted
for a day as "no denials seen" when it was structurally incapable of seeing any.
**A green light on an unread meter is not the same as a green light.**

**Downstream surfaces for this amendment:**
- `.github/workflows/claude-review.yml` — the review job's `--allowedTools` (adds
  `Read,Grep,Glob`) and its rationale comment; the classify step's denial
  extraction (`.permission_denials | length`) and its escalation from a
  `::warning::` to a PR comment + `::error::` + `exit 1`, moved ahead of the
  subtype case. The mention job is untouched (tag mode already grants `Read`).
- `CLAUDE.md`'s "Reading the Claude Review check" section — the **Red** bullet now
  names the denial cause, and "green + no comment" is narrowed: a denied-into-
  silence review reddens now, so it is no longer one of the green-no-comment cases.
- `decisions/README.md` — the ADR-005 narrative gains a line recording this second
  amendment.
- **This change cannot test itself**, for the third time and the same reason:
  editing the workflow makes the review job self-skip. First real exercise is the
  PR after this merges, judged by a posted comment, not a green check.

**Unchanged by Amendment 2:** Decisions 2 and 6 stand as written; Decision 4's
ceiling (40) is untouched; turn exhaustion still posts *"nothing was reviewed"* and
still does not go red. Only Decision 1 is extended and Decision 5 is amended.
