# portfolio decisions (`ADR-NNN`)

Repo-local decision records for the portfolio site, per the two-tier practice in
[`system/SYS-001`](https://github.com/sanlee-ys/architecture/blob/main/decisions/SYS-001-record-architecture-decisions.md).

| # | Title | Status |
|---|-------|--------|
| [ADR-001](ADR-001-mobile-qa-gate.md) | The mobile QA gate is a contract, enforced in CI | Accepted |

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

Both are real decisions currently living only as `CLAUDE.md` prose, with dates and rationale
already written:

- **AI-use posture: method, not confession** — `CLAUDE.md`, opens *"Decided 2026-07-11"*,
  names two rejected failure modes (apologetic, label-y). Commit `04f2ca7`.
- **Private repos: never mention, never link** — `CLAUDE.md`. Has the most interesting
  history in the repo: first codified 2026-07-01 as a `ROADMAP.md` checkbox, promoted to a
  standing rule 2026-07-03 *after the same leak recurred* in a cross-repo write-up. That
  escalation is exactly what a status lifecycle is for, and it is currently recorded only in
  a commit message (`14b924b`).

Also inbound, once this tier exists to receive it: `classifier/ADR-006` (adopt the autonomy
ladder as the portfolio spine) is a portfolio decision filed under the classifier because the
classifier is its protagonist. The protagonist of a decision is not its owner, and the
mis-filing already caused a live defect — `ADR-006` still lists BM25 grounding as the shipped
L2 rung after `ADR-012` retired it.

## Conventions

- Identifier and filename are both `ADR-NNN` (`ADR-001-short-title.md`)
- Shape: Context → Decision → Downstream surfaces → Consequences → Alternatives Considered
- Cross-tier references are prefixed: `system/SYS-009`, `portfolio/ADR-001`, `classifier/ADR-006`
