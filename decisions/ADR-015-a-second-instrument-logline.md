# ADR-015: A second instrument in a different domain, and a gate under its figures

**Status:** Accepted
**Date:** 2026-09-14
**Deciders:** San Lee

---

## Context

`ROADMAP.md` carried one open strategic question after the 2026-09-09 wave.
Every artifact on this site was the same defense-news system read a
different way: as architecture, as classifier quality, as a judge, as a
security measurement, as a program. telltale was the one exception, and it
is an instrument for the capacity that built the system, not a second
domain. The roadmap's own words: "A genuinely different domain remains an
open question, and it is not on this track."

The site's first-screen identity is Technical Program Manager (ADR-011,
owner ruling 2026-09-09). The program page states the practice: a roadmap
harvested from delivery, a dependency map, a risk register, a capacity gate
with pre-registered axes. It also states the gap in its own words: "pre-
registration without an instrument is half a measurement."

Program management has a rendered-guess problem of its own, and it is
older than the one telltale exists for. A status report says a milestone is
80% complete, a dependency is on track, a workstream is green. None of those
is a measurement. A percent needs a denominator nobody agreed on. A colour
is a verdict with the evidence removed. The claim the site makes about the
owner is that delivery is gated on evidence. No artifact on the site showed
what that looks like as a tool.

On 2026-09-14 the owner chose the domain from four candidates: a TPM
instrument, an infra tool from the day job, a second eval harness, or leave
the pick to the session. The ruling was the first.

## Decision

### 1. logline is the second instrument, in program management

`sanlee-ys/logline` is a Go program with no dependencies. It reads a ledger
of claims a program makes about itself, measures each claim against git
evidence at a pinned ref, and renders one of three states per claim: MET
with the commit, tag or path that proves it; UNMET when the measurement ran
and found nothing; UNMEASURED when the measurement could not run, with the
reason. Zero and absent never share a state, which is the telltale rule
(ADR-012 on this site; telltale design.md §4a.1) applied to delivery.

It refuses the figures a status report reaches for. No percent complete. No
ETA, velocity or burndown. No colour as the only signal. No verdict word.
No inference across dependencies. Each refusal is a named test in the
repository, so intent is not what holds the line.

A logline is the rope a ship paid out to measure its own speed. Knots on
the rope passed through a hand while a sandglass ran, and the count was the
speed. It pairs with telltale, the ribbon on a sail, on purpose: two
instruments, one rule.

### 2. The first ledger is this site's own claims

`examples/public-system.json` in the logline repository lists eighteen
claims this site makes on its roadmap and program page about six public
repositories: a merged pull request by number, a tag, a path, a pattern
count. It includes one Later row the site has not built, so the instrument's
first report carries an UNMET line and not only MET lines. A ledger that
only ever reports MET is a badge.

### 3. The page's figures are pulled, never typed, and a gate holds them

`scripts/pull-logline-evidence.cjs` builds logline from a clean checkout at
a pinned commit, runs it twice on that ledger, and writes
`src/data/logline-evidence.json`. The first run measures against the
sibling clones and its render is the `measure` frame. The second run points
the ledger at an empty directory, so every claim is UNMEASURED and logline
exits 3, and its render is the `nothing` frame. The page shows both, because
the second is the state a status report never admits to.

`scripts/check-logline-evidence.cjs` is the twin of the telltale gate, one
instrument over. Every `data-ll` figure on `projects/logline.html` must
equal its stored value; every `data-ll-frame` is interpolated from the
record; a page with no marker fails; a record with a percent, a verdict
word, a non-ASCII character or a machine identity in a frame fails at the
record, through `assertBoundaryLines` exported by the puller. The two gates
are dependency-free of each other, so a change to either owes the other a
look.

### 4. Placement

logline joins the Work index as the second flagship row, under telltale.
The program page's Now list gains one row that names it. Home does not
change: ADR-012's router holds four views of one system, and the flagship
block below it is telltale's. Whether logline earns a second flagship block
on Home is an owner call this record does not make.

### 5. What the record does not claim

logline measures git. It does not read GitHub issues, milestones or check
runs, and a ledger cannot express a claim about a conversation, a meeting or
a decision that left no commit. One ref for every repository per run. One
operator wrote the ledger and the claims it lists are his own. The
instrument shows whether the site's claims are backed by commits; it does not
show whether the claims were the right ones to make.

## Downstream surfaces

- `src/pages/projects/logline.astro`: the case-study page. Five `data-ll`
  figures and two `data-ll-frame` frames.
- `src/data/logline-evidence.json`: the generated record. Never hand-edit
  it.
- `scripts/pull-logline-evidence.cjs`: the generator. Run by hand, outside
  `npm run qa`, with `--repo` and `--siblings`.
- `scripts/check-logline-evidence.cjs`: the site gate.
- `scripts/check-logline-evidence.test.cjs`: its adversarial suite.
- `scripts/gates.cjs`: two new checks, in the same two positions as the
  telltale pair. The count moves from twenty-three to twenty-five.
- `.github/workflows/qa.yml`: the same two checks, in the same positions.
- `CLAUDE.md`: the five check-count sentences, twenty-three to twenty-five,
  nine cheap to ten, fourteen expensive to fifteen.
- `README.md`: the two gate lists gain a logline line each.
- `src/pages/work.astro`: the second flagship row.
- `src/pages/projects/product-and-program.astro`: one Now row.
- `scripts/og-cover.cjs`: the `logline` card; `public/assets/og-logline.png`
  is its output.
- `ROADMAP.md`: the open question is answered with a dated line in both
  places it was asked.
- `decisions/README.md`: this row.

## Consequences

- A second evidence record means a second thing that goes stale. The gate
  warns at 120 days and never fails on age, for the reason the telltale gate
  gives: the page prints the date.
- The puller needs Go and six sibling clones. It runs by hand, and the
  record it writes is what CI checks, so CI needs neither.
- The first ledger names only public repositories. ADR-003 binds the ledger
  as it binds every page: the bar is omission.
- The claims in the first ledger are the site's, so the instrument's first
  report is also an audit of this site. A roadmap citation that names the
  wrong pull request renders UNMET. That is the point.
- The check count on this site is now twenty-five. A later pull request
  that adds a gate owes the same five sentences in `CLAUDE.md`.

## Alternatives considered

- **An infra tool from the day job.** Seven years of infrastructure and
  operations would supply a real domain, but the public site cannot carry
  the day job's systems (ADR-011), so the artifact would have to be a
  simulation. logline measures real repositories.
- **A second eval harness.** A sibling of faithfulness-judge in a new
  domain. It would be the same proof of method a third time, and the
  roadmap already counts tool-seam as the second.
- **Build logline inside this repository.** No separate repo, no clone, no
  puller. It would put a Go module inside an Astro site, and it would break
  the pattern telltale set: the instrument is a public artifact on its own,
  and the site measures it from outside.
- **Read GitHub's API instead of git.** Issues, milestones and check runs
  would widen what a claim can say. It would also make the first ledger
  unmeasurable offline and make every UNMEASURED depend on a token. Git is
  enough for a first ledger, and the API is an open question in logline's
  own `STATE.md`.
