#!/usr/bin/env node
/*
 * QA gate runner — the local equivalent of `.github/workflows/qa.yml`.
 *
 * Since `ADR-006` the gates read the build, not the repo tree, and SITE_ROOT is
 * what points them there. The `gates` npm script used to chain the four gates
 * with no SITE_ROOT, so they walked the repo root, found `dist/` and `public/`
 * sitting side by side, and resolved every root-absolute href against a
 * directory where `/assets/…` does not exist — 180 phantom broken links. CI
 * never caught it: the workflow sets SITE_ROOT per step and never calls this
 * script, so the only broken path was the one CLAUDE.md tells a human to run.
 *
 * The fix has to be portable. A bare `SITE_ROOT=dist node …` prefix inside an
 * npm script is POSIX shell syntax, and npm runs scripts through cmd on
 * Windows, which parses it as a command name and fails. The two ways out are a
 * `cross-env` dev dependency or this file; this file is stdlib, so a QA gate
 * that must be runnable on a fresh clone does not gain a supply-chain edge for
 * one line of env-setting.
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

// Order matters only in that the slowest gate goes last: mobile-qa launches a
// browser and renders 60 page-widths, so a broken link should redden in a
// second rather than after it.
const GATES = [
  'scripts/link-check.cjs',
  'scripts/check-published-metrics.cjs',
  'scripts/private-repo-check.cjs',
  'scripts/mobile-qa.cjs',
];

// A gate aimed at a directory that isn't there dies on an uncaught ENOENT from
// readdirSync. That does exit non-zero, so nothing passes silently — but the
// message names a stack frame instead of the missing build, and the fix is one
// existsSync.
if (!fs.existsSync(SITE_ROOT)) {
  console.error(`✗ gates: "${SITE_ROOT}" does not exist. Nothing would be checked.`);
  console.error('  Run `npm run build` first, or `npm run qa`, which does both.');
  process.exit(1);
}

// spawnSync on the node binary directly, not through a shell: no quoting rules
// to get wrong on a path like C:\Users\… and no shell to be missing.
const env = { ...process.env, SITE_ROOT };
for (const gate of GATES) {
  const run = spawnSync(process.execPath, [gate], { cwd: REPO_ROOT, stdio: 'inherit', env });
  if (run.error) {
    console.error(`✗ gates: could not run ${gate} — ${run.error.message}`);
    process.exit(1);
  }
  // A gate killed by a signal reports status null. That is a failure, and `exit
  // null` would be read as exit 0 — the one way this runner could fake a pass.
  if (run.status !== 0) {
    if (run.status === null) console.error(`✗ gates: ${gate} was killed by ${run.signal}.`);
    process.exit(run.status === null ? 1 : run.status);
  }
}
