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
