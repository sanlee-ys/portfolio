# Roadmap

The tracked backlog for the portfolio site itself — the thing the site was
missing. A site built on "record the decisions" should record its own.

Status from a review on 2026-07-01. Checkboxes are the state; the notes are
the reasoning, kept in the same spirit as the ADRs.

---

## Mechanical / SEO — pure upside, no judgment calls

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

## Positioning — needs a decision from San, not just execution

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

## Breadth — the strategic gap

- [ ] **The whole site is one project seen from three angles.** The System /
      Classifier / Product-and-Program are three lenses on the same defense-news
      system. The evidence of *method* is overwhelming; the evidence of *breadth*
      is thin. Nothing on any current roadmap closes this — the items below add
      *depth* to the same system, not a second artifact. Open question: is one
      genuinely different artifact worth building?

## Already planned (pre-existing, folded in here so this is the one place to look)

- [ ] **Live GitHub-API repo cards** (from the README). Surfaces the real repos
      on the site — partial support for breadth by proving the four repos exist,
      but still depth on the same system, not a new artifact.
- [ ] **Lab experiments** (`lab/`, marked WIP). Ongoing front-end sandbox.
- [ ] **Defense-news system roadmap** — lives on `projects/product-and-program.html`
      as Now/Next/Later. That's product content for the *system*, not the site,
      but the "Later" items (containerize/deploy, OpenTelemetry) would each
      become new decision-log entries here. "Other verticals" is a deliberate
      non-goal.
