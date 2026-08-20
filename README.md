# portfolio

Public site for San Lee. Systems and product work, with a decision log.

**Live site:** https://sanlee.me

The site is **Astro** (static output, zero JS by default). Pages live under
`src/pages/`. Static assets and the standalone résumé live under `public/`.
GitHub Pages serves the built `dist/`.

## Layout

| Path | Holds |
|---|---|
| `src/pages/` | Route sources: `index`, `work`, `about`, `colophon`, `glossary`, `404`, plus archived `lab/` artifacts and `projects/`. |
| `src/layouts/` | Shared chrome (`Base.astro`: head, theme bootstrap, analytics, theme toggle). |
| `src/components/` | Shared pieces (`SiteNav.astro` and anything else reused across pages). |
| `public/` | Static files copied as-is: `assets/` (CSS, fonts, JS, images), standalone `resume.html` / `resume.pdf`, `CNAME`, `robots.txt`. |
| `astro.config.mjs` | Build config. `build.format: 'file'` keeps URLs as `glossary.html` rather than `glossary/index.html`. Do not change it. |
| `scripts/` | The QA gates CI runs (see **QA** below), font subsetting, résumé PDF build, local pre-commit guard. |
| `decisions/` | Architecture Decision Records for this site. |
| `learning/` | The learning log — one Markdown lesson per technique. |
| `ROADMAP.md` | The site's own tracked backlog. |
| `public/f2073a6c….txt` | IndexNow key. Proves domain ownership when pinging Bing to crawl a URL, so it has to stay served from the root; the contents are the filename stem with no trailing newline. Not a secret — it is designed to be publicly fetchable. Don't delete it as stray junk. |

`public/resume.html` is standalone on purpose: it carries its own inline styles
and links no shared stylesheet, because `scripts/resume-pdf.cjs` renders it
offline and aborts every non-`file:` request. Keep it in `public/`.

## Local preview

```bash
npm ci                 # or npm install
npm run dev            # Astro dev server with HMR
```

Production-shaped local check:

```bash
npm run build          # -> dist/
npm run preview        # serve dist/ (port 4322)
```

Full local QA (build, then every gate CI runs):

```bash
npm run qa             # npm run build && npm run gates
```

`npm run gates` alone re-runs the gates against an existing `dist/` without
rebuilding. The gates default to `dist/`; a bare `node scripts/link-check.cjs`
(and friends) walk the repo root, which is useful by hand but will invent
phantom broken links if `dist/` and `public/` are both present.

## QA

CI (GitHub Actions, `.github/workflows/qa.yml`) and the local runner
(`scripts/gates.cjs` / `npm run gates`) run the **same sixteen checks**. The
seven that need no build, browser, or network run first; the nine that walk the
built site or launch Chromium run after. `scripts/gates.cjs` must stay a
faithful mirror of the workflow — add a step there, add it here.

**Build-independent (cheap):**

- **`node --test scripts/private-repo-check.test.cjs
  scripts/private-name-precommit.test.cjs`** — adversarial suites for the
  private-repo guard, covering the CI layers and the local pre-commit layer CI
  can't run itself.
- **`node --test scripts/classify-review-outcome.test.cjs`** — drives the
  `Classify the review outcome` step of `.github/workflows/claude-review.yml`
  against synthetic execution logs, with `gh` stubbed. Extracts the step's real
  text from the workflow so the suite can't drift from what CI executes
  (`ADR-005`).
- **`node --test scripts/font-coverage.test.cjs`** — adversarial suite for the
  font-coverage gate.
- **`node --test scripts/resume-pdf.test.cjs`** — asserts the résumé PDF embeds
  its glyphs, plus its own adversarial suite.
- **`node --test scripts/check-published-metrics.test.cjs`** — marker-parity
  suite behind the published-metrics gate.
- **`node --test scripts/navigation-check.test.cjs`** — adversarial fixtures
  for the navigation contract: complete Work discovery and contextual return
  links, with explicit exemptions for archived standalone pages.
- **`scripts/lint_decisions.py`** — every ADR in `decisions/` carries a
  `## Downstream surfaces` section. Stdlib Python 3, no venv.

**Against the built site (`SITE_ROOT=dist`):**

- **`scripts/link-check.cjs`** — no broken internal links.
- **`scripts/navigation-check.cjs`** — every current professional-work page is
  linked from `work.html`, and every non-primary content page offers a
  contextual back link; archived standalone pages are explicitly exempted.
- **`scripts/font-coverage.cjs`** — every character in the copy has a
  self-hosted glyph (re-hashes the woff2 files against
  `scripts/font-coverage.json`).
- **`scripts/check-published-metrics.cjs`** — every figure marked up as a
  published metric still matches the classifier's generated artifact. A
  mismatch fails; an upstream fetch failure warns and passes.
- **`scripts/private-repo-check.cjs`** — every `sanlee-ys/<repo>` reference on
  every published page resolves to a repo that is actually **public**, checked
  live against the GitHub API. Fails closed if the list can't be fetched.
- **`scripts/contrast-check.cjs`** — rendered text contrast AA in both themes
  (composited pixels, not declared tokens).
- **`scripts/mobile-qa.cjs`** — every page at 320/360/390/430 px; fails on any
  horizontal overflow. Mobile is a contract here, not an afterthought.
- **`scripts/hit-target.cjs`** — every element that claims to be a control is
  clickable across its box (catches SVG `fill: none` hit-target bugs).
- **`node --test scripts/hit-target.test.cjs`** — adversarial suite for the
  hit-target gate (spawns Chromium, so it sits with the browser work).

The browser gates need a Chromium matching the pinned Playwright. On a fresh
clone and after any Playwright bump — from the repo root, on any OS:

```bash
npm --prefix scripts ci
npm --prefix scripts exec -- playwright install chromium
```

Without it those gates can't launch a browser and fail loudly rather than
skipping. Prefer `npm run qa` before you push layout or copy changes.

## Featured work

Grouped the way the site is organized — each link is a full writeup under
`projects/`.

**System and program**

- **The System** (`projects/the-system.html`): frozen contracts, idempotency, recorded decisions.
- **One Note, End to End** (`projects/the-system-run.html`): one note through the real schemas.
- **Product & Program** (`projects/product-and-program.html`): the same system read as program work.

**Classifier and evidence**

- **Defense News Classifier** (`projects/defense-news-classifier.html`): LLM classifier on a hand-labeled eval (<!-- metric:category_accuracy -->94.4%
  category, <!-- metric:domain_accuracy -->98.1% operational
  domain, <!-- metric:region_accuracy -->94.4% region).
- **Why an LLM at All** (`projects/classifier-baseline.html`): TF-IDF + logistic regression on the same 54 rows, in the browser.
- **Autonomy Ladder** (`projects/autonomy-ladder.html`): four levels of self-direction. Two of four shipped a measured no.
- **Loop replay** (`projects/loop-replay.html`): recorded replay of the prompt-optimization loop.

**Measurement and method**

- **Faithfulness Judge** (`projects/faithfulness-judge.html`): can an LLM judge catch a made-up claim?
- **False Green** (`projects/false-green.html`): six checks that reported success for work that never ran.
- **Retrieval, Measured** (`projects/kb-agent-retrieval.html`): gold set and paired A/Bs on kb-agent retrieval.

**Lab**

- **Zero-Touch Provisioning** (`projects/netops-lab.html`): a factory-blank router configures itself on one power cycle.

## Analytics

Traffic is measured with [Plausible](https://plausible.io) — privacy-friendly,
no cookie banner, script tag on every page. Dashboard: `sanlee.me` in the
Plausible account tied to this repo. Beyond pageviews, `public/assets/events.js`
sends three custom events — diagram node clicks, decision-card expands, and
résumé clicks — so the site has real usage data about what readers actually
engage with.
