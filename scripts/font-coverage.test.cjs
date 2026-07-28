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

/*
 * The real fonts but NO stylesheet: pages here carry their own inline faces,
 * the way resume.html does. Pages are written raw, not through PAGE().
 */
function makeBareFixture(pages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `fontcov-${fixtureSeq++}-`));
  fs.mkdirSync(path.join(dir, 'assets', 'fonts'), { recursive: true });
  for (const f of fs.readdirSync(REAL_FONTS)) {
    if (f.endsWith('.woff2')) {
      fs.copyFileSync(path.join(REAL_FONTS, f), path.join(dir, 'assets', 'fonts', f));
    }
  }
  for (const [name, html] of Object.entries(pages)) {
    fs.writeFileSync(path.join(dir, name), html);
  }
  return dir;
}

/* A minimal but REAL site root: the actual stylesheet, the actual fonts. */
function makeFixture(pages) {
  const dir = makeBareFixture({});
  fs.copyFileSync(REAL_CSS, path.join(dir, 'assets', 'style.css'));
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

test('a `</script >` end tag does not swallow the copy after it', () => {
  // CodeQL js/bad-tag-filter, and a real false negative rather than a nit:
  // `</script >` is valid, a `</script>`-only pattern misses it, and the lazy
  // match then runs to the NEXT `</script>` — eating every character in
  // between. The stray glyph below sits in that gap, so the old pattern
  // reported this page as clean.
  const dir = makeFixture({
    'index.html': '<script>var a = 1;</script >\n<p>Delta ∆ here.</p>\n<script>var b = 2;</script>',
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /U\+2206/);
});

test('script and style bodies are still ignored', () => {
  // The other half of the same rule: code is not copy. A glyph that appears
  // only inside a script must not be reported, or the gate cries wolf.
  const dir = makeFixture({
    'index.html': '<script>var s = "∆";</script><style>/* ∆ */</style><p>Plain.</p>',
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, out);
  assert.doesNotMatch(out, /U\+2206/);
});

test('a `>` inside an attribute does not end the script tag early', () => {
  const dir = makeFixture({
    'index.html': '<script data-x="a>b">var s = "∆";</script><p>Plain.</p>',
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, out);
  assert.doesNotMatch(out, /U\+2206/);
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

/*
 * Three inline faces in one <style>, each in a spelling CSS permits and the
 * old `@font-face\s*\{([^}]*)\}` regex did not survive: the first minified,
 * the second with a `}` inside a comment (which truncated `[^}]*` mid-body),
 * the third with a comment between the at-keyword and its brace (which `\s*`
 * never matched, so the face was invisible). Each face is the SOLE coverage
 * for one glyph in the copy — é (face 1), œ (face 2), → (face 3) — so a
 * parser that loses any one of them cannot pass this page.
 */
const THREE_FACES = (faces) => `<!doctype html><html><head><title>r</title><style>
  ${faces}
</style></head><body><p>Latin &#xe9;, extended &#x153;, arrow &rarr;.</p></body></html>`;

const FACE_ONE = '@font-face{font-family:"Geist";src:url("assets/fonts/geist-latin.woff2") format("woff2");unicode-range:U+0000-00FF;}';
const FACE_TWO = `@font-face {
    /* the } in this comment ended the old regex's body capture early */
    font-family: "Geist";
    src: url("assets/fonts/geist-latin-ext.woff2") format("woff2");
    unicode-range: U+0152-0153;
  }`;
const FACE_THREE = `@font-face/* this comment hid the whole face from the old regex */ {
    font-family: "Geist";
    src: url("assets/fonts/geist-latin.woff2") format("woff2");
    unicode-range: U+2190-2193;
  }`;

test('three @font-face blocks in one inline style are all seen', () => {
  const dir = makeBareFixture({
    'resume.html': THREE_FACES(`${FACE_ONE}\n  ${FACE_TWO}\n  ${FACE_THREE}`),
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, out);
  assert.match(out, /U\+00E9.*covered/);
  assert.match(out, /U\+0153.*covered/);
  assert.match(out, /U\+2192.*covered/);
});

test('...and that test has teeth: minus the third face, the page fails', () => {
  // The control for the test above. If it ever passes with a face missing,
  // the previous test is asserting nothing about the parser.
  const dir = makeBareFixture({
    'resume.html': THREE_FACES(`${FACE_ONE}\n  ${FACE_TWO}`),
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /UNCOVERED/);
  assert.match(out, /U\+2192/);
});

test('a face the gate cannot read fails rather than being skipped', () => {
  // Single quotes are valid CSS the parser does not speak. The old code
  // dropped such a face with `continue` — and with it every check on its
  // file. The well-formed first face keeps this from failing for any other
  // reason: without the hard failure, this page would pass.
  const dir = makeBareFixture({
    'resume.html': THREE_FACES(`${FACE_ONE}
  @font-face { font-family: 'Geist'; src: url('assets/fonts/geist-latin-ext.woff2'); unicode-range: U+0152-0153; }
  ${FACE_THREE}`),
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /cannot read/);
  assert.match(out, /resume\.html/);
});

test('a @font-face that opens and never closes is a failure, not a skip', () => {
  const dir = makeBareFixture({
    'resume.html': THREE_FACES(`${FACE_ONE}\n  @font-face { font-family: "Geist";`),
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 1, out);
  assert.match(out, /never closes/);
});

test('a code sample showing @font-face is not read as a live face', () => {
  // Only <style> bodies are CSS. A <pre> demonstrating an @font-face block
  // must not be parsed as one — under the old whole-page scan it was, and a
  // malformed sample would now redden the gate for a rule that styles nothing.
  const dir = makeFixture({
    'index.html': '<pre>@font-face { font-family: \'Demo\'; src: url(nope.woff2); }</pre><p>Plain.</p>',
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, out);
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
