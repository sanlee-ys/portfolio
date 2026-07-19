# ADR-003: Never mention or link private repos; the bar is omission

**Status:** Accepted
**Date:** 2026-07-01 (first codified) → 2026-07-03 (promoted to a standing rule) → 2026-07-06
(mechanized) — recorded as an ADR 2026-07-18
**Deciders:** San Lee

---

## Context

This site is public and indexed. It is also a portfolio, so its natural instinct is to survey
the owner's work: link the repos behind a writeup, count them, claim coverage. Some of that
work lives in repos that are private on purpose. Every survey-shaped claim on the site is
therefore a place where a private repo can surface — by name, by link, or by a total that only
adds up if you count it.

**The escalation history is the point of this record, and until now it lived only in a commit
message.**

1. **2026-07-01 — born as a parenthetical.** The rule came out of the adversarial round in
   `ROADMAP.md`, which found that a site claiming *"the proof is in the ADRs"* linked to none
   of them. The fix was to link repos from the writeups, and the completed checkbox carries
   the constraint as an aside: *"(Standing rule: never link private repos.)"*
   (`ROADMAP.md`, "Adversarial round (2026-07-01)").

2. **2026-07-03 — promoted after the same leak recurred.** Commit `14b924b` states the failure
   plainly: the rule *"lived only as a completed `ROADMAP.md` checkbox, not as an active
   constraint future edits get checked against. The same leak recurred today"* — in a
   cross-repo write-up in the public `architecture` repo. So it moved into `CLAUDE.md`, where
   agents read instructions *before* editing rather than after finishing. (The commit's local
   timestamp is 2026-07-02 21:40 EDT, i.e. 2026-07-03 UTC; `CLAUDE.md` dates it 2026-07-03.)

3. **2026-07-06 — mechanized, because prose was not holding.** `scripts/private-repo-check.cjs`
   opens with the reason: *"It has leaked twice on prose-and-hope; this is the guard."* Layers
   A and B landed in CI (PR #72), Layer C as a local pre-commit hook (PR #73).

A rule filed as *completed work* is not read by the next author writing a new page in a
different repo. That is what the checkbox stage got wrong, and the recurrence is the evidence.

## Decision

**Never name, link to, or describe the content of private repos anywhere on this site — and do
not acknowledge that any exist.**

1. No names, no links, no descriptions of private-repo content.
2. **Not even a generic acknowledgment** such as "plus some private repos." Confirming a
   private repo exists is itself a disclosure San does not want. **The bar is omission, not
   genericization.**
3. Before publishing anything that lists or surveys repos, check **every** repo name and
   **every** count or scope claim ("all my repos," a specific number) against the actual public
   list: `gh repo list sanlee-ys --visibility public`.
4. **If a claim would not be true restricted to just the public repos, drop it rather than
   soften it.** A softened count is still a claim about work the site is not supposed to
   confirm.

The guard implements this as a **public allowlist, never a private denylist** — hardcoding
private repo names into this public repo's CI would *be* the leak it prevents. So the question
it asks is "is every repo this site references actually public?", not "does the site mention
one of these secret names?" The one check that does need the names (Layer C, a bare name in
prose with no slug) runs locally against a gitignored list, never in public CI. It fails
closed: if the public-repo list cannot be fetched, the build fails rather than passing blind.

## Downstream surfaces

- **`CLAUDE.md`**, section *"Private repos: never mention, never link"* — the operative
  instruction, canonical for *what to do*. This ADR is canonical for *why*. Nothing is removed
  from `CLAUDE.md` by this record.
- **`ROADMAP.md`**, "Adversarial round (2026-07-01)" — the origin checkbox. Kept as history; it
  is no longer the carrier of the rule.
- **`scripts/private-repo-check.cjs`** — Layers A (slug allowlist, live from the GitHub API)
  and B (disclosure phrases). Run from the repo root: `node scripts/private-repo-check.cjs`.
- **`scripts/private-name-precommit.cjs`** + **`scripts/githooks/pre-commit`** — Layer C, local
  only. Per-clone setup is in the script header (generate `scripts/.private-repos.local`, then
  `git config core.hooksPath scripts/githooks`). Escape hatch: `PRIVATE_OK=1 git commit …`.
- **`.github/workflows/qa.yml`** — runs the guard and its adversarial test suites on every PR
  and push to `main`.
- **Any page that lists or surveys repos** — homepage, writeups, résumé — is subject to the
  pre-publish check in Decision 3.
- **Not governed here:** the recurrence happened in the `architecture` repo. This ADR binds the
  portfolio repo; the same bar in other public repos is not enforced by this record.

## Consequences

- **The rule now sits where it gets read, and where it gets run.** Instruction in `CLAUDE.md`,
  enforcement in CI and at commit time. The 07-01 placement failed precisely because it was
  neither.
- **It constrains what the site can say about the author's own work, and that cost was
  accepted.** Completeness claims are unavailable: no "all my repos," no total that counts
  private work, no gesture at unnamed projects. Real work is simply absent from the public
  record rather than summarized at a safe altitude. Omission is a stricter bar than
  genericization and it was chosen knowingly.
- **Genericization is not a fallback when a claim is inconvenient.** The instruction is to drop
  the claim. There is no softened form that satisfies the bar.
- **The guard scans `.html` only** — both the CI check and the pre-commit hook select staged or
  on-disk `.html` files. Repo markdown (this ADR, `CLAUDE.md`, `ROADMAP.md`) is readable on a
  public GitHub repo but is not covered by the automated layers. The rule still applies to it;
  only a human upholds it there.
- **Layer C is inactive by default on a fresh clone.** If `scripts/.private-repos.local` is
  missing, the hook warns and skips the bare-name check while Layer B still runs. A clone
  where nobody did the setup is quietly running with one layer down.
- **The gate depends on a live GitHub API call.** Fail-closed means an API outage or rate-limit
  breaks the build. Accepted: a gate that silently no-ops when its data source is down is not a
  gate.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| Genericize instead of omitting — "plus some private repos" | Rejected in the rule text itself: even confirming a private repo exists is a disclosure. A generic acknowledgment still leaks existence and rough count, and in a writeup its adjacency often implies the subject |
| Soften a count or scope claim that is not true of the public repos alone | Rejected explicitly: *"drop it rather than soften it."* A hedged number is still a claim about work the site should not confirm |
| Leave the rule as the `ROADMAP.md` checkbox | Tried, and it failed. Recorded as completed work rather than an active constraint, it was not read by the next author, and the same leak recurred two days later in a cross-repo write-up. That recurrence is the entire reason for the 07-03 promotion |
| Enforce with a denylist of private repo names in CI | Would be the leak it prevents — the names would live in this public repo. Hence the public-allowlist inversion, with the name-aware layer pushed to a local, gitignored, never-committed list |
| Hash the private names so CI could check them without storing plaintext | Rejected in `private-name-precommit.cjs`: a low-entropy repo name is brute-force-confirmable, so a hash is still a disclosure |
| Rely on the standing rule in `CLAUDE.md` without a mechanical guard | Held for three days. The guard's own header gives the count: *"It has leaked twice on prose-and-hope"* |
| Make the guard skip when the GitHub API is unavailable | Rejected as passing blind; the check fails closed instead |
