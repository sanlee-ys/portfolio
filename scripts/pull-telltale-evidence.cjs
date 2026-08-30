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
 * Both files below are pure ASCII, both excerpts are free of dollar figures,
 * and neither names a vendor beside a verdict.
 */
const FRAMES = {
  usage: {
    path: 'internal/hud/testdata/golden/usage-ascii.txt',
    lineStart: 3,
    lineEnd: 14,
  },
  record: {
    path: 'internal/council/testdata/golden/arena-record-ascii.txt',
    lineStart: 8,
    lineEnd: 10,
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

function firstNonAscii(line) {
  for (const ch of line) {
    const cp = ch.codePointAt(0);
    if (cp > 0x7f) return cp;
  }
  return null;
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

  const sha = git(repo, ['rev-parse', 'HEAD']).trim();
  const shortSha = git(repo, ['rev-parse', '--short', 'HEAD']).trim();

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
    const lines = all.slice(spec.lineStart - 1, spec.lineEnd).map((l) => l.replace(/\r$/, ''));
    lines.forEach((line, i) => {
      const cp = firstNonAscii(line);
      if (cp !== null) {
        fail(
          `${spec.path} line ${spec.lineStart + i} contains U+${cp
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}. A pasted frame must be pure ASCII — an "-ascii" ` +
            'suffix is not proof, and this would fail the font-coverage gate later.'
        );
      }
    });
    frames[key] = { path: spec.path, lineStart: spec.lineStart, lineEnd: spec.lineEnd, lines };
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
    console.log(`  frame ${key.padEnd(18)} ${frame.lines.length} lines from ${frame.path}`);
  }
  console.log('\nNow update the rendered values in src/pages/projects/telltale.astro and');
  console.log('src/pages/index.astro, then run: npm run qa');
}

main();
