# portfolio decisions (`ADR-NNN`)

Repo-local decision records for the portfolio site, per the two-tier practice in
[`system/SYS-001`](https://github.com/sanlee-ys/architecture/blob/main/decisions/SYS-001-record-architecture-decisions.md).

| # | Title | Status |
|---|-------|--------|
| [ADR-001](ADR-001-mobile-qa-gate.md) | The mobile QA gate is a contract, enforced in CI | Accepted |
| [ADR-002](ADR-002-ai-use-posture.md) | State the AI assist as method, not confession | Accepted |
| [ADR-003](ADR-003-private-repo-boundary.md) | Never mention or link private repos; the bar is omission | Accepted |
| [ADR-004](ADR-004-retire-the-lab-as-the-vehicle.md) | Retire the lab as the vehicle; interactive work belongs wherever it argues best | Accepted |
| [ADR-005](ADR-005-review-check-signal.md) | A red review check means the tooling broke, not that the PR is bad | Accepted |

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

Nothing pending. The two decisions listed here when this tier was created — the AI-use
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

Amendment 4 **was** verified, on a disposable PR (#124) opened the moment it merged —
and the result is the best argument in the whole record for building the instrument
before arguing about the fix. The review posted a verdict, the check went green with a
warning, and the warning finally named commands. All four were the agent trying to
discover *which PR it was reviewing*: `env`, `env | grep -i pr`, an `echo` of
`$PR_NUMBER`, and `gh pr list`. Nothing touched `scripts/`, `cat`, `ls`, or `git`. The
gate-running theory that shaped three amendments was simply wrong, and no amount of
reading the diff would have found that out — an agent that cannot name its PR cannot
call `gh pr comment <N>`, which is also the missing mechanism for the runs that died
silent. The fix was to interpolate the PR number into the prompt. **`--allowedTools`
has now survived four amendments unwidened**, every failure blamed on it having turned
out to be something else.

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
