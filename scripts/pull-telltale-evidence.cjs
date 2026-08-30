#!/usr/bin/env node
/*
 * Re-read every telltale figure and frame from the telltale repository, at a
 * pinned commit, and write `src/data/telltale-evidence.json`.
 *
 * WHY THIS EXISTS. `projects/telltale.html` argues one rule: a gauge may state
 * a number, or it may state nothing, but it may not state a number nobody
 * measured. A page that argues that rule and then carries hand-typed counts
 * refutes itself. So no count on that page is typed from memory. Each one is
 * derived here by a named command, and `scripts/check-telltale-evidence.cjs`
 * fails the build when the rendered page and this record disagree.
 *
 * RUN IT BY HAND, and keep it out of `npm run qa`:
 *     node scripts/pull-telltale-evidence.cjs --repo=C:\Users\sanle\code\telltale
 * It writes a source asset and it reads another repository, exactly like
 * `og-cover.cjs`. A gate that reaches outside this repo reddens for reasons
 * that have nothing to do with the site.
 *
 * THE TRAP THIS SCRIPT EXISTS TO AVOID. `telltale/.claude/worktrees/` holds 118
 * duplicate golden files. A recursive filesystem walk therefore counts 250
 * goldens where the repository tracks 132. **Every enumeration here goes
 * through `git ls-files` or `git grep`, never through the filesystem.** Reading
 * file content goes through `git show <sha>:<path>` for the same reason: the
 * record names a commit, so the bytes must come from that commit and not from
 * whatever the working tree happens to hold.
 *
 * THE SECOND TRAP. A golden file whose name ends `-ascii` is not necessarily
 * ASCII. `arena-check-ascii.txt` carries one non-ASCII character despite the
 * suffix. Every frame line is tested here, and the script fails rather than
 * writing a frame that would fail the font-coverage gate after the page copy is
 * already written.
 *
 * WHY ASCII PURITY IS NO LONGER THE ADMISSION TEST (ADR-013, measured
 * 2026-08-30). Purity fails in both directions. Nine of the eighteen files named
 * `*-ascii.txt` are not pure ASCII, and in every case the character is one of
 * U+00B7, U+2013, U+2014, or U+2192. The site already ships all four. So purity
 * rejects renderable frames. And purity detects nothing about COLUMN SHEAR,
 * which is the failure that actually breaks a frame: one codepoint with no glyph
 * in the shipped Geist Mono subset falls back to a proportional platform face,
 * every character after it moves, and no gate on this site can see it.
 * `contrast-check.cjs` exempts SVG, `mobile-qa.cjs` never measures a wrapped
 * frame, and a sheared row still fits its box.
 *
 * Three tests replace purity, and each one fails the run rather than write the
 * frame. `assertGlyphCoverage`, `assertAdvanceWidth`, and `assertBoundary` below
 * carry the reasoning for each.
 *
 * `check-telltale-evidence.cjs` still rejects a non-ASCII stored line. That is a
 * second, narrower control on the record and this script does not replace it.
 *
 * TWO KINDS OF FIGURE, AND NO THIRD.
 *   - `counted` — recomputed here by the command the record stores.
 *   - `cited`   — measured once inside the telltale project and recorded in its
 *                 design document. This script does not re-measure it. It
 *                 verifies that the named document still contains the named
 *                 section and the value, and it fails if either has moved. A
 *                 citation nobody can resolve is worse than no figure.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(REPO_ROOT, 'src', 'data', 'telltale-evidence.json');
const SOURCE_REPO = 'sanlee-ys/telltale';

/*
 * Frames. Each is a contiguous excerpt of one golden file, capped at about 14
 * lines: the goldens are 24 lines and 120 columns, and a full paste turns the
 * page into a wall. The line range is stored so the excerpt stays gated and the
 * caption can name exactly what the reader is looking at.
 *
 * THE RANGES ARE CHOSEN AGAINST THE PUBLICATION BOUNDARY, NOT ONLY AGAINST THE
 * ARGUMENT. Two rules cut most of the candidates.
 *
 *   1. No per-vendor sandbox posture. The council room's second row pairs each
 *      named vendor with its sandbox setting. Publishing that names which
 *      settings do not contain writes, which is a bypass instruction, and it
 *      attaches a negative finding to a named third-party product on a sample
 *      of one operator. Every council golden that shows a seat row shows that
 *      row directly under it, so no council seat row is pasted.
 *   2. No named seat beside a race verdict. The arena record's body lists each
 *      seat with an adoption rate, and one of those rates is zero. The record's
 *      own three-line header states the claim without naming anybody, so that
 *      is the excerpt.
 *
 * Both rules are enforced mechanically by `assertBoundary` below. The prose here
 * records WHY each window stops where it stops, because no gate reads meaning
 * and a line range is the whole review.
 *
 * THE WINDOW IS THE REVIEW. `check-telltale-evidence.cjs` compares bytes. It has
 * no opinion about what a line says. So the admission unit is a line range that
 * a reader can check in one second against the file, and every window below
 * records the neighbour lines it refused and the reason.
 *
 * Every window below is free of a dollar figure, and every one carries its
 * declared column width so `assertAdvanceWidth` can check the box.
 *
 * `columns` IS THE WIDTH OF THE WINDOW, NOT OF THE TERMINAL. The full panel is
 * 119 or 120 columns, and a window that does not include a full-width rule line
 * is narrower than the panel it came from. The caption states this number and
 * the scroll box is sized from it, so it has to be the width the reader can
 * measure. `assertAdvanceWidth` fails a declared width that no line reaches.
 */
const FRAMES = {
  /*
   * The shipped frame. Two vendors expose a quota and the display draws it
   * against its limit; the third exposes none, and the row states the reason in
   * words instead of drawing a gauge.
   *
   * Cut above: line 2, the horizontal rule that opens the panel. Cut below: line
   * 15, a blank separator, and then the `agy` block at lines 16 to 19 whose line
   * 18 pairs a vendor-family name with a rate. `assertBoundary` rejects that
   * line, so the window cannot grow downward.
   */
  usage: {
    path: 'internal/hud/testdata/golden/usage-ascii.txt',
    lineStart: 3,
    lineEnd: 14,
    columns: 119,
  },
  /*
   * A relayed reading that has gone stale is MARKED, not dropped and not
   * refreshed by guesswork. Line 5 carries the mark.
   *
   * Cut above: line 2, the panel rule. Cut below: line 11, a blank separator
   * before the `gemini` block.
   */
  stale: {
    path: 'internal/hud/testdata/golden/usage-stale-ascii.txt',
    lineStart: 3,
    lineEnd: 10,
    columns: 119,
  },
  /*
   * An absence names its own search. Two vendors have no quota reaching disk and
   * each row states a DIFFERENT reason in words: one store holds experiment
   * values rather than usage, and the other has no window, no ordinal, and no
   * reset time at all.
   *
   * WHY THIS WINDOW IS NOT LINES 12 TO 24. A window that also reached the
   * `gemini` absent row at line 12 would have to cross the `agy` block, and line
   * 17 of that block reads a vendor-family quota name beside a rate. GT10 rules
   * a vendor name beside a rate outside the publication boundary, and
   * `assertBoundary` rejects the line, so the window stops below the block. The
   * third absence reason is not lost: the `usage` frame above carries the
   * `gemini` row at its own line 13.
   *
   * Cut above: line 19, a blank separator, and above it the `agy` block. Cut
   * below: line 25, the closing panel rule.
   */
  absent: {
    path: 'internal/hud/testdata/golden/usage-stale-ascii.txt',
    lineStart: 20,
    lineEnd: 24,
    columns: 75,
  },
  /*
   * The shipped frame. The record states its reach before it states a result.
   *
   * Cut above: line 7, blank. Cut below: line 11, blank, and then lines 12 to 20,
   * the per-vendor adoption table. That table is never published, at any line
   * range, under any caption: it pairs a named seat with an adoption rate and a
   * verdict.
   */
  record: {
    path: 'internal/council/testdata/golden/arena-record-ascii.txt',
    lineStart: 8,
    lineEnd: 10,
    columns: 120,
  },
  /*
   * The composer box and the gate bar. A person who presses a key is the only
   * thing that spends a quota.
   *
   * Cut above: line 20, the last row of the three-column seat transcript. Its
   * columns are positionally bound to the named seats on line 5, so a reader can
   * attribute each sentence to a named vendor. Line 6 above it is the per-vendor
   * sandbox posture row, which is the hazard the whole window rule exists for.
   * Nothing is cut below: the file ends at line 24.
   */
  gate: {
    path: 'internal/council/testdata/golden/gated-vs-streaming-ascii.txt',
    lineStart: 21,
    lineEnd: 24,
    columns: 120,
  },
  /*
   * The product's own refusal, rendered in one line. Below sixty columns the
   * display renders nothing but the reason. The whole file is one line, so
   * nothing is cut above and nothing is cut below.
   */
  floor: {
    path: 'internal/hud/testdata/golden/floor-width.txt',
    lineStart: 1,
    lineEnd: 1,
    columns: 36,
  },
  /*
   * The sixty-column twin of the gate frame, and the only council window in the
   * corpus that a 393px reader consumes with no sideways scroll.
   *
   * Cut above: line 6, which names a seat beside its state. Above that, line 5
   * is the council seat row, and lines 3 and 4 each name a vendor beside a state.
   * All four are refused. Nothing is cut below: the file ends at line 10.
   */
  composer: {
    path: 'internal/council/testdata/golden/composer-clipped-to-one-row-ascii.txt',
    lineStart: 7,
    lineEnd: 10,
    columns: 60,
  },
};

/*
 * Directories under `internal/adapter/` that are not vendor adapters. Writing
 * the exclusions down is what makes the vendor count auditable: a reader can
 * see which directories were not counted, instead of trusting a total.
 *
 *   drift    — a shared helper. It reports that a vendor's on-disk store no
 *              longer has the shape its adapter was verified against, and all
 *              seven vendor adapters import it.
 *   dropfile — the documented drop-file relay. It has no vendor of its own;
 *              its rows are marked self-reported.
 *   pins     — the machine-readable canary inventory: which vendor build each
 *              adapter's field map was read at. It contains no reader.
 */
const ADAPTER_EXCLUSIONS = ['drift', 'dropfile', 'pins'];

/*
 * Cited figures. Each was measured once inside the telltale project and written
 * into its design document. This script does not re-measure any of them. It
 * verifies that the document still exists at the recorded commit, that the
 * named section is still in it, and that both the value and a longer anchor
 * phrase are still inside that section. If any of the three has moved, the run
 * fails: a citation nobody can resolve is worse than no figure.
 *
 * The anchor exists because several values are short. "50s" alone would match
 * almost any long document and prove nothing.
 */
const CITATIONS = [
  {
    key: 'race.firstFinish',
    value: '50s',
    anchor: '1st of 5',
    doc: 'docs/design.md',
    section: '### 9.37 /arena: the seats race in worktrees, and the human picks the winner',
  },
  {
    key: 'race.givenUp',
    value: '11 minutes',
    anchor: 'both cut seats kept their commit receipts',
    doc: 'docs/design.md',
    section: '### 9.37 /arena: the seats race in worktrees, and the human picks the winner',
  },
  {
    key: 'stall.streaming',
    value: '21 minutes',
    anchor: 'after the racer had exited',
    doc: 'docs/design.md',
    section: "#### A warm seat's racer could not finish, 2026-08-13 — measured, then fixed",
  },
  {
    key: 'stall.retired',
    value: '18 seconds',
    anchor: 'the column retired in',
    doc: 'docs/design.md',
    section: "#### A warm seat's racer could not finish, 2026-08-13 — measured, then fixed",
  },
  {
    key: 'sweep.keysPresent',
    value: 'eleven keys',
    anchor: 'structurally incapable',
    doc: 'docs/design.md',
    section:
      '#### The `usage` object re-measured 2026-08-29 — the token counts were always ' +
      "beside the cost, and this section's own sweep could not have seen them",
  },
  {
    key: 'sweep.keysMatched',
    value: 'one key',
    anchor: 'and reported one key',
    doc: 'docs/design.md',
    section:
      '#### The `usage` object re-measured 2026-08-29 — the token counts were always ' +
      "beside the cost, and this section's own sweep could not have seen them",
  },
];

// --- git plumbing -----------------------------------------------------------

function git(repo, args, { allowFail = false } = {}) {
  // spawnSync on the command directly, with an argument array: no shell, so no
  // quoting rules to get wrong and no MSYS path mangling on `<sha>:<path>`.
  const proc = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (proc.error) fail(`could not run git: ${proc.error.message}`);
  if (proc.status !== 0) {
    if (allowFail) return null;
    fail(`git ${args.join(' ')} exited ${proc.status}\n${proc.stderr || ''}`);
  }
  return proc.stdout;
}

function fail(message) {
  console.error(`✗ pull-telltale-evidence: ${message}`);
  process.exit(1);
}

/*
 * The whole tracked tree at `sha`, as paths. Enumeration goes through git and
 * never through the filesystem, because `.claude/worktrees/` holds 118
 * duplicate golden files: a recursive walk counts 250 goldens where the
 * repository tracks 132.
 *
 * `git ls-files` reads the index, so this uses `ls-tree` against the recorded
 * commit instead — the record names a commit, so the enumeration must come from
 * it. Filtering happens in JavaScript rather than in a pathspec, because
 * `ls-tree` does not glob a pathspec the way `ls-files` does and a pattern that
 * silently matches nothing returns zero, which reads exactly like an empty
 * directory.
 */
function treePaths(repo, sha) {
  const out = git(repo, ['ls-tree', '-r', '--name-only', sha]);
  const paths = out.split('\n').map((s) => s.trim()).filter(Boolean);
  if (paths.length === 0) fail(`git ls-tree returned nothing at ${sha}.`);
  return paths;
}

function showFile(repo, sha, filePath) {
  const out = git(repo, ['show', `${sha}:${filePath}`], { allowFail: true });
  if (out === null) fail(`${filePath} does not exist at ${sha}.`);
  return out;
}

// --- counting ---------------------------------------------------------------

// --- frame admission --------------------------------------------------------

const FONT_MANIFEST = path.join(REPO_ROOT, 'scripts', 'font-coverage.json');

function hex(cp) {
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

function inRanges(ranges, cp) {
  return ranges.some(([lo, hi]) => cp >= lo && cp <= hi);
}

/*
 * The codepoints the SHIPPED subsets cover, split two ways.
 *
 *   all  — every face on the site. `font-coverage.cjs` fails the build on a
 *          character outside this set, so a frame outside it reddens a gate
 *          later, after the page copy is already written.
 *   mono — the Geist Mono faces only. This is the stricter set, and it is the
 *          one the column grid depends on. See `assertAdvanceWidth`.
 *
 * The manifest is written by `scripts/subset-fonts.py` and re-hashed by
 * `font-coverage.cjs`. Reading it here rather than parsing woff2 is what lets
 * this script run with no font toolchain, exactly as that gate does.
 */
function loadFontRanges() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(FONT_MANIFEST, 'utf8'));
  } catch (err) {
    fail(`could not read ${FONT_MANIFEST}: ${err.message}`);
  }
  const fonts = (manifest && manifest.fonts) || {};
  const all = [];
  const mono = [];
  for (const [file, entry] of Object.entries(fonts)) {
    if (!entry || !Array.isArray(entry.ranges)) continue;
    all.push(...entry.ranges);
    if (/mono/i.test(file)) mono.push(...entry.ranges);
  }
  if (all.length === 0) fail(`${FONT_MANIFEST} declares no ranges, so coverage cannot be checked.`);
  if (mono.length === 0) {
    fail(`${FONT_MANIFEST} names no Geist Mono face, so column shear cannot be checked.`);
  }
  return { all, mono };
}

/*
 * T1, GLYPH COVERAGE. Every codepoint in the window has a glyph in a shipped
 * subset.
 *
 * This is the test ASCII purity was standing in for, and it is the correct one:
 * `font-coverage.cjs` fails the build on any character with no self-hosted
 * glyph, so a frame that fails here would redden that gate after the caption is
 * written. Failing at the record is cheaper and names the codepoint.
 */
function assertGlyphCoverage(key, spec, lines, ranges) {
  lines.forEach((line, i) => {
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      if (inRanges(ranges.all, cp)) continue;
      fail(
        `T1 glyph coverage: ${spec.path} line ${spec.lineStart + i} (frame "${key}") uses ` +
          `${hex(cp)}, which no shipped subset covers.\n` +
          '  A character with no self-hosted glyph is borrowed from a platform face. It ' +
          'looks correct here and changes shape on somebody else\'s machine, and ' +
          'scripts/font-coverage.cjs fails the build on it.'
      );
    }
  });
}

/*
 * T2, ADVANCE WIDTH. Two assertions, and they fail for different reasons.
 *
 * (a) EVERY CODEPOINT RENDERS AT THE MONO ADVANCE. A monospaced face gives every
 *     glyph one advance, so a codepoint COVERED BY GEIST MONO is safe by
 *     construction. A codepoint that Geist Mono does not cover is not: the
 *     browser falls back to a proportional face for that one character, every
 *     character after it on the row moves, and the frame shears. This is the
 *     failure ASCII purity never detected. The set is deliberately narrower than
 *     T1, because a glyph that only the proportional face carries passes T1 and
 *     still shears a row.
 *
 * (b) THE DECLARED COLUMN WIDTH IS THE REAL WIDTH. The caption states a column
 *     count and the CSS gives the frame its own scroll box, so a line wider than
 *     the declared width is a wrong caption and a wrong box.
 *
 * WHY (b) IS NOT AN EQUALITY ASSERTION, and this is a measured correction to the
 * design brief. The HUD goldens are RIGHT-TRIMMED: in `usage-ascii.txt` the
 * window's line lengths run 119, 0, 48, 59, 59, 0, 47, 36, 60, 0, 56, 35. The
 * council goldens are space-padded to a rectangle and the HUD goldens are not.
 * So "every line has the same length" would reject the frame this record ALREADY
 * PUBLISHES, and it would reject it for trailing whitespace that renders as
 * nothing. Length equality was never the property that mattered. Column
 * alignment is, and (a) is the test for it: while every codepoint advances by
 * one column, character N sits in column N on every row.
 */
const ASCII_MAX = 0x7f;

function assertAdvanceWidth(key, spec, lines, ranges) {
  lines.forEach((line, i) => {
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      if (cp <= ASCII_MAX || inRanges(ranges.mono, cp)) continue;
      fail(
        `T2 advance width: ${spec.path} line ${spec.lineStart + i} (frame "${key}") uses ` +
          `${hex(cp)}, which the Geist Mono subset does not cover.\n` +
          '  Every other codepoint on the row advances one column. This one falls back to ' +
          'a proportional face, so every character after it moves and the frame shears. ' +
          'A sheared frame still fits its box, so no gate on this site can see it.'
      );
    }
  });

  if (!Number.isInteger(spec.columns) || spec.columns <= 0) {
    fail(`T2 advance width: frame "${key}" declares no \`columns\`, so its box is unchecked.`);
  }
  const widest = lines.reduce((max, l) => Math.max(max, [...l].length), 0);
  if (widest > spec.columns) {
    fail(
      `T2 advance width: frame "${key}" declares ${spec.columns} columns and its widest ` +
        `line is ${widest} (${spec.path} line ${spec.lineStart + lines.findIndex(
          (l) => [...l].length === widest
        )}).\n` +
        '  The caption states the column count and the scroll box is sized from it.'
    );
  }
  if (widest !== spec.columns) {
    fail(
      `T2 advance width: frame "${key}" declares ${spec.columns} columns and no line ` +
        `reaches it; the widest is ${widest}.\n` +
        '  A declared width no line uses is a wrong caption. Correct `columns` to the ' +
        'measured width, or widen the window.'
    );
  }
}

/*
 * T3, BOUNDARY CONTENT. A denylist, applied line by line, that fails the run
 * rather than write the frame.
 *
 * THE POSTURE PATTERN IS THE ONE THAT MATTERS, and it is the correction a review
 * round produced. A denylist built only from dollar signs, adoption rates, and
 * percentages does NOT match the council room's second row, which pairs each
 * named seat with its sandbox setting. Publishing that names which settings do
 * not contain writes, which is a bypass instruction, and it attaches a negative
 * finding to a named third-party product on a sample of one operator. Every
 * council golden that shows a seat row shows that row directly under it, so the
 * pattern is what keeps a seat row out by construction rather than by care.
 *
 * A VENDOR NAME AS A ROW LABEL IN A READING IS LEGAL and stays legal: the
 * shipped `usage` frame publishes ` gemini  no quota reaches disk anywhere
 * telltale can read`. A vendor name BESIDE a rank, a rate, an adoption, a
 * verdict, or a posture is not, and never becomes so. That is why every pattern
 * below is a PAIRING and not a name.
 */
const VENDOR_TOKENS = [
  'claude', 'claude code', 'codex', 'gemini', 'cursor', 'grok',
  'antigravity', 'agy', 'copilot', 'openai', 'anthropic', 'google',
];

const BOUNDARY_RULES = [
  {
    name: 'a dollar figure',
    test: (line) => /\$\s*\d/.test(line),
  },
  {
    name: 'a per-vendor adoption rate',
    test: (line) => /\b\d+ of \d+ adopted\b/i.test(line),
  },
  {
    name: 'a per-vendor race verdict',
    test: (line) => /\bnever raced\b/i.test(line),
  },
  {
    // The council room's sandbox posture row: a posture word in a columned row.
    name: 'a per-vendor sandbox posture row',
    test: (line) => /\b(ro:tools|ro:requested|unsandboxed|gated)\b.*\|/i.test(line),
  },
  {
    // An absolute path into somebody's home directory is a machine identity.
    // A repository-relative path such as `internal/council/clock.go` is not.
    name: 'a path outside the telltale repository, or a machine identity',
    test: (line) => /(^|[\s"'([])(?:[A-Za-z]:[\\/]|\/(?:home|Users|root)\/)/.test(line),
  },
  {
    name: 'a vendor name beside a percentage',
    test: (line) => {
      if (!/\d\s*%/.test(line)) return false;
      const lower = line.toLowerCase();
      return VENDOR_TOKENS.some((v) => new RegExp(`\\b${v}\\b`).test(lower));
    },
  },
];

function assertBoundary(key, spec, lines) {
  lines.forEach((line, i) => {
    for (const rule of BOUNDARY_RULES) {
      if (!rule.test(line)) continue;
      fail(
        `T3 boundary: ${spec.path} line ${spec.lineStart + i} (frame "${key}") carries ` +
          `${rule.name}.\n` +
          `  Line: ${JSON.stringify(line.trim().slice(0, 100))}\n` +
          '  Move the window. This site never publishes a vendor name beside a rank, a ' +
          'rate, an adoption, a verdict, or a sandbox posture, and it publishes no dollar ' +
          'figure on a new surface.'
      );
    }
  });
}

function countTestFunctions(repo, sha) {
  /*
   * One `git grep` over the recorded tree rather than one `git show` per file.
   * Output is `<sha>:<path>:<count>`; the path is taken from between the first
   * and last colon, so a path with a colon in it cannot shift the count.
   */
  const out = git(repo, ['grep', '-c', '-E', '^func Test', sha, '--', '*_test.go']);
  let total = 0;
  const files = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const firstColon = line.indexOf(':');
    const lastColon = line.lastIndexOf(':');
    const file = line.slice(firstColon + 1, lastColon);
    const count = Number(line.slice(lastColon + 1));
    if (!Number.isFinite(count)) fail(`could not parse a git grep count line: ${line}`);
    if (!/^(internal|cmd)\//.test(file)) continue;
    total += count;
    files.push(file);
  }
  if (total === 0) fail('counted zero test functions, which cannot be right.');
  return { total, files: files.length };
}

/*
 * Vendor adapters. `internal/adapter/` holds more directories than there are
 * vendors, so the exclusion list is written into the record. That is what makes
 * the number auditable: a reader can see which directories were not counted and
 * why, instead of trusting a total.
 */
function countVendorAdapters(paths, sha, excluded) {
  const dirs = new Set();
  for (const p of paths) {
    if (!p.startsWith('internal/adapter/')) continue;
    const parts = p.split('/');
    if (parts.length < 4) continue;
    dirs.add(parts[2]);
  }
  const all = [...dirs].sort();
  const unknownExclusions = excluded.filter((name) => !dirs.has(name));
  if (unknownExclusions.length) {
    fail(
      `the exclusion list names ${unknownExclusions.join(', ')}, which is not a ` +
        `directory under internal/adapter/ at ${sha}. Known: ${all.join(', ')}`
    );
  }
  const vendors = all.filter((name) => !excluded.includes(name));
  return { vendors, all, excluded };
}

// --- citations --------------------------------------------------------------

/*
 * A cited figure is verified, not trusted. The document must still exist at the
 * recorded commit, the section heading must still be in it, and the value must
 * still appear inside that section. Any of the three failing means the record
 * moved, and the page must drop the figure or be rewritten — it must not carry
 * a citation that no longer resolves.
 */
function sectionBody(text, heading) {
  const at = text.indexOf(heading);
  if (at === -1) return null;
  // A section ends at the next heading of the SAME or a HIGHER level. Ending it
  // at any heading would cut a `###` section at its first `####` subsection,
  // and most of the measurements below live in those subsections.
  const level = heading.match(/^#+/)[0].length;
  const rest = text.slice(at + heading.length);
  const next = rest.search(new RegExp(`\\n#{1,${level}} `));
  return next === -1 ? rest : rest.slice(0, next);
}

function verifyCitation(repo, sha, cite) {
  const text = showFile(repo, sha, cite.doc);
  const body = sectionBody(text, cite.section);
  if (body === null) {
    fail(
      `the citation for "${cite.key}" names a section in ${cite.doc} that is not ` +
        `present at ${sha}:\n    ${cite.section}\n` +
        '  Re-read the document. Correct the heading, or drop the figure.'
    );
  }
  for (const [label, needle] of [['anchor', cite.anchor], ['value', cite.value]]) {
    if (needle && !body.includes(needle)) {
      fail(
        `the citation for "${cite.key}" expects the ${label} "${needle}" inside ` +
          `"${cite.section.replace(/^#+\s*/, '')}" in ${cite.doc}, and it is not ` +
          `there at ${sha}.\n` +
          '  Re-read the document, then either correct the figure or drop it. A ' +
          'citation nobody can resolve is worse than no figure.'
      );
    }
  }
  return `${cite.doc}, "${cite.section.replace(/^#+\s*/, '')}"`;
}

// --- main -------------------------------------------------------------------

function main() {
  const repoArg = process.argv.slice(2).find((a) => a.startsWith('--repo='));
  if (!repoArg) {
    fail('pass --repo=<path to the telltale clone>.');
  }
  const repo = path.resolve(repoArg.slice('--repo='.length));
  if (!fs.existsSync(path.join(repo, '.git'))) {
    fail(`${repo} is not a git working tree.`);
  }

  /*
   * Tracked modifications mean work in progress that the operator probably
   * meant to commit, so refuse. Untracked files are ignored on purpose: every
   * byte below is read with `git show <sha>:<path>` and every enumeration with
   * `git ls-tree <sha>`, so an untracked file cannot reach this record. A check
   * that fails on a state it is immune to only teaches people to skip it.
   */
  const dirty = git(repo, ['status', '--porcelain', '--untracked-files=no']).trim();
  if (dirty) {
    fail(`${repo} has uncommitted changes to tracked files. Commit or stash them first.`);
  }

  /*
   * The commit is PINNED, and the pin is an argument rather than whatever HEAD
   * happens to be. Every `counted` figure below is recomputed from the tree at
   * this commit, so a newer commit silently re-baselines `goldens.total`,
   * `tests.total`, and `adapters.vendor`. Those are published figures. Moving
   * one is a decision about what the page claims, not a side effect of running
   * a script on a day when the sibling repository had moved on.
   *
   *     node scripts/pull-telltale-evidence.cjs --repo=<path> --sha=38f262a
   *
   * With no `--sha` it reads HEAD, which is the original behaviour. Diff the
   * output before committing it either way: if a counted figure moved, stop.
   */
  const shaArg = process.argv.slice(2).find((a) => a.startsWith('--sha='));
  const requested = shaArg ? shaArg.slice('--sha='.length) : 'HEAD';
  const sha = (git(repo, ['rev-parse', '--verify', `${requested}^{commit}`], { allowFail: true }) || '').trim();
  if (!sha) fail(`${requested} does not resolve to a commit in ${repo}.`);
  const shortSha = git(repo, ['rev-parse', '--short', sha]).trim();

  // The page links readers to a public commit. An unpushed HEAD would name one
  // that nobody else can resolve.
  const pushedMain =
    git(repo, ['rev-parse', '--verify', 'origin/main'], { allowFail: true }) === null
      ? 'main'
      : 'origin/main';
  const ancestor = spawnSync('git', ['-C', repo, 'merge-base', '--is-ancestor', sha, pushedMain]);
  if (ancestor.status !== 0) {
    fail(`HEAD (${shortSha}) is not an ancestor of ${pushedMain}. Push it first.`);
  }

  // --- counted figures ------------------------------------------------------

  const paths = treePaths(repo, sha);

  /*
   * Golden TEXT renders only. The repository also tracks four `.json` snapshot
   * goldens, and the page says "text renders" for that reason — the command is
   * stored beside the number, so a reader can see exactly what was counted
   * rather than take a total on trust.
   */
  const goldenRe = /^internal\/[^/]+\/testdata\/golden\/[^/]+\.txt$/;
  const goldens = paths.filter((p) => goldenRe.test(p));
  if (goldens.length === 0) fail(`no golden text renders matched at ${sha}.`);

  const zeroVsAbsent = paths.filter((p) => p.includes('zero-vs-absent'));
  if (zeroVsAbsent.length === 0) fail('no zero-vs-absent golden files found.');

  const tests = countTestFunctions(repo, sha);
  const adapters = countVendorAdapters(paths, sha, ADAPTER_EXCLUSIONS);

  const figures = {
    'goldens.total': {
      value: String(goldens.length),
      kind: 'counted',
      command:
        'git ls-tree -r --name-only <sha>, matching internal/<pkg>/testdata/golden/*.txt',
    },
    'goldens.zeroVsAbsent': {
      value: String(zeroVsAbsent.length),
      kind: 'counted',
      command: 'git ls-tree -r --name-only <sha>, matching paths containing zero-vs-absent',
      files: zeroVsAbsent,
    },
    'tests.total': {
      value: String(tests.total),
      kind: 'counted',
      command:
        "git grep -c -E '^func Test' <sha> -- '*_test.go', summed over paths under internal/ and cmd/",
      files: tests.files,
    },
    'adapters.vendor': {
      value: String(adapters.vendors.length),
      kind: 'counted',
      command:
        'distinct directories under internal/adapter/ in git ls-tree at <sha>, minus the exclusions below',
      included: adapters.vendors,
      excluded: adapters.excluded,
    },
  };

  // --- cited figures --------------------------------------------------------

  for (const cite of CITATIONS) {
    figures[cite.key] = {
      value: cite.value,
      kind: 'cited',
      cite: verifyCitation(repo, sha, cite),
    };
  }

  // --- frames ---------------------------------------------------------------

  const fontRanges = loadFontRanges();
  const frames = {};
  for (const [key, spec] of Object.entries(FRAMES)) {
    const text = showFile(repo, sha, spec.path);
    const all = text.split('\n');
    // A trailing newline yields a final empty element. Drop it so line numbers
    // in the caption match the file a reader opens.
    if (all.length && all[all.length - 1] === '') all.pop();
    if (spec.lineEnd > all.length) {
      fail(`${spec.path} has ${all.length} lines, and the frame wants ${spec.lineEnd}.`);
    }
    if (spec.lineStart < 1 || spec.lineStart > spec.lineEnd) {
      fail(`frame "${key}" declares the line range ${spec.lineStart}-${spec.lineEnd}.`);
    }
    const lines = all.slice(spec.lineStart - 1, spec.lineEnd).map((l) => l.replace(/\r$/, ''));

    // The three admission tests, in order. Each one fails the run rather than
    // write a frame the site cannot render or must not publish.
    assertGlyphCoverage(key, spec, lines, fontRanges);
    assertAdvanceWidth(key, spec, lines, fontRanges);
    assertBoundary(key, spec, lines);

    frames[key] = {
      path: spec.path,
      lineStart: spec.lineStart,
      lineEnd: spec.lineEnd,
      columns: spec.columns,
      lines,
    };
  }

  const record = {
    source: {
      repo: SOURCE_REPO,
      sha: shortSha,
      pulledAt: new Date().toISOString().slice(0, 10),
    },
    figures,
    frames,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  console.log(`OK - wrote ${path.relative(REPO_ROOT, OUT_PATH)} from ${SOURCE_REPO} at ${shortSha}.`);
  for (const [key, fig] of Object.entries(figures)) {
    console.log(`  ${key.padEnd(24)} ${fig.kind.padEnd(8)} ${fig.value}`);
  }
  for (const [key, frame] of Object.entries(frames)) {
    console.log(
      `  frame ${key.padEnd(18)} lines ${frame.lineStart}-${frame.lineEnd}, ` +
        `${frame.columns} cols, from ${frame.path}`
    );
  }
  console.log('\nNow update the rendered values in src/pages/projects/telltale.astro and');
  console.log('src/pages/index.astro, then run: npm run qa');
}

main();
