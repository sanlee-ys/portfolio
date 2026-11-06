# Roadmap

The tracked backlog for the portfolio site itself — the thing the site was
missing. A site built on "record the decisions" should record its own.

Status from a review on 2026-07-01. Checkboxes are the state; the notes are
the reasoning, kept in the same spirit as the ADRs.

Two tracks, kept separate on purpose. The **Site track** below sequences the
work on this website. It is *not* the same as the **System roadmap** on
`projects/product-and-program.html`, which is a product roadmap for the
defense-news system — different subject, different cadence. Merging them would
just make both harder to read.

---

## Site track — Now / Next / Later

The sequencing, by leverage, cost, and dependency. The grouped detail further
down carries the full reasoning for each item.

### Now — cheap, high-leverage, no decision required

- [x] **Social share cards** (`og:` + `twitter:`). Highest leverage here; the
      site exists to be shared and today it unfurls bare. *(Shipped: branded
      1200×630 card + full OG/Twitter tags on all 9 pages.)*
- [x] **Meta descriptions** on the 4 pages missing them. Ships in the same pass.
- [x] **Favicon.** *(Shipped: accent monogram, 16/32 PNG + apple-touch.)*
- [x] **Résumé link + contact.** Both shipped — `mailto:hi@sanlee.me` in the
      hero icons and footer, and a grounded neutral-master `resume.html`
      (self-contained page; `scripts/resume-pdf.cjs` builds the tagged
      `resume.pdf`, PR #304, 2026-09-03) linked from the hero and footer.
      *2026-09-04: both links now sit in the primary nav and the footer; the
      hero links left in b77fd11 (2026-08-19).*
- [x] **Resolve the orphaned `learning/` dir.** *Kept, not deleted — it's a
      real front-end learning log, not filler. Wired into the Lab page as a
      "Learning log" section linking the six lessons on GitHub.*
      *2026-09-04: the site links no `learning/` lesson; the directory stays in
      the repo as a record.*

### Next — valuable, but needs a small decision or more build

- [x] **Custom `404.html`.** *Shipped — on-brand "not in the record" page.*
- [x] **`sitemap.xml` + `robots.txt`.** *Shipped.*
- [x] **Career-story depth.** *Closed 2026-08-17 (`ADR-011`, Informational
      since 2026-09-04). About holds a three-sentence tell and the résumé keeps
      the facts. The owner's current call sets the public depth; a session that
      changes it adds a dated line.*
- [x] **Voice pass** (soften the relentlessness). *Done 2026-08-18 — see "The
      voice is relentless" under Positioning for what the pass changed.*

### Later — strategic or deliberately deferred

- [x] **A second, different artifact** (the breadth gap). *Shipped 2026-09-09
      as the tool-seam gold set and writeup (`projects/tool-seam.html`). It is a
      second proof of method — attacks on the agent tool-result path — not a
      new vertical.*
- [x] **Live GitHub repo cards** (the README no longer lists the plan as of
      2026-09-04; this roadmap is the record; needs the API script).
      *Shipped 2026-09-09, PR #352: build-time fetch of the public repos this
      site already names. Stars are not a field.*
- [x] **System deploy / OpenTelemetry** — OTel tracing shipped earlier across
      the three services (opt-in). Local compose + kind manifests shipped
      2026-09-09 (`architecture` #100, `deploy/`). notes-api and kb-agent
      Dockerfiles shipped the same day (`notes-api` #58, `kb-agent` #113).
      This is operate-what-you-built on loopback, not a public cloud deploy.

> Note: the System roadmap's "Now" is effectively all shipped. The Site "Now"
> above is what actually keeps a live roadmap live.

### Adversarial round (2026-07-01) — attack the gap between claims and practice

- [x] **Homepage/résumé disagreed about the present.** Hero said "Seven years
      at JPMorganChase"; the résumé says currently there in product. Hero now
      reads from the present.
- [x] **"The proof is in the ADRs" but nothing linked to them.** All four
      system repos are public — now linked from the writeups where they're
      named. (Standing rule: never link private repos.)
- [x] **A repo preaching evals-as-CI had no CI.** GitHub Actions now runs the
      mobile-overflow gate and an internal-link checker on every PR and push.
- [x] **`resume.html` had no analytics** despite the README's "every page."
- [x] **README layout table was stale** — now lists the actual site.
- [x] **Employer hygiene** — "views and projects are my own" disclaimer on the
      homepage footer and the résumé.
- [x] **Metrics table showed a rejected variant unlabeled** — "v2 grounded"
      column now says *(not shipped)*.
- [x] **Dogfood the analytics** — custom events (diagram clicks, decision-card
      expands, résumé clicks) via `assets/events.js`. *(2026-09-04: the
      decision-card expand listener has had no DOM target since #152,
      2026-07-26; two of the three events are live. 2026-09-09, PR #351: the
      dead listener is gone. Resume clicks record `nav` | `footer` | `hero` |
      `other`.)*
- [x] **Security on the agent's tool seam** — the gap SYS-007 itself names.
      Prompt-injection hardening of kb-agent + a writeup (threat model, attacks
      tried, what held). Strongest candidate for the "second artifact" slot.
      **Phase 1 (threat model) shipped** — verified against real source and
      committed into kb-agent at `docs/notes/tool-seam-threat-model.md`.
      **Phase 2 (gold set) shipped 2026-09-09**, kb-agent PR #110: 40 items,
      T1&ndash;T7. Structural T3 and T7 held. `t7-02` found a per-round fanout
      hole and the cap closed it (kb-agent PR #111). Live T4 run 2026-09-09
      (kb-agent PR #112): 10 of 10 PASS on `claude-sonnet-5`. One T5 FAIL
      (`t5-04`). Writeup: `projects/tool-seam.html`.
- [x] **Check `www.sanlee.me` resolves/redirects** — owner-side, two minutes.
      *Verified 2026-09-09: `http://www.sanlee.me` and `https://www.sanlee.me`
      both 301 to `https://sanlee.me/`. GitHub Pages cert covers both names.
      HTTPS is enforced.*
- [x] **"What readers actually read"** — Plausible collects pageviews and two
      custom events. *Closed 2026-09-09 as declined: the public read waits on
      an owner export, and this repo does not publish those counts. Collection
      stays. Event wiring is honest (PR #351). Box checked 2026-09-14 so the
      roadmap shows no open item it is not tracking.*
- [x] **Live-walk P3s (2026-09-09).** *Closed 2026-09-14. Three landed on
      `main` (#356, #364, #369, #370). The owner ruled on the rest: Home stays
      out of the primary nav, interior pages return through `.back` (ADR-007);
      the demo's idle verdict stays an em-dash, the site's absence grammar;
      the gallery lightbox keeps its empty `src` until a detector becomes a
      gate; the side-tab borders, desktop link heights and the Work ADR rows
      stay as they are. `handoff/live-walk-deferred.md` is deleted; this
      line is the record.*

---

## Site track, refreshed 2026-11-06

Every box above is checked, and the last one was checked on 2026-09-14. The
site then had no tracked forward work for eight weeks, and the only commits in
that window were dependency bumps. The owner ruled on 2026-11-06 that the site
keeps evolving with new content, not only maintenance. A decision log with no
new decisions is an archive, and this site does not describe itself as one.

This refresh adds a Now / Next / Later below the first. The first track stays
as it is, boxes and notes, because the history is the record. Same voice:
checkboxes are the state, the notes are the reasoning.

Two rules this track keeps from the one above. No page names, links, or hints
at a private repo; every candidate below draws on a repo that
`src/data/public-repos.json` already lists, which is the allowlisted public
set, and nothing else. No surface prints a job title San has not held.

### Now — landing 2026-11-06

- [x] **Logline** (`projects/logline.html`). *Landed 2026-11-06, the first new
      project page since the tool-seam writeup on 2026-09-09. The Work index
      lists it; the navigation gate checks the return link; the figure
      contract binds any plate it carries.*
- [x] **"What changed" on `work.html`.** *Landed 2026-11-06 in the same PR. A
      dated changelog section on the complete index, newest first. It is the
      public face of this roadmap: the roadmap records why, the changelog
      records when. The first entry is the logline page; the second is the
      career-copy record below.*
- [x] **The career-copy reversal, recorded in public on `about.html`.** *Landed
      2026-11-06. The 2026-09-09 ruling set the first screen to a title San
      has not held; the 2026-10-03 audit reversed it, and CLAUDE.md carried the
      reversal while the site showed only the result. A decision log,
      reversals included, prints its own reversals. The About page now carries
      a dated line that says what changed and why.*

### Next — the next instrument. San picks one.

An instrument on this site is a page that makes one claim, carries the
measurement that supports it, and names what the measurement does not show.
Three candidates below. Each is grounded only in what the site already
publishes: its project pages and the public-repo descriptions in
`src/data/public-repos.json`. No candidate carries a result, because none has
been measured. The session that scoped them could not read the repos, so the
evidence column says what the page needs, not what the repo holds. The first
step on any of them is a read of the repo to find out whether that evidence
exists. If it does not, the candidate is not an instrument yet.

- [ ] **Candidate A — the guards ledger** (draws on `agent-ops`, "operating
      layer for a multi-vendor agent fleet: security posture, mechanical
      guards, postmortems, and working agreements"). *Claim: the fleet runs
      under mechanical guards, and the record shows which guard caught what.
      The page is a ledger, one row per guard: what it checks, when it
      landed, and the dated postmortem or incident it answers. The site's
      False Green page argues that a check nobody can watch fail is not a
      check; this page would be the same argument one repo over, at fleet
      scale. Evidence it needs: the guard inventory and its dates from the
      repo, and for each guard at least one dated event it caught or one
      postmortem it closed. Counts must come from the repo at a pinned
      commit, the way `pull-telltale-evidence.cjs` reads telltale, not from a
      hand-typed table. Gates it touches: `check-published-metrics` for every
      count, a new puller in the shape of `check-telltale-evidence`, the
      figure contract if it carries a plate, `private-repo-check` and
      `private-name-precommit` above all. A fleet config names the repos the
      fleet operates on, and the puller must read an allowlist, not the
      config, so that nothing outside the public set reaches the page. That
      constraint is the main cost. Size: medium. One page, one puller, one
      data file, one gate. Two to three sessions.*
- [ ] **Candidate B — the classifier over time** (draws on
      `defense-news-classifier`, whose description states a version and three
      scores: "human-graded gold at v3.2.1: 94.4% / 98.1% / 94.4%"). *Claim:
      the classifier's accuracy moved by evidence-gated steps, and the
      trajectory shows which decisions moved it and which ones the gates
      declined. The classifier page already carries the decisions and the
      current scores; the autonomy-ladder page carries two accepted and two
      rejected levels; neither page draws the versions on one axis. This
      page would. Evidence it needs: a per-version score record in the repo,
      each version dated and graded on the same gold set, or the page has no
      trajectory, only a point. If the gold set changed between versions, the
      page says so in `.fig-limit`, because scores on two gold sets are not
      one line. Gates it touches: the figure contract most of all. The
      trajectory is a generated figure, so `build-plots.cjs` writes its
      geometry into `src/data/figures.json`, the `<svg>` declares
      `data-fig-generated="true"`, and `.fig-what` names the artifact and the
      commit. Every score on the page is a `data-metric` span for
      `check-published-metrics`. `contrast-check` for the series colours, in
      both themes. Size: medium. One page, one plot producer, one data file.
      Two sessions if the record exists, and the first session finds out.*
- [ ] **Candidate C — the tool seam, re-run** (draws on `kb-agent` and the
      existing `projects/tool-seam.html`). *Claim: a dated result is a result
      on one model and one date, and the page says so. The current page
      records one run, 2026-09-09, on one model: thirty-nine PASS, one FAIL,
      and `t5-04` left open as a finding. The faithfulness-judge page already
      compares two model tiers and reports that the sample does not separate
      them. This instrument applies that shape to the seam: the same forty
      items, run again on a later date and on a second tier, with the open
      finding as the question. Did `t5-04` hold, fail again, or change class?
      Evidence it needs: two more dated runs of the runner the page already
      links, committed into kb-agent the way the first was. Model items need
      an API key, and the page keeps the existing rule that an item without a
      key is UNRUN, not PASS. Gates it touches: `check-published-metrics` for
      the PASS, FAIL, and UNRUN counts; `check-telltale-evidence` is the
      model for pulling those counts from the repo at a pinned commit rather
      than typing them; the figure contract if the runs are drawn as a grid.
      This candidate can land as a section on the existing page rather than a
      new one, which is also its weakness: the Work index gains nothing new to
      list. Size: small. One session on the site once the runs exist. The
      runs are the owner's cost, not the site's.*

The pick is San's. The session that takes the pick opens with a read of the
repo, and if the evidence is not there, it writes that down here as a dated
line and stops. A candidate that fails its evidence check is a finding, not a
page.

### Later — cadence, so silence reddens

- [ ] **Standing rule: every content PR adds a changelog entry.** *A PR that
      adds, moves, or retires a page, or changes what a page claims, adds a
      dated entry to "What changed" on `work.html` in the same PR. A
      dependency bump does not. The rule binds from 2026-11-06. Without it the
      changelog goes stale the same way this roadmap did, and a stale
      changelog is worse than none: it states a last-changed date that is
      false.*
- [ ] **Proposal: a cadence gate.** *Needs an ADR line before it is built. The
      shape: a `node --test` suite among the cheap build-independent nine, so
      it runs first and needs no browser. It reads the newest date in the
      changelog and the newest date among the project pages, and it fails
      when the changelog is older than the newest page. That half is a
      correctness check: a page landed and the changelog did not say so. The
      second half is the cadence itself: fail when the newest changelog entry
      is older than N days. N is the owner's number and the ADR records it.
      The second half is the contentious one, because it reddens CI on a
      quiet week, and a gate that reddens on the calendar is a gate someone
      will learn to bump past. The ADR weighs that against the alternative,
      which is what happened between 2026-09-14 and 2026-11-06: nothing went
      red, and nothing moved. The runner count in CLAUDE.md goes from
      twenty-three to twenty-four when it lands, and `gates.cjs` and `qa.yml`
      change together, or neither does.*

> Note: the first track's closing note said the Site "Now" is what keeps a
> live roadmap live. It did, until it was all checked. This section is the
> correction: a roadmap needs an open box, and from now on it needs a date on
> the newest one.

---

## Detail & reasoning

### Mechanical / SEO — pure upside, no judgment calls

These have no tradeoffs worth debating. None were previously planned.

- [x] **Social share cards** (`og:` + `twitter:` tags) on every page. Highest
      leverage: the site's job is to get shared, and right now it unfurls as a
      bare URL with no title, image, or blurb. *Shipped a branded 1200×630
      `og-cover.png` (dark theme, name, tagline, proof chips) rather than a
      photo — a stronger face for a systems/product portfolio.*
- [x] **Meta descriptions** on the pages missing them:
      `projects/the-system.html`, `projects/defense-news-classifier.html`,
      `projects/product-and-program.html`, `lab/scroll-storytelling.html`.
- [x] **Favicon** — was the bare-tab default on every page. *Shipped an accent
      "S" monogram: 16/32px PNG + a full-bleed apple-touch icon.*
- [x] **Custom `404.html`** — GitHub Pages serves it automatically; keeps a bad
      link on-brand instead of dumping to the default. *Shipped: styled 404 with
      absolute asset paths, noindex, and links back to the main sections.*
- [x] **`sitemap.xml` + `robots.txt`** — small, standard, helps indexing.
      *Shipped: sitemap lists all 10 public pages; robots allows all and points
      to the sitemap.*
- [x] **Orphaned `learning/` directory** — six `.md` files nothing linked to.
      On inspection it's a genuine front-end learning log (distinct from the
      external `learning-notes`, which is AI techniques), so it was *kept and
      surfaced*, not deleted: the Lab page linked each lesson on GitHub at the
      time (which renders the Markdown; `.nojekyll` means the repo serves `.md`
      as raw text). No page links them as of 2026-09-04.

### Positioning — needs a decision from San, not just execution

- [x] **Career story has one sentence behind it.** *Decided 2026-08-17
      (`ADR-011`, Informational since 2026-09-04): keep it short. About holds a
      three-sentence tell. The owner's current call sets its length; a session
      that changes it adds a dated line. Longer stories stay private.*
- [x] **No résumé link and no contact path.** *Shipped: `mailto:hi@sanlee.me`
      and `resume.html` are linked from the primary nav and the footer (see the
      Site Now entry above). Closed 2026-09-04.*
- [x] **The voice is relentless.** *Done 2026-08-18: site-copy pass cut the
      stacked aphorisms. Tables and decision facts stay. The 2026-08-17 About
      tell was unchanged by this pass (ADR-011, Informational since 2026-09-04).*

### Breadth — the strategic gap

- [x] **A second proof of method.** *Shipped 2026-09-09 as the tool-seam gold
      set (`projects/tool-seam.html`). It is still the same system, read as
      security measurement rather than as classifier quality. A genuinely
      different domain remains an open question, and it is not on this track.*

### Already planned (pre-existing, folded in here so this is the one place to look)

- [x] **Live GitHub-API repo cards** (from the README). *Shipped 2026-09-09,
      PR #352. Work lists the public repos this site already names, refreshed
      at build time. Stars are not a field.*
- [x] ~~**Lab experiments** (`lab/`, marked WIP). Ongoing front-end sandbox.~~
      *Retired 2026-07-23 by [`ADR-004`](decisions/ADR-004-retire-the-lab-as-the-vehicle.md):
      the sandbox stopped being fed, and its framing was discounting the site's
      strongest artifact. `loop-replay.html` was promoted to `projects/`; the
      gallery and scroll-storytelling pages stay at their URLs; the learning log
      left the site, and no page links it as of 2026-09-04.*
- [x] **Defense-news system roadmap** — lives on `projects/product-and-program.html`
      as Now/Next/Later. That's product content for the *system*, not the site.
      2026-09-09 closed the remaining Later build items (local deploy, OTel
      already shipped, kb-agent evals-as-CI tier 2, weekly cadence, durable
      outbox). "Other verticals" stays a deliberate non-goal.
