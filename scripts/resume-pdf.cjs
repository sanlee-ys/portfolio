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

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = process.cwd();

(async () => {
  const exe = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
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
