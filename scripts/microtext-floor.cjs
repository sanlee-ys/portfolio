#!/usr/bin/env node
/*
 * Microtext floor gate — no SVG text renders under 9px at a 320px viewport.
 *
 * The rule is `CLAUDE.md`, "The microtext floor", and `decisions/ADR-014`
 * section 5. This gate enforces it.
 *
 * WHY THIS GATE EXISTS, WHEN THE RULE SAID NO GATE COULD
 * ------------------------------------------------------
 * `CLAUDE.md` recorded that the floor "is a rule because no gate can be one",
 * and gave the reason: `contrast-check.cjs` skips every node inside an `<svg>`,
 * so a plate nobody can read passes every check. That reason is a fact about
 * the contrast gate, not about gates. The rendered size of a text node is
 * ordinary laid-out geometry, and this repo already measures laid-out geometry
 * twice — `hit-target.cjs` hit-tests controls, `contrast-check.cjs` composites
 * pixels. This is the same shape, at one page load per page.
 *
 * WHAT MADE IT WORTH BUILDING: a hand measurement got the answer wrong.
 * ---------------------------------------------------------------------
 * On 2026-09-01 a measurement of the system map on `projects/the-system.html`
 * reported its labels rendering at 4.08px and 5.10px — under half the floor —
 * and proposed repairs to a figure that is correct. The real rendered sizes are
 * 12.98px and 15.02px. The error is exactly reproducible, and it is the reason
 * this gate measures the way it does:
 *
 *   - It read the viewBox from the MARKUP (`0 0 800 430`) instead of from the
 *     live plate. `diagram.js` rewrites that attribute to `0 45 440 470` at
 *     phone widths, so the scale came out 272/800 = 0.34 instead of 0.62.
 *   - It read the font sizes from `diagram.js`'s source constants (12 and 15,
 *     the WIDE layout) instead of from the live nodes, which carry an inline
 *     `font-size` of 21 and 24.3 at that width.
 *
 * Both halves of the arithmetic were stale in the same direction, so the
 * product was off by a factor of three toward "this is broken". A gate that
 * renders cannot make either mistake, and the cost of the mistake is a lane
 * spent editing a working figure.
 *
 * HOW THE SCALE IS MEASURED: `getScreenCTM()`, not a viewBox ratio.
 * -----------------------------------------------------------------
 * Two separate choices sit here, and it is worth keeping them apart, because
 * only the first one is what the incident above turned on.
 *
 * The first is RENDER RATHER THAN READ. A runtime-rewritten viewBox defeats any
 * gate that reads the source, and that is the whole of the 2026-09-01 error. It
 * does not argue for one in-page formula over another: a width ratio computed
 * IN THE PAGE reads the live attribute and gets the system map right.
 *
 * The second is the formula, and it earns its place on two narrower cases that
 * an in-page width ratio still gets wrong, both in the direction that matters —
 * the ratio reports a legible size for text the reader cannot read:
 *
 *   1. a `transform` on the text node or on any ancestor group, which a width
 *      ratio never looks at;
 *   2. a `preserveAspectRatio` that letterboxes. It defaults to `meet`, so the
 *      applied scale is the SMALLER axis ratio; a plate that is wide for its
 *      box paints smaller than its width ratio claims.
 *
 * `getScreenCTM()` returns the element's own user-space to viewport transform,
 * so it composes all of it. The vertical scale is `hypot(b, d)`, the length of
 * the transformed unit-y vector, because a font size scales along y.
 *
 * `microtext-floor.test.cjs` pins both choices separately, and the split above
 * is a mutation result rather than a claim: swapping this line for an in-page
 * width ratio reddens the two blind-spot tests and leaves the runtime-rewrite
 * tests green.
 *
 * The two methods were also compared over the whole built site on 2026-09-01:
 * 410 text nodes on 22 pages, and they agreed on every one. The ratio method is
 * not wrong on today's site. It is fragile against constructions the site
 * already contains.
 *
 * WHY 320px ALONE
 * ---------------
 * The rule names 320px, and 320px is also the binding width. A plate is
 * `width: 100%` over a fixed viewBox, so its scale grows with the viewport; a
 * plate under a `max-width` cap holds one scale above the cap. Rendered size is
 * therefore non-decreasing in viewport width, and the narrowest viewport is the
 * worst case. Measured confirmation, 2026-09-01: the site minimum is 9.00px at
 * 320, 360, 390 and 430 alike.
 *
 * Run from the repo root:   node scripts/microtext-floor.cjs
 * Requires Playwright and a Chromium binary.
 */
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
  console.error('microtext-floor error: Playwright is not installed. From the repo root, run:');
  console.error('  npm --prefix scripts ci');
  console.error('  npm --prefix scripts exec -- playwright install chromium');
  process.exit(1);
}

const { serve } = require('./static-server.cjs');

const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();

const FLOOR = 9;
const WIDTH = 320;

/*
 * A hundredth of a pixel is not a legibility difference, and the CTM is a float
 * product. A plate declared exactly at the floor under a scale that computes to
 * 0.99999997 would otherwise redden the build for arithmetic noise. The
 * tolerance sits far below anything a reader can see, so it cannot launder a
 * plate that is actually short.
 */
const EPSILON = 0.01;

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
 * Runs in the page. Every `<text>` under every `<svg>`, measured as it renders.
 *
 * An empty node is reported as empty rather than dropped. It carries no
 * legibility claim, so it is not a failure, but a walk that silently discards
 * part of what it found cannot be audited — and "none skipped" is a property
 * the CLAUDE.md record states about this measurement.
 *
 * A node with no CTM is a FAILURE, not a skip. That is the ruling
 * `contrast-check.cjs` makes about a colour it cannot resolve: the gate refuses
 * to guess. A `<text>` inside `<defs>`, or under `display: none`, reports null
 * here. Neither has ever existed on this site, so the honest response to the
 * first one is a decision, not a silent pass.
 */
const PROBE = () => {
  const measured = [];
  let empty = 0;

  for (const t of document.querySelectorAll('svg text')) {
    const svg = t.ownerSVGElement;
    if (!svg) continue;

    const label = (t.textContent || '').trim();
    if (label === '') { empty++; continue; }

    const declared = parseFloat(getComputedStyle(t).fontSize) || 0;
    const m = t.getScreenCTM();

    measured.push({
      label: label.slice(0, 34),
      cls: t.getAttribute('class')
        || (t.parentElement && t.parentElement.getAttribute('class'))
        || '',
      svgId: svg.id || '',
      declared,
      // hypot(b, d) is the vertical scale: the length of the transformed unit-y
      // vector. A font size scales along y.
      scale: m ? Math.hypot(m.b, m.d) : null,
      rendered: m ? declared * Math.hypot(m.b, m.d) : null,
    });
  }
  return { measured, empty };
};

(async () => {
  const pages = findHtml('.').sort();
  // A gate that rendered no pages must not report success (`ADR-006`).
  if (pages.length === 0) {
    console.error(`microtext-floor error: no HTML found under ${ROOT}. Nothing was rendered.`);
    console.error('  Run `npm run build` first, or unset SITE_ROOT.');
    process.exit(1);
  }

  const exe = process.env.PW_CHROMIUM;
  if (exe && !fs.existsSync(exe)) {
    console.error(`microtext-floor error: PW_CHROMIUM is set to "${exe}" but nothing exists there.`);
    console.error('Unset it to use the Chromium from `npm --prefix scripts exec -- playwright install chromium`.');
    process.exit(1);
  }

  const site = await serve(ROOT);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  await page.route('**/*', r => (r.request().url().startsWith(site.origin) ? r.continue() : r.abort()));
  await page.setViewportSize({ width: WIDTH, height: 900 });

  let fails = 0;
  let checked = 0;
  let empties = 0;
  let smallest = null;

  for (const rel of pages) {
    await page.goto(`${site.origin}/${rel}`, { waitUntil: 'load', timeout: 20000 });
    // The plates are drawn by classic (non-deferred) scripts, so they exist by
    // `load`. One frame settles layout for anything that sizes on rAF — and
    // `diagram.js` solves its type against the MEASURED plate width, so a
    // measurement taken before layout settles reads the pre-solve sizes.
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));

    const { measured, empty } = await page.evaluate(PROBE);
    empties += empty;
    const raw = await page.evaluate(() => {
      const all = [...document.querySelectorAll('svg text')];
      return {
        n: all.length,
        noOwner: all.filter(t => !t.ownerSVGElement).length,
        blank: all.filter(t => (t.textContent || '').trim() === '').length,
        labels: all.map(t => JSON.stringify(t.textContent || '')).join('|'),
      };
    });
    console.log(`TALLY ${rel} measured=${measured.length} raw=${raw.n} noOwner=${raw.noOwner} blank=${raw.blank}`);
    if (rel.includes('the-system-run')) console.log(`LABELS ${raw.labels}`);

    for (const t of measured) {
      checked++;
      const what = `<text${t.svgId ? ` in #${t.svgId}` : ''}${t.cls ? ` class="${t.cls}"` : ''}>`;
      const where = `${rel} @${WIDTH}px  ${what} "${t.label}"`;

      if (t.rendered === null) {
        fails++;
        console.log(`  FAIL  ${where}`);
        console.log('        this node has no screen transform, so its rendered size is unknowable.');
        console.log('        A <text> in <defs>, or under `display: none`, reports this. The gate');
        console.log('        refuses to guess (the contrast gate makes the same ruling). Either the');
        console.log('        node does not belong in the document, or the exemption is a decision');
        console.log('        to record in CLAUDE.md.');
        continue;
      }

      if (smallest === null || t.rendered < smallest.rendered) smallest = { ...t, rel };

      if (t.rendered < FLOOR - EPSILON) {
        fails++;
        console.log(`  FAIL  ${where}`);
        console.log(`        renders at ${t.rendered.toFixed(2)}px; the floor is ${FLOOR}px.`);
        console.log(`        declared ${t.declared}px in user space, under a plate scale of ${t.scale.toFixed(4)}.`);
        console.log('        Raise the DECLARED unit; do not scale the plate. A plate that grows');
        console.log('        only under a phone breakpoint renders its text smaller again above');
        console.log('        that breakpoint. Bigger microtext costs height — take the height.');
        console.log('        See CLAUDE.md, "The microtext floor", and decisions/ADR-014 section 5.');
      }
    }
  }

  await browser.close();
  await site.close();

  /*
   * Zero text nodes is a failure, not a clean run — the guard
   * `figure-contract.cjs` and `hit-target.cjs` both carry. The plates on this
   * site are script-drawn, so "none found" most likely means a renderer broke,
   * and a broken renderer is the one state this gate must never call green.
   */
  if (checked === 0) {
    console.error(`✗ microtext-floor: walked ${pages.length} page(s) and found no SVG text at all.`);
    console.error('  The figures here are script-drawn, so this most likely means a renderer broke.');
    process.exit(1);
  }

  if (fails > 0) {
    console.error(`\n✗ microtext-floor: ${fails} text node(s) render under ${FLOOR}px at ${WIDTH}px.`);
    process.exit(1);
  }

  console.log(
    `OK - microtext floor: ${checked} SVG text node(s) on ${pages.length} page(s) at ${WIDTH}px, `
    + `none under ${FLOOR}px${empties ? `, ${empties} empty node(s) skipped` : ', none skipped'}.`
  );
  if (smallest) {
    console.log(
      `     smallest on the site: ${smallest.rendered.toFixed(2)}px `
      + `(${smallest.rel}${smallest.cls ? ` .${smallest.cls}` : ''}).`
    );
  }
})();
