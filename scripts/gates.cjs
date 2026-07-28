#!/usr/bin/env node
/*
 * QA gate runner — the local equivalent of `.github/workflows/qa.yml`.
 *
 * Two bugs live in this file's history, and they are the same bug at different
 * scopes: a local QA command that reports success without having checked what
 * CI checks.
 *
 * The first was aim. The `gates` npm script chained four gates with no
 * SITE_ROOT, so they walked the repo root, found `dist/` and `public/` sitting
 * side by side, and resolved every root-absolute href against a directory where
 * `/assets/…` does not exist — 180 phantom broken links.
 *
 * The second was coverage. `qa.yml` runs seven checks; this runner ran four.
 * The missing three were the cheap ones — two `node --test` suites and a
 * stdlib-Python linter, no browser and no network — so an ADR could ship
 * without its `## Downstream surfaces` section, or the private-repo guard's own
 * test suite could break, and `npm run qa` would go green anyway. You found out
 * from CI, after pushing.
 *
 * Hence the rule this file exists to keep: **every check in `qa.yml` runs here
 * too.** Add a step there, add it here. A local gate that is a subset of CI is
 * a gate that lies.
 *
 * Portability, since it constrains the shape: a bare `SITE_ROOT=dist node …`
 * prefix inside an npm script is POSIX shell syntax, and npm runs scripts
 * through cmd on Windows, which parses it as a command name and fails. The two
 * ways out are a `cross-env` dev dependency or this file; this file is stdlib,
 * so a QA gate that must be runnable on a fresh clone does not gain a
 * supply-chain edge for one line of env-setting.
 *
 * The gates themselves are untouched. Each still defaults to cwd when SITE_ROOT
 * is unset, and each still fails when it walks zero pages. The default lives
 * here, at the call site — not inside a gate, where it would quietly make a
 * stale `dist/` look like a fresh one.
 *
 * Run from the repo root:   node scripts/gates.cjs      (or `npm run gates`)
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

// Note the asymmetry: an explicit SITE_ROOT is resolved against the caller's
// cwd, because that is what they meant; the `dist` default is anchored to the
// repo so `node scripts/gates.cjs` behaves the same from any directory.
const SITE_ROOT = process.env.SITE_ROOT
  ? path.resolve(process.env.SITE_ROOT)
  : path.join(REPO_ROOT, 'dist');

/*
 * Finding a Python 3 is the one genuinely awkward part of mirroring CI.
 *
 * `qa.yml` can say `python3` because the ubuntu runner guarantees it. A Windows
 * box usually spells it `python` or reaches it through the `py` launcher, and
 * Windows also ships an App Execution Alias named `python3.exe` that is not
 * Python at all — it opens the Microsoft Store. So candidates are *probed*, not
 * assumed to exist: each has to actually run and report major version 3, which
 * is what rejects the Store stub.
 *
 * PYTHON=/path/to/python overrides the search for a machine that spells it
 * something else. There is deliberately no flag to skip this check — see
 * runAdrLint.
 */
const PYTHON_PROBE = 'import sys; print(sys.version_info[0])';
const PYTHON_CANDIDATES = process.env.PYTHON
  ? [[process.env.PYTHON, []]]
  : [['python3', []], ['python', []], ['py', ['-3']]];

function findPython() {
  for (const [cmd, prefix] of PYTHON_CANDIDATES) {
    let probe;
    try {
      probe = spawnSync(cmd, [...prefix, '-c', PYTHON_PROBE], { encoding: 'utf8' });
    } catch {
      continue; // not on PATH, or not executable — try the next spelling
    }
    if (probe.status === 0 && probe.stdout.trim() === '3') return [cmd, prefix];
  }
  return null;
}

// spawnSync on a command directly, not through a shell: no quoting rules to get
// wrong on a path like C:\Users\… and no shell to be missing.
function run(label, cmd, args, env) {
  const proc = spawnSync(cmd, args, { cwd: REPO_ROOT, stdio: 'inherit', env });
  if (proc.error) {
    console.error(`✗ gates: could not run ${label} — ${proc.error.message}`);
    return 1;
  }
  // A check killed by a signal reports status null. That is a failure, and
  // `exit null` would be read as exit 0 — the one way this runner could fake a
  // pass.
  if (proc.status === null) {
    console.error(`✗ gates: ${label} was killed by ${proc.signal}.`);
    return 1;
  }
  return proc.status;
}

function runNodeTest(label, files) {
  // No SITE_ROOT here on purpose. These suites exercise the gates' own logic
  // against fixtures they build themselves; they never walk the site, so
  // handing them a site root would imply a contract they do not have.
  return run(label, process.execPath, ['--test', ...files], process.env);
}

function runAdrLint() {
  const python = findPython();
  /*
   * A missing interpreter is a hard failure, not a warning-and-skip.
   *
   * Skipping is the more comfortable choice and it is the wrong one: it rebuilds
   * the exact defect this runner was extended to remove — a green `npm run qa`
   * that does not predict a green CI run. The warning scrolls off the screen;
   * the exit code is what a human, a pre-push hook, and a `&&` chain actually
   * read. And CI is not lenient about it either, so a skip only moves the
   * failure to after the push, which is the whole complaint.
   *
   * The remediation is small enough to justify the strictness: the linter is
   * stdlib-only by design (no venv, no requirements), so "install Python 3" is
   * the entire fix.
   */
  if (!python) {
    console.error('✗ gates: no working Python 3 found, so the ADR linter cannot run.');
    console.error(`  Tried: ${PYTHON_CANDIDATES.map(([c, p]) => [c, ...p].join(' ')).join(', ')}`);
    console.error('  Install Python 3 (stdlib only — the linter needs no venv and no packages),');
    console.error('  or set PYTHON to the interpreter, e.g. PYTHON=C:\\Python314\\python.exe.');
    console.error('  This is a failure rather than a skip on purpose: CI runs this check, so');
    console.error('  skipping it here would make a green local run stop predicting a green CI run.');
    return 1;
  }
  const [cmd, prefix] = python;
  return run('ADR downstream-surfaces linter', cmd, [...prefix, 'scripts/lint_decisions.py'], process.env);
}

function runSiteGate(label, script) {
  return run(label, process.execPath, [script], { ...process.env, SITE_ROOT });
}

/*
 * Ordered cheapest-first, which is also build-independent-first. The five
 * checks above the line need no `dist/`, no browser and no network, and finish
 * in seconds; the six below walk the built site, and the last two launch a
 * browser — contrast-check renders every page in both themes, mobile-qa renders
 * 64 page-widths. A missing ADR section should redden in two seconds, not after
 * a full render pass.
 */
const CHECKS = [
  {
    label: 'private-repo guard (adversarial suites, A+B and C)',
    needsSite: false,
    run: () => runNodeTest('private-repo guard suites', [
      'scripts/private-repo-check.test.cjs',
      'scripts/private-name-precommit.test.cjs',
    ]),
  },
  {
    label: 'review classify step (synthetic execution logs)',
    needsSite: false,
    run: () => runNodeTest('review classify suite', ['scripts/classify-review-outcome.test.cjs']),
  },
  {
    label: 'font-coverage gate (adversarial suite)',
    needsSite: false,
    run: () => runNodeTest('font-coverage suite', ['scripts/font-coverage.test.cjs']),
  },
  {
    label: 'resume.pdf embeds its glyphs (adversarial suite)',
    needsSite: false,
    run: () => runNodeTest('resume-pdf suite', ['scripts/resume-pdf.test.cjs']),
  },
  {
    label: 'ADRs list their downstream surfaces',
    needsSite: false,
    run: runAdrLint,
  },
  { label: 'internal links', needsSite: true, run: () => runSiteGate('link-check', 'scripts/link-check.cjs') },
  {
    label: 'every character in the copy has a self-hosted glyph',
    needsSite: true,
    run: () => runSiteGate('font-coverage', 'scripts/font-coverage.cjs'),
  },
  {
    label: 'published metrics match the classifier artifact',
    needsSite: true,
    run: () => runSiteGate('check-published-metrics', 'scripts/check-published-metrics.cjs'),
  },
  {
    label: 'private-repo guard (never name/link/describe a private repo)',
    needsSite: true,
    run: () => runSiteGate('private-repo-check', 'scripts/private-repo-check.cjs'),
  },
  {
    label: 'text contrast AA (rendered, both themes)',
    needsSite: true,
    run: () => runSiteGate('contrast-check', 'scripts/contrast-check.cjs'),
  },
  {
    label: 'mobile QA (no horizontal overflow at 320/360/390/430)',
    needsSite: true,
    run: () => runSiteGate('mobile-qa', 'scripts/mobile-qa.cjs'),
  },
];

// Checked lazily, immediately before the first check that needs the build, so
// that editing an ADR and running `npm run gates` still lints it on a clone with
// no `dist/`. A gate aimed at a directory that isn't there dies on an uncaught
// ENOENT from readdirSync — non-zero either way, so nothing passes silently, but
// the message names a stack frame instead of the missing build.
let siteRootChecked = false;
function siteRootMissing() {
  if (siteRootChecked || fs.existsSync(SITE_ROOT)) {
    siteRootChecked = true;
    return false;
  }
  console.error(`✗ gates: "${SITE_ROOT}" does not exist. The site checks would check nothing.`);
  console.error('  Run `npm run build` first, or `npm run qa`, which does both.');
  return true;
}

for (const check of CHECKS) {
  if (check.needsSite && siteRootMissing()) process.exit(1);
  const status = check.run();
  if (status !== 0) {
    console.error(`✗ gates: failed at "${check.label}".`);
    process.exit(status);
  }
}
