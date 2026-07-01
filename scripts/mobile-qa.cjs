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
 */
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = process.cwd();
const WIDTHS = [320, 360, 390, 430]; // 320 covers Display-Zoom phones; 430 the largest iPhone

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
  const exe = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage();
  // Block external requests (analytics/fonts) so pages load fast and offline.
  await page.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));

  let fails = 0;
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const rel of pages) {
      await page.goto('file://' + path.join(ROOT, rel), { waitUntil: 'domcontentloaded', timeout: 10000 });
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      if (over > 0) { fails++; console.log(`  FAIL  +${over}px  ${rel} @${w}px`); }
    }
  }
  await browser.close();

  if (fails) {
    console.error(`\n✗ ${fails} horizontal-overflow issue(s) across ${WIDTHS.join('/')}px. Fix before committing.`);
    process.exit(1);
  }
  console.log(`✓ No horizontal overflow — ${pages.length} pages × ${WIDTHS.length} widths (${WIDTHS.join('/')}px).`);
})().catch(e => { console.error('mobile-qa error:', e.message); process.exit(1); });
