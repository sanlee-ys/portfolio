#!/usr/bin/env node
/*
 * Regenerate resume.pdf from resume.html so the two never drift.
 *
 * Renders resume.html under PRINT media (so the @media print rules apply)
 * to a Letter-size PDF. Run from the repo root after editing resume.html:
 *
 *   node scripts/resume-pdf.cjs
 *
 * Requires Playwright + a Chromium binary (same toolchain as mobile-qa.cjs).
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
  console.error('resume-pdf error: Playwright is not installed. From the repo root, run:');
  console.error('  npm --prefix scripts ci');
  console.error('  npm --prefix scripts exec -- playwright install chromium');
  process.exit(1);
}

// `resume.html` is deliberately standalone — its own inline <style> and
// @font-face rules, no link to the shared stylesheet — so this script can render
// it offline while aborting every non-`file:` request. `ADR-006` made that
// property structural rather than remembered: the file lives in `public/` and is
// copied into the build verbatim, so nothing in the layout can reach it.
//
// This reads and writes `public/`, NOT the build. Both files are tracked and the
// point of the script is that they never drift; pointing it at `dist/` would
// write the PDF into a gitignored directory and leave the committed one stale —
// exactly the drift it exists to prevent. `file://` still works here precisely
// because the page has no root-absolute dependencies to resolve.
const ROOT = process.env.SITE_ROOT
  ? path.resolve(process.env.SITE_ROOT)
  : path.join(process.cwd(), 'public');

(async () => {
  // Browser resolution is PW_CHROMIUM or Playwright's own — nothing in between.
  // A hardcoded default would silently outrank the pinned revision on any host
  // that happened to have that path, which is the one case nobody would notice.
  const exe = process.env.PW_CHROMIUM;
  if (exe && !fs.existsSync(exe)) {
    console.error(`resume-pdf error: PW_CHROMIUM is set to "${exe}" but nothing exists there.`);
    console.error('Unset it to use the Chromium from `npm --prefix scripts exec -- playwright install chromium`.');
    process.exit(1);
  }
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  // Block external requests (analytics) so render is fast and offline.
  await page.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await page.goto('file://' + path.join(ROOT, 'resume.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.emulateMedia({ media: 'print' });

  /*
   * Wait for the webfonts, and assert they arrived.
   *
   * This is a guard, not a bug fix: the fonts were in fact making it into the
   * PDF before (the committed file references Geist 22 times). But nothing
   * here waited for them. `domcontentloaded` fires when the markup is parsed,
   * before a woff2 is necessarily fetched and applied, and `font-display:
   * swap` renders the fallback until it is — so a correct PDF depended on the
   * fetch winning a race it was never told to run.
   *
   * The failure that race loses is silent and expensive: a renamed font file
   * or a slower machine yields a résumé quietly set in the platform UI font,
   * and it looks fine, because a sans is a sans. `document.fonts.ready` alone
   * would not catch that either — it resolves happily when zero faces loaded.
   * So the loaded set is checked against the families the page declares, and a
   * miss fails the run instead of writing a PDF in the wrong typeface.
   */
  const fontReport = await page.evaluate(async () => {
    await document.fonts.ready;
    const declared = new Set();
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSFontFaceRule) {
          declared.add(rule.style.fontFamily.replace(/["']/g, ''));
        }
      }
    }
    const loaded = new Set();
    document.fonts.forEach(f => { if (f.status === 'loaded') loaded.add(f.family.replace(/["']/g, '')); });
    return { declared: [...declared], loaded: [...loaded] };
  });

  // "Won" is ranged to a single codepoint, so it only loads on a page that
  // actually sets one; it is expected in the loaded set here because this page
  // does, but the check below is about the text faces.
  const missing = fontReport.declared.filter(f => !fontReport.loaded.includes(f));
  if (missing.length) {
    console.error(`resume-pdf error: declared @font-face families never loaded: ${missing.join(', ')}.`);
    console.error(`  Loaded: ${fontReport.loaded.join(', ') || '(none)'}`);
    console.error('  The PDF would embed a platform fallback instead, which is the drift');
    console.error('  this page is self-contained to prevent. Check the woff2 paths under');
    console.error('  public/assets/fonts/ and that nothing is blocking file: requests.');
    await browser.close();
    process.exit(1);
  }

  await page.pdf({
    path: path.join(ROOT, 'resume.pdf'),
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.4in', bottom: '0.4in', left: '0.5in', right: '0.5in' },
  });
  await browser.close();
  console.log(`✓ Wrote resume.pdf from resume.html (Letter, print media). `
    + `Fonts embedded: ${fontReport.loaded.sort().join(', ')}.`);
})().catch(e => { console.error('resume-pdf error:', e.message); process.exit(1); });
