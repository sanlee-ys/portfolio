/*
 * Adversarial suite for scripts/font-coverage.cjs.
 *
 * Three gates in this repo were found, in one night, not checking what they
 * appeared to: the metrics guard was blind to attribute order, the sitemap's
 * shallow-clone guard was a date-FORMAT check that could never fail, and
 * link-check split `#` off every URL and so had never validated a single
 * anchor. All three ran green the whole time. The shape they share is that a
 * passing run proves nothing on its own — so each way this gate can fail is
 * exercised here by actually breaking a fixture and demanding a non-zero exit.
 *
 * The fixtures are built from the real stylesheet and the real woff2 files,
 * because the manifest check is a hash comparison against the shipped bytes and
 * a synthetic font would fail it for the wrong reason.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, 'scripts', 'font-coverage.cjs');
const REAL_CSS = path.join(REPO, 'public', 'assets', 'style.css');
const REAL_FONTS = path.join(REPO, 'public', 'assets', 'fonts');

const PAGE = (body) => `<!doctype html><html><head><title>t</title>
<link rel="stylesheet" href="/assets/style.css"></head><body>${body}</body></html>`;

let fixtureSeq = 0;

/* A minimal but REAL site root: the actual stylesheet, the actual fonts. */
function makeFixture(pages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `fontcov-${fixtureSeq++}-`));
  fs.mkdirSync(path.join(dir, 'assets', 'fonts'), { recursive: true });
  fs.copyFileSync(REAL_CSS, path.join(dir, 'assets', 'style.css'));
  for (const f of fs.readdirSync(REAL_FONTS)) {
    if (f.endsWith('.woff2')) {
      fs.copyFileSync(path.join(REAL_FONTS, f), path.join(dir, 'assets', 'fonts', f));
    }
  }
  for (const [name, body] of Object.entries(pages)) {
    fs.writeFileSync(path.join(dir, name), PAGE(body));
  }
  return dir;
}

function runGate(siteRoot) {
  const proc = spawnSync(process.execPath, [GATE], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, SITE_ROOT: siteRoot },
  });
  return { status: proc.status, out: `${proc.stdout}${proc.stderr}` };
}

test('a clean page passes', () => {
  const dir = makeFixture({ 'index.html': '<p>Plain copy &mdash; with an arrow &rarr; and a dash.</p>' });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, out);
  assert.match(out, /Font coverage OK/);
});

test('a glyph no font carries fails, and is named', () => {
  // U+2206 INCREMENT: not in any of the three faces, and not an EXPECTED entry.
  const dir = makeFixture({ 'index.html': '<p>Delta ∆ appears here.</p>' });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /UNCOVERED/);
  assert.match(out, /U\+2206/);
});

test('the same glyph is caught when it hides in a rendered attribute', () => {
  // The Python original read element text only, so a glyph in `placeholder`
  // went unchecked -- which is how the ellipsis in the glossary filter escaped
  // the audit written to catch exactly this.
  const dir = makeFixture({
    'index.html': '<input type="search" placeholder="Filter ∆ terms">',
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /U\+2206/);
});

test('a range widened without re-cutting the font fails as DECLARED-ONLY', () => {
  const dir = makeFixture({ 'index.html': '<p>Delta ∆ appears here.</p>' });
  const css = path.join(dir, 'assets', 'style.css');
  // Claim U+2206 in the Geist latin range. The woff2 still has no such glyph,
  // which is precisely the drift this check exists to find.
  fs.writeFileSync(css, fs.readFileSync(css, 'utf8').replace(
    'U+2190-2193, U+2212, U+2215, U+FEFF, U+FFFD;',
    'U+2190-2193, U+2206, U+2212, U+2215, U+FEFF, U+FFFD;',
  ));
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /DECLARED-ONLY/);
  assert.match(out, /U\+2206/);
});

test('a font changed without refreshing the manifest fails the hash check', () => {
  const dir = makeFixture({ 'index.html': '<p>Plain copy.</p>' });
  const victim = path.join(dir, 'assets', 'fonts', 'geist-latin.woff2');
  fs.appendFileSync(victim, Buffer.from([0x00]));
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /does not match the manifest/);
  assert.match(out, /geist-latin\.woff2/);
});

test('an entity the gate cannot resolve fails rather than being skipped', () => {
  const dir = makeFixture({ 'index.html': '<p>Mystery &frobnicate; here.</p>' });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /cannot resolve/);
  assert.match(out, /&frobnicate;/);
});

test('a walk that finds no pages fails instead of passing empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fontcov-empty-'));
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /no HTML found/);
});

test('a site with pages but no @font-face fails rather than reporting all-clear', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fontcov-nofaces-'));
  fs.writeFileSync(path.join(dir, 'index.html'), PAGE('<p>Copy → here.</p>'));
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /no @font-face rules/);
});

test('the recorded exceptions are still exercised, not silently dropped', () => {
  // kappa and the toggle's sun/moon must report as expected -- if someone
  // empties EXPECTED, this fails rather than the gate going quietly stricter.
  const dir = makeFixture({ 'index.html': '<p>&kappa; &#9728; &#9789;</p>' });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, out);
  assert.match(out, /U\+03BA.*expected/);
  assert.match(out, /U\+2600.*expected/);
});
