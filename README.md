# portfolio

Public portfolio site for San Lee — a curated front door to the systems and
product work I build for myself.

**Live site:** https://sanlee.me

This repo is deliberately **public**. It's the polished, showcase end of my
personal projects: the artifact that points at real work and frames it in
systems / product language.

## Layout

| Path | Holds |
|---|---|
| `index.html` | The landing page — hero, thesis, the decision log. |
| `resume.html` | The résumé — self-contained page, print-to-PDF ready. |
| `glossary.html` | Terms as actually used here, tied back to the decisions. |
| `colophon.html` | How the site was built (directing an AI agent), with the ledger. |
| `404.html` | On-brand not-found page (GitHub Pages serves it automatically). |
| `projects/` | One HTML writeup per featured project — problem, decisions, outcome. |
| `lab/` | Two front-end experiments kept at stable URLs; the section itself is retired (`ADR-004`). |
| `learning/` | The learning log — one Markdown lesson per technique. |
| `assets/` | Stylesheet, JS (theme, reveal, diagram, events), share card, favicons. |
| `scripts/` | The QA gates CI runs (see **QA** below), plus the local pre-commit guard and the résumé PDF build. |
| `ROADMAP.md` | The site's own tracked backlog. |
| `f2073a6c….txt` | IndexNow key. Proves domain ownership when pinging Bing to crawl a URL, so it has to stay served from the root; the contents are the filename stem with no trailing newline. Not a secret — it is designed to be publicly fetchable. Don't delete it as stray junk. |

## QA

CI (GitHub Actions) runs seven gates on every PR and push to `main`, in this
order:

- **`scripts/link-check.cjs`** — no broken internal links.
- **`node --test scripts/private-repo-check.test.cjs
  scripts/private-name-precommit.test.cjs`** — the adversarial suites for the
  reference guard below, covering both the layers that run in CI and the local
  pre-commit layer that CI can't run itself.
- **`node --test scripts/classify-review-outcome.test.cjs`** — drives the
  `Classify the review outcome` step of `.github/workflows/claude-review.yml`
  against synthetic execution logs, with `gh` stubbed so nothing touches a PR.
  It runs the step's real text, extracted from the workflow rather than copied,
  so the suite can't drift from what CI executes. That step decides whether a
  failed review reads as *the PR is bad* or *the tooling broke* (`ADR-005`), and
  until now it could only be exercised by merging it and opening a throwaway PR.
- **`scripts/private-repo-check.cjs`** — every `sanlee-ys/<repo>` reference on
  every published page resolves to a repo that is actually **public**, checked
  live against the GitHub API. Built on a public allowlist rather than a
  denylist, and it fails closed: if the list can't be fetched the build fails
  rather than passing blind.
- **`scripts/check-published-metrics.cjs`** — every figure marked up as a
  published metric still matches the classifier's generated artifact, so a
  number quoted here can't quietly go stale. A mismatch fails; an upstream
  fetch failure warns and passes, so an outage can't redden the build.
- **`scripts/lint_decisions.py`** — every ADR in `decisions/` carries a
  `## Downstream surfaces` section, so a decision can't ship without naming
  what it touches. Stdlib Python, no venv.
- **`scripts/mobile-qa.cjs`** — renders every page at 320/360/390/430 px and
  fails on any horizontal overflow. Mobile is a contract here, not an
  afterthought (see `CLAUDE.md`).

The mobile gate is also meant to run **before** you commit, and it needs a
Chromium matching the pinned Playwright. `node_modules/` isn't tracked and a
Playwright bump strands the old browser revision, so run this on a fresh clone
and after any bump — from the repo root, on any OS:

```bash
npm --prefix scripts ci
npm --prefix scripts exec -- playwright install chromium
```

Then `node scripts/mobile-qa.cjs`. Without it the gate can't launch a browser
and gets skipped, leaving CI as the only thing catching mobile regressions.

## Featured work

- **The System** (`projects/the-system.html`) — cross-repo architecture: how four
  independent repos operate as one system, recorded via a two-tier ADR convention.
- **Defense News Classifier** (`projects/defense-news-classifier.html`) — an LLM
  classifier that enriches notes via an in-process FastAPI BackgroundTask, scored on a
  real hand-labeled eval (<!-- metric:category_accuracy -->92.6% category,
  <!-- metric:domain_accuracy -->92.6% operational domain,
  <!-- metric:region_accuracy -->87.0% region).
- **Product & Program** (`projects/product-and-program.html`) — the same system read as
  product and program work: scope cuts, risk reasoning, and decision framing.
- **Loop replay** (`projects/loop-replay.html`) — a recorded-replay viewer for the
  prompt-optimization loop's run log; the interactive evidence for the classifier's
  L3 rung and the Goodhart argument.

## Analytics

Traffic is measured with [Plausible](https://plausible.io) — privacy-friendly,
no cookie banner, script tag on every page. Dashboard: `sanlee.me` in the
Plausible account tied to this repo. Beyond pageviews, `assets/events.js`
sends three custom events — diagram node clicks, decision-card expands, and
résumé clicks — so the site has real usage data about what readers actually
engage with.

## Local preview

It's static HTML — open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.
