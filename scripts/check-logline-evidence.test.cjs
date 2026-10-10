/*
 * Adversarial suite for scripts/check-logline-evidence.cjs.
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
} = require('./check-logline-evidence.cjs');
const { assertBoundaryLines } = require('./pull-logline-evidence.cjs');

// A minimal well-formed record. Each test copies it and breaks one thing.
function goodEvidence() {
  return {
    source: { repo: 'sanlee-ys/logline', sha: 'abc1234', pulledAt: '2026-09-14' },
    figures: {
      'claims.met': { value: '7', kind: 'counted', command: 'logline measure ...; record.counts.met' },
      'claims.total': { value: '9', kind: 'counted', command: 'logline measure ...; record.counts.total' },
    },
    frames: {
      measure: { path: 'examples/public-system.json', lines: ['MET 7   UNMET 2   UNMEASURED 0   of 9 claims', 'MET         kb-fanout-cap    kb-agent #111 merged 2026-09-09 a1b2c3d'] },
    },
  };
}

function page(html, rel = REQUIRED_PAGE) {
  return [{ rel, html }];
}

// --- the marker patterns ----------------------------------------------------

test('a well-formed figure marker parses and leaves no gap', () => {
  const html = '<span data-ll="claims.met">7</span>';
  assert.deepStrictEqual(figuresIn(html), [['claims.met', '7']]);
  assert.strictEqual(unparsedFigures(html), 0);
});

test('a figure marker parses regardless of attribute order', () => {
  const html = '<span class="fig" data-ll="claims.met" id="x">7</span>';
  assert.deepStrictEqual(figuresIn(html), [['claims.met', '7']]);
  assert.strictEqual(unparsedFigures(html), 0);
});

test('a figure marker wrapping nested markup is reported as a gap, not ignored', () => {
  /*
   * The shape that defeats the pattern. It is not a mismatch and it is not a
   * pass: without the parity counter it is an absence, which is what a clean
   * run looks like.
   */
  const html = '<span data-ll="claims.met"><strong>7</strong></span>';
  assert.strictEqual(figuresIn(html).length, 0);
  assert.strictEqual(unparsedFigures(html), 1);
});

test('the figure counter does not count a frame attribute', () => {
  // `data-ll-frame=` must not satisfy `data-ll=`, or every frame would report
  // as an unparsed figure and the gate would cry wolf on a correct page.
  const html = '<pre data-ll-frame="measure">MET 7   UNMET 2   UNMEASURED 0   of 9 claims\nMET         kb-fanout-cap    kb-agent #111 merged 2026-09-09 a1b2c3d</pre>';
  assert.strictEqual(unparsedFigures(html), 0);
  assert.strictEqual(unparsedFrames(html), 0);
  assert.deepStrictEqual(framesIn(html), [['measure', 'MET 7   UNMET 2   UNMEASURED 0   of 9 claims\nMET         kb-fanout-cap    kb-agent #111 merged 2026-09-09 a1b2c3d']]);
});

test('markers on a second page are still found', () => {
  // A module-level /g regex keeps `lastIndex` between calls and skips the first
  // marker on every page after the first. The gate builds a fresh pattern per
  // call; this pins that.
  const html = '<span data-ll="a">1</span>';
  assert.strictEqual(figuresIn(html).length, 1);
  assert.strictEqual(figuresIn(html).length, 1);
});

// --- markup a browser never renders ------------------------------------------

/*
 * The comment-parsing chokepoint, ported from scripts/figure-contract.cjs
 * (`contentRegion`/`stripNonMarkup`, commit 864c356). The defect class it
 * closes, measured 2026-08-30 against this checker before the port: the four
 * marker patterns run over raw HTML, so a commented-out `data-ll` span parses
 * as a live figure and a `[data-ll="..."]` selector in a style island counts
 * as an unparsed raw marker. Both name markup no reader will ever see, and the
 * cheapest way to green either false failure is to delete the comment or the
 * selector.
 */

test('a commented-out figure marker is not a live figure', () => {
  const html =
    '<!-- retired draft: <span data-ll="claims.met">99</span> -->' +
    '<span data-ll="claims.met">7</span>';
  const { problems, checked } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 1);
});

test('a commented-out frame is not a live frame', () => {
  const html =
    '<!-- <pre class="ll-frame" data-ll-frame="measure">OLD LINES</pre> -->' +
    '<pre class="ll-frame" data-ll-frame="measure">MET 7   UNMET 2   UNMEASURED 0   of 9 claims\nMET         kb-fanout-cap    kb-agent #111 merged 2026-09-09 a1b2c3d</pre>';
  const { problems, checked } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 1);
});

test('a data-ll selector inside a style island is not an unparsed marker', () => {
  const html =
    '<style>[data-ll="claims.met"] { font-variant-numeric: tabular-nums; }</style>' +
    '<span data-ll="claims.met">7</span>';
  const { problems } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
});

test('a comment holding a > still hides the markup after it', () => {
  // Every plate on this site is preceded by a rationale comment, and those
  // comments hold `>` characters. A comment ends at `-->`, not at the first `>`.
  const html =
    '<!-- the arrow a -> b is drawn, not typed: <span data-ll="claims.met">7</span> -->' +
    '<span data-ll="claims.met">7</span>';
  const { problems, checked } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 1);
});

// --- failure mode 1: an unknown key -----------------------------------------

test('an unknown data-ll key fails', () => {
  const { problems } = verify({
    pages: page('<span data-ll="claims.mett">7</span>'),
    evidence: goodEvidence(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /is not in the evidence file/);
});

// --- failure mode 2: a rendered value that differs from the record ----------

test('a rendered value that differs from the record fails', () => {
  const { problems } = verify({
    pages: page('<span data-ll="claims.met">8</span>'),
    evidence: goodEvidence(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /renders as "8" but the record says "7"/);
});

test('a wrong number typed BESIDE the marked one still fails', () => {
  /*
   * The exact defect a page-wide substring search cannot see: the correct
   * string "7" is present on the page, so a substring search passes. The
   * assertion is anchored to the attribute, so it does not.
   */
  const html = 'The suite holds 7 met claims. <span data-ll="claims.met">71</span>';
  const { problems } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /renders as "71"/);
});

test('a correct page produces no problems and reports what it checked', () => {
  const html =
    '<span data-ll="claims.met">7</span>' +
    '<span data-ll="claims.total">9</span>' +
    '<pre class="ll-frame" data-ll-frame="measure" tabindex="0">MET 7   UNMET 2   UNMEASURED 0   of 9 claims\nMET         kb-fanout-cap    kb-agent #111 merged 2026-09-09 a1b2c3d</pre>';
  const { problems, checked } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 3);
});

test('an escaped entity in the rendered text is decoded before comparison', () => {
  // The renderer escapes `&` and `<`. Comparing the escaped form against the
  // stored form reports a mismatch that is not one, and a gate that cries wolf
  // gets silenced.
  const evidence = goodEvidence();
  evidence.figures['repos.count'] = { value: 'a & b', kind: 'counted', command: 'ls' };
  const { problems } = verify({
    pages: page('<span data-ll="repos.count">a &amp; b</span>'),
    evidence,
  });
  assert.deepStrictEqual(problems, []);
});

// --- failure mode 3: an inert gate ------------------------------------------

test('zero markers on the logline page fails', () => {
  const { problems } = verify({
    pages: page('<p>A page with prose and no marked figure at all.</p>'),
    evidence: goodEvidence(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no data-ll marker/);
});

test('markers on some other page do not satisfy the logline page', () => {
  const { problems } = verify({
    pages: [
      { rel: REQUIRED_PAGE, html: '<p>nothing marked here</p>' },
      { rel: 'index.html', html: '<span data-ll="claims.met">7</span>' },
    ],
    evidence: goodEvidence(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no data-ll marker/);
});

// --- failure mode 4: a malformed record -------------------------------------

test('a record that is not an object fails', () => {
  assert.strictEqual(validateEvidence(null).length, 1);
  assert.match(validateEvidence('132')[0], /did not parse as an object/);
});

test('a counted figure with no command fails', () => {
  const evidence = goodEvidence();
  delete evidence.figures['claims.met'].command;
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /counted but names no `command`/);
});

test('a cited figure with no cite fails', () => {
  // logline's record carries no cited figure today, but the validator still
  // knows the kind, and a cited figure with no citation must fail.
  const evidence = goodEvidence();
  evidence.figures['claims.cited'] = { value: 'once', kind: 'cited', cite: 'LEDGER.md' };
  delete evidence.figures['claims.cited'].cite;
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /cited but names no `cite`/);
});

test('a third kind fails — there are exactly two', () => {
  const evidence = goodEvidence();
  evidence.figures['claims.met'].kind = 'estimated';
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /There is no third state/);
});

test('a numeric value fails — values are stored as strings', () => {
  const evidence = goodEvidence();
  evidence.figures['claims.met'].value = 7;
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
  // A stray codepoint in a pasted frame fails the font-coverage gate after
  // the copy is written, so every line is tested at the record instead.
  const evidence = goodEvidence();
  evidence.frames.measure.lines = ['MET 7 of 9 claims', 'MET   x   \u2014'];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 contains U\+2014/);
});

test('a frame whose rendered text drifts from the stored lines fails', () => {
  const html = '<pre class="ll-frame" data-ll-frame="measure">MET 8   UNMET 2   UNMEASURED 0   of 9 claims</pre>';
  const { problems } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /does not match the stored lines/);
});

test('an unknown frame key fails', () => {
  const html = '<pre class="ll-frame" data-ll-frame="nothing">MET 0</pre>';
  const { problems } = verify({ pages: page(html), evidence: goodEvidence() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /is not in the evidence file/);
});

test('a frame with no lines fails', () => {
  const evidence = goodEvidence();
  evidence.frames.measure.lines = [];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no `lines`/);
});

// --- the publication boundary, re-applied to the record ---------------------

/*
 * These four are the record-side half of the boundary. The puller applies the
 * same rules when it cuts a window, but the puller runs by hand and this gate
 * runs on every build. Without these, a hand edit of logline-evidence.json and
 * a widened window committed without re-running the puller both ship green.
 * One case per rule class, because a denylist that stops matching one class
 * still reports clean.
 */

test('a frame line carrying a percent fails at the record', () => {
  // The one figure the instrument refuses. A percent in the record is either
  // not logline's output or a hand edit after the pull.
  const evidence = goodEvidence();
  evidence.frames.measure.lines = ['MET 7 of 9 claims', '78% complete'];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 carries a percent/);
  assert.match(problems[0], /Never hand-edit a frame/);
});

test('a frame line carrying a verdict word fails at the record', () => {
  const evidence = goodEvidence();
  evidence.frames.measure.lines = ['MET 7 of 9 claims', 'kb-fanout-cap  on track'];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 carries a verdict word/);
});

test('a frame line carrying a machine identity fails at the record', () => {
  const evidence = goodEvidence();
  evidence.frames.measure.lines = ['MET 7 of 9 claims', 'UNMEASURED  x  not a git working tree at /home/someone/kb-agent'];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 carries a path outside the repositories/);
});

test('a frame line wider than the column fails at the record', () => {
  // The render is 80 columns by contract. A wider line is a renderer change
  // the page has not been re-measured against.
  const evidence = goodEvidence();
  evidence.frames.measure.lines = ['MET 7 of 9 claims', 'x'.repeat(81)];
  const problems = validateEvidence(evidence);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /line 2 carries more than 80 columns/);
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
    pages: page('<span data-ll="claims.met">7</span>'),
    evidence,
  });
  assert.deepStrictEqual(problems, []);
});
