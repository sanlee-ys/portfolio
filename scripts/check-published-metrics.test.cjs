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

const { markersIn, unparsedMarkers } = require('./check-published-metrics.cjs');

test('a well-formed Markdown marker parses and leaves no gap', () => {
  const md = 'category <!-- metric:category_accuracy -->92.6% of the set';
  assert.deepStrictEqual(markersIn(md, 'README.md'), [['category_accuracy', '92.6%']]);
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 0);
});

test('a bold Markdown value still parses', () => {
  const md = '<!-- metric:region_accuracy -->**87.0%**';
  assert.deepStrictEqual(markersIn(md, 'README.md'), [['region_accuracy', '87.0%']]);
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 0);
});

/*
 * The two shapes that were live holes. Both were probed against the shipped
 * pattern and both returned zero markers AND zero complaints, so a figure
 * written either way was published unguarded while the gate reported green.
 */
test('a backticked Markdown value is reported as an unparsed marker', () => {
  const md = '<!-- metric:category_accuracy -->`99.9%`';
  assert.deepStrictEqual(markersIn(md, 'README.md'), [], 'the value pattern cannot read it');
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 1, 'and the parity counter must say so');
});

test('a Markdown value with a leading tilde is reported as an unparsed marker', () => {
  const md = '<!-- metric:domain_accuracy --> ~99.9%';
  assert.deepStrictEqual(markersIn(md, 'README.md'), []);
  assert.strictEqual(unparsedMarkers(md, 'README.md'), 1);
});

test('several malformed Markdown markers are counted, not collapsed to one', () => {
  const md = ['<!-- metric:a -->`1%`', '<!-- metric:b --> ~2%', '<!-- metric:c -->3%'].join('\n');
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
