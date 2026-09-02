/*
 * Adversarial suite for scripts/microtext-floor.cjs.
 *
 * This gate exists because a hand measurement of a correct figure reported it
 * as three times worse than the floor (see the gate's header). So the suite's
 * first duty is not "does the gate fail a small plate" — it is "does the gate
 * measure the LIVE plate", which is the thing the hand measurement did not do.
 *
 * That question needs both directions, and only both directions answer it. A
 * gate that measured nothing at all would pass the runtime-rewrite fixture that
 * must pass. Only the mirror fixture — a plate whose markup looks legal and
 * whose live geometry is not — proves the gate reads what the browser reads.
 *
 * The other failure modes get the same treatment, for the reason
 * font-coverage.test.cjs and hit-target.test.cjs both record: this repo has
 * shipped gates that ran green while checking nothing, so a passing run is not
 * evidence about a gate. Each way this one must fail is driven by a fixture
 * that genuinely has the defect.
 *
 * Fixtures are self-contained pages with inline CSS, because what is under test
 * is rendered geometry and the fixture supplies it in full.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, 'scripts', 'microtext-floor.cjs');

let fixtureSeq = 0;

function makeFixture(pages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `microtext-${fixtureSeq++}-`));
  for (const [name, html] of Object.entries(pages)) {
    fs.writeFileSync(path.join(dir, name), html);
  }
  return dir;
}

function runGate(dir) {
  const proc = spawnSync(process.execPath, [GATE], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, SITE_ROOT: dir },
  });
  return { status: proc.status, out: `${proc.stdout || ''}${proc.stderr || ''}` };
}

/*
 * A plate drawn the way this site draws one: an `<svg>` at a fixed CSS width
 * over a viewBox, with the text declared in user-space units. `svgCss` and
 * `viewBox` are the two knobs the scale turns on, and `body` is spliced inside
 * the plate so a fixture can add a transform or a second node.
 */
const PLATE = ({ viewBox, svgCss, body, script = '' }) => `<!doctype html><html><head>
<title>t</title><style>
  body { margin: 0; }
  svg { display: block; ${svgCss} }
  text { font-family: monospace; fill: #222; }
</style></head><body>
<figure>
  <svg id="plate" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${body}</svg>
</figure>
${script ? `<script>${script}</script>` : ''}
</body></html>`;

// ---- The defect the floor is about ---------------------------------------

test('a plate whose text renders under the floor FAILS', () => {
  // Declared 8px at scale 1: 8px on the screen, and the floor is 9.
  const dir = makeFixture({
    'index.html': PLATE({
      viewBox: '0 0 300 150',
      svgCss: 'width: 300px; height: 150px;',
      body: '<text x="10" y="40" font-size="8">wipe then cfg</text>',
    }),
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'an 8px rendered label must fail the 9px floor');
  assert.match(out, /renders at 8\.00px/);
  assert.match(out, /"wipe then cfg"/);
});

test('a legal plate at exactly the floor PASSES', () => {
  // 9.00px is the smallest size on the real site, so the gate must not fail it.
  const dir = makeFixture({
    'index.html': PLATE({
      viewBox: '0 0 300 150',
      svgCss: 'width: 300px; height: 150px;',
      body: '<text x="10" y="40" font-size="9">at the floor</text>',
    }),
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, `a plate at exactly 9px must pass:\n${out}`);
  assert.match(out, /smallest on the site: 9\.00px/);
});

test('a legal DECLARED size under a sub-1 plate scale still FAILS', () => {
  /*
   * The trap the floor exists for, and the reason it binds the rendered size
   * rather than the declared one. 20px reads as generous in the source; the
   * plate paints it at 7.50px.
   */
  const dir = makeFixture({
    'index.html': PLATE({
      viewBox: '0 0 800 400',
      svgCss: 'width: 300px; height: 150px;',
      body: '<text x="10" y="80" font-size="20">generous in the source</text>',
    }),
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'a 20-unit label under a 0.375 scale must fail');
  assert.match(out, /renders at 7\.50px/);
  assert.match(out, /plate scale of 0\.3750/);
});

// ---- The incident this gate was built after: RENDER, do not read source ---
//
// These two pin the root cause of the 2026-09-01 measurement, which is that it
// read the source instead of rendering it. Both directions, because one proves
// nothing on its own: a gate that measured nothing would pass the first.
//
// What they do NOT pin is the choice of `getScreenCTM()` over a viewBox ratio.
// A ratio computed IN THE PAGE reads the live attribute and gets these right
// too — verified by mutation on 2026-09-01, which reddened only the transform
// test below. The CTM's advantage over an in-page ratio is the next two tests,
// not these. Keeping the distinction straight is the point: a suite that
// claimed these proved the CTM would be describing a guarantee it does not
// hold.

test('a viewBox rewritten at RUNTIME to a legal scale PASSES', () => {
  /*
   * The exact false positive of 2026-09-01. Read from the markup, this plate
   * is a 20-unit label under a 300/800 = 0.375 scale, which computes to 7.50px
   * and looks broken. The live plate carries a 300-unit viewBox, so the label
   * paints at 20px. `diagram.js` does this on the system map at phone widths.
   *
   * A gate that reads the source attribute reports a correct figure as three
   * times worse than the floor, and sends a lane to edit a working plate.
   */
  const dir = makeFixture({
    'index.html': PLATE({
      viewBox: '0 0 800 400',
      svgCss: 'width: 300px; height: 150px;',
      body: '<text x="10" y="80" font-size="20">live and legible</text>',
      script: "document.getElementById('plate').setAttribute('viewBox', '0 0 300 150');",
    }),
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, `the gate must measure the live viewBox, not the markup:\n${out}`);
  assert.match(out, /smallest on the site: 20\.00px/);
});

test('a viewBox rewritten at RUNTIME to an illegal scale FAILS', () => {
  /*
   * The mirror, and the test that gives the one above its meaning. Read from
   * the markup this plate is a legal 12px at scale 1. The live plate is a
   * 900-unit viewBox in a 300px track, so the label paints at 4.00px — which
   * is the order of magnitude the 2026-09-01 measurement believed it had found
   * on the real system map.
   */
  const dir = makeFixture({
    'index.html': PLATE({
      viewBox: '0 0 300 150',
      svgCss: 'width: 300px; height: 150px;',
      body: '<text x="10" y="40" font-size="12">legal in the source only</text>',
      script: "document.getElementById('plate').setAttribute('viewBox', '0 0 900 450');",
    }),
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'a runtime-shrunk plate must fail even though its markup looks legal');
  assert.match(out, /renders at 4\.00px/);
});

// ---- The two blind spots that DO justify getScreenCTM() -------------------
//
// Each of these fails a width-ratio gate, in the direction that matters: the
// ratio reports a legible size for text the reader cannot read.

test('a transform above the text node is counted in the scale', () => {
  /*
   * Blind spot 1. The plate renders 1:1, so a width ratio says this 12px label
   * is a 12px label. The group shrinks it to 4.80px and the ratio never looks.
   */
  const dir = makeFixture({
    'index.html': PLATE({
      viewBox: '0 0 300 150',
      svgCss: 'width: 300px; height: 150px;',
      body: '<g transform="scale(0.4)"><text x="10" y="40" font-size="12">shrunk by a group</text></g>',
    }),
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'a scale() on an ancestor group must count toward the rendered size');
  assert.match(out, /renders at 4\.80px/);
});

test('a letterboxed plate is measured at its real scale, not its width ratio', () => {
  /*
   * Blind spot 2. `preserveAspectRatio` defaults to `meet`, so the applied
   * scale is the SMALLER of the two axis ratios. This plate is 600px wide over
   * a 300-unit viewBox — a width ratio of 2 — but only 150px tall over 150
   * units, so the real scale is 1 and the drawing is pillarboxed inside its
   * box. A 6px label paints at 6.00px. A width ratio calls it 12px and passes
   * it.
   */
  const dir = makeFixture({
    'index.html': PLATE({
      viewBox: '0 0 300 150',
      svgCss: 'width: 600px; height: 150px;',
      body: '<text x="10" y="40" font-size="6">pillarboxed and unreadable</text>',
    }),
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'the applied scale is the smaller axis ratio, not the width ratio');
  assert.match(out, /renders at 6\.00px/);
  assert.match(out, /plate scale of 1\.0000/);
});

// ---- The ways this gate could be worthless while running green -----------

test('a build with no SVG text at all FAILS', () => {
  /*
   * The plates on this site are script-drawn, so "none found" most likely means
   * a renderer broke. `figure-contract.cjs` and `hit-target.cjs` carry the same
   * guard, for the same reason: an inert gate reads exactly like a clean one.
   */
  const dir = makeFixture({
    'index.html': '<!doctype html><html><head><title>t</title></head><body><p>no plate here</p></body></html>',
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'a site with no SVG text must not report a clean run');
  assert.match(out, /found no SVG text at all/);
});

test('an empty walk FAILS', () => {
  const dir = makeFixture({});
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'a gate aimed at an empty directory must not pass');
  assert.match(out, /no HTML found/);
});

test('one failing page fails the run even when every other page is clean', () => {
  const legal = PLATE({
    viewBox: '0 0 300 150',
    svgCss: 'width: 300px; height: 150px;',
    body: '<text x="10" y="40" font-size="14">fine</text>',
  });
  const dir = makeFixture({
    'index.html': legal,
    'about.html': legal,
    'deep.html': PLATE({
      viewBox: '0 0 300 150',
      svgCss: 'width: 300px; height: 150px;',
      body: '<text x="10" y="40" font-size="6">too small</text>',
    }),
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'a single bad page must redden the run');
  assert.match(out, /deep\.html/);
  assert.match(out, /renders at 6\.00px/);
});

// ---- What must NOT fail ---------------------------------------------------

test('an empty text node is skipped and counted, not failed', () => {
  /*
   * An empty `<text>` carries no legibility claim, so failing it would be a
   * false positive. Reporting the count is what keeps the skip auditable —
   * "none skipped" is a property the CLAUDE.md record states about this
   * measurement, and it can only be stated if the gate says so.
   */
  const dir = makeFixture({
    'index.html': PLATE({
      viewBox: '0 0 300 150',
      svgCss: 'width: 300px; height: 150px;',
      body: '<text x="10" y="20" font-size="4"></text><text x="10" y="60" font-size="14">real</text>',
    }),
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, `an empty node must not fail the floor:\n${out}`);
  assert.match(out, /1 empty node\(s\) skipped/);
});

test('the reported node count matches what the fixture contains', () => {
  /*
   * The count is what a later reader checks the CLAUDE.md record against, so a
   * wrong count is a wrong record. A gate that walked one page of three, or
   * dropped nodes it could not read, would still print a clean line without
   * this.
   */
  const page = (n) => PLATE({
    viewBox: '0 0 300 150',
    svgCss: 'width: 300px; height: 150px;',
    body: Array.from({ length: n }, (_, i) => `<text x="10" y="${20 + i * 20}" font-size="12">n${i}</text>`).join(''),
  });
  const dir = makeFixture({ 'index.html': page(3), 'about.html': page(2) });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, `the fixture is legal and must pass:\n${out}`);
  assert.match(out, /5 SVG text node\(s\) on 2 page\(s\)/);
});
