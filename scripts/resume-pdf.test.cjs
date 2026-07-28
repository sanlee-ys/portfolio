/*
 * Adversarial suite for the embedded-font assertion in scripts/resume-pdf.cjs.
 *
 * This check exists because the one it replaced could not fail. The script used
 * to close by printing "Fonts embedded: Geist", read from `document.fonts` in
 * the page — which proves a woff2 loaded into the BROWSER and says nothing
 * about what was written to the PDF. It was read as evidence that the artifact
 * was fine, and it cost a round of investigation into a defect that never
 * existed. Replacing it with an assertion that is itself never seen to fail
 * would repeat the mistake exactly, so every branch is exercised here.
 *
 * Fixtures are hand-built PDF fragments rather than rendered ones: the check is
 * a regex over raw bytes, so the bytes are the unit under test, and driving
 * Chromium to produce a font-less PDF is not something we can ask it for.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { assertFontsEmbedded } = require('./resume-pdf.cjs');

let seq = 0;
function fixture(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `respdf-${seq++}-`));
  const file = path.join(dir, 'resume.pdf');
  fs.writeFileSync(file, `%PDF-1.4\n${body}\ntrailer\n<</Size 1>>\n%%EOF\n`, 'latin1');
  return file;
}

/* A Type 3 font as Chromium actually writes it: no /FontFile, glyphs in /CharProcs. */
const TYPE3 = `<</Type /Font\n/Subtype /Type3\n/CharProcs 5 0 R\n/FontDescriptor 6 0 R>>`;
/* A CID font with a real embedded program, which is what a static face produces. */
const EMBEDDED = `<</Type /Font\n/Subtype /Type0\n/BaseFont /AAAAAA+Geist>>\n`
  + `<</Type /FontDescriptor\n/FontFile2 7 0 R>>`;
/* Neither: a bare reference the reader must substitute a face for. */
const BARE = `<</Type /Font\n/Subtype /TrueType\n/BaseFont /Helvetica>>`;

test('a Type 3 font with its glyph procedures passes', () => {
  const r = assertFontsEmbedded(fixture(TYPE3));
  assert.deepStrictEqual(r, { total: 1, type3: 1, fontFiles: 0, glyphProcs: 1 });
});

test('an embedded font program passes', () => {
  const r = assertFontsEmbedded(fixture(EMBEDDED));
  assert.strictEqual(r.total, 1);
  assert.strictEqual(r.fontFiles, 1);
});

test('the two shapes are accepted together', () => {
  const r = assertFontsEmbedded(fixture(`${TYPE3}\n${EMBEDDED}`));
  assert.strictEqual(r.total, 2);
});

test('a font that is neither Type 3 nor embedded FAILS', () => {
  assert.throws(() => assertFontsEmbedded(fixture(BARE)), /neither Type 3 nor carry an embedded program/);
});

test('one bare font hiding among good ones still FAILS', () => {
  assert.throws(() => assertFontsEmbedded(fixture(`${TYPE3}\n${BARE}\n${EMBEDDED}`)),
    /1 font\(s\) are neither/);
});

test('a Type 3 font missing its glyph procedures FAILS', () => {
  const noProcs = `<</Type /Font\n/Subtype /Type3\n/FontDescriptor 6 0 R>>`;
  assert.throws(() => assertFontsEmbedded(fixture(noProcs)), /has nothing to draw/);
});

test('a PDF with no fonts at all FAILS rather than reporting all-clear', () => {
  assert.throws(() => assertFontsEmbedded(fixture('<</Type /Page>>')), /no fonts found/);
});

/*
 * The regression that motivated the word-boundary in the /Font pattern: every
 * Type 3 font carries a /FontDescriptor, and a pattern matching `/Type /Font`
 * loosely counts those too, inflating `total` past what is accounted for and
 * failing a perfectly good PDF.
 */
test('/FontDescriptor is not miscounted as a font', () => {
  const r = assertFontsEmbedded(fixture(`${TYPE3}\n<</Type /FontDescriptor\n/FontName /AAAAAA+Geist>>`));
  assert.strictEqual(r.total, 1);
});

/* The real artifact is the case that matters most, so it is asserted directly. */
test('the committed resume.pdf carries all of its glyphs', () => {
  const real = path.join(__dirname, '..', 'public', 'resume.pdf');
  const r = assertFontsEmbedded(real);
  assert.ok(r.total > 0, 'expected fonts in the committed resume.pdf');
  assert.strictEqual(r.type3 + r.fontFiles >= r.total, true);
});
