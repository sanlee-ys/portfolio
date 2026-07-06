#!/usr/bin/env node
/*
 * private-repo-check — mechanically enforce the "never name, link, or describe
 * a private repo on this public site" rule (see CLAUDE.md). It has leaked twice
 * on prose-and-hope; this is the guard.
 *
 * Built on a PUBLIC allowlist, never a private denylist: hardcoding private
 * repo names into this public repo's CI would BE the leak it prevents. So the
 * question is "is every repo this site references actually public?", not "does
 * the site mention one of these secret names?".
 *
 * Layers:
 *   A. Slug allowlist  — every `sanlee-ys/<repo>` reference in the site must
 *      resolve to a PUBLIC repo (fetched live from the GitHub API). A reference
 *      to a private or non-existent repo fails the build.
 *   B. Disclosure phrases — the site must not acknowledge private repos at all
 *      ("private repo", "all my repos", ...). Enforces the CLAUDE.md
 *      "omission, not genericization" bar. These phrases are not secret.
 *   C. Bare-name denylist — catches a private repo named in prose with no slug.
 *      Implemented OUT of CI, in the local pre-commit guard
 *      private-name-precommit.cjs (a machine-local, gitignored name list, never
 *      committed) — knowing the private names in this public repo's CI would
 *      itself disclose them.
 *
 * Fail-closed: if the public-repo list can't be fetched, the build fails rather
 * than passing blind — a gate that silently no-ops when its data source is down
 * isn't a gate.
 *
 * Run from the repo root:   node scripts/private-repo-check.cjs
 */
const fs = require('fs');
const path = require('path');

const OWNER = 'sanlee-ys'; // public owner name; not a secret
const ROOT = process.cwd();

// --- Layer A: every sanlee-ys/<repo> reference (URL or bare slug) ------------
const REPO_REF = /sanlee-ys\/([A-Za-z0-9._-]+)/g;

function extractRepoRefs(text) {
  const refs = new Set();
  for (const m of text.matchAll(REPO_REF)) {
    // Strip a `.git` clone suffix and any trailing dot(s) — sentence
    // punctuation like "…/notes-api." gets pulled into the char class, but a
    // GitHub repo name can't end in a dot, so this is safe.
    const repo = m[1].replace(/\.git$/, '').replace(/\.+$/, '');
    if (repo) refs.add(repo);
  }
  return refs;
}

// --- Layer B: phrases that must never appear on the public site -------------
// Repo-focused on purpose: "private repo(s)" is a disclosure, but "private
// project" is not (freelance work isn't a repo). Kept non-overlapping so one
// offending phrase is one violation.
const DISCLOSURE_PHRASES = [
  /\bprivate repos?\b/i,
  /\bprivate repositor(?:y|ies)\b/i,
  /\ball(?: of)? my repos\b/i,
];

function findDisclosurePhrases(text) {
  const hits = [];
  for (const re of DISCLOSURE_PHRASES) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

// --- Pure checker (no network; this is what the test suite drives) -----------
// pages: [{file, text}];  publicRepos: Set<string> of public repo names.
function checkContent(pages, publicRepos) {
  const violations = [];
  for (const { file, text } of pages) {
    for (const repo of extractRepoRefs(text)) {
      if (!publicRepos.has(repo)) {
        violations.push({
          file,
          kind: 'slug',
          detail: `references sanlee-ys/${repo}, which is not a public repo`,
        });
      }
    }
    for (const phrase of findDisclosurePhrases(text)) {
      violations.push({
        file,
        kind: 'phrase',
        detail: `contains a private-repo disclosure phrase: "${phrase}"`,
      });
    }
    // Layer C (bare private names) is handled OUT of CI, in the local
    // pre-commit guard scripts/private-name-precommit.cjs — knowing the private
    // names can't happen in this public repo's CI without disclosing them.
  }
  return violations;
}

// --- Network: the public allowlist (fail-closed) ----------------------------
async function fetchPublicRepos() {
  const repos = new Set();
  const headers = {
    'User-Agent': 'private-repo-check',
    Accept: 'application/vnd.github+json',
  };
  // Raises the rate limit only; the default CI token cannot see other repos'
  // private visibility, and we filter !private regardless.
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.github.com/users/${OWNER}/repos?per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status} fetching public repos (page ${page})`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const r of batch) if (!r.private) repos.add(r.name);
    if (batch.length < 100) break;
  }
  if (repos.size === 0) throw new Error('public-repo list came back empty; refusing to pass blind');
  return repos;
}

function findHtml(dir) {
  const out = [];
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'scripts') continue;
    const rel = dir === '.' ? name : `${dir}/${name}`;
    if (fs.statSync(path.join(ROOT, rel)).isDirectory()) out.push(...findHtml(rel));
    else if (name.endsWith('.html')) out.push(rel);
  }
  return out;
}

async function main() {
  const publicRepos = await fetchPublicRepos(); // throws -> fail-closed below
  const pages = findHtml('.')
    .sort()
    .map((file) => ({ file, text: fs.readFileSync(path.join(ROOT, file), 'utf8') }));
  const violations = checkContent(pages, publicRepos);
  if (violations.length) {
    console.error('✗ private-repo guard: violation(s) found\n');
    for (const v of violations) console.error(`  ${v.file}: ${v.detail}`);
    console.error(`\n${violations.length} violation(s). See the "Private repos" rule in CLAUDE.md.`);
    process.exit(1);
  }
  console.log(
    `✓ private-repo guard OK — ${pages.length} pages, ${publicRepos.size} public repos in the allowlist.`
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`✗ private-repo guard errored (fail-closed): ${err.message}`);
    process.exit(1);
  });
}

module.exports = { extractRepoRefs, findDisclosurePhrases, checkContent };
