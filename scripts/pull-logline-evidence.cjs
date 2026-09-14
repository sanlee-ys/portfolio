#!/usr/bin/env node
/*
 * Run logline against its own first ledger, at a pinned commit, and write
 * `src/data/logline-evidence.json`.
 *
 * WHY THIS EXISTS. `projects/logline.html` argues that a program's status is
 * a list of measured claims and never a percent. A page that argues that and
 * then carries a hand-typed count of met claims refutes itself. So no count on
 * that page is typed from memory. This script builds logline from a clean
 * checkout, runs it on `examples/public-system.json`, which lists claims this
 * site makes about the owner's public repositories, and stores the counts and
 * the rendered report. `scripts/check-logline-evidence.cjs` fails the site
 * build when a rendered figure or frame disagrees with the record.
 *
 * RUN IT BY HAND, and keep it out of `npm run qa`:
 *     node scripts/pull-logline-evidence.cjs --repo=<logline clone> --siblings=<dir>
 * `--siblings` is the directory that holds the sibling clones the ledger
 * names (kb-agent, notes-api, architecture, defense-news-classifier,
 * telltale, portfolio), one directory per repository name. It writes a source
 * asset and it reads other repositories, exactly like `og-cover.cjs` and
 * `pull-telltale-evidence.cjs`. A gate that reaches outside this repo reddens
 * for reasons that have nothing to do with the site.
 *
 * TWO RUNS, TWO FRAMES. The first run measures the ledger against the
 * sibling clones, and its render is the `measure` frame. The second run points
 * the same ledger at an empty directory, so every repository is missing and
 * every claim is UNMEASURED; logline exits 3 on that run, because a report
 * that measured nothing is a failed measurement, and its render is the
 * `nothing` frame. The page shows both, because the second is the state a
 * status report never admits to.
 *
 * THE PIN. The record names the logline commit the binary was built from, and
 * the ref every sibling was measured at (`main`). Each sibling's resolved sha
 * is in the frame's own `repos` line, so a reader can reproduce the run.
 *
 * THE BOUNDARY. Every frame line is tested here and again at build time by the
 * check gate, which imports `assertBoundaryLines` from this file. A line that
 * carries a percent, a verdict word, a non-ASCII character, or a path outside
 * the repositories fails the run rather than writing a frame the page would
 * then argue against. The rules live here and only here; two copies of a
 * denylist drift.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(REPO_ROOT, 'src', 'data', 'logline-evidence.json');
const SOURCE_REPO = 'sanlee-ys/logline';
const LEDGER = 'examples/public-system.json';
const REF = 'main';
const MAX_COLS = 80;

// The words a status report reaches for when it has not measured anything.
// logline's own TestRenderNoVerdictWords pins the same list upstream; this
// copy binds the RECORD on this side, where a hand edit could reintroduce one.
const VERDICT_RE = /\b(on track|at risk|off track|green|amber|red|healthy|behind|ahead)\b/i;

const BOUNDARY_RULES = [
  {
    // A percent is the one figure the instrument refuses. A frame carrying
    // one is either not logline's output or a later hand edit.
    name: 'a percent',
    test: (line) => /%/.test(line),
  },
  {
    name: 'a verdict word',
    test: (line) => VERDICT_RE.test(line),
  },
  {
    // Same rule as pull-telltale-evidence.cjs: a path into somebody's home
    // directory is a machine identity. `../../kb-agent` is not.
    name: 'a path outside the repositories, or a machine identity',
    test: (line) =>
      /(^|[\s"'([=])[A-Za-z]:[\\/]/.test(line) ||
      /\/(?:home|users|root)\//i.test(line) ||
      /(^|\s)~[\\/]/.test(line) ||
      /%USERPROFILE%|\$HOME\b/i.test(line),
  },
  {
    name: `more than ${MAX_COLS} columns`,
    test: (line) => line.length > MAX_COLS,
  },
];

function assertBoundaryLines(lines) {
  const findings = [];
  lines.forEach((text, i) => {
    for (const rule of BOUNDARY_RULES) {
      if (rule.test(text)) findings.push({ line: i + 1, rule: rule.name, text });
    }
  });
  return findings;
}

function fail(msg) {
  console.error(`✗ pull-logline-evidence: ${msg}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const proc = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (proc.error) fail(`could not run ${cmd}: ${proc.error.message}`);
  return proc;
}

function git(repo, args, { allowFail = false } = {}) {
  const proc = run('git', ['-C', repo, ...args]);
  if (proc.status !== 0) {
    if (allowFail) return null;
    fail(`git ${args.join(' ')} exited ${proc.status}\n${proc.stderr || ''}`);
  }
  return proc.stdout;
}

function arg(name) {
  const found = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

function main() {
  const repoArg = arg('repo');
  const siblingsArg = arg('siblings');
  if (!repoArg || !siblingsArg) fail('pass --repo=<logline clone> and --siblings=<dir of sibling clones>.');
  const repo = path.resolve(repoArg);
  const siblings = path.resolve(siblingsArg);
  if (!fs.existsSync(path.join(repo, '.git'))) fail(`${repo} is not a git working tree.`);
  if (!fs.existsSync(siblings)) fail(`${siblings} does not exist.`);

  // Tracked modifications mean the binary would not match the commit the
  // record names. Untracked files cannot reach the build of a Go module that
  // is committed, so they are ignored on purpose.
  const dirty = git(repo, ['status', '--porcelain', '--untracked-files=no']).trim();
  if (dirty) fail(`${repo} has uncommitted changes to tracked files. Commit or stash them first.`);

  const sha = git(repo, ['rev-parse', 'HEAD']).trim();
  const shortSha = git(repo, ['rev-parse', '--short', 'HEAD']).trim();

  // The page links readers to a public commit. An unpushed HEAD names one
  // nobody else can resolve. `--allow-unpushed` exists for the first run,
  // before the repository has a remote; the record it writes is re-pulled
  // after the push, and the check gate does not know the difference.
  const pushedMain = git(repo, ['rev-parse', '--verify', 'origin/main'], { allowFail: true });
  if (pushedMain === null) {
    if (!process.argv.includes('--allow-unpushed')) {
      fail(`${repo} has no origin/main. Push first, or pass --allow-unpushed for a draft pull.`);
    }
    console.warn('WARNING: no origin/main; the record names a commit that may not be public yet.');
  } else {
    const anc = spawnSync('git', ['-C', repo, 'merge-base', '--is-ancestor', sha, 'origin/main']);
    if (anc.status !== 0) fail(`HEAD (${shortSha}) is not an ancestor of origin/main. Push it first.`);
  }

  const ledgerPath = path.join(repo, LEDGER);
  if (!fs.existsSync(ledgerPath)) fail(`${LEDGER} is missing from ${repo}.`);
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'logline-pull-'));
  const bin = path.join(tmp, process.platform === 'win32' ? 'logline.exe' : 'logline');
  const build = run('go', ['build', '-o', bin, './cmd/logline'], { cwd: repo });
  if (build.status !== 0) fail(`go build exited ${build.status}\n${build.stderr || ''}`);

  /*
   * The ledger's paths are relative to the ledger file and assume the owner's
   * sibling layout. This machine's layout may differ, so each run gets a copy
   * of the ledger in a scratch directory with every path rewritten RELATIVE
   * to that directory. Relative, not absolute, so an UNMEASURED reason names
   * `../x/kb-agent` and never a home directory; the boundary rule below would
   * reject the absolute form, and correctly.
   */
  function ledgerAt(dir, root) {
    const copy = JSON.parse(JSON.stringify(ledger));
    for (const [name, entry] of Object.entries(copy.repos)) {
      entry.path = path.relative(dir, path.join(root, name)).split(path.sep).join('/');
    }
    const p = path.join(dir, 'public-system.json');
    fs.writeFileSync(p, JSON.stringify(copy, null, 2));
    return p;
  }

  const today = new Date().toISOString().slice(0, 10);
  const at = `${today}T00:00:00Z`;

  const measureDir = path.join(tmp, 'measure');
  fs.mkdirSync(measureDir);
  const recordPath = path.join(measureDir, 'record.json');
  const measured = run(bin, [
    'measure', '--ledger', ledgerAt(measureDir, siblings), '--ref', REF, '--json', recordPath, '--at', at, '--ascii',
  ]);
  if (measured.status !== 0) {
    fail(`logline measure exited ${measured.status}. Every sibling the ledger names must be cloned under --siblings.\n${measured.stdout}${measured.stderr}`);
  }
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));

  const nothingDir = path.join(tmp, 'nothing');
  const emptyRoot = path.join(tmp, 'empty');
  fs.mkdirSync(nothingDir);
  fs.mkdirSync(emptyRoot);
  const nothing = run(bin, ['measure', '--ledger', ledgerAt(nothingDir, emptyRoot), '--ref', REF, '--at', at, '--ascii']);
  if (nothing.status !== 3) {
    fail(`logline measure against an empty directory exited ${nothing.status}, not 3. The exit-three rule is part of the record.\n${nothing.stdout}${nothing.stderr}`);
  }

  const counts = record.counts || {};
  for (const k of ['met', 'unmet', 'unmeasured', 'total']) {
    if (!Number.isInteger(counts[k])) fail(`record.counts.${k} is not an integer.`);
  }
  if (counts.met + counts.unmet + counts.unmeasured !== counts.total) fail('record counts do not sum.');
  if (counts.unmeasured === counts.total) fail('every claim is UNMEASURED; nothing was measured, so nothing is recorded.');
  if (counts.total !== ledger.claims.length) fail('record.counts.total differs from the ledger claim count.');
  const repoCount = Object.keys(ledger.repos).length;

  const lines = (text) => text.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const frames = {
    measure: { path: LEDGER, lines: lines(measured.stdout) },
    nothing: { path: LEDGER, lines: lines(nothing.stdout) },
  };
  for (const [key, frame] of Object.entries(frames)) {
    if (frame.lines.length === 0 || frame.lines.every((l) => l.trim() === '')) fail(`the ${key} frame is empty.`);
    frame.lines.forEach((line, i) => {
      for (const ch of line) {
        if (ch.codePointAt(0) > 0x7f) fail(`${key} frame line ${i + 1} is not ASCII: ${JSON.stringify(line)}`);
      }
    });
    const findings = assertBoundaryLines(frame.lines);
    if (findings.length) {
      for (const f of findings) console.error(`  ${key} frame line ${f.line} carries ${f.rule}: ${JSON.stringify(f.text)}`);
      fail('the publication boundary rejected a frame. Fix the ledger or the renderer; never hand-edit the record.');
    }
  }

  const cmd = `logline measure --ledger ${LEDGER} --ref ${REF} --json record.json; record.counts`;
  const evidence = {
    source: { repo: SOURCE_REPO, sha: shortSha, pulledAt: today },
    ledger: { path: LEDGER, ref: REF, program: ledger.program },
    figures: {
      'claims.total': { value: String(counts.total), kind: 'counted', command: `${cmd}.total` },
      'claims.met': { value: String(counts.met), kind: 'counted', command: `${cmd}.met` },
      'claims.unmet': { value: String(counts.unmet), kind: 'counted', command: `${cmd}.unmet` },
      'claims.unmeasured': { value: String(counts.unmeasured), kind: 'counted', command: `${cmd}.unmeasured` },
      'repos.count': { value: String(repoCount), kind: 'counted', command: `Object.keys(ledger.repos).length over ${LEDGER}` },
    },
    frames,
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`OK - wrote ${path.relative(REPO_ROOT, OUT_PATH)} from ${SOURCE_REPO} at ${shortSha}.`);
  for (const [k, f] of Object.entries(evidence.figures)) console.log(`  ${k.padEnd(20)} counted  ${f.value}`);
  for (const [k, f] of Object.entries(frames)) console.log(`  frame ${k.padEnd(14)} ${f.lines.length} lines`);
  console.log('\nNow update the rendered values in src/pages/projects/logline.astro, then run: npm run qa');
}

if (require.main === module) main();

module.exports = { BOUNDARY_RULES, assertBoundaryLines, MAX_COLS, LEDGER, SOURCE_REPO };
