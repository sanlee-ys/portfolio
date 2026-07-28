#!/usr/bin/env node
/*
 * Render public/assets/og-cover.png (1200x630) from scripts/og-cover.html.
 *
 * WHY THIS EXISTS AS A SCRIPT. The card that shipped until 2026-07-28 was a
 * hand-made PNG from the site's previous identity: cool near-black ground,
 * a blue keyline, and three rounded pills reading "eval-driven development /
 * contract-first integration / AI product judgment". Every part of that had
 * stopped being true. The ground and the accent were from a theme the site no
 * longer has, and "AI product judgment" is precisely the label-y
 * self-description the colophon's own voice rule warns against — the one
 * surface where the site described itself instead of showing an artifact was
 * the surface every link preview renders.
 *
 * A binary with no source drifts silently, because nobody diffs a PNG. So the
 * card is generated: change the identity, run this, and the preview follows.
 *
 * It renders over the repo's own static server rather than from file://, for
 * the same reason `mobile-qa.cjs` does — the card loads the site's real
 * self-hosted woff2 files by URL, so it is set in the same Geist and Geist
 * Mono the pages are, not in a lookalike the renderer happened to have.
 *
 * That coupling is the point, and it is also the trap: delete a woff2 the card
 * names and this script renders the fallback face without erroring. The serif
 * removal on 2026-07-28 was exactly that case — og-cover.html named two
 * Newsreader files that no longer exist — so the card was repointed and
 * regenerated in the same commit. Check the PNG, not just the exit code.
 *
 * Run from the repo root, after `npm run build`:
 *     node scripts/og-cover.cjs
 *
 * It is deliberately NOT part of `npm run qa`. The gates check the built site;
 * this writes a source asset. Wiring a generator into a gate is how a check
 * ends up "fixing" what it was supposed to be reporting on.
 */
const fs = require('fs');
const path = require('path');
const { serve } = require('./static-server.cjs');

const REPO = path.resolve(__dirname, '..');
const SRC = path.join(__dirname, 'og-cover.html');
const OUT = path.join(REPO, 'public', 'assets', 'og-cover.png');
const DIST = path.join(REPO, 'dist');

// Same two-step browser resolution the other Playwright scripts use: PW_CHROMIUM
// if set, else Playwright's own. No hard-coded path — see CLAUDE.md for the
// stale-revision incident that rule exists to prevent.
function chromium() {
  const { chromium: c } = require(path.join(__dirname, 'node_modules', 'playwright'));
  return c;
}

(async () => {
  if (!fs.existsSync(DIST)) {
    console.error('✗ og-cover: dist/ does not exist. Run `npm run build` first —');
    console.error('  the card loads the site\'s own font files from the built output.');
    process.exit(1);
  }

  const site = await serve(DIST);
  // The source keeps a FONTDIR placeholder rather than a hard-coded origin, so
  // the file stays openable in a browser for editing and the script supplies
  // the ephemeral port at render time.
  const html = fs.readFileSync(SRC, 'utf8').replace(/FONTDIR/g, site.origin + '/assets/fonts');
  const staged = path.join(__dirname, '.og-cover.staged.html');
  fs.writeFileSync(staged, html);

  const launchOpts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};
  const browser = await chromium().launch(launchOpts);
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto('file:///' + staged.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  // Without this the card can render in the fallback face on a cold cache,
  // which is the one failure mode that looks fine until you compare it.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1200, height: 630 } });

  await browser.close();
  await site.close();
  fs.unlinkSync(staged);

  const buf = fs.readFileSync(OUT);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (w !== 1200 || h !== 630) {
    console.error(`✗ og-cover: wrote ${w}x${h}, expected 1200x630.`);
    process.exit(1);
  }
  console.log(`OK - og-cover.png ${w}x${h}, ${buf.length} bytes.`);
})();
