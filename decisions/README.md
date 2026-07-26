# portfolio decisions (`ADR-NNN`)

Repo-local decision records for the portfolio site, per the two-tier practice in
[`system/SYS-001`](https://github.com/sanlee-ys/architecture/blob/main/decisions/SYS-001-record-architecture-decisions.md).

| # | Title | Status |
|---|-------|--------|
| [ADR-001](ADR-001-mobile-qa-gate.md) | The mobile QA gate is a contract, enforced in CI | Accepted |
| [ADR-002](ADR-002-ai-use-posture.md) | State the AI assist as method, not confession | Accepted |
| [ADR-003](ADR-003-private-repo-boundary.md) | Never mention or link private repos; the bar is omission | Accepted |
| [ADR-004](ADR-004-retire-the-lab-as-the-vehicle.md) | Retire the lab as the vehicle; interactive work belongs wherever it argues best | Accepted |
| [ADR-005](ADR-005-review-check-signal.md) | A red review check means the tooling broke, not that the PR is bad — **on-demand via `@claude` only** since 2026-07-26 (Amendment 7) | Accepted |
| [ADR-006](ADR-006-hand-written-html-or-a-generator.md) | Hand-written HTML, or a static site generator? | **Proposed — open** |

## Why this tier was missing

This repo had no `decisions/` folder until 2026-07-18. A two-tier audit of the system's 38
decision documents found something worth stating plainly, because it cuts against the
assumption the audit started from.

The hypothesis was that repos without a local tier push their decisions *upward*, inflating
the system log. That is what happened to the architecture repo. **It is not what happened
here.** Not one portfolio decision ever became a `SYS` entry. They were made, dated, and
written down — in `CLAUDE.md`. The missing tier produced **invisibility, not inflation**.

That matters for a site whose own metadata describes it as *"A decision log."* The homepage
documents decisions about the classifier, the contracts, and the model tier — all other
repos' decisions. Its own were the only ones with nowhere to be cited from.

There is also a rule-versus-practice gap this closes. `SYS-001`'s Alternatives table
explicitly rejects *"Leave decisions in CLAUDE.md / commit messages"* on the grounds that
they are *"not discoverable or reviewable as a set, and no status lifecycle."* This repo was
doing exactly the rejected thing, and `ROADMAP.md` says so in as many words: *"Checkboxes are
the state; the notes are the reasoning, kept in the same spirit as the ADRs."*

## The split: ADR records the why, `CLAUDE.md` keeps the rule

Moving these decisions out of `CLAUDE.md` would be a mistake, and this tier does not do it.
`CLAUDE.md` is read by agents as **operative instruction** — the mobile gate must stay there
as an instruction to run, or it stops being run. The ADR carries the reasoning, the
alternatives, and the status lifecycle; `CLAUDE.md` keeps the imperative and cross-links.
Nothing is deleted from `CLAUDE.md` by adding a record here.

## Still to record

**One open question: [`ADR-006`](ADR-006-hand-written-html-or-a-generator.md).** It is a
deliberate **stub** — status *Proposed*, with *Decision* and *Consequences* left empty. It
holds the evidence from the 2026-07-26 front-end review (12,150 words across 8 measured
pages, ~55 minutes to read; 13 hand-duplicated page shells; the migration checklist of
seven CI gates, the `data-metric` spans, and `resume.html`'s standalone-for-PDF
constraint) so that a scoped session can decide without re-deriving any of it. The record
exists *before* the decision on the same reasoning [`ADR-004`](ADR-004-retire-the-lab-as-the-vehicle.md)
was written before its migration: the question turns on reversing a stated property
(`CLAUDE.md`'s "no build step") and on whether a generator undercuts ADR-004's
learning-vehicle premise, and a reversal deserves a reviewable record rather than a diff.

The earlier decisions — the AI-use
posture and the private-repo boundary — were recorded on 2026-07-18 as
[`ADR-002`](ADR-002-ai-use-posture.md) and [`ADR-003`](ADR-003-private-repo-boundary.md). Per
the split above, both remain in `CLAUDE.md` as operative instruction; the ADRs carry the why.

[`ADR-004`](ADR-004-retire-the-lab-as-the-vehicle.md)'s migration was carried out on
2026-07-23: the lab section is gone, `loop-replay.html` now lives in `projects/`, and the
learning log moved to the colophon. The ADR was written before the migration on purpose — it
reverses two previously written rules, so the reversal wanted a reviewable record rather than
a diff — and its *Downstream surfaces* section served as the checklist.

[`ADR-005`](ADR-005-review-check-signal.md) shipped on 2026-07-23 with one open
verification item — the record could not be closed by its own PR, because editing
`.github/workflows/claude-review.yml` makes the Claude App skip the review on that same
PR, so the change landed green without ever running. **Closed the same day:** the next PR
(#104) got a posted comment from the review job at `turns=22 denials=0` — the first review
comment the job has produced since the 2026-07-13 pilot. The proof was the comment, not
the green check; a green check is what the broken version produced for ten days.

That first measurement immediately amended the record. Decision 4 had argued the turn
ceiling should stay at 25, reasoning from runs that used 13–15 turns — but those runs were
the *broken* ones, so the number measured what giving up costs rather than what reviewing
costs. A working review of a one-paragraph diff spent 22. The ceiling went to 40 and the
ADR carries an *Amendment* section saying so, kept rather than edited away because the
shape of the error — careful reasoning from a baseline that did not exist — is the part
worth remembering.

The same amendment caught a second defect the ceiling had been hiding: ADR-005 made
`@claude` the documented way to recover an inconclusive review, but that path ran at 8
turns — one third of the job it was supposed to rescue. A remediation routed to a smaller
budget than the thing it remediates is not a remediation; both are now 40.

A second amendment landed the same day, off PR #108 — an inline-SVG diff you cannot
review without reading the file. It surfaced that the review job still granted no
`Read`/`Grep`/`Glob` (agent mode grants only what is listed, so the diff was reachable
but the files were not), and the agent burned five denied file-reads and posted nothing,
green. That same run proved the denial counter had never worked: it read
`.permission_denials_count`, a field absent from the execution log — the raw SDK message
carries the array `permission_denials` — so Decision 5's warning had been reading 0 on
every run. Both are fixed; a denial now **reddens** the check ("fix CI") rather than
warning into a log nobody reads.

A third amendment (2026-07-25) closed the loop and corrected the second. The tool-grant
change could not test itself (editing the workflow self-skips its review), so a
disposable smoke PR (#111) was opened to trigger a real review. It **confirmed the core
fix** — the review read the diff, validated an internal link, and posted a real verdict,
the first the automated job has produced end-to-end — which closes the open verification
item the same way #104 closed the last one. But it also falsified Amendment 2's bet that
reddening on *any* denial would rarely bite: the agent posted a good verdict yet made 3
speculative denied calls, so a clean review went red on turn one — the meaningless-red
disease, reintroduced. Amendment 3 calibrates it: a denial reddens only when the review
posted **no verdict** (true silence); a denial a completed review survived stays green
with a warning that now **names** the denied tools, so the grant can be tuned against
data instead of guessed at.

A fourth amendment (2026-07-25) is what happened when someone tried to do that. Six
reviews landed within hours of the third, every one of them with denials and three
silenced outright — and all six named the same thing: `Bash`. That is the tool *class*
every shell command reports under, so the instrument built to make the grant tunable
could not distinguish `node scripts/link-check.cjs` from `ls`, and the execution log
that holds the real answer is destroyed with the runner. Amendment 3's own prescribed
verification (#113) had already come back **red** and gone unrecorded, which is the
same failure in process form. The fix names the denied **call**, not the class; tells
the review what toolset it actually holds, since the three silenced runs were all short
and denial-saturated and look like an agent discovering its permissions by hitting
walls; and pointedly **does not widen the grant**, because doing so on this evidence
would have been the fourth guess in a record whose first three each cost a cycle.

The thread running through all four: a counter that could not count, then a name that
could not distinguish. Both were the right kind of fix and both stopped one field short
of being usable, and neither shortfall showed until someone tried to make a decision
from the output. **An instrument is validated by someone acting on what it said, not by
it firing.**

A fifth amendment (2026-07-25) answered the question the fourth had declared
unanswerable. Amendment 4 concluded there was "no path to confirming any hypothesis
about these six runs" — but every input to the review is committed to this repo, so it
can just be **run again locally** against the same PR with the denials captured
directly. Doing that for #118 took minutes and produced the cause: the job checks out
the **merge ref**, which is detached, so `gh` cannot infer a PR from a branch and
`gh pr diff` — the prompt's own first instruction — fails outright. The agent then goes
looking for the PR number, is denied, and **asks for approval and waits**, which in an
unattended run is silence. So it was never a permissions defect: the agent was blocked
on a *reply*, not a capability, and no widening would have fixed it. The prompt now
passes the number the workflow has known all along, and tells the agent that nothing
can approve a denied call. The grant stays unchanged for the third amendment running.
**When the instrument is blind, reproduce the system rather than wait for better
telemetry** — a CI job whose inputs are all in the repo is a reproducible experiment.

**Verified, and recorded this time.** Amendments 4 and 5 both shipped unexercised, for the
sixth time — editing the workflow self-skips its own review. The disposable smoke PR (#125)
ran on 2026-07-25 and came back:
`subtype=success turns=5 denials=0 cost_usd=0.1207 denied_tools=[]`, with a posted verdict
comment. **Zero denials — the first review in this repo's history to record any**, against
4, 10, 2, 8, 11 and 4 on the six runs before it, and at roughly a seventh the turns and the
cost of the worst of them (#114, 34 turns / $0.9117). That closes the verification item
Amendment 5 opened, and it is
written down here deliberately: Amendment 3's prescribed verification (#113) *also* ran, came
back **red**, and left no mark on the record until Amendment 4 went looking — which is the
same unread-instrument failure in process clothing. A verification whose result nobody
records is not a verification.

A sixth amendment (2026-07-25) took the fifth's lesson one layer out. All five of the
others close with *"this change cannot test itself"* — true of the **review**, which
self-skips when this workflow is edited, and quietly extended to the **classify
step**, which is ordinary bash reading a JSON file and was testable the whole time. It
now has a suite that runs the step's real text, extracted from the workflow so it
cannot drift, against synthetic execution logs with `gh` stubbed — the same
reproduce-it move Amendment 5 made against the review, applied to the thing that
reports on it. Thirteen of its fourteen fixtures passed against the merged code, which
is what makes the fourteenth worth reading: the denied-command extraction was guarded
at the whole-program level, so a single malformed element discarded the commands for
**all** of them and the comment fell back to *"see the job log"*, where
`show_full_output: false` means they are not there either. A dead end, on the one path
where those commands are the only thing to act on. The guard is now per-field. The
defect is minor and was never observed in production; the five amendments that shipped
with no way to find one are the finding.

A seventh amendment (2026-07-26) ended the automated pass. `ADR-005`'s *Alternatives*
table had rejected "drop the automated review, keep only `@claude`" on an explicit
condition — *"it deserved one attempt at working before being judged"* — and six
amendments were that attempt. The lane now works and therefore costs money on every PR,
so the trigger is gone and the review fires only when asked. Two follow-on effects were
handled rather than noted: the `mention` job was **folded into** the review job instead
of left as the survivor (deleting the unreachable review job would have taken the review
prompt and all of this classify machinery with it, downgrading `@claude` exactly as it
became the only path), and Amendment 3's verdict probe — which assumed "the review runs
once, on open" — now filters comments by a timestamp taken before the run, so a
re-review that gets silenced still reddens. The classify suite's fourteen fixtures pass
unchanged, which is Amendment 6's investment paying off on the first change after it.

`classifier/ADR-006` (adopt the autonomy ladder as the portfolio spine) was considered for
this tier and **deliberately not moved**. Its inbound citations and its living spec
(`docs/specs/autonomy-ladder.md`) both live in the classifier repo, so relocating the record
would break those links without moving the thing they describe. The defect cited as the
argument for moving it — `ADR-006` listing BM25 grounding as the shipped L2 rung after
`ADR-012` retired it — has since been fixed in place by an amendment to `ADR-006`. The
mechanism here is the cross-tier citation (`classifier/ADR-006`), not relocation.

## Conventions

- Identifier and filename are both `ADR-NNN` (`ADR-001-short-title.md`)
- Shape: Context → Decision → Downstream surfaces → Consequences → Alternatives Considered
- Cross-tier references are prefixed: `system/SYS-009`, `portfolio/ADR-001`, `classifier/ADR-006`
