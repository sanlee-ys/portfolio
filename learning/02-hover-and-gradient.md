# Lesson 02 — Hover micro-interactions + animated gradient

**Tier 1 (CSS craft) · cards lift on hover, the "read" arrow slides, and the hero
has a slow ambient gradient.**

## Concepts

Two ideas in one rung:

1. **Hover micro-interactions** — small, responsive feedback when you point at
   something interactive.
2. **Ambient animation** — slow, looping motion that gives the page life without
   demanding attention.

## The why

**Micro-interactions** tell the user "this is alive and clickable." The card
lifts (`transform: translateY(-4px)`) and gains a shadow; the arrow slides right.
`transform` is the right property because it's GPU-cheap — the browser doesn't
re-layout the page, it just repaints the moved layer.

**The inline-block gotcha:** you *cannot* `transform` a plain inline element (like
a bare `<span>` of text). It has to be `display: inline-block` (or block/flex)
first. That's why the arrow is wrapped in `<span class="arrow">` with
`display: inline-block`.

**Parent-hover-affects-child:** the selector `.card:hover .card-link .arrow`
animates the arrow when the *card* (the parent) is hovered — not the arrow itself.
Hover state cascades down.

**The animated gradient** lives on a `::before` pseudo-element behind the hero
content, not on the hero itself. Why a separate layer? So we can animate/scale the
background freely without the text moving. The content gets `position: relative;
z-index: 1` to sit on top — this is **z-index stacking**, and it only works once
an element is positioned (`relative`/`absolute`). The motion is a `@keyframes`
animation that slowly drifts and scales the blob layer on an infinite `alternate`
loop.

## Takeaways

- **Animate `transform`/`opacity`, not `top`/`width`/`margin`.** The former are
  cheap (compositor); the latter force expensive layout/paint.
- **`inline-block` is required to transform inline content.**
- **Hover cascades:** style a child off a parent's `:hover`.
- **Pseudo-elements (`::before`) + z-index** let you layer ambient effects behind
  content cleanly.
- **`@keyframes` + `animation`** for looping ambient motion; `transition` for
  one-shot state changes. Different tools.
- Reduced-motion again: the ambient drift is disabled for users who ask for it.

## Files

- `assets/style.css` — `.hero::before` + `@keyframes hero-drift`; card `:hover`
  lift/shadow; `.arrow` nudge; `--shadow` theme variable
- `index.html` — arrows wrapped in `<span class="arrow">`
