/*
 * Adversarial suite for scripts/check-telltale-evidence.cjs.
 *
 * A gate that has only ever been seen to pass is a gate nobody has tested. The
 * failure modes below are the ones that make this gate worthless if any of them
 * is silently absent, and each one is invisible on a clean tree: a marker the
 * pattern cannot read produces no mismatch, an inert gate produces no output,
 * and a wrong number typed beside a correct one passes any substring search.
 *
 * Every fixture is built here. The suite reads no `dist/` and needs no build,
 * which is why it sits with the cheap build-independent checks.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const {
  figuresIn,
  unparsedFigures,
  framesIn,
  unparsedFrames,
  validateEvidence,
  verify,
  ageWarning,
  REQUIRED_PAGE,
  EVIDENCE_PATH,
} = require('./check-telltale-evidence.cjs');
const { assertBoundaryLines } = require('./pull-telltale-evidence.cjs');

// A minimal well-formed record. Each test copies it and breaks one thing.
function goodEvidence() {
  return {
    source: { repo: 'sanlee-ys/telltale', sha: '38f262a', pulledAt: '2026-08-29' },
    figures: {
      'goldens.total': { value: '132', kind: 'counted', command: "git ls-files '...' | wc -l" },
      'race.firstFinish': { value: '4m12s', kind: 'cited', cite: 'DESIGN.md, The first race' },
    },
    frames: {
      council: { path: 'internal/council/testdata/golden/ascii.txt', lines: ['SEAT  CTX', 'a     12'] },
    },
  };
}

function page(html, rel = REQUIRED_PAGE) {
  return [{ rel, html }];
}

// --- the marker patterns ----------------------------------------------------

test('a well-formed figure marker parses and leaves no gap', () => {
  const html = '<span data-tt="goldens.total">132</span>';
  assert.deepStrictEqual(figuresIn(html), [['goldens.total', '132']]);
  assert.strictEqual(unparsedFigures(html), 0);
});

test('a figure marker parses regardless of attribute order', () => {
  const html = '<span class="fig" data-tt="goldens.total" id="x">132</span>';
  assert.deepStrictEqual(figuresIn(html), [['goldens.total', '132']]);
  assert.strictEqual(unparsedFigures(html), 0);
});

test('a figure marker wrapping nested markup is reported as a gap, not ignored', () => {
  /*
   * The shape that defeats the pattern. It is not a mismatch and it is not a
   * pass: without the parity counter it is an absence, which is what a clean
   * run looks like.
   */
  const html = '<span data-tt="goldens.total"><strong>132</strong></span>';
  assert.strictEqual(figuresIn(html).length, 0);
  assert.strictEqual(unparsedFigures(html), 1);
});

test('the figure counter does not count a frame attribute', () => {
  // `data-tt-frame=` must not satisfy `data-tt=`, or every frame would report
  // as an unparsed figure and the gate would cry wolf on a correct page.
  const html = '<pre data-tt-frame="council">SEAT  CTX\na     12</pre>';
  assert.strictEqual(unparsedFigures(html), 0);
  assert.strictEqual(unparsedFrames(html), 0);
  assert.deepStrictEqual(framesIn(html), [['council', 'SEAT  CTX\na     12']]);
});

test('markers on a second page are still found', () => {
  // A module-level /g regex keeps `lastIndex` between calls and skips the first
  // marker on every page after the first. The gate builds a fresh pattern per
  // call; this pins that.
  const html = '<span data-tt="a">1</span>';
  assert.strictEqual(figuresIn(html).length, 1);
  assert.strictEqual(figuresIn(html).length, 1);
});

// --- markup a browser never renders ------------------------------------------

/*
 * The comment-parsing chokepoint, ported from scripts/figure-contract.cjs
 * (`contentRegion`/`stripNonMarkup`, commit 864c356). The defect class it
 * closes, measured 2026-08-30 against this checker before the port: the four
 * marker patterns run over raw HTML, so a commented-out `data-tt` span parses
 * as a live figure and a `[data-tt="..."]` selector in a style island counts
 * as an unparsed raw marker. Both name markup no reader will ever see, and the
 * cheapest way to green either false failure is to delete the comment or the
 * selector.
 */

test('a commented-out figure marker is not a live figure', () => {
  const html =
    '<!-- retired draft: <span data-tt="goldens.total">999</span> -->' +
    '<span data-tt="goldens.total">132</span>';
  const { problems, checked } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 1);
});

test('a commented-out frame is not a live frame', () => {
  const html =
    '<!-- <pre class="tt-frame" data-tt-frame="council">OLD  LINES</pre> -->' +
    '<pre class="tt-frame" data-tt-frame="council">SEAT  CTX\na     12</pre>';
  const { problems, checked } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 1);
});

test('a data-tt selector inside a style island is not an unparsed marker', () => {
  const html =
    '<style>[data-tt="goldens.total"] { font-variant-numeric: tabular-nums; }</style>' +
    '<span data-tt="goldens.total">132</span>';
  const { problems } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
});

test('a comment holding a > still hides the markup after it', () => {
  // Every plate on this site is preceded by a rationale comment, and those
  // comments hold `>` characters. A comment ends at `-->`, not at the first `>`.
  const html =
    '<!-- the arrow a -> b is drawn, not typed: <span data-tt="goldens.total">7</span> -->' +
    '<span data-tt="goldens.total">132</span>';
  const { problems, checked } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 1);
});

// --- failure mode 1: an unknown key -----------------------------------------

test('an unknown data-tt key fails', () => {
  const { problems } = verify({
    pages: page('<span data-tt="goldens.totl">132</span>'),
    evidence: goodEvidence(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /is not in the evidence file/);
});

// --- failure mode 2: a rendered value that differs from the record ----------

test('a rendered value that differs from the record fails', () => {
  const { problems } = verify({
    pages: page('<span data-tt="goldens.total">133</span>'),
    evidence: goodEvidence(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /renders as "133" but the record says "132"/);
});

test('a wrong number typed BESIDE the marked one still fails', () => {
  /*
   * The exact defect a page-wide substring search cannot see: the correct
   * string "132" is present on the page, so a substring search passes. The
   * assertion is anchored to the attribute, so it does not.
   */
  const html = 'The suite holds 132 files. <span data-tt="goldens.total">231</span>';
  const { problems } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /renders as "231"/);
});

test('a correct page produces no problems and reports what it checked', () => {
  const html =
    '<span data-tt="goldens.total">132</span>' +
    '<span data-tt="race.firstFinish">4m12s</span>' +
    '<pre class="tt-frame" data-tt-frame="council" tabindex="0">SEAT  CTX\na     12</pre>';
  const { problems, checked } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 3);
});

test('an escaped entity in the rendered text is decoded before comparison', () => {
  // The renderer escapes `&` and `<`. Comparing the escaped form against the
  // stored form reports a mismatch that is not one, and a gate that cries wolf
  // gets silenced.
  const evidence = goodEvidence();
  evidence.figures['adapters.vendor'] = { value: 'a & b', kind: 'counted', command: 'ls' };
  const { problems } = verify({
    pages: page('<span data-tt="adapters.vendor">a &amp; b</span>'),
    evidence,
  });
  assert.deepStrictEqual(problems, []);
});

// --- failure mode 3: an inert gate ------------------------------------------

test('zero markers on the telltale page fails', () => {
  const { problems } = verify({
    pages: page('<p>A page with prose and no marked figure at all.</p>'),
    evidence: goodEvidence(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no data-tt marker/);
});

test('markers on some other page do not satisfy the telltale page', () => {
  const { problems } = verify({
    pages: [
      { rel: REQUIRED_PAGE, html: '<p>nothing marked here</p>' },
      { rel: 'index.html', html: '<span data-tt="goldens.total">132</span>' },
    ],
    evidence: goodEvidence(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no data-tt marker/);
});

// --- failure mode 4: a malformed record -------------------------------------

test('a record that is not an object fails', () => {
  assert.strictEqual(validateEvidence(null).length, 1);
  assert.match(validateEvidence('132')[0], /did not parse as an object/);
});

test('a counted figure with no command fails', () => {
  const evidence = goodEvidence();
  delete evidence.figures['goldens.total'].command;
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /counted but names no `command`/);
});

test('a cited figure with no cite fails', () => {
  const evidence = goodEvidence();
  delete evidence.figures['race.firstFinish'].cite;
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /cited but names no `cite`/);
});

test('a third kind fails — there are exactly two', () => {
  const evidence = goodEvidence();
  evidence.figures['goldens.total'].kind = 'estimated';
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /There is no third state/);
});

test('a numeric value fails — values are stored as strings', () => {
  const evidence = goodEvidence();
  evidence.figures['goldens.total'].value = 132;
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /must store its value as a string/);
});

test('a malformed sha and a malformed date both fail', () => {
  const evidence = goodEvidence();
  evidence.source.sha = 'not-a-sha';
  evidence.source.pulledAt = '29 August 2026';
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 2);
  assert.match(problems.join('\n'), /is not a hex commit id/);
  assert.match(problems.join('\n'), /is not an ISO date/);
});

// --- failure mode 5: a frame that is not ASCII ------------------------------

test('a frame line containing a non-ASCII character fails', () => {
  /*
   * `arena-check-ascii.txt` upstream carries a non-ASCII character despite its
   * name, and `zero-vs-absent.txt` carries four with no ASCII twin. The suffix
   * is not proof, so every line is tested at the record rather than discovered
   * by the font gate after the copy is written.
   */
  const evidence = goodEvidence();
  evidence.frames.council.lines = ['SEAT  CTX', 'a     —'];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 contains U\+2014/);
});

test('a frame whose rendered text drifts from the stored lines fails', () => {
  const html = '<pre class="tt-frame" data-tt-frame="council">SEAT  CTX\na     13</pre>';
  const { problems } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /does not match the stored lines/);
});

test('an unknown frame key fails', () => {
  const html = '<pre class="tt-frame" data-tt-frame="arena">SEAT</pre>';
  const { problems } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /is not in the evidence file/);
});

test('a frame with no lines fails', () => {
  const evidence = goodEvidence();
  evidence.frames.council.lines = [];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no `lines`/);
});

// --- the publication boundary, re-applied to the record ---------------------

/*
 * These four are the record-side half of the boundary. The puller applies the
 * same rules when it cuts a window, but the puller runs by hand and this gate
 * runs on every build. Without these, a hand edit of telltale-evidence.json and
 * a widened window committed without re-running the puller both ship green.
 * One case per rule class, because a denylist that stops matching one class
 * still reports clean.
 */

test('a frame line carrying a sandbox posture fails at the record', () => {
  // GT11: the posture row sits directly under every council seat row, which is
  // why no council seat row is admitted at any line range.
  const evidence = goodEvidence();
  evidence.frames.council.lines = [
    'SEAT  CTX',
    '[   ro:tools  tokens  |  ro:requested  |  unsandboxed  |  gated',
  ];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 carries a sandbox posture/);
  assert.match(problems[0], /Never hand-edit a frame/);
});

test('a frame line carrying a dollar figure fails at the record', () => {
  const evidence = goodEvidence();
  evidence.frames.council.lines = ['SEAT  COST', 'a     $2.41'];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 carries a dollar figure/);
});

test('a frame line carrying an adoption rate fails at the record', () => {
  const evidence = goodEvidence();
  evidence.frames.council.lines = ['STANDINGS', '3 of 5 adopted'];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 carries an adoption rate/);
});

test('a frame line carrying a machine identity fails at the record', () => {
  const evidence = goodEvidence();
  evidence.frames.council.lines = ['PATH', '  /home/someone/telltale'];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 carries a path outside the telltale repository/);
});

test('the shipped frames pass the boundary rules', () => {
  /*
   * The record this site actually publishes. A rule that only ever runs against
   * a fixture proves the fixture, not the site. This reads the real file, so a
   * later hand edit reddens `node --test` before it reddens the site gate.
   */
  const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
  const frames = evidence.frames || {};
  assert.ok(Object.keys(frames).length > 0, 'the record ships no frames, so this test is inert');
  for (const [key, frame] of Object.entries(frames)) {
    assert.deepStrictEqual(
      assertBoundaryLines(frame.lines),
      [],
      `the shipped frame "${key}" breaks the publication boundary`
    );
  }
});

// --- the age report is a warning, never a failure ---------------------------

test('a fresh pull produces no warning', () => {
  assert.strictEqual(ageWarning(goodEvidence(), new Date('2026-09-05T00:00:00Z')), null);
});

test('a stale pull warns and does not appear as a problem', () => {
  const evidence = goodEvidence();
  const warning = ageWarning(evidence, new Date('2027-06-01T00:00:00Z'));
  assert.match(warning, /^WARNING/);
  assert.match(warning, /not a failure/);
  // The same record still verifies clean, which is the whole point: age is
  // reported to a human, never enforced against a build.
  const { problems } = verify({
    pages: page('<span data-tt="goldens.total">132</span>'),
    evidence,
  });
  assert.deepStrictEqual(problems, []);
});
