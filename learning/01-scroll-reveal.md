# Lesson 01 — Scroll-reveal

**Tier 1 (CSS craft) · the cards and headings fade up as you scroll to them.**

## Concept

Elements start invisible and animate into place when they enter the viewport.

## The why

The naive approach is to listen to the `scroll` event and measure positions on
every tick — but `scroll` fires dozens of times a second, so that's wasteful and
janky. The right tool is **`IntersectionObserver`**: you hand the browser a list
of elements and it calls *you* back only when one actually crosses a threshold
into view.

That's the **observer pattern** — the same instinct as a Kafka consumer. Don't
poll; *subscribe* and react to events. I already think this way on the backend;
this is the exact same idea pointed at the DOM.

## How it works (the split)

- **CSS owns the look.** A resting state (`.reveal` → `opacity: 0;
  translateY(18px)`) and a destination (`.is-visible` → `opacity: 1`), with a
  `transition` between them.
- **JS owns the trigger.** The observer does *one thing*: add `.is-visible` when
  the element scrolls in. Style is declarative, behavior is imperative — keep them
  apart.

## Takeaways

- **`IntersectionObserver` = subscribe, don't poll.**
- **Separate look (CSS) from trigger (JS).** This separation is the whole game.
- **Craftsmanship details that separate "works" from "professional":**
  - `observer.unobserve()` after revealing — stop watching once done.
  - `@media (prefers-reduced-motion: reduce)` — respect users who disable motion;
    skip straight to visible. Accessibility is table stakes, not polish.
  - A fallback that just shows everything if `IntersectionObserver` is missing.
- **No framework needed.** `IntersectionObserver`, CSS transitions, `transform`
  are all native browser primitives. A lot of "fancy" front-end is just knowing
  the platform.

## Files

- `assets/reveal.js` — the observer
- `assets/style.css` — `.reveal` / `.is-visible`, stagger via `data-delay`, reduced-motion
- `index.html` — `class="reveal"` on the headings and cards
