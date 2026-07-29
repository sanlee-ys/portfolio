/*
 * Adversarial suite for scripts/hit-target.cjs.
 *
 * The gate's whole value is that it fails on a page every other check calls
 * clean, so a passing run proves nothing on its own — the same reasoning as
 * font-coverage.test.cjs, and for the same reason: this repo has shipped gates
 * that ran green while checking nothing. Each way this one can fail is
 * exercised by building a fixture that genuinely has the defect and demanding a
 * non-zero exit, and each way it must NOT fail is exercised too, because the
 * first draft of this gate keyed on `cursor: pointer` and reported 31 failures
 * against correctly built pages.
 *
 * Fixtures are self-contained pages with inline CSS. Unlike the font gate there
 * is nothing to compare against the real stylesheet — what is under test is
 * rendered geometry, which the fixture supplies in full.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, 'scripts', 'hit-target.cjs');

let fixtureSeq = 0;

function makeFixture(pages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `hittarget-${fixtureSeq++}-`));
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
 * A node the size of the real diagram's, drawn the way the diagram draws one:
 * a <g> carrying the role and the tabindex, an unfilled <rect>, and a <text>
 * that opts out of pointer events. `extra` is spliced into the rect's rule,
 * which is the single line the whole bug turned on.
 */
const NODE_PAGE = (extraRectCss) => `<!doctype html><html><head><title>t</title><style>
  body { margin: 0; }
  svg { display: block; width: 600px; height: 300px; }
  .node rect { fill: none; stroke: #888; stroke-width: 1; cursor: pointer; ${extraRectCss} }
  .node text { fill: #06c; pointer-events: none; }
</style></head><body>
<svg id="d" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
  <g class="node" role="button" tabindex="0" aria-label="alpha">
    <rect x="100" y="100" width="171" height="57"></rect>
    <text x="185" y="132" text-anchor="middle">alpha</text>
  </g>
</svg></body></html>`;

// ---- The defect this gate was written for -------------------------------

test('an unfilled SVG node that claims to be a button FAILS', () => {
  const dir = makeFixture({ 'index.html': NODE_PAGE('') });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'a node with only a 1px stroke as its hit target must fail');
  assert.match(out, /centre is DEAD/);
  assert.match(out, /"alpha"/);
});

test('the same node with pointer-events: all PASSES', () => {
  const dir = makeFixture({ 'index.html': NODE_PAGE('pointer-events: all;') });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, `expected a pass, got:\n${out}`);
});

test('the same node with a transparent fill PASSES', () => {
  // The idiom #score-chart uses for its hit columns. Both fixes are legitimate
  // and the gate must not prefer one.
  const dir = makeFixture({ 'index.html': NODE_PAGE('fill: transparent;') });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, `expected a pass, got:\n${out}`);
});

// ---- The false positives that the first draft produced -------------------

test('decoration that merely INHERITS cursor:pointer does not fail', () => {
  /*
   * The regression guard for this gate's own first draft, which treated
   * `cursor: pointer` as a claim of interactivity. The cursor inherits, so
   * every decorative shape inside a real control reported it — including
   * `#score-chart`'s `.series-dot` markers, whose hit area legitimately
   * belongs to a sibling. Keying on it called four correct pages broken.
   */
  const dir = makeFixture({
    'index.html': `<!doctype html><html><head><title>t</title><style>
      body { margin: 0; }
      svg { display: block; width: 400px; height: 200px; }
      .hit { fill: transparent; cursor: pointer; }
      .dot { fill: none; stroke: #888; cursor: pointer; }
    </style></head><body>
    <svg id="d" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      <circle class="dot" cx="200" cy="100" r="7"></circle>
      <rect class="hit" x="120" y="20" width="160" height="160"
            role="button" tabindex="0" aria-label="column"></rect>
    </svg></body></html>`,
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, `unfilled decoration must not fail the gate:\n${out}`);
});

test('a control clipped by its own SVG viewport is measured on the visible part', () => {
  /*
   * `#score-chart`'s outermost hit columns are drawn half a column past the
   * plate edge, so ~44% of their bounding box is clipped away by the SVG. That
   * area was never claimable; counting it as dead made a correct chart read as
   * 56% broken.
   */
  const dir = makeFixture({
    'index.html': `<!doctype html><html><head><title>t</title><style>
      body { margin: 0; }
      svg { display: block; width: 400px; height: 200px; }
      .hit { fill: transparent; }
    </style></head><body>
    <svg id="d" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      <rect class="hit" x="-100" y="20" width="260" height="160"
            role="button" tabindex="0" aria-label="edge column"></rect>
    </svg></body></html>`,
  });
  const { status, out } = runGate(dir);
  assert.strictEqual(status, 0, `a clipped-but-hittable control must pass:\n${out}`);
});

// ---- The ways this gate could go blind -----------------------------------

test('a control clipped ENTIRELY out of its SVG fails rather than being skipped', () => {
  const dir = makeFixture({
    'index.html': `<!doctype html><html><head><title>t</title><style>
      body { margin: 0; }
      svg { display: block; width: 400px; height: 200px; }
      .hit { fill: transparent; }
    </style></head><body>
    <svg id="d" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      <rect class="hit" x="-500" y="20" width="200" height="160"
            role="button" tabindex="0" aria-label="offscreen"></rect>
    </svg></body></html>`,
  });
  const { status } = runGate(dir);
  assert.notStrictEqual(status, 0, 'an unreachable control must fail, not be waved through');
});

test('a build with no interactive SVG at all FAILS rather than passing vacuously', () => {
  /*
   * The figures are script-drawn. If a renderer breaks, the elements simply are
   * not in the DOM and every assertion above passes over an empty set — a green
   * run that proves the opposite of what it appears to. Same rule as "fails if
   * it finds no pages", one level down.
   */
  const dir = makeFixture({
    'index.html': '<!doctype html><html><head><title>t</title></head><body><p>No figures.</p></body></html>',
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0);
  assert.match(out, /no interactive SVG elements/);
});

test('an empty walk FAILS', () => {
  const dir = makeFixture({});
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0);
  assert.match(out, /no HTML found/);
});

// ---- The mobile tap contract ---------------------------------------------

test('a fully hittable control below the 44px tap minimum FAILS at phone width', () => {
  const dir = makeFixture({
    'index.html': `<!doctype html><html><head><title>t</title><style>
      body { margin: 0; }
      svg { display: block; width: 300px; height: 120px; }
      .hit { fill: transparent; }
    </style></head><body>
    <svg id="d" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
      <rect class="hit" x="10" y="10" width="20" height="20"
            role="button" tabindex="0" aria-label="tiny"></rect>
    </svg></body></html>`,
  });
  const { status, out } = runGate(dir);
  assert.notStrictEqual(status, 0, 'a 20x20 control is hittable but not tappable');
  assert.match(out, /tap target/);
});
