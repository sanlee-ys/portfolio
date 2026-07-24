# Learning log

A running record of the front-end I'm learning while building this site. I came
from infra/backend and never did front-end, so this is me climbing the UI
envelope deliberately — one technique at a time, in the open.

**One file per lesson.** Each captures the *concept*, the *why* (often by analogy
to something I already know), the *takeaways*, and the files that changed — so the
lesson and its actual `git` history sit side by side.

## The tier ladder, retired

These lessons were originally sequenced as a four-tier climb — CSS craft, Canvas
2D, SVG/dataviz, then WebGL — with the deep end reserved for a `/lab` sandbox.
[`ADR-004`](../decisions/ADR-004-retire-the-lab-as-the-vehicle.md) retired both
the ladder and the sandbox: sorting work into "fancy UI = learning exercise" and
"prose = real work" was never true, and the tier framing was discounting the
site's strongest artifact. The lessons below stand on their own; front-end
learning now happens inside the real work rather than in a separate wing.

## Lessons

| # | Lesson | Core techniques |
|---|--------|-----------------|
| [01](01-scroll-reveal.md) | Scroll-reveal | `IntersectionObserver`, CSS transitions, `transform`, `prefers-reduced-motion` |
| [02](02-hover-and-gradient.md) | Hover micro-interactions + animated gradient | `@keyframes`, `animation`, pseudo-elements, z-index stacking, `inline-block` for transforms |
| [03](03-layout-flexbox-grid.md) | Layout: Flexbox & Grid | 1D vs 2D, `auto-fit`/`minmax`, `fr`, flex axes, `margin-top:auto`, `flex-wrap` |
| [04](04-robust-and-fluid.md) | Robust & fluid | `:focus-visible`, `clamp()`, container queries, zero-media-query responsive |
| [05](05-scroll-driven-storytelling.md) | Scroll-driven storytelling | `animation-timeline: scroll()`/`view()`, `position: sticky`, `@supports`, progressive enhancement |
| [06](06-svg-data-driven-diagram.md) | Data-driven SVG diagram | SVG `viewBox`, `createElementNS`, data-to-visual binding, `<marker>`, keyboard-operable SVG |
| [07](07-domain-dns-email.md) | The domain: DNS, CNAMEs & email forwarding | `A` vs `CNAME`, apex rules, repo `CNAME` file vs DNS record, `MX`, receive-only forwarding |
