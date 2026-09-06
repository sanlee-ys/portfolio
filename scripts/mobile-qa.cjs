#!/usr/bin/env node
/*
 * Mobile responsive QA gate.
 *
 * Renders every .html page at phone widths and FAILS on any horizontal
 * overflow (the page scrolling sideways). This is the check that catches
 * things like a table or nav row widening the page and clipping content.
 *
 * Run from the repo root:   node scripts/mobile-qa.cjs
 * Exit code is non-zero if anything overflows — do not commit layout changes
 * until this is green.
 *
 * Requires Playwright and a Chromium binary.
 *
 * ROOT_FONT_PX=20 runs the same pass at a larger root font size. That is the
 * large-text pass, and CI runs it as its own step. A reader who raises the
 * text size gets a 20px root, and every rem on this site follows it. A grid
 * track's minimum width is its content, so an element that cannot wrap fits
 * at 16px and widens the page at 20px, behind a px query that does not follow
 * the root. The homepage did that on 2026-09-06 (scrollWidth 405 against 370
 * to 400px) with the default pass green.
 *
 * The emulation is an injected `html { font-size }` rule, not a browser
 * setting, because headless Chromium exposes no default-font-size setting to
 * Playwright. A rem in a media query resolves against the browser default and
 * not against that rule, so this pass sees narrower breakpoints than a real
 * large-text browser does. It therefore under-measures, and it rewards a fix
 * that wraps by content rather than by a query.
 */
const fs = require('fs');
const path = require('path');

// Playwright lives in scripts/node_modules, which this file resolves against on
// its own. If it isn't there the answer is always "install it" — so say that,
// rather than dying at module load with whatever require threw.
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
  console.error('mobile-qa error: Playwright is not installed. From the repo root, run:');
  console.error('  npm --prefix scripts ci');
  console.error('  npm --prefix scripts exec -- playwright install chromium');
  process.exit(1);
}

const { serve } = require('./static-server.cjs');

// Since `ADR-006` the pages are build output and their asset paths are
// root-absolute, because one shared layout serves several directory depths.
// Root-absolute paths do NOT resolve over `file://`, so this gate now serves
// the build over HTTP instead of opening files. Opening `dist/*.html` as files
// renders them unstyled — and an unstyled page does not overflow, so the gate
// would go green while testing nothing.
const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();
const WIDTHS = [320, 360, 390, 430]; // 320 covers Display-Zoom phones; 430 the largest iPhone
// Unset means the browser default root (16px in every shipped Chromium).
const ROOT_FONT_PX = process.env.ROOT_FONT_PX ? Number(process.env.ROOT_FONT_PX) : null;
if (process.env.ROOT_FONT_PX && !(ROOT_FONT_PX > 0)) {
  console.error(`mobile-qa error: ROOT_FONT_PX is "${process.env.ROOT_FONT_PX}", which is not a positive number.`);
  process.exit(1);
}
const ROOT_NOTE = ROOT_FONT_PX ? ` at a ${ROOT_FONT_PX}px root` : '';

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

(async () => {
  const pages = findHtml('.').sort();
  // A gate that rendered no pages must not report success (`ADR-006`).
  if (pages.length === 0) {
    console.error(`mobile-qa error: no HTML found under ${ROOT}. Nothing was rendered.`);
    console.error('  Run `npm run build` first, or unset SITE_ROOT.');
    process.exit(1);
  }
  // Browser resolution is PW_CHROMIUM or Playwright's own — nothing in between.
  // A hardcoded default would silently outrank the pinned revision on any host
  // that happened to have that path, which is the one case nobody would notice.
  const exe = process.env.PW_CHROMIUM;
  if (exe && !fs.existsSync(exe)) {
    console.error(`mobile-qa error: PW_CHROMIUM is set to "${exe}" but nothing exists there.`);
    console.error('Unset it to use the Chromium from `npm --prefix scripts exec -- playwright install chromium`.');
    process.exit(1);
  }
  const site = await serve(ROOT);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const context = await browser.newContext();
  if (ROOT_FONT_PX) {
    // The rule goes in at DOMContentLoaded, which fires before `page.goto`
    // resolves, so the measurement below reads a page laid out at this root.
    // `!important` outranks any later author rule on `html`.
    await context.addInitScript((px) => {
      const inject = () => {
        const style = document.createElement('style');
        style.textContent = `html { font-size: ${px}px !important; }`;
        document.head.appendChild(style);
      };
      if (document.head) inject();
      else document.addEventListener('DOMContentLoaded', inject);
    }, ROOT_FONT_PX);
  }
  const page = await context.newPage();
  // Block external requests (analytics/fonts) so pages load fast and offline.
  // The allowed origin is the local server, not `file:` — the gate serves the
  // build now, so a `file:`-only filter would abort the stylesheet itself and
  // measure an unstyled page.
  await page.route('**/*', r => (r.request().url().startsWith(site.origin) ? r.continue() : r.abort()));

  let fails = 0;
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const rel of pages) {
      await page.goto(`${site.origin}/${rel}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      // Measure the page in its own fonts. `domcontentloaded` fires before the
      // self-hosted woff2 files settle unless the cache already holds them, and
      // a fallback face sets narrower: at a 20px root one label measured 264px
      // in the fallback and 269px in Geist Mono, on a line with 3px to spare.
      // Read without this wait, the gate's answer depended on the cache.
      await page.evaluate(() => document.fonts.ready);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      if (over > 0) { fails++; console.log(`  FAIL  +${over}px  ${rel} @${w}px${ROOT_NOTE}`); }
    }
  }
  await browser.close();
  await site.close();

  if (fails) {
    console.error(`\n✗ ${fails} horizontal-overflow issue(s) across ${WIDTHS.join('/')}px${ROOT_NOTE}. Fix before committing.`);
    process.exit(1);
  }
  console.log(`✓ No horizontal overflow — ${pages.length} pages × ${WIDTHS.length} widths (${WIDTHS.join('/')}px)${ROOT_NOTE}.`);
})().catch(e => { console.error('mobile-qa error:', e.message); process.exit(1); });
