# portfolio

Public portfolio site for San Lee — a curated front door to the systems and
product work I build for myself.

**Live site:** _(GitHub Pages — link added once enabled)_

This repo is deliberately **public**. It's the polished, showcase end of my
personal projects: the artifact that points at real work and frames it in
systems / product language.

## Layout

| Path | Holds |
|---|---|
| `index.html` | The landing page — hero, thesis, project cards. |
| `assets/` | Stylesheet and (later) the GitHub-API script for live repo cards. |
| `projects/` | One HTML writeup per featured project — problem, decisions, outcome. |

## Featured work

- **The System** (`projects/the-system.html`) — cross-repo architecture: how four
  independent repos operate as one system, recorded via a two-tier ADR convention.
- **Defense News Classifier** (`projects/defense-news-classifier.html`): an LLM
  classifier feeding a Kafka consume-then-writeback loop.

## Local preview

It's static HTML — open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.
