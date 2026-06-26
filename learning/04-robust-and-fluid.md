# Lesson 04 — Robust & fluid

**Tier 1 (CSS craft) · making the page accessible and size-adaptive without
breakpoints.** Three techniques: `:focus-visible`, `clamp()`, container queries.

## `:focus-visible` — keyboard accessibility done right

The problem: `:focus` fires on *both* keyboard navigation and mouse clicks — so
styling `:focus` puts an ugly outline on a button the moment you click it.

`:focus-visible` is smarter: the browser only matches it when it thinks the user
actually needs a focus indicator (keyboard `Tab`, not mouse click). So:

```css
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
```

Keyboard users get a clear ring; mouse users don't get visual noise. **Never
remove focus outlines without replacing them** — that strands keyboard-only users.

## `clamp()` — fluid sizing, no media query

```css
font-size: clamp(1.15rem, 3.5vw, 1.4rem);
```

`clamp(MIN, PREFERRED, MAX)` = scale with the viewport (`3.5vw`), but never go
below `MIN` or above `MAX`. Applied to the hero padding, the tagline, and the
section title, the type and spacing now scale *smoothly* across screen sizes
instead of jumping at breakpoints.

This let me **delete the last media query.** Combined with the auto-fit grid from
Lesson 3, the page is now fully responsive with **zero `@media` rules**. You
describe the bounds; the browser interpolates.

## Container queries — respond to the *container*, not the viewport

A media query asks "how big is the *screen*?" A container query asks "how big is
this element's *container*?" That's the right question for a reusable component:
the same card might sit in a wide slot or a narrow one, and it should adapt to
*where it is*, not to the whole window.

```css
.card { container-type: inline-size; container-name: card; }

@container card (max-width: 330px) {
  .card h3 { font-size: 1.15rem; }
}
```

- `container-type: inline-size` makes the card a query container (measured by its
  inline/horizontal size).
- `@container card (max-width: 330px) { ... }` styles the card's *descendants*
  when the card itself is under 330px — which happens when it's in a single
  column on a phone, not when it's half-width on desktop.

> Note: this is a light demo — container queries shine when one component appears
> in many different-width slots (sidebars, grids, modals). The judgment is *when*
> to reach for them; the syntax is the easy part.

## Takeaways

- **`:focus-visible`, not `:focus`,** for focus rings. Never delete outlines
  without a replacement.
- **`clamp(min, preferred, max)`** = fluid type/spacing; often replaces media
  queries entirely.
- **The page now has zero media queries** and is still fully responsive.
- **Container queries** ask about the *container's* size — the right tool for
  components reused at different widths.

## Files

- `assets/style.css` — `clamp()` on hero padding / `.tagline` / `.section-title`;
  removed the last `@media`; `container-type` on `.card` + `@container` rule;
  `:focus-visible` ring block
