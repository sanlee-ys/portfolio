#!/usr/bin/env node
/*
 * private-name-precommit — Layer C of the private-repo guard, run LOCALLY as a
 * pre-commit hook (never in public CI). Catches a private repo NAMED in prose
 * without a slug — the one shape Layers A (slug allowlist) and B (disclosure
 * phrases) in private-repo-check.cjs can't see.
 *
 * Why local, not CI: catching a bare private name means KNOWING the private
 * names, and putting those in this public repo — even hashed — is itself a
 * disclosure (a low-entropy name is brute-force-confirmable). So the name list
 * lives machine-local and gitignored, and the check runs at commit time on your
 * machine. This is the claude-ops redline-guard pattern.
 *
 * Setup (per clone), both one-liners:
 *   1. Generate the gitignored name list from your own gh auth (never commit it):
 *        gh repo list <owner> --visibility private --json name -q '.[].name' \
 *          > scripts/.private-repos.local
 *   2. Install the hook:
 *        git config core.hooksPath scripts/githooks
 *
 * Escape hatch (conscious, one commit):  PRIVATE_OK=1 git commit ...
 *
 * It also runs Layer B (disclosure phrases) offline, so those get caught at
 * commit too. Layer A (slug allowlist) stays in CI — it needs the network.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { findDisclosurePhrases } = require('./private-repo-check.cjs');

const TERMS_FILE = path.join(__dirname, '.private-repos.local');
const CONTEXT_WORDS = new Set([
  'repo', 'repos', 'repository', 'repositories', 'github', 'git', 'project', 'projects',
]);
const CONTEXT_WINDOW = 3;
const OWNER_SLUG = /sanlee-ys\/([A-Za-z0-9._-]+)/g;
const WORD = /[A-Za-z0-9._-]+/g;

function loadTerms() {
  try {
    return fs
      .readFileSync(TERMS_FILE, 'utf8')
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t && !t.startsWith('#'));
  } catch {
    return null; // null = list absent (Layer C inactive)
  }
}

// Flag a private name only in a repo-shaped context (an owner slug, or within a
// few tokens of a context word). A guard that fires on ordinary prose — the
// word "finance" in "a finance background" — gets routed around; this is the
// false-positive lesson from the credential-guard history, via redline-guard.
function findPrivateNames(text, terms) {
  const wanted = new Set(terms.map((t) => t.toLowerCase()));
  const hits = new Set();

  for (const m of text.matchAll(OWNER_SLUG)) {
    const repo = m[1].replace(/\.git$/, '').replace(/\.+$/, '').toLowerCase();
    if (wanted.has(repo)) hits.add(repo);
  }

  const tokens = [...text.matchAll(WORD)].map((m) => m[0].toLowerCase());
  for (let i = 0; i < tokens.length; i++) {
    if (!wanted.has(tokens[i])) continue;
    const lo = Math.max(0, i - CONTEXT_WINDOW);
    const hi = i + CONTEXT_WINDOW + 1;
    if (tokens.slice(lo, hi).some((w) => CONTEXT_WORDS.has(w))) hits.add(tokens[i]);
  }
  return [...hits];
}

// Never echo a private name back in full — that would be its own small leak.
function mask(name) {
  return `${name.slice(0, 1)}…(${name.length} chars)`;
}

function stagedHtml() {
  const out = execFileSync('git', [
    'diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z',
  ]).toString('utf8');
  return out.split('\0').filter((f) => f && f.endsWith('.html'));
}

function stagedContent(file) {
  try {
    return execFileSync('git', ['show', `:${file}`]).toString('utf8');
  } catch {
    return null;
  }
}

function main() {
  if (process.env.PRIVATE_OK === '1') {
    process.stderr.write('private-name-precommit: skipped via PRIVATE_OK=1 (conscious override)\n');
    return 0;
  }
  const terms = loadTerms();
  const violations = [];
  for (const file of stagedHtml()) {
    const text = stagedContent(file);
    if (text == null) continue;
    for (const phrase of findDisclosurePhrases(text)) {
      violations.push(`${file}: disclosure phrase "${phrase}"`);
    }
    if (terms) {
      for (const name of findPrivateNames(text, terms)) {
        violations.push(`${file}: names a private repo (${mask(name)}) in a repo context`);
      }
    }
  }
  if (terms === null) {
    process.stderr.write(
      'private-name-precommit: scripts/.private-repos.local not found — Layer C inactive '
      + '(see this script\'s header to enable). Layer B (phrases) still ran.\n'
    );
  }
  if (violations.length) {
    process.stderr.write('✗ private-repo guard (pre-commit): this commit would name/describe a private repo:\n');
    for (const v of violations) process.stderr.write(`  ${v}\n`);
    process.stderr.write('\nGenericize it; or if it is a false positive, re-run with PRIVATE_OK=1 and say why.\n');
    return 2;
  }
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { findPrivateNames };
