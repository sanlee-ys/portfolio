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

## Site track, second round (2026-11-17)

Every box in the first round is checked, and the site read as finished. It is
not. The last content edit to a project page landed 2026-09-14
(`telltale.astro`). The résumé and the first-screen copy moved on 2026-10-03
and 2026-10-07, and every commit since is a dependency bump. Meanwhile the
public repos kept moving. Measured 2026-11-17 against
shallow clones of all ten public repos, non-dependency commits since
2026-09-14: telltale 8, agent-ops 7, learning-notes 3, defense-news-classifier
2 (docs only), netops-lab 1. faithfulness-judge, kb-agent, notes-api,
architecture and sanlee-ys carry no new work. The gaps below are the
difference between what the repos record and what the site says.

### Now — the site is behind its own repos

- [ ] **telltale page refresh.** The page pins its evidence to `07163dd`
      (2026-09-14). Since then telltale shipped: replay records its own
      timestamp and `^w c` compares two seats (#378); `--model` names the
      model per seat and the column reads back what ran (#382); a hosted
      room writes `room.json` and resumes its threads (#390); `ctrl+]` types
      into the live pane (#389); the host's per-turn memory is measured
      (#388); grok history stays unread because two measurements disagree
      on one record (#387). The page also names none of: the rebuttal round,
      `--record`/`--replay`, the gate card, `replay-check`. Re-pin, then add
      the honest-gauge story that #387 and #388 tell. One PR.
- [ ] **Field notes on Work list 12 of 30.** learning-notes now runs to note
      30 (the honest gauge and record/replay, 2026-09-16). Notes 26–30 are a
      natural sixth cluster, "Harness and observability": integration tests
      with testcontainers, fan-out cost control, tracing an agent loop,
      ablate your own scaffolding, the honest gauge. Add the cluster. Keep
      the "this is a selection" line.
- [ ] **netops page says nothing after ZTP.** netops-lab ADR-010 (2026-09-30,
      status Proposed) designs FRR on the Pi: OSPF for the link, eBGP for a
      service prefix, no default route. Not applied yet. Add one dated
      paragraph under the write-up that states the design and its status.
      Do not describe it as running.
- [ ] **Keep this round live.** A checked-out roadmap is how the site went
      quiet for two months. The owner reviews this list when a repo ships,
      not when the site does.

### Next — two new pages, each needs a one-line call from San

- [ ] **"Does a second vendor's review pay?"** A page on
      `agent-ops/evals/review-efficacy`. Two runs. The 2026-09-04 pilot:
      Claude 8/10, Codex 8/10, zero discordant pairs, so McNemar is
      undefined and the run cannot show equality. The 2026-09-20 harder
      seeds: Claude 6/18, Codex UNMEASURED on the first attempt (every case
      failed before a model), then 7/18 on a pinned model, five discordant
      pairs, still under the power floor. This is the site's voice exactly:
      a measurement that refuses to claim more than it can. It pairs with
      False Green. **Call needed:** agent-ops is public, but it has never
      been a flagship surface here. Yes or no.
- [ ] **"Four leaks in one week."** The agent-ops incident record: five
      postmortems from 2026-07-02 to 07-04 (plaintext API key, uncapped
      premium fan-out, PAT recurrence, guard interpreter bypass, grep leak),
      the `PreToolUse` credential guard, and the 2026-09-30 talk kits that
      demonstrate the guard failing and the check that did not run. This is
      the breadth the first round left open: a security domain, not the
      classifier read again. **Call needed:** whether the postmortems are
      portfolio material. They are already public on GitHub.
- [ ] **Homepage proof band shows one system.** Three of the four cells are
      classifier results and the fourth is False Green. Once either page
      above ships, swap one classifier cell for it so the first screen
      shows two domains. Do not invent a new metric for the band; reuse a
      figure the new page already states.

### Later — needs work in another repo first

- [ ] **The lockout experiment.** netops-lab roadmap item 4: can an agent on
      a live router avoid locking itself out? This is the only genuinely new
      domain on the horizon. It waits on ADR-010 being applied. The site
      page follows the run. It does not precede it.
- [ ] **telltale hero capture.** The telltale README holds an open HERO SLOT
      for an animated capture of a real room. If it lands, the site can carry
      the same recording as a generated figure (`data-fig-generated`,
      `src/data/figures.json`) rather than a hand-drawn plate.
- [ ] **About and résumé.** No change now. ADR-011 keeps public career copy
      at résumé facts, and San sets the depth. Revisit only after the two
      Next pages ship, and ask in one sentence before adding a line.

### Non-goals this round

- No new repo cards beyond the allowlist. ADR-003 holds: the Work page
  lists repos the site already names, never a survey.
- No redesign. The MONOGRAPH identity (ADR-014) shipped 2026-09 and the
  gates hold it. This round is content.
- No system-roadmap merge. The defense-news system's Now/Next/Later stays
  on `projects/product-and-program.html`.

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
