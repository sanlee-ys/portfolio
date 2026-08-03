/*
 * Adversarial suite for the marker parsing in scripts/check-published-metrics.cjs.
 *
 * The parity counter is this gate's backstop: the value pattern will always miss
 * some way of writing a number, and a marker the pattern cannot read is not a
 * mismatch, it is an absence — which is exactly what a passing run looks like.
 * So the counter's job is to notice the gap, and its own failure mode is to
 * return zero for a file it never really examined.
 *
 * That is precisely what it did for Markdown until 2026-07-28: `unparsedMarkers`
 * opened with `if (file.endsWith('.md')) return 0;`, so every malformed Markdown
 * marker was silently free. These tests exist because the fix is unfalsifiable
 * without them — a parity counter that returns 0 and a parity counter that is
 * correct produce identical output on a clean tree.
 */
const test = require('node:test');
const assert = require('node:assert');

const { markersIn, unparsedMarkers, lineInitialMarkers } = require('./check-published-metrics.cjs');

test('a well-formed Markdown marker parses and leaves no gap', () => {
  const md = 'category <!-- metric:category_accuracy -->92.6% of the set';
  assert.deepStrictEqual(markersIn(md, 'README.md'), [['category_accuracy', '92.6%']]);
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 0);
});

/*
 * Every fixture in this file places its marker AFTER text on the line. That is
 * load-bearing, not incidental. A marker that starts a line is a real defect (see
 * `lineInitialMarkers` and its tests below), so a fixture written that way would
 * document the broken shape as the correct one — which is exactly what happened in
 * faithfulness-judge, where four pre-existing tests did precisely that.
 */
test('a bold Markdown value still parses', () => {
  const md = 'region <!-- metric:region_accuracy -->**87.0%**';
  assert.deepStrictEqual(markersIn(md, 'README.md'), [['region_accuracy', '87.0%']]);
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 0);
});

/*
 * The two shapes that were live holes. Both were probed against the shipped
 * pattern and both returned zero markers AND zero complaints, so a figure
 * written either way was published unguarded while the gate reported green.
 */
test('a backticked Markdown value is reported as an unparsed marker', () => {
  const md = 'category <!-- metric:category_accuracy -->`99.9%`';
  assert.deepStrictEqual(markersIn(md, 'README.md'), [], 'the value pattern cannot read it');
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 1, 'and the parity counter must say so');
});

test('a Markdown value with a leading tilde is reported as an unparsed marker', () => {
  const md = 'domain <!-- metric:domain_accuracy --> ~99.9%';
  assert.deepStrictEqual(markersIn(md, 'README.md'), []);
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 1);
});

test('several malformed Markdown markers are counted, not collapsed to one', () => {
  const md = ['a <!-- metric:a -->`1%`', 'b <!-- metric:b --> ~2%', 'c <!-- metric:c -->3%'].join(
    '\n'
  );
  assert.strictEqual(markersIn(md, 'README.md').length, 1, 'only the well-formed one parses');
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 2);
});

test('a Markdown file with no markers at all is not a gap', () => {
  const md = '# A document that makes no numeric claims.\n\nProse only.';
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 0);
});

/*
 * The HTML side, kept here so the two branches cannot drift apart unnoticed. The
 * attribute-order case is the defect this parity counter was originally added to
 * back up: the pattern once required `data-metric` to be the span's only
 * attribute, and the three headline accuracies on the homepage matched nothing.
 */
test('HTML markers parse regardless of attribute order', () => {
  const html = '<span class="stat-value" data-metric="category_accuracy">92.6%</span>';
  assert.deepStrictEqual(markersIn(html, 'index.html'), [['category_accuracy', '92.6%']]);
  assert.strictEqual(unparsedMarkers(html, 'index.html'), 0);
});

test('an HTML marker the pattern cannot read is reported as a gap', () => {
  const html = '<span data-metric="category_accuracy"><em>92.6%</em></span>';
  assert.strictEqual(markersIn(html, 'index.html').length, 0, 'nested markup defeats the pattern');
  assert.strictEqual(unparsedMarkers(html, 'index.html'), 1);
});

/*
 * Placement. The failure here is the inverse of the parity counter's: that one
 * catches a marker the CHECKER cannot read, this one catches a marker the READER
 * can — a line-initial `<!--` opens a Markdown HTML block, so the paragraph splits
 * and inline formatting stops until the next blank line, on the published page,
 * while the source looks fine and the gate stays green.
 *
 * Two of these were live in README.md until 2026-08-02. Both carried perfectly
 * correct values, which is why nothing else could have caught them.
 */
test('a marker after text on its line is the correct shape', () => {
  const md = 'real hand-labeled eval (<!-- metric:category_accuracy -->92.6% category)';
  assert.deepStrictEqual(lineInitialMarkers(md, 'README.md'), []);
});

test('a marker at column zero is reported with its line number', () => {
  const md = 'scored on a\n<!-- metric:category_accuracy -->92.6% category.';
  assert.deepStrictEqual(lineInitialMarkers(md, 'README.md'), [2]);
});

test('a marker indented inside a list item is still line-initial', () => {
  /*
   * The shape that actually shipped, and the reason `/^<!--/` is not enough. An
   * HTML block opens on up to three spaces of indentation, and a list item's
   * content starts at column 2 — so the marker is at relative column zero while
   * looking, to a reviewer, like ordinary continuation text.
   */
  const md =
    '- **Defense News Classifier** — scored on a\n' +
    '  <!-- metric:domain_accuracy -->92.6% operational domain,\n' +
    '  <!-- metric:region_accuracy -->87.0% region).';
  assert.deepStrictEqual(lineInitialMarkers(md, 'README.md'), [2, 3]);
});

test('a tab-indented marker is line-initial too', () => {
  assert.deepStrictEqual(lineInitialMarkers('text\n\t<!-- metric:a -->1%', 'README.md'), [2]);
});

test('a line-initial marker is caught even when the value is malformed', () => {
  /*
   * The two defects are independent and can co-occur: the parity counter sees a
   * marker it cannot parse, this rule sees a marker in the wrong place. Neither
   * may mask the other.
   */
  const md = 'text\n<!-- metric:category_accuracy -->`99.9%`';
  assert.deepStrictEqual(lineInitialMarkers(md, 'README.md'), [2]);
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 1);
});

test('a marker inside a fenced block is documentation, not a use', () => {
  const md = ['Never write it like this:', '', '```markdown', 'category', '<!-- metric:a -->92.6%', '```'].join('\n');
  assert.deepStrictEqual(lineInitialMarkers(md, 'README.md'), []);
});

test('a marker inside an inline code span is not a use', () => {
  assert.deepStrictEqual(lineInitialMarkers('Write `<!-- metric:KEY -->` first.', 'README.md'), []);
});

test('line numbers survive a fenced block earlier in the file', () => {
  /*
   * Code is blanked, not deleted. Deleting it would shift every line after the
   * fence and point the reader at the wrong line — worse than no line number,
   * because it looks authoritative.
   */
  const md = ['intro', '```js', 'a', 'b', '```', 'text', '<!-- metric:a -->1%'].join('\n');
  assert.deepStrictEqual(lineInitialMarkers(md, 'README.md'), [7]);
});

test('an HTML file is exempt — a comment there is just a comment', () => {
  assert.deepStrictEqual(lineInitialMarkers('<!-- metric:a -->92.6%', 'index.html'), []);
});
