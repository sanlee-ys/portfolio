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
| [ADR-006](ADR-006-hand-written-html-or-a-generator.md) | Hand-written HTML, or a static site generator? — **migrated to Astro**, executed 2026-07-26 | Accepted |
| [ADR-007](ADR-007-split-dont-trim.md) | Split, don't trim — the two-speed reader | Accepted |
| [ADR-008](ADR-008-breakout-grid.md) | A breakout grid — two deliberate edges, not one honest column. **Reverses the "One content column" rule** | Accepted |
| [ADR-009](ADR-009-rendered-contrast-gate.md) | Contrast is checked on the rendered pixel, not the declared token | Accepted |
| [ADR-010](ADR-010-the-figure-offers-the-jump.md) | A figure offers the jump, it does not take it | Accepted |
| [ADR-011](ADR-011-career-story-ceiling.md) | The public career tell stays short | Accepted |

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

**One open item, and it is implementation rather than a question:**
[`ADR-007`](ADR-007-split-dont-trim.md) is accepted and its splits have not shipped yet.

ADR-007 answers the complaint that opened ADR-006 and that ADR-006 pointedly refused to take
credit for: *too much information density.* It resolves the tension the owner raised — that
[`ADR-004`](ADR-004-retire-the-lab-as-the-vehicle.md)'s content floor was written before the
judge and netops pages existed, so every page can respect it individually while the
*aggregate* burden grows past anything that record considered. The resolution: **the floor
governs deleting substance, not relocating it**, with a rider that a split unit must be a
whole argument — claim, evidence and caveat travel together.

Two things about it are worth reading even if the diff is not. It **corrects a measurement in
public** rather than quietly: the homepage was first reported as one 1,264-word section, which
would have aimed the fix at the wrong place, and the real concentration is the decision log
plus a table duplicated from the classifier. And at the single point where a proposed cut met
ADR-004's floor — compressing the classifier's decision cards to linked ADR one-liners — **the
floor won**, for the sake of ~150 words. The record says so explicitly, because a floor that
bends the first time it costs something is not a floor.

[`ADR-008`](ADR-008-breakout-grid.md) is the first record in this tier that
**reverses another one of this repo's own written rules** rather than an unwritten
habit. The *"One content column"* comment block in `public/assets/style.css` was a
real decision, argued from a real measurement — six near-miss right edges on the
homepage, which do read as sloppiness — and it concluded that one column at 720px
beat two competing ones, with prose running long as the accepted price.

What overturned it was measuring the price. The comment said ~91 characters;
measured across four pages the site was running **94–96, with paragraphs over
100**, against a comfortable band of 65–75. And its own prescribed escape hatch —
shorten the metrics table's column headers to buy the measure back — pointed at
the evidence: those headers name which eval, which data, which model. **Degrading
the evidence to satisfy a layout rule inverts what this site is for.**

The record is worth reading for one distinction it draws, because it is the thing
the old rule got wrong: *"one column"* and *"no ragged edges"* were treated as the
same claim. Six edges nobody designed are not the same object as two edges that
land in the same place on every page and sit 184px apart. It also records a
correction it would have been easy to make silently — the obvious way to write "65
characters" in CSS is `65ch`, and in Geist that measures **~94 real characters**,
which is exactly the defect. The token is set in `rem` and verified by
measurement. Three artifacts the rule would obviously promote are argued down
rather than promoted, including the autonomy ladder, which was on the list until it
was rendered.

[`ADR-006`](ADR-006-hand-written-html-or-a-generator.md) closed the same
day it was opened, and the stub-then-decide split did exactly what it was built for: the
deciding session spent its time on the crux instead of re-deriving 12,150 words of
measurements, and the record shows which half came from where.

The verdict is **migrate to Astro**, as a lift-and-shift with an output-diff acceptance
bar. The crux the stub insisted be answered first — whether a generator undercuts
[`ADR-004`](ADR-004-retire-the-lab-as-the-vehicle.md)'s learning-vehicle premise — turned
out to be answerable from evidence rather than taste: the surviving learning log is seven
notes, all of them CSS, browser-API, SVG or DNS, and Astro subtracts none of them. What it
subtracts is transcribing a 38-line `<head>` a thirteenth time.

Two things about how the decision was argued are worth keeping. **The density complaint was
deliberately excluded from the case for migrating**, even though it is what opened the
question — no option removes a word, and the "expensive pages cause monoliths" chain is
unproven and contradicted by two pages that landed fine. And **the strongest opposing
option was the home-grown one**: formalizing #141's throwaway shell script keeps zero
dependencies and view-source fidelity, and it was rejected only on the grounds that it is a
build step in disguise, bought at the price of a templating engine with one maintainer.

**The migration then executed the same day.** `CLAUDE.md`'s "no build step" line changed in
the migration PR, in the same commit that made it false, as this paragraph originally
promised.

The acceptance bar is what makes the result claimable: every page was compared against its
pre-migration self as a **parsed DOM**, so entity spelling, brace escapes and attribute
order normalised away and only content differences survived — **12/12 pages semantically
identical**. It earned its keep immediately by catching two regressions on `404.html` that
every CI gate was green through: the layout had **dropped that page's `noindex`**, and had
given it an empty `og:url` and a null canonical. The page with no social metadata is the one
that proves an unconditional layout is wrong.

Two honest notes. The plan's one unfulfilled benefit was the **generated sitemap**, and it
**closed the same day**: `@astrojs/sitemap` cannot emit a single `sitemap.xml` (only
`sitemap-index.xml` + a numbered file, with `filenameBase` changing the prefix, not the
shape), which would have 404'd the live URL `robots.txt` advertises — so a ~60-line build
integration emits it instead, reading the build output so it cannot drift from the site, and
dating each entry from git. That rejection-of-a-dependency needs the distinction stated:
ADR-006 turned down a home-grown *templating system* as open-ended with one maintainer; a
frozen single-purpose spec with one input is a different object, and here the ecosystem
option fails a constraint the local one meets. And the `Article.astro` layout the plan
specified was **not built**: the
back link and `.article-body` turned out to be page content, and wrapping them would have
meant editing content to fit the abstraction.

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

[`ADR-009`](ADR-009-rendered-contrast-gate.md) is the fourth record in a row of the same
shape, and the shape is now the point. A provenance subline was rendering at **3.80:1**
while its colour token measured **5.81:1** — both numbers correct, because an `opacity`
sat on top of the token and composited it. Every instrument that inspects *declared*
colour agreed the text was fine: the stylesheet's own measured-contrast comment block,
devtools, and any CSS linter. They were all reading a number that never reached the screen.

That puts it with the metrics guard blind to attribute order, the sitemap's date-format
check that could never fail, and `link-check.cjs` never validating anchors — **four gates
or checks in this repo whose failure was invisible from a green run.** The fix is the one
those cases keep pointing at: measure the artifact, not the description of it. The gate
renders every built page in both themes and computes the composited pixel.

Two things about it are worth reading past the diff. Its **first implementation was itself
wrong in the same family** — it toggled `data-theme` on a loaded page and measured
immediately, which reads new ink over old paper because `body` carries a 200ms
background transition, and it produced 400+ confident findings for a state that never
rendered. A gate reporting violations is not the same as a gate that is right, and the
tell was that the numbers were too dramatic to be real. And **only one of the three real
defects it found was the opacity bug it was built for**: the other two were a colour with
no light-theme value at all, and a chart colour tuned against a 3:1 stroke bar then reused
as body text on backgrounds nobody had measured it against. The convention this ADR also
adopts — never fade text with opacity — would have caught neither, which is precisely why
the convention alone was not accepted as the answer.

[`ADR-010`](ADR-010-the-figure-offers-the-jump.md) is the second record in two PRs about the
same figure, and both defects had the same symptom: **nothing visible happening.** The first
was the 1.8% hit target, which read as lag. The second is what this record answers — selecting
a node scroll-hijacked the reader to the matching decision entry with no return path, so on a
phone the map went off screen and browsing the second node meant scrolling back to find it.

The complaint is the small part. Weighing it turned up two things that were not in the report
and that decided it: the caption under the figure **already carries** the node's full
description, so the jump re-delivered information 1,200px further down; and on the homepage two
of the three anchors are one-line `<li>` footnotes rather than `.decision` blocks, so the
reader was carried from a paragraph to a sentence — **less** than they were already reading —
and `.decision.target`, the highlighter swipe built to say *you landed here*, **did not match
an `<li>` at all.** On two nodes out of three it had been firing into an empty selector, below
the fold, at the end of a jump that had already disoriented you. Nobody reported it because
there was nothing to see.

The resolution is one sentence — *the figure offers the jump, it does not take it* — and the
part worth reading is what it does **not** do. It does not delete the route to the decision,
which is a real claim the figure makes. It does not add a "back to the map" control, which
keeps the displacement and then builds machinery to undo it. And it does not remove the focus
move because the focus move looked like the culprit: the announcement to assistive tech was
never coming from focus, it comes from `aria-live="polite" aria-atomic="true"` on the caption,
which is why the focus move could be relocated onto the reader's own click rather than dropped.
Handing the navigation to an ordinary `<a href="#…">` then buys three things the script had
faked or simply lacked — the browser's own reduced-motion-aware scroll, a hash, and **a history
entry, so Back is the return path** the complaint was actually asking for.

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
