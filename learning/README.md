# Learning log

A running record of the front-end I'm learning while building this site. I came
from infra/backend and never did front-end, so this is me climbing the UI
envelope deliberately — one technique at a time, in the open.

**One file per lesson.** Each captures the *concept*, the *why* (often by analogy
to something I already know), the *takeaways*, and the files that changed — so the
lesson and its actual `git` history sit side by side.

## The tiers

The plan is to climb, not skip:

1. **CSS craft** — motion, transforms, `IntersectionObserver`
2. **Canvas 2D** — the render loop, particles
3. **SVG + dataviz** — the interactive system diagram
4. **WebGL / shaders** — the deep end (lives in `/lab`)

## Lessons

| # | Lesson | Tier | Core techniques |
|---|--------|------|-----------------|
| [01](01-scroll-reveal.md) | Scroll-reveal | 1 | `IntersectionObserver`, CSS transitions, `transform`, `prefers-reduced-motion` |
| [02](02-hover-and-gradient.md) | Hover micro-interactions + animated gradient | 1 | `@keyframes`, `animation`, pseudo-elements, z-index stacking, `inline-block` for transforms |
| [03](03-layout-flexbox-grid.md) | Layout: Flexbox & Grid | 1 | 1D vs 2D, `auto-fit`/`minmax`, `fr`, flex axes, `margin-top:auto`, `flex-wrap` |
