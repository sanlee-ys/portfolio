# Lesson 03 — Layout: Flexbox & Grid

**Tier 1 (CSS craft) · the backbone. How things are actually positioned, not just
decorated.**

## The one distinction that unlocks everything

- **Flexbox is one-dimensional** — lay items along a single row *or* column.
- **Grid is two-dimensional** — rows *and* columns at once.

That's the whole decision tree. Buttons in a row → Flexbox. A card matrix → Grid.
And they **compose**: Grid for the outer arrangement, Flex for the inside of each
item. That's how real layouts are built.

## Grid: intrinsic responsiveness (no media query)

The cards went from a fixed `grid-template-columns: 1fr 1fr` (plus a media query
to collapse to one column on mobile) to:

```css
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
```

- `minmax(280px, 1fr)` — each column is **at least 280px**, and grows to share
  leftover space (`1fr` = one fraction of the free space).
- `repeat(auto-fit, ...)` — fit as many such columns as will fit; when two 280px
  columns no longer fit, it **wraps to one automatically**.

Result: the layout is responsive **with the breakpoint deleted**. The browser does
the math. This is the single biggest "aha" of modern CSS layout — you describe
intent, not pixel breakpoints.

## Flexbox: the inside of each card

Two flex contexts inside one card:

1. **The card itself** is `display: flex; flex-direction: column`. Combined with
   Grid stretching every card to equal height, this lets us pin the "Read" link
   to the bottom regardless of description length:
   ```css
   .card-link { margin-top: auto; align-self: flex-start; }
   ```
   - `margin-top: auto` eats all leftover vertical space above the element,
     shoving it to the bottom. (A flex "auto margin" absorbs free space.)
   - `align-self: flex-start` stops it stretching full width — because flex
     **stretches children on the cross axis by default**.

2. **The tag pills** are a `display: flex; flex-wrap: wrap; gap: 8px` row. This is
   the *other* axis of flexbox: items flow along a line and wrap when they run out
   of room.

## Axes (the mental model)

A flex container has a **main axis** (the direction of `flex-direction`) and a
**cross axis** (perpendicular). `justify-content` distributes along the main axis;
`align-items` along the cross axis. Flip `flex-direction` and those two swap which
way they point — that's the part that trips everyone up.

## Where it already lived (examples on this page)

- `.cta` — `display: flex; gap` — the hero buttons in a row.
- `.footer .wrap` — `display: flex; justify-content: space-between` — name pushed
  left, links pushed right.

## Takeaways

- **1D = Flexbox, 2D = Grid.** Memorize this; it answers 90% of layout questions.
- **`repeat(auto-fit, minmax(...))`** gives responsive grids with no breakpoints.
- **`fr`** is "a fraction of leftover space" — the native grid/flex unit.
- **Auto margins in flex absorb free space** (`margin-top: auto` to bottom-pin).
- **Flex stretches children on the cross axis by default** — `align-self` to opt out.
- **Main axis vs cross axis** flips with `flex-direction`.

## Files

- `assets/style.css` — `.cards` (auto-fit grid), `.card` (flex column),
  `.card-link` (margin-top:auto), `.tags` (flex-wrap row); removed the cards
  media query
- `index.html` — `.meta` text replaced with `<ul class="tags">` pills
