# Lesson 06 — A data-driven SVG diagram

**Tier 3 (SVG + dataviz) · an interactive map of the system, generated from data.**
On the [The System](../projects/the-system.html) writeup.

## The new idea

CSS styles HTML boxes. SVG is different: a coordinate space where you *draw*
shapes by position (`<rect>`, `<line>`, `<text>`) inside a `viewBox`. The powerful
part, and the whole basis of D3 and dataviz, is **generating the shapes from a
data structure** instead of hand-drawing each one.

The diagram is defined as data:

```js
var nodes = [{ id: "notes-api", label: "notes-api", x: 165, y: 215, desc: "..." }, ...];
var edges = [{ from: "notes-api", to: "kafka", label: "NoteCreated" }, ...];
```

Then code turns that data into SVG. Change the data, the picture changes. Nothing
is hand-positioned in the markup.

## Pieces worth knowing

- **`viewBox="0 0 800 430"`** sets an internal coordinate system. The SVG then
  scales to whatever width the CSS gives it (`width: 100%`), so the drawing is
  resolution-independent. You think in viewBox units, not pixels.
- **`createElementNS`** — SVG elements live in the SVG XML namespace, so you build
  them with `document.createElementNS("http://www.w3.org/2000/svg", "rect")`, not
  the plain `createElement` you'd use for HTML.
- **Draw order is paint order.** Edges are appended before nodes so the node boxes
  paint on top of the lines (the lines visually tuck under the boxes).
- **A `<marker>`** defined once in `<defs>` and referenced with
  `marker-end="url(#arrow)"` draws the arrowhead on every edge. Define once, reuse.
- **A little coordinate math** stops each edge at the target box's border instead
  of its center, so the arrowhead lands cleanly on the edge of the box. (The
  `border()` helper scales the direction vector to the box's half-width/height.)

## Interactivity and accessibility

- Each node is a `<g class="node" tabindex="0" role="button">`. Click *or*
  keyboard (Enter / Space) selects it and writes its description into a detail
  panel. Making the SVG group focusable and key-operable is what keeps it usable
  without a mouse.
- **Progressive enhancement again:** the diagram needs JS to render. The same flow
  is written out as an ordered list right below it, so a no-JS reader loses nothing.
  The diagram is the enhancement, the prose is the baseline.

## Takeaways

- **SVG = a coordinate space you draw in;** HTML/CSS = a document you style.
- **Bind data to visuals.** Define the picture as data, render it with code. This
  is the D3 mental model, now understood from first principles.
- **`createElementNS`** for SVG, not `createElement`.
- **Paint order = append order**; use `<defs>` + `<marker>` for reusable parts.
- Make interactive SVG **keyboard-operable** (`tabindex`, `role`, key handlers).

## Files

- `assets/diagram.js` — the data + the renderer
- `assets/style.css` — `.diagram`, `.node`, `.edge`, marker and detail-panel styles
- `projects/the-system.html` — the `<svg>` shell + the ordered-list fallback
