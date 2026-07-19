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
| `lab/` | Front-end experiments, plus the learning-log index. |
| `learning/` | The learning log — one Markdown lesson per technique. |
| `assets/` | Stylesheet, JS (theme, reveal, diagram, events), share card, favicons. |
| `scripts/` | QA gates: `mobile-qa.cjs` (overflow) and `link-check.cjs` (dead links). |
| `ROADMAP.md` | The site's own tracked backlog. |

## QA

CI (GitHub Actions) runs on every PR and push to `main`:

- **`scripts/link-check.cjs`** — no broken internal links.
- **`scripts/mobile-qa.cjs`** — renders every page at 320/360/390/430 px and
  fails on any horizontal overflow. Mobile is a contract here, not an
  afterthought (see `CLAUDE.md`).

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
- **Lab** (`lab/index.html`) — a front-end sandbox where the experiments live so the
  front page stays clean.

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
