# ADR-002: State the AI assist as method, not confession

**Status:** Accepted
**Date:** 2026-07-11 (recorded as an ADR 2026-07-18)
**Deciders:** San Lee

---

## Context

Every public surface that makes a "who built this" claim has to say something about how the
site and the projects behind it were actually built, because an AI (Claude) did most of the
typing. The colophon had already settled on a framing and states it in the first paragraph:
San sets the direction, the contracts, and the bar; Claude does most of the typing; and the
output is verified against the real repos before it ships.

The problem was drift. Each new surface — a bio, a README intro, a project writeup — re-invented
how to say it, and the re-inventions pulled in two opposite directions: toward a confession
("full disclosure…") or toward a label ("agentic orchestration"). The commit that introduced
this rule (`04f2ca7`, 2026-07-11) names the drift as the motivation directly: make the
colophon's framing the recorded canonical posture "so other surfaces align to it instead of
drifting back."

The rule was written into `CLAUDE.md` on 2026-07-11 and the same pass aligned the surfaces that
were already out of step: the GitHub bio and the profile README intro. This ADR records the
reasoning; the operative instruction stays in `CLAUDE.md` where agents read it.

## Decision

**The colophon's framing is canonical, and other surfaces align to it rather than
re-deriving one:** *San sets the direction, the contracts, and the bar; Claude does most of
the typing; the evals and postmortems are the proof.* Copy that references the AI assist
states it as directed work, in that framing.

Two failure modes are named and rejected:

1. **Apologetic** — "full disclosure", "disclaimer", "I have to admit". The assist is a
   competency being demonstrated, not a caveat to preempt.
2. **Label-y** — "agentic orchestration" or similar used as a self-description. Describe the
   practice; the skeptical-senior-engineer reader credits artifacts, not vocabulary.

**Honesty is unchanged by this rule.** It governs how the assist is phrased, not whether it is
disclosed: Claude is named plainly on every surface that makes a "who built this" claim. The
rule is a voice constraint, not a reduction in disclosure.

## Downstream surfaces

- `CLAUDE.md` — carries the operative voice rule. Canonical for *what to write*; this ADR is
  canonical for *why*.
- `colophon.html` — the source of the canonical framing (already aligned by construction; it is
  what the other surfaces align *to*). Its ledger has its own, narrower curation bar in an HTML
  comment, which is a separate constraint from this one.
- GitHub bio and the profile README intro — both live outside this repo, and both were swept
  into alignment in the same pass on 2026-07-11.
- Any future surface that makes a "who built this" claim: `index.html`, `resume.html`, project
  writeups. No registry exists — alignment is a review-time check against this record, not an
  automated gate.

## Consequences

- **New copy has a fixed target.** The framing is written down, so a bio or a writeup can be
  checked against it rather than re-argued each time. That is the whole point of promoting the
  colophon's wording to canonical.
- **Nothing enforces it.** Unlike the mobile gate (`portfolio/ADR-001`), this is a prose rule
  with no script behind it. It holds only as long as it is read, which is why it lives in
  `CLAUDE.md` where agents read it.
- **The two rejected phrasings are the recurring pull.** Naming them explicitly makes the drift
  detectable in review; it does not make it stop happening.
- **It raises the bar on the surrounding claims.** "The evals and postmortems are the proof"
  only works if the evals and postmortems exist and are linked. The posture makes the copy
  dependent on the artifacts holding up.
- **The rule was reactive, not anticipatory.** It was written after surfaces had already drifted,
  and the same commit had to fix two of them.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| Apologetic framing — "full disclosure", "disclaimer", "I have to admit" | Treats the assist as a caveat to preempt. It is a competency being demonstrated; framing it as something to confess concedes the opposite of the claim the site is making |
| Label-y framing — "agentic orchestration" or similar as a self-description | The skeptical-senior-engineer reader credits artifacts, not vocabulary. A label asserts the competency where describing the practice would demonstrate it |
| Let each surface phrase it its own way | This is the status quo the rule replaced. It produced exactly the two failure modes above, on more than one surface, which is why 2026-07-11 needed a sweep and not just a rule |
| Drop the disclosure entirely | Never on the table in the source prose, and foreclosed by it: honesty is explicitly unchanged, and Claude is named plainly on every surface that makes a "who built this" claim |
