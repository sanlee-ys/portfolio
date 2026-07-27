# ADR-007: Split, don't trim — the two-speed reader

**Status:** Accepted 2026-07-26. Implementation follows this record, per the
decision-before-diff practice [`ADR-004`](ADR-004-retire-the-lab-as-the-vehicle.md)
and [`ADR-006`](ADR-006-hand-written-html-or-a-generator.md) both used.
**Date:** 2026-07-26
**Deciders:** San Lee

---

## Context

The complaint that opened this is the same one that opened `ADR-006`, and it is
still unanswered: *the site is too much information density — a whole lot of
scrolling and reading.* `ADR-006` said so explicitly and refused to take credit
for fixing it. **The migration to Astro did not remove one word.** What it did
was make adding a page cost one file and one nav entry, which is the
precondition for this record rather than a substitute for it.

### What is actually there, measured

Playwright, 900px-tall viewport, word counts per `h2` section:

| Page | Words | Screens |
|---|---|---|
| `projects/defense-news-classifier.html` | 3,225 | 10.4 |
| `projects/the-system.html` | 1,977 | 8.0 |
| `projects/netops-lab.html` | 1,794 | 5.2 |
| `index.html` | 1,405 | 7.5 |
| `projects/faithfulness-judge.html` | 1,314 | 4.0 |
| `glossary.html` | 923 | 4.4 |
| `projects/product-and-program.html` | 837 | 3.8 |
| `colophon.html` | 734 | 2.7 |

**One measurement was wrong and is corrected here rather than quietly fixed.**
The first pass reported the homepage as a single 1,264-word `h2`, which framed it
as the worst structural offender on the site. It is not: `index.astro` has five
`h2`s, but four sit inside `<section class="measure">` wrappers and the walker
only read top-level children of `<main>`, so everything after the first heading
was attributed to it. The real concentration is **the decision log (~760 words in
8 cards)** and a **metrics table duplicated verbatim from the classifier page**.
Recorded because the wrong number would have aimed the fix at the wrong section.

A second correction, same origin: `loop-replay.html`'s 2,675 words are mostly the
**JS-rendered run log**, not authored prose. Its authored prose is ~925 words. It
needs no split.

### The audience the numbers have to serve

A recruiter gives a portfolio 30–90 seconds. A skeptical senior engineer who is
genuinely interested gives it perhaps five minutes. The site asks for ~55.

### The tension this record exists to resolve

[`ADR-004`](ADR-004-retire-the-lab-as-the-vehicle.md) Decision 5 sets a content
floor: text that *is* the substance — ADR reasoning, negative results, what was
measured and did not pay — is not trimmed for visual breathing room, because
*"a prettier site that argues less well is a net loss."*

That floor was written 2026-07-19. **`faithfulness-judge` and `netops-lab` both
landed afterward.** So every page can respect the floor individually while the
*aggregate* reading burden grows past what that record ever considered — which is
exactly the gap the owner named: *"we also didn't plan on adding a judge or
network portions in it."*

## Decision

### 1. The floor governs deletion, not relocation — with a rider

**`ADR-004` Decision 5 constrains removing substance. It does not constrain
moving it.** A split relocates words; nothing is argued less well, it is argued
in layers. On the letter of that record, splitting is simply not the activity it
prohibits.

That reading is correct and, taken alone, too convenient — Decision 5's *purpose*
is that pages survive a skeptical read, and an argument can be broken by
relocation alone. Moving the judge's *"What this number does not establish"* one
click from its κ table would preserve every word and destroy the honesty pitch.
So the reading is adopted **with a rider that is the operative rule**:

> **A split unit must be a whole argument.** Claim, evidence and caveat travel
> together. Any summary left behind must keep the conclusion's polarity —
> negative results at full parity with wins — and must say that caveats exist
> where they moved.

### 2. The 90-second cut

- **Screen 1:** hero, plus the three-receipt proof strip. Already the best 40
  words on the site; untouched.
- **Screen 2:** one orientation paragraph with three role routes, then the
  interactive system diagram. A visual, not prose.
- **A project page above the fold:** h1, subtitle, lead, ToC — then *the numbers*.
  On the classifier this is a reorder: the metric table currently arrives on
  screen 4, behind two long cards.

### 3. Split the two monoliths; leave the well-shaped pages alone

`faithfulness-judge`, `netops-lab`, `product-and-program`, `loop-replay`,
`glossary` and `colophon` are **not changed**. The first two are already the shape
the classifier should converge toward: result first, one flagship finding, a
limits section that is pure floor-protected substance. **Uniformity is not a
goal**; the aggregate burden is fixed by routing plus the two genuine monoliths.

Three new pages absorb the depth, at new URLs (new URLs are free; existing ones
are frozen — see *Downstream surfaces*):

| URL | Absorbs |
|---|---|
| `projects/autonomy-ladder.html` | The ladder deep-dive from the classifier |
| `projects/classifier-baseline.html` | The full "Why an LLM at all" bake-off |
| `projects/the-system-run.html` | The five-step example run |

### 4. The deletions, ruled on individually

Relocation is the default. Every place words are *removed* was listed separately
and ruled on rather than approved as a block:

- **Homepage decision log — hybrid, not a full collapse.** The three cards that
  match the proof strip stay as full cards; the other five become one-line
  ledger rows. The homepage lands ~900 words rather than ~720. **The reasoning
  for rejecting the fuller cut:** those cards are not duplicates, they are
  summaries *written for this page*, and lines like *"two unit tests that happen
  to agree are not a contract test"* are among the sharpest writing on the site
  and sit exactly where a 90-second reader is looking. Density is bought
  elsewhere more cheaply.
- **The duplicated classifier metrics table and the orientation bullets go.**
  The table exists verbatim on the classifier page; the bullets restate the lede
  and the proof strip.
- **The classifier's "The decisions" cards STAY.** This was the one proposed cut
  that removes *reasoning* rather than duplication, on the argument that each
  ADR is public and linked. **Rejected.** It buys ~150 words at the price of the
  one precedent worth not setting, and Decision 5 exists for precisely this case.
  Where a cut and the floor meet, the floor wins.
- **Two near-verbatim duplicates on `the-system` go** (the SYS-002 card's second
  half, which restates the classifier's routing verdicts; and the
  "Where it goes next" ladder recap, superseded by the ladder page).

Net: the site's total corpus is roughly unchanged. Roughly 1,800 words relocate;
the deletions are duplication, not argument.

### 5. No new progressive disclosure

The homepage's nine `<details>` elements go and **none are added anywhere**.
Collapsing text hides words while leaving the page conceptually as long, and the
hidden content is not linkable, shareable or indexable. A split gives the deep
layer its own URL, which arrives with a back-link and is read only by the reader
who chose it.

## Downstream surfaces

- **`src/pages/index.astro`** — the decision log becomes three full cards plus
  five ledger rows; the classifier table becomes a three-stat strip reusing the
  existing `data-metric` spans, **moved, never retyped**; the orientation bullets
  go. **The `id="decision-*"` anchors must survive on the ledger rows** —
  `glossary.html` deep-links four of them, and external links may exist.
- **`src/pages/projects/defense-news-classifier.astro`** — reordered numbers-first;
  two sections move out. **`id="autonomy-ladder"` must stay** on the summary block
  that replaces the deep-dive: `the-system` deep-links it today.
- **`src/pages/projects/the-system.astro`** — the example run moves out; two
  duplicate passages trimmed.
- **Three new pages** under `src/pages/projects/`, each using `Base` + `SiteNav`
  with no `current`, and each opening with the existing `.back` idiom pointed at
  its **parent page**, not the homepage — the idiom `loop-replay` already uses.
- **`src/components/SiteNav.astro`** — **not changed.** The nav is the 90-second
  router; the new pages are depth reached from their parents. Adding them would
  make the router longer to serve readers who are already committed.
- **`sitemap.xml`** — no action required, and this is the one surface that
  changed character since `ADR-004`: it is generated from build output as of
  `ADR-006`'s follow-up, so new pages appear automatically and retired URLs
  cannot linger. `ADR-004` §4 records the opposite failure, when the
  hand-maintained file kept three dead `lab/` URLs.
- **`scripts/check-published-metrics.cjs`** — no change needed. Verified against
  the source: it checks the markers it *finds* and fails on an unknown key, a
  value mismatch, or zero markers site-wide. Moving `data-metric` spans between
  pages is safe; retyping a number is not.
- **`decisions/ADR-004`** — not amended. This record extends how its floor is
  *read* (deletion vs relocation) without changing what it decided, and Decision
  5 is upheld in §4 at the one point they met.
- **`CLAUDE.md`** — no operative rule changes. The mobile contract
  ([`ADR-001`](ADR-001-mobile-qa-gate.md)) applies to every page this touches, and
  the ledger rows are the one new mobile-layout risk: they render as a stacked
  list, never a `<table>`, so they cannot overflow at 320px.
- **`glossary.html`** — its eight `index.html#decision-*` links keep working via
  the preserved ids; retargeting the four that now point at fuller project-page
  tellings is optional cleanup, not a requirement.

## Consequences

- **The site gains a layer, and layers can rot.** Three new pages are three more
  surfaces that can drift from the parents that summarise them. The mitigation is
  that each deep page is the *only* home for its content — the summary left behind
  states a conclusion and links, rather than restating an argument.
- **A reader who wants everything now pays a click.** That is the trade being
  made deliberately: the default path gets ~42% shorter, and the completionist
  gets an extra navigation step. Given a recruiter spends 90 seconds and a
  skeptic five minutes, optimising for the completionist was the error.
- **"Whole argument" is a judgement call, and it will be argued about.** The rider
  is enforceable by reading — if a summary states a win whose caveat moved away,
  it fails — but it is not mechanically checkable. No gate will catch a broken
  split.
- **The homepage keeps ~180 words it did not strictly need**, because the hybrid
  ruling valued the writing over the word count. That is a deliberate refusal of
  the maximal fix, and the reason is recorded so a later reader does not "finish
  the job" without knowing it was declined.
- **The density complaint is finally being answered directly**, rather than by
  tooling. If this does not move it, the next lever is editorial — what the site
  claims at all — not structural.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| **Progressive disclosure — collapse the long sections behind `<details>`** | The reflex answer, and the homepage already has nine. Hiding text does not shorten a page, it makes it invisible while leaving it just as long; the content is also unlinkable and unindexable. A split produces a real URL a reader can be sent to |
| **Trim the prose across the board** | Rejected by `ADR-004` Decision 5 and again here. The dense reasoning is the credibility; the site's pitch is measured honesty and the negative results are the proof |
| **Split every page symmetrically for consistency** | `netops-lab` and `faithfulness-judge` are already result-first and under 5.5 screens. Splitting them would manufacture churn to no reader's benefit. Consistency is not the goal; the two real monoliths are |
| **A `projects/` hub page** | Adds one click for every reader and saves none. The homepage and the nav already do the routing |
| **Put the new deep pages in the nav** | The nav is the 90-second router. Adding depth pages lengthens it for the reader who has not committed, to serve the one who already has |
| **Collapse all 8 homepage decision cards to one-liners** | The maximal density win (~640 words) and the plan's original recommendation. Declined: those cards are summaries written for the homepage, not duplicates of it, and they sit where a 90-second reader actually looks. See §4 |
| **Compress the classifier's "The decisions" cards to linked ADR one-liners** | Declined at §4. The only proposed cut that removes reasoning rather than duplication, for ~150 words. Where a cut meets the floor, the floor wins |
| **Do nothing structural; treat it as an editorial problem** | Half right — the corpus really is long — but the measurable defect is that the *default path* forces a reader through 4,630 words before they can judge anything. Routing fixes that without deleting an argument |
