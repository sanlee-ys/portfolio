# CLAUDE.md — working agreement for this repo

Public portfolio site — static HTML/CSS/JS, served at **sanlee.me** via GitHub
Pages. No build step; every page links `assets/style.css`.

## Mobile is a contract, not an afterthought

This site is public and most visitors arrive on a phone. **Any change that
touches HTML, CSS, or layout must be verified at mobile widths before it is
committed.** The owner should never have to QA the phone layout after the fact.

Before committing any layout / style / markup change:

1. **Run the mobile QA gate** from the repo root:

   ```
   node scripts/mobile-qa.cjs
   ```

   It renders every page at **320 / 360 / 390 / 430 px** and **fails on any
   horizontal overflow**. It must be green before you commit.

2. **Hard rules** (the gate enforces overflow; you uphold the rest):
   - **No horizontal overflow at any width.** The page must never scroll
     sideways. Wide elements — tables, `pre`/code blocks, images, embeds — stay
     within the viewport. A table scrolls inside its **own** box (`display:
     block; overflow-x: auto`), it never widens the page.
   - Nav and footer link rows **wrap**, never clip.
   - Tap targets ≥ 44px.
   - If you change colors, check **both** light and dark themes.

3. **Actually look at it.** For anything visual, screenshot the affected page at
   ~390px (Playwright + Chromium at `/opt/pw-browsers/chromium`) and inspect it —
   don't assume from the code.

## Why 320px matters

430px ≈ the largest iPhone in CSS pixels, but many people run **Display Zoom**,
which drops the effective width to ~375px or less. Test **down to 320px**, not
just 430 — a layout that only works at 430 will still clip for a real user.

## Deploy note

After merging, GitHub Pages + its CDN can serve **cached** CSS for a few
minutes. If a fix "doesn't work," hard-refresh (or wait for the cache to expire)
before concluding it failed — the source may already be correct.
