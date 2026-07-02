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
      (self-contained page, print-to-PDF) linked from the hero and footer.
- [x] **Resolve the orphaned `learning/` dir.** *Kept, not deleted — it's a
      real front-end learning log, not filler. Wired into the Lab page as a
      "Learning log" section linking the six lessons on GitHub.*

### Next — valuable, but needs a small decision or more build

- [x] **Custom `404.html`.** *Shipped — on-brand "not in the record" page.*
- [x] **`sitemap.xml` + `robots.txt`.** *Shipped.*
- [ ] **Career-story depth.** Needs San to decide how much to tell first.
- [ ] **Voice pass** (soften the relentlessness). Stylistic, optional.

### Later — strategic or deliberately deferred

- [ ] **A second, different artifact** (the breadth gap). Biggest effort, real
      strategic question. Note: frame it as a separate proof of method, *not* a
      new vertical — "other verticals" is an explicit non-goal on the system
      roadmap, and the two shouldn't read as a contradiction.
- [ ] **Live GitHub repo cards** (already planned in README; needs the API script).
- [ ] **System deploy / OpenTelemetry** — on the system's own "Later"; each
      would spawn a new decision-log entry here.

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
      expands, résumé clicks) via `assets/events.js`.
- [ ] **Security on the agent's tool seam** — the gap SYS-007 itself names.
      Prompt-injection hardening of kb-agent + a writeup (threat model, attacks
      tried, what held). Strongest candidate for the "second artifact" slot.
      **Phase 1 (threat model) drafted** — parked at
      [`handoff/kb-agent-threat-model-draft.md`](handoff/kb-agent-threat-model-draft.md)
      since this session couldn't write to `kb-agent` directly. 4 tools mapped,
      7 attack scenarios (T1&ndash;T7) numbered for the Phase 2 gold set, two
      existing mitigations credited (system-prompt spotlighting, host
      allowlisting). Unverified against real source — see its Open Questions
      section before treating it as final. Next: verify, commit into
      `kb-agent`, then build the attack gold set (Phase 2).
- [ ] **Check `www.sanlee.me` resolves/redirects** — owner-side, two minutes.
- [ ] **"What readers actually read"** — once the custom events accumulate,
      publish the read on them: real usage data, on-thesis.

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
      surfaced*, not deleted: the Lab page now has a "Learning log" section
      linking each lesson on GitHub (which renders the Markdown; `.nojekyll`
      means the repo serves `.md` as raw text).

### Positioning — needs a decision from San, not just execution

- [ ] **Career story has one sentence behind it.** "Network operations →
      software engineering → product" + "Seven years at JPMorganChase" is a
      strong hook with nothing behind it. No roles, no what-shipped. The "About,
      honestly" section is about the side project, not the career. Decide how
      much of the real career to tell.
- [ ] **No résumé link and no contact path** beyond social icons. For a
      job-relevant site, an easy "email me / résumé" is a cheap, obvious add.
- [ ] **The voice is relentless.** Nearly every paragraph lands an aphorism.
      Each is good; in aggregate the rhetorical pressure never lets up. Letting a
      few paragraphs state a fact plainly would make the punchlines that remain
      hit harder. Stylistic — do only if it feels right.

### Breadth — the strategic gap

- [ ] **The whole site is one project seen from three angles.** The System /
      Classifier / Product-and-Program are three lenses on the same defense-news
      system. The evidence of *method* is overwhelming; the evidence of *breadth*
      is thin. Nothing on any current roadmap closes this — the items below add
      *depth* to the same system, not a second artifact. Open question: is one
      genuinely different artifact worth building?

### Already planned (pre-existing, folded in here so this is the one place to look)

- [ ] **Live GitHub-API repo cards** (from the README). Surfaces the real repos
      on the site — partial support for breadth by proving the four repos exist,
      but still depth on the same system, not a new artifact.
- [ ] **Lab experiments** (`lab/`, marked WIP). Ongoing front-end sandbox.
- [ ] **Defense-news system roadmap** — lives on `projects/product-and-program.html`
      as Now/Next/Later. That's product content for the *system*, not the site,
      but the "Later" items (containerize/deploy, OpenTelemetry) would each
      become new decision-log entries here. "Other verticals" is a deliberate
      non-goal.
