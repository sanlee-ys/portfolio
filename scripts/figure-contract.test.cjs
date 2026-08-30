/*
 * Adversarial suite for scripts/figure-contract.cjs.
 *
 * A gate that has only ever been seen to pass is a gate nobody has tested. This
 * one has three ways to be worthless and every one of them looks like a clean
 * run: it can fail nothing, it can fail the wrong thing, or it can hold an
 * exemption for a figure that is no longer there.
 *
 * The second one is the reason this suite exists at all. Measured on
 * 2026-08-30, the site ships 30 SVG text nodes with a raw digit, and exactly
 * one of them renders no digit: `.lab-topo` reads `wipe &#8594; cfg`. A gate
 * that skipped the decode would fail a correct figure, and the remedy a lane
 * reaches for is a deletion. So the decode is pinned here, in both directions.
 *
 * Every fixture is built here. The suite reads no `dist/` and needs no build,
 * which is why it sits with the cheap build-independent checks.
 */
const test = require('node:test');
const assert = require('node:assert');

const {
  decodeEntities,
  contentRegion,
  svgsIn,
  textNodesIn,
  figuresIn,
  unparsedFigureMarkers,
  slotText,
  inventory,
  validateBaseline,
  verify,
  textOf,
} = require('./figure-contract.cjs');

// An SVG with text and no digit. Every fixture carries one, so the inert-gate
// check never fires on a test that is about something else.
const BENIGN = '<svg class="ok-plate"><text>no digit here</text></svg>';

function site(inner, rel = 'projects/example.html') {
  return [{
    rel,
    html: '<body><nav><svg class="chrome"><text>2026</text></svg></nav>'
      + `<main class="wrap article-body" id="main" tabindex="-1">${inner}${BENIGN}</main>`
      + '<footer>2026</footer></body>',
  }];
}

// A baseline that exempts nothing. Each test adds only what it means to exempt.
function emptyBaseline() {
  return { digitPlates: [], undeclaredFigures: [] };
}

function messages(problems) {
  return problems.join('\n');
}

// --- the region scope -------------------------------------------------------

test('the content region is the page main, and chrome sits outside it', () => {
  const html = site('')[0].html;
  const region = contentRegion(html);
  assert.ok(region.includes('ok-plate'));
  assert.ok(!region.includes('chrome'), 'a nav SVG must not be inside the region');
  assert.ok(!region.includes('<footer>'), 'the footer must not be inside the region');
});

test('a digit in site chrome does not fail the gate', () => {
  // The nav fixture carries `2026`. A rule written for editorial figures must
  // not reach the theme toggle or the footer imprint.
  const { problems } = verify({ pages: site(''), baseline: emptyBaseline() });
  assert.deepStrictEqual(problems, []);
});

test('a main that is neither .wrap nor .article-body is not a content region', () => {
  assert.strictEqual(contentRegion('<main id="x"><svg><text>1</text></svg></main>'), null);
});

test('a page with no main contributes no region', () => {
  assert.strictEqual(contentRegion('<body><p>nothing</p></body>'), null);
});

// --- the decode, in both directions -----------------------------------------

test('a numeric entity is decoded before the digit test: the measured false positive', () => {
  /*
   * `netops-lab.astro` reads `wipe &#8594; cfg`. The digits belong to the
   * entity reference and the reader sees an arrow. A gate that read the source,
   * or that skipped the decode, would fail a figure that was never wrong.
   */
  const { text, unknown } = decodeEntities('wipe &#8594; cfg');
  assert.strictEqual(text, 'wipe → cfg');
  assert.deepStrictEqual(unknown, []);
  assert.ok(!/[0-9]/.test(text));

  const { problems } = verify({
    pages: site('<svg class="lab-topo"><text>wipe &#8594; cfg</text></svg>'),
    baseline: emptyBaseline(),
  });
  assert.deepStrictEqual(problems, []);
});

test('a named entity whose SPELLING holds a digit is decoded, not failed', () => {
  // `&frac12;` renders one character and no digit. Passing an entity through
  // un-decoded invents a violation.
  const { text } = decodeEntities('half &frac12; done');
  assert.ok(!/[0-9]/.test(text));
  const { problems } = verify({
    pages: site('<svg class="p"><text>half &frac12; done</text></svg>'),
    baseline: emptyBaseline(),
  });
  assert.deepStrictEqual(problems, []);
});

test('a hex entity is decoded too', () => {
  assert.strictEqual(decodeEntities('a &#x2192; b').text, 'a → b');
});

test('an entity this gate cannot resolve fails, and names itself', () => {
  /*
   * The alternative is a gate that goes quietly blind on new copy. An
   * un-decodable entity leaves the gate unable to say whether a digit renders,
   * and "unable to say" must never read as "clean". font-coverage.cjs made the
   * same call.
   *
   * It reports ONCE. `&sup2;` spells a digit it never renders, so a digit
   * verdict on the same text would be a second, wrong complaint about the same
   * defect, and it would point the lane at the plate instead of at the table.
   */
  const { unknown } = decodeEntities('x &sup2; y');
  assert.deepStrictEqual(unknown, ['sup2']);
  const { problems } = verify({
    pages: site('<svg class="p"><text>x &sup2; y</text></svg>'),
    baseline: emptyBaseline(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /cannot resolve/);
  assert.match(problems[0], /&sup2;/);
});

test('a decoded digit still fails: the decode is not an escape hatch', () => {
  // `&#52;` is the character `4`. Hiding a count behind an entity must not work.
  const { problems } = verify({
    pages: site('<svg class="p"><text>&#52; rungs</text></svg>'),
    baseline: emptyBaseline(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /holds a digit/);
});

// --- R-D, the digit rule ----------------------------------------------------

test('a new hand-drawn plate with a digit fails, and the message names the fix', () => {
  const { problems } = verify({
    pages: site('<svg class="ca2-bypass"><text>2 bypasses</text></svg>'),
    baseline: emptyBaseline(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /"\.ca2-bypass" holds a digit/);
  assert.match(problems[0], /"2 bypasses"/);
  assert.match(problems[0], /data-fig-generated/);
});

test('a generated plot carries its digits', () => {
  const { problems } = verify({
    pages: site('<svg class="dnc1-power" data-fig-generated="true"><text>p=0.0522</text></svg>'),
    baseline: emptyBaseline(),
  });
  assert.deepStrictEqual(problems, []);
});

test('a baselined plate passes with the values the baseline lists', () => {
  const baseline = emptyBaseline();
  baseline.digitPlates.push({
    page: 'projects/example.html', figure: '.rung-plate', texts: ['L1', 'L2'], reason: 'rung names',
  });
  const { problems, checked } = verify({
    pages: site('<svg class="rung-plate"><text>L1</text><text>L2</text></svg>'),
    baseline,
  });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 1);
});

test('a NEW digit added to a baselined plate fails: the exemption is per value', () => {
  /*
   * The exemption covers what already shipped. Without a per-value check, one
   * grandfathered plate becomes a place to put any number at all.
   */
  const baseline = emptyBaseline();
  baseline.digitPlates.push({
    page: 'projects/example.html', figure: '.rung-plate', texts: ['L1', 'L2'], reason: 'rung names',
  });
  const { problems } = verify({
    pages: site('<svg class="rung-plate"><text>L1</text><text>L2</text><text>4 rungs</text></svg>'),
    baseline,
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /now renders the digit text "4 rungs"/);
});

test('the baseline cannot rot: a stored value the page no longer renders fails', () => {
  /*
   * `.ci-plot` and `.eval-plate` are frozen historical measurements. This is
   * what freezes them: an edit to either one reddens the build instead of
   * shipping as an ordinary diff.
   */
  const baseline = emptyBaseline();
  baseline.digitPlates.push({
    page: 'projects/example.html', figure: '.ci-plot', texts: ['94.4%'], reason: 'frozen',
  });
  const { problems } = verify({
    pages: site('<svg class="ci-plot"><text>95.1%</text></svg>'),
    baseline,
  });
  // Two complaints, and both are correct: a new value, and a lost one.
  assert.strictEqual(problems.length, 2);
  assert.match(messages(problems), /now renders the digit text "95\.1%"/);
  assert.match(messages(problems), /no longer renders it/);
});

test('the baseline cannot rot: an exemption for a figure that is gone fails', () => {
  const baseline = emptyBaseline();
  baseline.digitPlates.push({
    page: 'projects/example.html', figure: '.deleted-plate', texts: ['7'], reason: 'gone',
  });
  const { problems } = verify({ pages: site(''), baseline });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /no such figure with digit text is on the built site/);
});

test('a re-indented text node still matches its baseline value', () => {
  // The source indents its SVG markup. A whitespace change is not a changed
  // figure, and a gate that said otherwise would be edited away.
  const baseline = emptyBaseline();
  baseline.digitPlates.push({
    page: 'projects/example.html', figure: '.run-plate', texts: ['3 fields'], reason: 'payload shape',
  });
  const { problems } = verify({
    pages: site('<svg class="run-plate"><text>\n      3\n      fields\n    </text></svg>'),
    baseline,
  });
  assert.deepStrictEqual(problems, []);
});

test('a digit inside a tspan is read, not skipped', () => {
  // Inner markup is removed with no replacement, because a tspan is an inline
  // run of the same string. Inserting a space would invent a word break.
  const nodes = textNodesIn('<svg><text>n=<tspan>54</tspan></text></svg>');
  assert.deepStrictEqual(nodes, ['n=54']);
  const { problems } = verify({
    pages: site('<svg class="p"><text>n=<tspan>54</tspan></text></svg>'),
    baseline: emptyBaseline(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /"n=54"/);
});

test('an SVG title is not a rendered text node', () => {
  // <title> is the accessible name, not painted copy. The digit rule is about
  // what the reader sees.
  const { problems } = verify({
    pages: site('<svg class="p"><title>4 rungs</title><text>rungs</text></svg>'),
    baseline: emptyBaseline(),
  });
  assert.deepStrictEqual(problems, []);
});

test('two plates on one page are both found', () => {
  // A module-level /g regex keeps `lastIndex` between calls and skips a match.
  const region = '<svg class="a"><text>1</text></svg><svg class="b"><text>2</text></svg>';
  assert.strictEqual(svgsIn(region).length, 2);
  assert.strictEqual(svgsIn(region).length, 2);
});

test('markers on a second page are still found', () => {
  const pages = [...site('<svg class="a"><text>1</text></svg>', 'one.html'),
    ...site('<svg class="b"><text>2</text></svg>', 'two.html')];
  const { problems } = verify({ pages, baseline: emptyBaseline() });
  assert.strictEqual(problems.length, 2);
});

// --- R-C, the caption rule --------------------------------------------------

const CAPTIONED = '<figure class="fig" data-fig="plate"><svg class="q"><text>a</text></svg>'
  + '<figcaption><span class="fig-what">What it argues.</span>'
  + '<span class="fig-limit">What it does not show.</span></figcaption></figure>';

test('a declared figure with both caption slots passes', () => {
  const { problems, checked } = verify({ pages: site(CAPTIONED), baseline: emptyBaseline() });
  assert.deepStrictEqual(problems, []);
  assert.strictEqual(checked, 1);
});

test('a declared figure with no .fig-limit fails', () => {
  const html = '<figure data-fig="plate" class="fig"><figcaption>'
    + '<span class="fig-what">What it argues.</span></figcaption></figure>';
  const { problems } = verify({ pages: site(html), baseline: emptyBaseline() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /holds no `\.fig-limit`/);
});

test('a declared figure with no .fig-what fails', () => {
  const html = '<figure data-fig="strip" class="fig"><figcaption>'
    + '<span class="fig-limit">What it does not show.</span></figcaption></figure>';
  const { problems } = verify({ pages: site(html), baseline: emptyBaseline() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /holds no `\.fig-what`/);
});

test('an EMPTY .fig-limit fails: this is the slot that orphans a caveat', () => {
  /*
   * The ADR-007 rider says a figure sequence that ends on a win, with the
   * caveat somewhere else, is a broken split even though nothing moved. A
   * present-but-empty span is how that ships past a "the span exists" check.
   */
  const html = '<figure data-fig="plate" class="fig"><figcaption>'
    + '<span class="fig-what">What it argues.</span>'
    + '<span class="fig-limit">   </span></figcaption></figure>';
  const { problems } = verify({ pages: site(html), baseline: emptyBaseline() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /`\.fig-limit` inside ".fig" is empty/);
});

test('a caption slot holding only markup and entities is not mistaken for text', () => {
  assert.strictEqual(slotText('<span class="fig-limit"><b>&nbsp;</b></span>', 'fig-limit'), '');
  assert.strictEqual(slotText('<span class="fig-what">One <b>claim</b>.</span>', 'fig-what'),
    'One claim .');
});

test('a caption slot keeps text AFTER a nested span, which is the normal case', () => {
  /*
   * The caption contract puts the exact numbers inside a `data-metric` or
   * `data-tt` span inside `.fig-what`. A reader that stopped at the first inner
   * `</span>` would return "The bar never moved at" and drop the rest, which is
   * a silent truncation, not a failure anyone would see.
   */
  const cap = '<span class="fig-what">The bar never moved at '
    + '<span data-metric="power">p=0.0522</span>, and the caption keeps this half.</span>'
    + '<span class="fig-limit">A limit.</span>';
  assert.strictEqual(
    slotText(cap, 'fig-what'),
    'The bar never moved at p=0.0522 , and the caption keeps this half.'
  );
  assert.strictEqual(slotText(cap, 'fig-limit'), 'A limit.');
});

test('a > inside an attribute value does not end a tag', () => {
  /*
   * The reason this file does not strip tags with `replace(/<[^>]*>/g, '')`.
   * That pattern ends the match at the `>` inside the title and leaves markup
   * behind as text, which CodeQL flags as an incomplete sanitization and which
   * is a correctness bug in a gate that reads real page markup.
   */
  assert.strictEqual(textOf('a<b title="x>y">c', ''), 'ac');
  assert.strictEqual(textOf("a<b title='x>y'>c", ' '), 'a c');
});

test('an unclosed tag is read as text rather than swallowing the rest', () => {
  assert.strictEqual(textOf('keep me <span class="x', ''), 'keep me <span class="x');
});

test('a caption slot is found when the class sits beside others', () => {
  assert.strictEqual(
    slotText('<span class="cap fig-limit muted">A limit.</span>', 'fig-limit'),
    'A limit.'
  );
});

// --- R-N, the declaration rule ----------------------------------------------

test('a new figure with no data-fig fails: the escape hatch is closed', () => {
  /*
   * Without R-N, the whole caption rule is opt-in: a lane omits the attribute
   * and R-C never runs. That is a gate that new work can decline.
   */
  const { problems } = verify({
    pages: site('<figure class="ca2-fig"><svg class="s"><text>a</text></svg></figure>'),
    baseline: emptyBaseline(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no `data-fig`/);
});

test('a baselined figure may stay undeclared', () => {
  const baseline = emptyBaseline();
  baseline.undeclaredFigures.push({
    page: 'projects/example.html', figure: '.sango', reason: 'a photograph',
  });
  const { problems } = verify({
    pages: site('<figure class="sango"><img alt="" /></figure>'),
    baseline,
  });
  assert.deepStrictEqual(problems, []);
});

test('an exemption for one page does not cover the same class on another page', () => {
  const baseline = emptyBaseline();
  baseline.undeclaredFigures.push({
    page: 'index.html', figure: '.sango', reason: 'a photograph',
  });
  const { problems } = verify({
    pages: site('<figure class="sango"><img alt="" /></figure>', 'about.html'),
    baseline,
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no `data-fig`/);
});

test('a data-fig this gate cannot parse is reported as a gap, not ignored', () => {
  /*
   * The shape that defeats the pattern. It is not a mismatch and it is not a
   * pass: without the parity counter it is an absence, which is what a clean
   * run looks like.
   */
  const region = '<div data-fig="plate">not a figure element</div>';
  assert.strictEqual(unparsedFigureMarkers(region), 1);
  const { problems } = verify({ pages: site(region), baseline: emptyBaseline() });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /could not parse/);
});

test('a well-formed declared figure leaves no parity gap', () => {
  assert.strictEqual(unparsedFigureMarkers(CAPTIONED), 0);
  assert.strictEqual(figuresIn(CAPTIONED).length, 1);
  assert.strictEqual(figuresIn(CAPTIONED)[0].declared, true);
});

// --- the inert gate ---------------------------------------------------------

test('a site with no content region fails rather than passing on an empty walk', () => {
  const { problems } = verify({
    pages: [{ rel: 'x.html', html: '<body><p>no main</p></body>' }],
    baseline: emptyBaseline(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /checked nothing/);
});

test('a site whose content regions hold no SVG fails', () => {
  const { problems } = verify({
    pages: [{ rel: 'x.html', html: '<main class="wrap"><p>prose only</p></main>' }],
    baseline: emptyBaseline(),
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /not one carried an <svg>/);
});

test('the inventory reports what it walked', () => {
  const inv = inventory({ pages: site('<svg class="p"><text>7</text></svg>') });
  assert.strictEqual(inv.regions, 1);
  assert.strictEqual(inv.svgCount, 2); // the fixture plate and the benign one
  assert.deepStrictEqual(inv.plates.map((p) => p.figure), ['.p']);
});

// --- a malformed baseline ---------------------------------------------------

test('a baseline that is not an object fails', () => {
  assert.match(validateBaseline(null)[0], /did not parse as an object/);
  assert.match(validateBaseline([])[0], /did not parse as an object/);
});

test('a baseline missing a section fails', () => {
  const problems = validateBaseline({ digitPlates: [] });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /`undeclaredFigures` is missing/);
});

test('an exemption with no recorded reason fails', () => {
  /*
   * An exemption is a rule somebody decided to break. A decision with no reason
   * is how a baseline stops being a record and becomes a place to hide things.
   */
  const problems = validateBaseline({
    digitPlates: [{ page: 'a.html', figure: '.p', texts: ['1'] }],
    undeclaredFigures: [],
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /carries no `reason`/);
});

test('an exemption with no listed values fails', () => {
  const problems = validateBaseline({
    digitPlates: [{ page: 'a.html', figure: '.p', texts: [], reason: 'why' }],
    undeclaredFigures: [],
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /must list its exact text values/);
});

test('a malformed baseline stops the run before any page verdict', () => {
  // A broken record must not produce page-level complaints a reader would then
  // try to fix on the page.
  const { problems } = verify({
    pages: site('<svg class="p"><text>9</text></svg>'),
    baseline: { digitPlates: 'nope', undeclaredFigures: [] },
  });
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /`digitPlates` is missing or is not an array/);
});

// --- the shipped baseline describes the shipped site ------------------------

test('the committed baseline is well formed', () => {
  const baseline = require('./figure-contract-baseline.json');
  assert.deepStrictEqual(validateBaseline(baseline), []);
  // The two permanent entries are named in ADR-013. If either is dropped, the
  // frozen historical records lose the only thing that freezes them.
  const keys = baseline.digitPlates.map((e) => `${e.page} ${e.figure}`);
  assert.ok(keys.includes('projects/defense-news-classifier.html .ci-plot'));
  assert.ok(keys.includes('projects/defense-news-classifier.html .eval-plate'));
});
