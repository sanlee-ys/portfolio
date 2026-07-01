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

- [ ] **Social share cards** (`og:` + `twitter:`). Highest leverage here; the
      site exists to be shared and today it unfurls bare.
- [ ] **Meta descriptions** on the 4 pages missing them. Ships in the same pass.
- [ ] **Favicon.**
- [ ] **Résumé link + contact `mailto:`.** Cheap, high value, no design debate.
- [ ] **Resolve the orphaned `learning/` dir** (wire in or delete).

### Next — valuable, but needs a small decision or more build

- [ ] **Custom `404.html`.**
- [ ] **`sitemap.xml` + `robots.txt`.**
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

---

## Detail & reasoning

### Mechanical / SEO — pure upside, no judgment calls

These have no tradeoffs worth debating. None were previously planned.

- [ ] **Social share cards** (`og:` + `twitter:` tags) on every page. Highest
      leverage: the site's job is to get shared, and right now it unfurls as a
      bare URL with no title, image, or blurb. Reuse a photo from `assets/img/`
      as the `og:image`.
- [ ] **Meta descriptions** on the pages missing them:
      `projects/the-system.html`, `projects/defense-news-classifier.html`,
      `projects/product-and-program.html`, `lab/scroll-storytelling.html`.
- [ ] **Favicon** — currently the bare-tab default on every page.
- [ ] **Custom `404.html`** — GitHub Pages serves it automatically; keeps a bad
      link on-brand instead of dumping to the default.
- [ ] **`sitemap.xml` + `robots.txt`** — small, standard, helps indexing.
- [ ] **Orphaned `learning/` directory** — six `.md` files nothing links to;
      the site points at the external `learning-notes` repo instead. Either wire
      them in or delete them so the repo doesn't imply dead pages.

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
