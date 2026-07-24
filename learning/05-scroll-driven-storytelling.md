# Lesson 05 — Scroll-driven storytelling

**Tier 1 (CSS craft) · the finale. Animations driven by scroll position, plus
sticky pinning — all with zero JavaScript.**

## The new idea

Everything before this ran on **time** (`@keyframes` over seconds) or fired on an
**event** (`IntersectionObserver` adds a class once). Scroll-driven animation runs
on **scroll position**: progress = where you are in the scroll, so it scrubs
**forward and backward** as you scroll, like dragging a video scrubber.

The modern version is native CSS — `animation-timeline` — so **no JS**.

## Two surfaces

### Front page — scroll progress bar (`scroll()` timeline)

A 3px bar that fills as you scroll the whole page:

```css
.scroll-progress { transform: scaleX(0); transform-origin: 0 50%; }

@supports (animation-timeline: scroll()) {
  .scroll-progress {
    animation: progress-grow linear both;
    animation-timeline: scroll(root block); /* the root scroller, vertical axis */
  }
}
@keyframes progress-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

- `scroll(root block)` = an **anonymous scroll timeline** tracking the root
  scroller along the block (vertical) axis.
- `animation-timeline` replaces the usual time-based duration — progress is now
  bound to scroll, not seconds.
- We animate `transform: scaleX` (cheap — see Lesson 2), not `width`.

### The demo page — sticky panel + scrubbed reveals (`view()` timeline)

In `/lab/scroll-storytelling.html`:

**`position: sticky`** — an element scrolls normally until it hits an offset
(`top: 22vh`), then *pins* there until its parent section scrolls out.

```css
.story-sticky { position: sticky; top: 22vh; align-self: start; }
```

> **The gotcha:** in a grid/flex container, items *stretch* to fill the track by
> default. A stretched item has no room to "stick." `align-self: start` lets it
> take its natural height so sticky actually works. This breaks more sticky
> layouts than anything else.

**`animation-timeline: view()`** — animate based on the element's own visibility
within the scrollport:

```css
@supports (animation-timeline: view()) {
  .scrub-item {
    animation: scrub-in linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%; /* scrub during the entry phase */
  }
}
```

- `view()` tracks *this element* as it crosses the viewport (vs `scroll()` which
  tracks a scroll container).
- `animation-range: entry` = run the animation specifically while the element is
  *entering* view.

## Progressive enhancement (important)

Scroll-timeline support is recent (Chromium yes; Safari/Firefox catching up). So
both demos are wrapped in `@supports (animation-timeline: ...)`:

- The progress bar defaults to `scaleX(0)` (invisible) — no broken bar if
  unsupported.
- The scrub items are **visible by default**, and only get the (initially
  hidden) animation *inside* `@supports`. Without this, unsupported browsers
  would show the `from`-state forever — invisible content. **Always make the
  no-support path the usable one.**

## Takeaways

- **Scroll-driven = progress bound to scroll position**, scrubs both ways. Different
  from time-based (`@keyframes`) and event-based (`IntersectionObserver`).
- **`scroll()`** tracks a scroll container; **`view()`** tracks an element entering
  the viewport.
- **`animation-range: entry`** targets the entry phase.
- **`position: sticky` needs `align-self: start`** inside grid/flex, or it can't stick.
- **Gate cutting-edge CSS behind `@supports`** and make the fallback the usable state.

## Files

- `index.html` + `assets/style.css` — the `.scroll-progress` bar
- `lab/scroll-storytelling.html` — sticky panel + `view()` scrubbed reveals (self-contained)
- `colophon.html` — links the demo from the learning log
