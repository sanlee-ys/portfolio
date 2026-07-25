# ADR-005: A red review check means the tooling broke, not that the PR is bad

**Status:** Accepted; amended five times — Decision 4 reversed and the remediation
path resized on first measurement (2026-07-24, *Amendment*); Decision 1's tool grant
completed and Decision 5's denial signal fixed and escalated to red (2026-07-24,
*Amendment 2*); the redden calibrated to fire only on a *silenced* review, not a
survived denial, after a smoke test falsified Amendment 2's "rare" assumption on the
first real review (2026-07-25, *Amendment 3*); the denial signal made actionable —
naming the *tool* named nothing, because every shell command is called `Bash` — and
the review finally told what toolset it holds, after six consecutive reviews hit
denials and three of them died silent (2026-07-25, *Amendment 4*); the cause of those
six recovered by local reproduction and found to be no permissions defect at all —
a detached merge-ref checkout broke the prompt's own first command, and the agent
*asked a human for approval* and waited (2026-07-25, *Amendment 5*)
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
- **Amendment 3 below** calibrates Amendment 2's escalation: a denial reddens only
  when the review posted no verdict (the #108 silence); a denial a completed review
  survived (#111) stays green with a warning that names the denied tools. It also
  makes the classify step extract those names. Amendment 2's "redden on any denial"
  is narrowed, not reverted; the core grant and counter fix are confirmed, not
  changed.
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

---

## Amendment 3 — 2026-07-25: the smoke test falsified "rare," on the first real review

Amendment 2 escalated any tool denial to a red check and named the cost honestly:
it would also redden a PR whose review *was* posted but that hit a stray denial. It
"accepted" that edge by reasoning denials would be "near zero" after the grant, and
it deferred the precise rule — redden only when a denial coincides with no verdict —
as too fragile to be worth the classify-step complexity.

Because Amendment 2 edits the workflow, it could not test itself (the self-skip, for
the third time). The verification was a deliberate throwaway PR — #111, a nine-line
markdown file whose only purpose was to trigger a real review once the fix was live.
It falsified the "rare" assumption immediately.

**What #111 showed.** The core fix worked exactly as intended: the review read the
diff, checked the one internal link by hand, and posted a substantive verdict — the
thing #108 could never do. `subtype=success, turns=11`. The counter read `denials=3`
(Amendment 2's fix working; the old code would have read 0). And Amendment 2's
escalation fired: the check went **red**.

But the three denials had silenced nothing. The agent posted a complete, correct
verdict; the denials were speculative reaches for tools it did not need and did not
miss. So the red was exactly the failure this record was written to prevent: **a red
check that is not a verdict on the PR, on a PR that was reviewed fine.** Amendment 2
reintroduced the meaningless red it set out to kill — narrowed to the denial case,
but the same disease. On a trivial diff, on the first real review, "rare" was every
run.

A second, quieter defect surfaced with it: the classify step *counted* the denials
but did not *name* them, and `show_full_output` is off, so "widen `--allowedTools`"
was not actionable — you could see that three tools were denied and had no way to
learn which three. Tool *names* are safe to surface even when tool *outputs* are not;
Amendment 2 conflated the two and logged neither.

**The decision.** Calibrate the redden by the one thing that separates a fatal denial
from a survivable one: **did the review post a verdict?**

- **Denial + no verdict → red.** This is #108 — denied into silence, the job could
  not do its work. Unchanged in spirit from Amendment 2.
- **Denial + a verdict → green,** with a workflow warning naming the denied tools.
  This is #111 — the review worked; the denial is a grant to tune, not a failure to
  report. The verdict comment carries the review; the warning carries the tooling
  note. Two channels, as Decision 2 intended.

"Did it post a verdict?" is read from the PR: did `claude` author an issue comment.
The review runs once, on open, so at classify time the only such comment is this
review's summary (its prompt mandates one); the classify step's own comment is
authored by `github-actions`, so it is never miscounted. The step now names the
denied tools in both the log line and the red comment, so the grant can be widened
without guessing.

This is not a reversal of Amendment 2 — it is the narrower rule Amendment 2 *named as
the next step* and declined to build. What changed is the evidence: Amendment 2
judged the precise rule not worth its complexity because it expected the sharp edge
to be rare; #111 measured it at 100% of reviews, which is the "measure, then tune"
the first Amendment preached. The complexity is worth it now because the alternative
— a check that is red on every good review — is the thing that trains people to
ignore checks.

**What is left unfixed, deliberately.** Denials are now *visible* (named) but not
*eliminated*: the agent will keep reaching for tools it lacks, and each such review
is green-with-a-warning rather than silent. Whether to also *grant* those tools (so
denials reach zero and the warning stops) is left to observation — the warning now
names them, so the next few reviews will say what they are, and the grant can be
widened against data instead of guessed at. A green check with a named-tool warning
is an honest resting state; pre-granting tools the review does not need, just to zero
a counter, is not.

**The general lesson.** Amendment 2 accepted a sharp edge by reasoning about how
often it would fire. One disposable PR measured it in three minutes and the reasoning
was wrong by two orders of magnitude. A verification PR is cheap; a decision defended
by "this will rarely happen" is not — and for a workflow that self-skips its own
review, the throwaway smoke PR is now the standard way to check any change to this
file before trusting it.

**Downstream surfaces for this amendment:**
- `.github/workflows/claude-review.yml` — the classify step gains a `DENIED_TOOLS`
  extraction, a `POSTED` verdict-check via `gh pr view`, and a split of the denial
  branch into red-on-silence vs green-with-warning. The subtype case is unchanged.
- `CLAUDE.md`'s "Reading the Claude Review check" section — the **Red** bullet now
  says *denied into silence*, and **green + a comment** notes the possible tooling
  warning.
- `decisions/README.md` — the ADR-005 open-verification item is now **closed**: #111
  was the first real review and it posted a verdict (the proof), as #104 closed the
  previous one. A note records the calibration.
- **This change cannot test itself** either — a fourth time; editing the workflow
  self-skips its review. Verify with another throwaway PR after this merges, judged
  by: a good review that posts a verdict goes **green with a named-tool warning**,
  not red.

**Unchanged by Amendment 3:** the core grant (`Read,Grep,Glob`) and the counter fix
stand — #111 confirmed both. Turn exhaustion is still inconclusive and non-red.
Decisions 2, 4, 6 stand; Decision 5, already amended once, is calibrated further
here.

---

## Amendment 4 — 2026-07-25: "Bash" is not the name of a command

Amendment 3 closed by declining to widen the grant, on an explicit promise: the
classify step now **names** the denied tools, so "the next few reviews will say
what they are, and the grant can be widened against data instead of guessed at."

Six reviews of data arrived within hours. Every one of them named the same four
letters.

| Run | PR | Turns | Denials | Named | Outcome |
|---|---|---|---|---|---|
| `30159316257` | #113 | 7 | 4 | `Bash` | **red — silenced** |
| `30164085590` | #114 | 34 | 10 | `Bash` | green, verdict posted |
| `30164267464` | #115 | 16 | 2 | `Bash` | green, verdict posted |
| `30164546592` | #116 | 11 | 8 | `Bash` | **red — silenced** |
| `30164667372` | #117 | 24 | 11 | `Bash` | green, verdict posted |
| `30164713372` | #118 | 7 | 4 | `Bash` | **red — silenced** |

`Bash` is not a command. It is the tool *class* every shell invocation reports
under, so a denial of `node scripts/link-check.cjs` and a denial of `ls` are
indistinguishable in the only record that survives the run. Amendment 3 built an
instrument, read it six times, and learned nothing from it — which is Amendment
2's own lesson (*"a green light on an unread meter is not the same as a green
light"*) recurring one layer further down. This one was read. It just had nothing
to say.

**The data is not recoverable after the fact.** `execution_file` is written to the
runner's filesystem and nothing uploads it as an artifact, so it is destroyed with
the runner. The classify step is the only thing that ever reads it, and it extracts
`.tool_name`. Re-running the review does not help: a re-run produces a *new* denial
set under the same uninformative label. There was no path to confirming any
hypothesis about these six runs, and there would have been none for the seventh.

**Amendment 3's own verification came back red, and nobody wrote it down.** Its
downstream list prescribed a throwaway PR judged by "a good review that posts a
verdict goes **green** with a named-tool warning, not red." That PR was #113. It
went **red at 7 turns with 4 denials, having posted nothing.** The prescribed
verification ran, failed, and left no mark on the record — the check was performed
and its result was not read, which is the same failure as the unread meter wearing
process clothes instead of code.

**The tempting fix, and why it is wrong.** The obvious reading of #116 is
PR-specific: it rewrote the README to describe what each of six CI gates enforces,
so a reviewer verifying those claims would try to *run* them, and `node
scripts/*.cjs` is not granted. Plausible, and the table falsifies it. #114 was a
sitemap and JSON-LD change; #115 was a `CLAUDE.md` paragraph about a browser
prerequisite; #118 was a browser-path fix. None of them describe gate behaviour and
every one of them hit Bash denials. **The denials are not about what the PR
contains.** They are constant, which points at the agent's standing model of its own
capabilities, not at any diff.

Widening the grant against that reading would have been the fourth guess in this
record's history, and the first three each cost a cycle. Worse, the specific widening
suggested — `Bash(node scripts/:*)` — grants a PR the ability to execute its *own*
modified `scripts/*.cjs` inside a job holding `pull-requests: write`, because the
checkout is the merge ref. The same-repo gate bounds the blast radius to the owner;
the *Alternatives* table's reasoning against broad Bash still applies, and the
review does not need it anyway — the `qa` job runs all six gates on the same PR.

### The decision

**Make the denial legible and stop causing denials, before granting anything.**

1. **Log the denied CALL, not the tool class.** The classify step now renders each
   denial as `Bash: node scripts/link-check.cjs` — the tool name plus its
   `tool_input` (`.command` for Bash, `.file_path` for Read, `.pattern`, `.url`),
   collapsed to one line and capped at 160 characters. It goes in the log line, in
   the green-with-warning annotation, and as an indented code block in the red PR
   comment. This is what Amendment 3 meant to build.

2. **Tell the agent what it holds.** The prompt never stated the toolset, so the
   agent discovered its grant by hitting walls — which is exactly the shape of the
   three silenced runs (7 turns/4 denials, 11/8, 7/4: short, denial-saturated, and
   ended `subtype=success`, meaning it decided it was *finished*, not that it ran
   out of road). The prompt now names the six tools, says there is no general shell,
   says the `qa` gates have already run and are not the review's to reproduce, and
   says never to end a run without posting the summary. This grants nothing and
   costs nothing.

3. **Do not widen `--allowedTools`.** Deliberate, and the point of the amendment.
   The next review's denials will name actual commands; the grant gets tuned then,
   on evidence. Fixes 1 and 2 are upstream of the grant question and one of them may
   dissolve it.

**Why logging a tool input is not `show_full_output`.** The *Alternatives* table
rejected `show_full_output` because it dumps tool **results** — repo content, API
responses, whatever a command read — and the action's own input description warns
they "may contain secrets." A denied call has no result: it never executed and read
nothing. What is logged is a string the agent composed from a public diff, in a
public repo, for a command that did not run. The distinction is between what a tool
*returned* and what the agent *asked for*, and only the first is the hazard that
rule was written about.

**Known gap, left open on purpose.** `actions: read` is granted so the review can
see whether `qa` passed instead of reviewing blind to CI, but no `Bash(gh pr
checks:*)` makes it reachable — a permission granted and unusable since it was
added. It is a real gap and a confirmed one, unlike the rest. It is still folded into
the same data-driven widening rather than fixed alone here, because the whole point
of this amendment is to stop changing the grant on reasoning and start changing it on
denial logs.

**The general lesson.** Amendment 2 shipped a counter that could not count.
Amendment 3 replaced it with a name that could not distinguish. Both were the
correct *category* of fix and both stopped one field short of being actionable, and
in each case the shortfall was invisible until someone tried to *use* the output for
the decision it was built to inform. **An instrument is not validated by firing. It
is validated by someone acting on what it said** — so the test for the next one is
not "did the warning appear" but "could a maintainer widen the grant from it without
opening anything else."

**Downstream surfaces for this amendment:**
- `.github/workflows/claude-review.yml` — the classify step gains `DENIED_LIST` /
  `DENIED_CALLS` / `DENIED_CALLS_MD` and threads them through the warning and the red
  comment; the `prompt` gains a toolset paragraph and a never-end-without-posting
  instruction; the `--allowedTools` rationale comment records the deliberate
  non-widening and the `actions: read` gap. `--allowedTools` itself is **unchanged**,
  as are `--max-turns`, the mention job, and the denial classification logic.
- `CLAUDE.md`'s "Reading the Claude Review check" — the **Red** and **green + a
  comment** bullets now say the denied *calls* are named, not just the tools.
- `decisions/README.md` — the ADR-005 narrative gains this amendment, including that
  Amendment 3's verification (#113) failed unrecorded.
- **This change cannot test itself** — a fifth time, and #112 confirmed the mechanism
  again three hours ago: it edited this workflow and its review self-skipped with no
  execution file at all. Verify on the next PR, judged by **a posted comment or a
  denial log naming real commands** — never by a green check.

**Unchanged by Amendment 4:** every decision above stands. The grant is untouched,
the redden-on-silence calibration from Amendment 3 is untouched, turn exhaustion is
still inconclusive and non-red, and Decision 2's two-channel colour model is what
this amendment is serving rather than revising.

---

## Amendment 5 — 2026-07-25: the denials were real and the diagnosis was still wrong

Amendment 4 was right about its instrument and wrong about one sentence, and the
sentence is the interesting part:

> There was no path to confirming any hypothesis about these six runs, and there
> would have been none for the seventh.

There was a path. The review is a `claude` invocation with a known prompt, model,
ceiling and tool grant — every input is in this file. It can simply be **run again,
locally, against the same PR**, with `permission_denials` captured directly instead
of hoping a future run reports it. That was done for #118, with `gh` shimmed so no
write could reach the live PR, and it produced the answer the runner had thrown away
in about two minutes.

**What the reproduction showed.** With the checkout on a **branch**: a clean review,
**0 denials**. With the checkout **detached** — which is what CI actually has — the
failure reproduced immediately, and the agent's own final message was the whole bug:

> The `gh pr list` call needs your approval to run — go ahead and approve it (or let
> me know the PR number directly) so I can start the review.

**The mechanism.** This job checks out the **merge ref**, deliberately and correctly,
and the comment on that step explains why. A merge-ref checkout is **detached**. `gh`
infers a PR from the current branch, so `gh pr diff` — *the first instruction of the
review prompt* — fails with `could not determine current branch`. The agent then
tries to discover the PR number, and every route to it (`gh pr list`, `gh api`,
`git log`) sits outside the grant. It gets denied, and then it does the thing an
interactive assistant is built to do: **it asks for permission and waits.** In an
unattended run nobody answers, so it terminates `subtype: success` — *finished*, not
out of road — having reviewed nothing. That is exactly the `turns=7 denials=4`
no-verdict signature of #113 and #118.

**So four amendments in a row asked the wrong question.** Each one asked *which tool
is missing?* and none asked *why did it stop?* The framing was set by Decision 1,
which was correct at the time — the pilot really was a permissions failure — and it
outlived its evidence. No widening of `--allowedTools` would have fixed this: the
agent was never blocked on a capability, it was blocked on **a reply**. Granting
`gh pr list` would have removed this trigger and left the shape intact, so the next
ungranted call stops the review dead the same way.

Two details make it sharper. The workflow has known the PR number the entire time —
`github.event.pull_request.number` is already interpolated into the classify step a
few lines below the prompt that goes looking for it. And the answer was sitting in
the result payload in plain English on all six runs: the classify step reads
`.permission_denials` and has never once looked at `.result`.

**The decision.**

1. **Pass the PR number into the prompt** and require it on every `gh` call, naming
   the detached-merge-ref reason so the constraint is legible rather than a rule to
   obey. The discovery call is not granted; it is made **unnecessary**. Verified in
   reproduction: same detached HEAD, **0 denials**.

2. **Forbid waiting for approval.** The prompt now states that nothing can approve a
   denied call, that asking *ends* the review rather than pausing it, and that the
   response to a denial is to reach for a granted tool and post what it has. (1)
   removes the observed trigger; this removes the shape. Amendment 4's toolset
   paragraph tells the agent what it holds; this tells it what to do when it reaches
   past that anyway.

3. **`--allowedTools` stays unchanged**, for the third amendment running and now for
   a stronger reason than "not yet enough data": the denial that mattered was caused
   by a defect in the prompt, and granting it would buy the agent a workaround for
   that defect on a job holding `pull-requests: write`. Amendment 4's `actions: read`
   gap is untouched and still open.

**What this does not settle.** The reproduction recovered `gh pr list` and nothing
else. CI logged 4–11 denials where the local run logged 2, and the local environment
differs in OS, in Claude Code build (2.1.215 vs CI's 2.1.220), and in having no
`mcp__github_inline_comment__*` server. The remaining commands are **not guessed at
here** — Amendment 4's `DENIED_CALLS` is what will name them on the next run, and
this amendment expects to be partially superseded by that data. Both halves are
needed: Amendment 4 made the next failure legible, Amendment 5 removed the cause of
the last six.

**The general lesson.** Amendment 4 concluded that an instrument is validated by
someone acting on its output, which is right. This one adds the step before it:
**when the instrument is blind, reproduce the system instead of waiting for better
telemetry.** Six runs of unusable data were collected across two days and treated as
the only available evidence, because the evidence was framed as *something the
pipeline must report* rather than *something that can be re-created on demand*. A
CI job whose inputs are all committed to the repo is a reproducible experiment, and
the record now says so.

**Downstream surfaces for this amendment:**
- `.github/workflows/claude-review.yml` — the `prompt` gains the PR-number
  interpolation with its detached-merge-ref explanation, and a never-wait-for-approval
  paragraph appended to Amendment 4's toolset block; the `--allowedTools` rationale
  comment records the reproduced cause. `--allowedTools` itself, `--max-turns`, the
  classify step and the mention job are **unchanged**.
- `CLAUDE.md` — **unchanged, and verified so.** This removes a *cause* of the
  denied-into-silence red; it does not change what any colour means, and Amendment 4
  already updated the bullets that name the denied calls.
- `decisions/README.md` — the ADR-005 narrative gains this fifth amendment.
- **This change cannot test itself** — a sixth time, same mechanism. Verify on the
  next PR by **a posted verdict comment**, with `denials=0` in the classify line. If
  denials persist, they now arrive as named commands, which is the point.

**Unchanged by Amendment 5:** every decision above stands, including all of
Amendment 4. The grant is untouched, Amendment 3's redden-on-silence calibration is
untouched, and turn exhaustion is still inconclusive and non-red.
