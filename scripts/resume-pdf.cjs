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
//
// Resolved when a render actually starts, not at import: the adversarial suite
// requires this file for assertFontsEmbedded alone, and that check reads bytes
// off disk and needs no browser. At module scope this would exit(1) on a clone
// that has never run `npm --prefix scripts ci` — killing a suite that gates.cjs
// promises will run without a build.
function loadChromium() {
  try { return require('playwright').chromium; }
  catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
    console.error('resume-pdf error: Playwright is not installed. From the repo root, run:');
    console.error('  npm --prefix scripts ci');
    console.error('  npm --prefix scripts exec -- playwright install chromium');
    process.exit(1);
  }
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

const main = async () => {
  // Browser resolution is PW_CHROMIUM or Playwright's own — nothing in between.
  // A hardcoded default would silently outrank the pinned revision on any host
  // that happened to have that path, which is the one case nobody would notice.
  const exe = process.env.PW_CHROMIUM;
  if (exe && !fs.existsSync(exe)) {
    console.error(`resume-pdf error: PW_CHROMIUM is set to "${exe}" but nothing exists there.`);
    console.error('Unset it to use the Chromium from `npm --prefix scripts exec -- playwright install chromium`.');
    process.exit(1);
  }
  const browser = await loadChromium().launch(exe ? { executablePath: exe } : {});
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

  const pdfPath = path.join(ROOT, 'resume.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.4in', bottom: '0.4in', left: '0.5in', right: '0.5in' },
  });
  await browser.close();

  const fonts = assertFontsEmbedded(pdfPath);
  console.log(`✓ Wrote resume.pdf from resume.html (Letter, print media). `
    + `Webfonts loaded: ${fontReport.loaded.sort().join(', ')}. `
    + `PDF carries ${fonts.total} embedded font(s): `
    + `${fonts.type3} Type 3 (${fonts.glyphProcs} glyph procedures), ${fonts.fontFiles} font program(s).`);
};

if (require.main === module) {
  main().catch(e => { console.error('resume-pdf error:', e.message); process.exit(1); });
}

/*
 * Assert the WRITTEN PDF carries its glyphs, by reading the file back.
 *
 * The check above this is about the browser: it proves the woff2 loaded into
 * the page. That is a checkpoint, not the artifact, and the two can disagree —
 * the script used to close by printing "Fonts embedded: Geist" off
 * `document.fonts`, which is a claim it had no way to verify. It happened to be
 * true, but it read as evidence, and it cost a round of investigation into a
 * defect that did not exist. Same family as the gates in CLAUDE.md: a check
 * that cannot fail is not a check.
 *
 * What "embedded" means here is not what it looks like. Chromium emits these
 * as TYPE 3 fonts — every glyph is a little PDF content stream of drawing
 * operators under /CharProcs — so there is no /FontFile and no /BaseFont
 * anywhere in this file, and looking for one concludes, wrongly, that nothing
 * is embedded. The glyphs are all there; they are vectors rather than a font
 * program.
 *
 * The cause is the variable weight axis, confirmed by rendering the same page
 * twice: with `geist-latin.woff2` as shipped (wght 100-900) Chromium wrote
 * Type 3 and zero /FontFile; with a static wght-400 instance of that same file
 * it wrote a Type0 CID font with a real /FontFile, at ~38% of the bytes. Skia
 * cannot embed a variable font program into a PDF, so it draws the glyphs
 * instead. Pinning static instances is therefore a real option — smaller and
 * hinted — but it is a site-wide font-pipeline change, not a resume one, and
 * nothing is broken today: text extraction round-trips cleanly (5,849
 * characters, no replacement characters, correct Unicode for the dashes,
 * quotes, arrow and middot), so ATS parsing is unaffected.
 *
 * Both shapes are accepted, and anything that is neither fails. Parsing is a
 * regex over the raw bytes rather than a PDF library on purpose: this file is
 * PDF-1.4, which has no object streams, so every dictionary is uncompressed
 * ASCII and a dependency would buy nothing. If Chromium ever emits 1.5+ the
 * dictionaries move inside compressed streams, the font count reads zero, and
 * the `total === 0` branch fails the run — the correct direction to be wrong in.
 */
function assertFontsEmbedded(file) {
  const raw = fs.readFileSync(file).toString('latin1');
  const count = re => (raw.match(re) || []).length;

  // `/Font\b` cannot match `/FontDescriptor`: 't'/'D' are both word characters,
  // so there is no boundary between them.
  const total = count(/\/Type\s*\/Font\b/g);
  const type3 = count(/\/Subtype\s*\/Type3\b/g);
  const fontFiles = count(/\/FontFile\d?\b/g);
  const glyphProcs = count(/\/CharProcs\b/g);

  // Throws rather than exiting: the run's own catch turns that into exit 1 with
  // the message, and a thrown error is what makes this testable at all.
  const fail = msg => {
    throw new Error(`${msg}\n`
      + `  Counted in ${path.basename(file)}: ${total} font(s), ${type3} Type 3, `
      + `${glyphProcs} /CharProcs, ${fontFiles} /FontFile.\n`
      + '  A font that is neither a Type 3 with its glyph procedures nor an embedded\n'
      + '  program renders in whatever face the reader substitutes, which is the drift\n'
      + '  this page is self-contained to prevent.');
  };

  if (total === 0) {
    fail('no fonts found in the written PDF. If Chromium moved past PDF-1.4 the '
      + 'dictionaries are now inside compressed object streams and this check needs a parser.');
  }
  if (type3 !== glyphProcs) {
    fail(`${type3} Type 3 font(s) but ${glyphProcs} /CharProcs — a Type 3 font without its `
      + 'glyph procedures has nothing to draw.');
  }
  if (type3 + fontFiles < total) {
    fail(`${total - type3 - fontFiles} font(s) are neither Type 3 nor carry an embedded program.`);
  }
  return { total, type3, fontFiles, glyphProcs };
}

module.exports = { assertFontsEmbedded };
