# ADR-010: A figure offers the jump, it does not take it

**Status:** Accepted
**Date:** 2026-07-28
**Deciders:** San Lee

---

## Context

Selecting a node in the system diagram — on the homepage and on
`projects/the-system.html` — did four things at once:

```js
target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
target.classList.add("target");
target.setAttribute("tabindex", "-1");
target.focus({ preventScroll: true });
```

Three of those are fine. The first is a **scroll hijack with no return path.**
The reader touches a box in a figure and the page carries them somewhere else.
At 390px the figure is then entirely off screen, so exploring a second node
means scrolling back up and finding the map again — and nothing on the page they
were sent to offers a way back. The diagram is built to be *browsed*, three
nodes in whatever order you like, and the interaction made browsing it the
expensive path.

It was noticed while fixing a different bug in the same file (#188, the nodes
were 1.8% clickable) and deliberately left alone there, because it is a design
question rather than a defect with one right answer.

Two facts found while weighing it turned out to matter more than the complaint
did, and both argue that the jump was not paying for what it cost:

- **The caption already has the payload.** `#diagram-detail` is `aria-live` and
  shows the selected node's full description plus its ADR/SYS ids. The jump was
  a second delivery of information already on screen, 1,200px further down.
- **On the homepage the jump was often a downgrade, and its feedback was
  broken.** Two of the three homepage anchors (`decision-contracts`,
  `decision-rightsized`) are one-line `<li>` footnotes in `ul.ledger`, not
  `.decision` blocks. So the reader was carried away from a full paragraph to a
  single sentence — **less** than they were already reading. And
  `.decision.target`, the highlighter swipe built to say *you landed here*,
  does not match an `<li>`: on two nodes out of three it fired into an empty
  selector, below the fold, where nobody could see it not happening.

There is a real accessibility tension in removing it, and it has to be answered
rather than waved past. The focus move plus the live region are what tell a
screen-reader user that anything happened; deleting the focus move outright
could regress that.

## Decision

**The figure offers the jump. It does not take it.**

`select()` updates the caption and stops. The caption gains an ordinary
same-page link — *"The decision behind it →"* — pointing at the node's anchor.
The reader chooses whether to travel.

Everything the old code did *on arrival* is kept and simply moved onto that
link's activation: `tabindex="-1"`, `focus({ preventScroll: true })`, and the
1300ms `.target` swipe. Focus following the navigation is correct there,
because the reader asked for the navigation.

Three properties are load-bearing:

1. **The announcement was never the focus move.** `#diagram-detail` carries
   `aria-live="polite" aria-atomic="true"`, and an atomic live region re-reads
   its whole contents on any change — including the new link's text. That is
   what announces a selection, before and after this change. If anything the
   focus move worked against it: moving focus mid-announcement can pre-empt a
   pending polite one. What the focus move *did* add was moving the reading
   position, and that is now reachable rather than automatic — the caption is
   the next element after the `<svg>` in DOM order, so **Tab from the nodes
   lands on the link.**
2. **Native anchor navigation supplies three things the scripted jump faked or
   lacked.** The browser's own scroll, already reduced-motion-aware through
   `html { scroll-behavior: smooth }` inside a `prefers-reduced-motion:
   no-preference` query, so the script no longer picks a `behavior:` for
   itself. A **history entry — so Back is the return path**, which is the thing
   the complaint was actually about. And a hash, so where you landed is
   linkable, exactly like the inbound `glossary.html` deep links that already
   point at these same anchors.
3. **The landing mark is fixed rather than left half-working.** `.ledger li`
   joins `.decision` on the `.target` rule, so the swipe lands on all three
   homepage anchors instead of one.

## Downstream surfaces

- `public/assets/diagram.js` — `select()` no longer scrolls or focuses; the
  caption link and its `markTarget()` handler are the replacement. The file
  header's "selecting a box jumps to the decision behind it" is corrected.
- `public/assets/style.css` — three edits: `.diagram-detail .card-link` spacing;
  `.ledger li` added to the `.target` highlight and its reduced-motion
  companion; and the `scroll-behavior` comment block, which named the diagram's
  node as a scripted case and now names the caption's anchor.
- `src/pages/index.astro`, `src/pages/projects/the-system.astro` — **no change
  required.** Both already host `#diagram-detail` with the live-region
  attributes this decision now leans on, and both already contain all three
  anchor ids. Recorded because "surfaces unchanged" is a checked answer here,
  not an unexamined one.
- `CLAUDE.md` — carries the operative rule ("a figure offers the jump"). Per
  `decisions/README.md`, canonical for *what to do*; this ADR is canonical for
  *why*.
- `scripts/hit-target.cjs` — **not affected, and worth knowing why.** It scopes
  itself to elements inside an `<svg>`, so the new HTML `<a>` is outside its
  reach. The 44px tap contract on it is upheld by the author, per `CLAUDE.md`.
- `portfolio/ADR-001` — the mobile contract this was verified against
  (320/360/390/430, no horizontal overflow).

## Consequences

- **The reader keeps their place.** Selecting all three nodes in a row is now
  three clicks in one spot rather than three round trips. That is the whole
  point; it is also the thing no gate can measure, so it was checked by
  looking, at 390px, in both themes.
- **One more click to reach a decision.** Accepted, and it is the trade being
  made rather than a cost being minimised: a reader who wants the decision asks
  for it, and a reader who wanted the description already has it. The link is
  the first thing after the caption text and the next Tab stop after the nodes.
- **It fixed a highlight that had never worked on two thirds of the homepage's
  nodes.** Nobody had reported it, and nobody could have: the failure was a
  wash that did not appear, on an element below the fold, at the end of a jump
  that had already disoriented you. That is the second defect in two PRs on
  this figure whose only symptom was *nothing visible happening*, after the
  1.8% hit target that read as lag.
- **Reduced-motion handling moved from JS to CSS, and got broader.** The script
  used to query `prefers-reduced-motion` itself and pass `behavior: "auto"`.
  The stylesheet's `no-preference` query already covers every anchor navigation
  on the site, so the special case is gone rather than duplicated.
- **The `<a>` sits inside a live region.** That is legal and ordinary, and
  `aria-atomic` means its text is part of the announcement. The cost is that
  the link is announced on every selection, including selections where the
  reader does not want it; a persistent link outside the region would announce
  never, which is worse for the case this decision cares about.
- **No test covers the new behaviour**, and that is stated rather than implied
  by a green run. `npm run qa`'s fourteen checks confirm the change breaks
  nothing measurable — links resolve, no overflow at four widths, contrast AA
  in both themes, hit targets sound, glyph coverage intact. None of them can
  assert "the page did not move", because the defect was never a rendering
  property. What backs that claim is a Playwright pass driving the real page:
  scroll position recorded before and after a node click, at 390px and 1280px.

## Alternatives Considered

| Option | Reason Not Chosen |
|--------|-------------------|
| **Keep the jump, add a "back to the map" affordance** | Treats the symptom and doubles the machinery: it keeps the displacement and then builds a control to undo it. The control has to be injected into a decision entry that has no other reason to hold one, has to appear only after a jump (so it is a transient control that a reader may see once), and on the homepage would have to be injected into a one-line `<li>` footnote. And it does not help the phone case much — you are still thrown, you just get a lift home |
| **Keep the jump only for keyboard activation**, pointer excluded | Makes one control behave two ways depending on how you touched it, which is the kind of rule you cannot state in a caption. It is also not the accessibility win it sounds like: the displacement is identical for a keyboard user, and the alternative form — `focus({ preventScroll: true })` with no scroll — parks focus off screen, which is a WCAG 2.4.11 (Focus Not Obscured) problem rather than a fix. The accessible behaviour wanted here is that activation has an announced result, and the live region already provides it |
| **Widen the `prefers-reduced-motion` check** so the jump is instant rather than smooth for that reader | Misreads the complaint. The objection is displacement, not animation; an instant teleport to a spot 1,200px away is the same loss of place, arriving faster. The reduced-motion query was already respected by the old code and the bug was reported anyway |
| **Drop the anchor entirely** — caption only, no link | The smallest possible change and genuinely tempting, since the caption carries the description. Rejected because the node → decision relationship is a real claim the figure makes ("this box is governed by that decision"), the `adr` ids in the caption are inert text pointing at something the reader then has to hunt for, and on `the-system.html` the decision entries carry substance the caption does not — including the contract seam that broke. Removing the route to them to fix how the route was travelled is throwing out the thing that worked |
| **CSS `:target` for the landing highlight** instead of the JS `.target` class | Would delete the click handler and cover inbound deep links from `glossary.html` too. Rejected on blast radius against benefit: `:target` persists until the hash changes, so a wash that bleeds 14px past the reading column becomes permanent rather than a 1300ms mark, and it would change how every existing deep link into these anchors behaves. The transient swipe is already tuned; this decision moves its trigger, it does not redesign it |
| **Scroll the figure and the decision into view together** (e.g. shrink the map, or a split view) | A layout redesign in answer to an interaction bug, and it fails at 390px anyway, where there is no room to hold a 470-unit-tall diagram and a decision entry on one screen. The narrow layout exists precisely because the figure needs the whole width |
