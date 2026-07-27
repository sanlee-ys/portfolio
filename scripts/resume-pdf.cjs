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
  await page.pdf({
    path: path.join(ROOT, 'resume.pdf'),
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.4in', bottom: '0.4in', left: '0.5in', right: '0.5in' },
  });
  await browser.close();
  console.log('✓ Wrote resume.pdf from resume.html (Letter, print media).');
})().catch(e => { console.error('resume-pdf error:', e.message); process.exit(1); });
