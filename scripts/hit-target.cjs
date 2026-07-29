#!/usr/bin/env node
/*
 * Hit-target gate — anything that advertises interactivity must be hittable
 * where it looks hittable.
 *
 * The bug this exists to catch, in full, because nothing else on the site could
 * see it:
 *
 *   `.node rect` in the diagram was styled `fill: none` (the plate is drawn
 *   unfilled, by design) and `.node text` was styled `pointer-events: none`.
 *   Both are reasonable lines. Together they were a trap, because SVG hit
 *   testing defaults to `visiblePainted`: a shape is a target only where it is
 *   actually PAINTED. An unfilled rect has no paint in its middle, so a
 *   171x57 box that carried `role="button"`, `tabindex="0"` and
 *   `cursor: pointer` had a real hit target of 1.8% of its area — the 1px
 *   stroke, and nothing else.
 *
 * Every other gate passed it. The markup is correct: role, tabindex, aria-label,
 * click and keydown handlers, all present and all attached synchronously with
 * the shapes. The stylesheet is correct read line by line. The rendered contrast
 * is correct. It only exists as geometry in a laid-out page, which is why this
 * gate renders and hit-tests rather than reading CSS — the same reason
 * `contrast-check.cjs` measures composited pixels instead of declared tokens
 * (see `ADR-009`).
 *
 * It also reads as a TIMING bug to whoever hits it, which is how it was first
 * reported ("couldn't click ... seems to be a bit of a delay"). It isn't:
 * `.node:hover rect` paints a fill, and a painted fill IS hit-testable, so
 * grazing the hairline border brings the whole box to life for as long as the
 * pointer stays on it. Dead, then working, with no code running late.
 *
 * What is checked, per interactive element, at desktop and phone widths:
 *   1. the centre of its box is a hit target
 *   2. at least MIN_COVERAGE of its box is a hit target
 *   3. its box is at least MIN_TAP px on both axes (the CLAUDE.md tap contract)
 *
 * Run from the repo root:   node scripts/hit-target.cjs
 * Requires Playwright and a Chromium binary.
 */
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
  console.error('hit-target error: Playwright is not installed. From the repo root, run:');
  console.error('  npm --prefix scripts ci');
  console.error('  npm --prefix scripts exec -- playwright install chromium');
  process.exit(1);
}

const { serve } = require('./static-server.cjs');

const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();

// Desktop and the narrow layout. The diagram swaps layouts at 600px, and the
// phone width is also where the tap-size rule bites, so both are measured.
const WIDTHS = [1280, 390];

// 60%, not 100%, because a legitimately non-rectangular target (a circle, a
// diamond) covers only part of its bounding box and must not fail for it — a
// circle is ~78%. The defect this catches was 1.8%, two orders of magnitude
// below the threshold, so the gap costs nothing in sensitivity.
const MIN_COVERAGE = 0.6;

// The CLAUDE.md mobile contract. Applied at phone width only: a desktop
// pointer is precise, a thumb is not, and enforcing it at 1280 would fail
// legitimately small controls that a mouse handles fine.
const MIN_TAP = 44;
const TAP_WIDTH = 390;

function findHtml(dir) {
  const out = [];
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'scripts') continue;
    const rel = dir === '.' ? name : `${dir}/${name}`;
    const stat = fs.statSync(path.join(ROOT, rel));
    if (stat.isDirectory()) out.push(...findHtml(rel));
    else if (name.endsWith('.html')) out.push(rel);
  }
  return out;
}

/*
 * Runs in the page. Scoped to elements inside an <svg>, which is where this
 * class of bug lives: HTML buttons and links are filled boxes and hit-test as
 * you would expect, while SVG's `visiblePainted` default makes an unpainted
 * shape untouchable without saying so anywhere.
 *
 * Sampling is on a grid rather than every pixel: a 24x24 grid over a 171x57 box
 * is ~576 elementFromPoint calls instead of ~9,700, resolves 1.8% from 100%
 * without ambiguity, and keeps the whole gate to a few seconds.
 */
const PROBE = ({ minCoverage }) => {
  const SAMPLES = 24;
  const results = [];
  const seen = new Set();

  for (const svg of document.querySelectorAll('svg')) {
    for (const el of svg.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const role = el.getAttribute('role');
      const ti = el.getAttribute('tabindex');
      /*
       * "Advertises interactivity" = the element itself claims to be a control:
       * a button/link role, or focusable. Both are explicit, per-element
       * assertions in the markup.
       *
       * `cursor: pointer` is deliberately NOT sufficient, though it was in the
       * first draft of this gate and produced 31 false failures. The cursor
       * INHERITS, so every decorative <path> inside a real <a> reports it, and
       * a marker can legitimately show a pointer while the hit area belongs to
       * a sibling -- which is exactly how `#score-chart` is built: the
       * `.series-dot` circles are `fill: none` decoration and the real control
       * is the `.hit-col` rect behind them, `fill: transparent` and
       * `role="button"`. Keying on the cursor called that correct page broken.
       */
      const advertises =
        role === 'button' || role === 'link' || (ti !== null && ti !== '-1');
      if (!advertises || seen.has(el)) continue;
      seen.add(el);

      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;

      // elementFromPoint only answers for points inside the viewport, so the
      // element has to be scrolled in first. Measuring without this reports a
      // dead target for anything below the fold -- a false FAIL, and the exact
      // mistake made while diagnosing the original bug.
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const raw = el.getBoundingClientRect();

      /*
       * Sample the element's box INTERSECTED with its <svg>'s box, not the raw
       * box. An SVG clips at its viewport, so a shape may extend past the plate
       * edge -- `#score-chart`'s outermost hit columns are drawn `colWidth/2`
       * beyond it and lose ~44% of their bounding box that way. That area was
       * never claimable and counting it as "dead" made a correctly built chart
       * read as 56% broken. Coverage has to be measured over the region the
       * element can actually occupy, or the number does not mean what the
       * failure message says it means.
       */
      const sb = svg.getBoundingClientRect();
      const b = {
        left: Math.max(raw.left, sb.left), right: Math.min(raw.right, sb.right),
        top: Math.max(raw.top, sb.top), bottom: Math.min(raw.bottom, sb.bottom),
      };
      b.width = b.right - b.left;
      b.height = b.bottom - b.top;
      // Entirely outside its own SVG: a control that is clipped out of
      // existence. Unreachable, so a failure rather than a skip.
      if (b.width <= 0 || b.height <= 0) {
        results.push({
          tag: el.tagName, id: el.id || svg.id || '',
          label: el.getAttribute('aria-label') || '', role, tabindex: ti, cursor: cs.cursor,
          width: 0, height: 0, clipped: true, coverage: 0, centreHit: false,
        });
        continue;
      }
      const clipped = b.top < 0 || b.bottom > innerHeight;

      let hits = 0, total = 0;
      for (let i = 0; i <= SAMPLES; i++) {
        for (let j = 0; j <= SAMPLES; j++) {
          const x = b.left + (b.width * i) / SAMPLES;
          const y = b.top + (b.height * j) / SAMPLES;
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
          const hit = document.elementFromPoint(x, y);
          total++;
          // A descendant counts: clicks bubble, so hitting the <text> inside a
          // node is hitting the node.
          if (hit && (hit === el || el.contains(hit))) hits++;
        }
      }

      const centre = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      results.push({
        tag: el.tagName,
        id: el.id || svg.id || '',
        label: el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 30),
        role, tabindex: ti, cursor: cs.cursor,
        width: Math.round(b.width), height: Math.round(b.height),
        clipped,
        coverage: total ? hits / total : 0,
        centreHit: !!(centre && (centre === el || el.contains(centre))),
        minCoverage,
      });
    }
  }
  return results;
};

(async () => {
  const pages = findHtml('.').sort();
  // A gate that rendered no pages must not report success (`ADR-006`).
  if (pages.length === 0) {
    console.error(`hit-target error: no HTML found under ${ROOT}. Nothing was rendered.`);
    console.error('  Run `npm run build` first, or unset SITE_ROOT.');
    process.exit(1);
  }

  const exe = process.env.PW_CHROMIUM;
  if (exe && !fs.existsSync(exe)) {
    console.error(`hit-target error: PW_CHROMIUM is set to "${exe}" but nothing exists there.`);
    console.error('Unset it to use the Chromium from `npm --prefix scripts exec -- playwright install chromium`.');
    process.exit(1);
  }

  const site = await serve(ROOT);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  await page.route('**/*', r => (r.request().url().startsWith(site.origin) ? r.continue() : r.abort()));

  let fails = 0;
  let checked = 0;
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const rel of pages) {
      await page.goto(`${site.origin}/${rel}`, { waitUntil: 'load', timeout: 15000 });
      // The diagram is drawn by a classic (non-deferred) script, so it exists by
      // `load`. One frame settles layout for anything that sizes on rAF.
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));

      const found = await page.evaluate(PROBE, { minCoverage: MIN_COVERAGE });
      for (const f of found) {
        checked++;
        const where = `${rel} @${w}px  <${f.tag}${f.id ? ` #${f.id}` : ''}> "${f.label}"`;
        if (!f.centreHit || f.coverage < MIN_COVERAGE) {
          fails++;
          console.log(`  FAIL  ${where}`);
          console.log(`        advertises: ${[f.role && `role=${f.role}`, f.tabindex !== null && `tabindex=${f.tabindex}`, f.cursor === 'pointer' && 'cursor:pointer'].filter(Boolean).join(', ')}`);
          console.log(`        box ${f.width}x${f.height}px, but only ${(f.coverage * 100).toFixed(1)}% of it is a hit target; centre is ${f.centreHit ? 'live' : 'DEAD'}.`);
          if (f.clipped) console.log('        (element extends past the viewport — coverage is a partial sample)');
          console.log('        In SVG a shape is only hittable where it is PAINTED. `fill: none` +');
          console.log('        `pointer-events: none` leaves the stroke as the only target. Add');
          console.log('        `pointer-events: all` (or a transparent fill) to the shape.');
        } else if (w === TAP_WIDTH && (f.width < MIN_TAP || f.height < MIN_TAP)) {
          fails++;
          console.log(`  FAIL  ${where}`);
          console.log(`        tap target is ${f.width}x${f.height}px; the mobile contract is ${MIN_TAP}x${MIN_TAP}px minimum.`);
        }
      }
    }
  }

  await browser.close();
  await site.close();

  /*
   * Zero interactive SVG elements site-wide is a failure, not a clean run.
   *
   * This is the "fails if it finds no pages" rule one level down. The figures
   * this gate guards are drawn by JavaScript; if that script breaks, throws, or
   * gets renamed, the elements simply are not there and every assertion below
   * passes vacuously. A gate whose subject can silently vanish is the exact
   * shape of the three checks this repo already shipped that never checked
   * anything.
   */
  if (checked === 0) {
    console.error('\n✗ hit-target: found no interactive SVG elements anywhere in the build.');
    console.error('  The interactive figures are script-drawn, so "none found" most likely means');
    console.error('  a renderer failed rather than that there is nothing to check.');
    process.exit(1);
  }

  if (fails) {
    console.error(`\n✗ ${fails} hit-target issue(s). An element that looks interactive must be clickable across its box.`);
    process.exit(1);
  }
  console.log(`✓ Hit targets sound — ${checked} interactive element(s) across ${pages.length} pages × ${WIDTHS.join('/')}px.`);
})().catch(e => { console.error('hit-target error:', e.message); process.exit(1); });
