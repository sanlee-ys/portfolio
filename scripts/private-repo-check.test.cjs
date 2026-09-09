/*
 * Adversarial suite for private-repo-check. Drives the pure checker with
 * synthetic fixtures — no network, and NEVER a real private repo name (private
 * names must not enter this public repo; that's the whole point). Run:
 *
 *     node --test scripts/private-repo-check.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { extractRepoRefs, findDisclosurePhrases, checkContent, checkSnapshotNames } = require('./private-repo-check.cjs');

// A stand-in public allowlist (real public repos; safe to name).
const PUBLIC = new Set([
  'portfolio', 'architecture', 'kb-agent', 'defense-news-classifier',
  'learning-notes', 'notes-api', 'sanlee-ys',
]);

// ---- Layer A: slug allowlist ----------------------------------------------

test('links to public repos pass', () => {
  const pages = [{
    file: 'index.html',
    text: '<a href="https://github.com/sanlee-ys/kb-agent">kb</a> and github.com/sanlee-ys/portfolio',
  }];
  assert.deepEqual(checkContent(pages, PUBLIC), []);
});

test('a link to a non-public (synthetic) repo fails', () => {
  const pages = [{ file: 'index.html', text: '<a href="https://github.com/sanlee-ys/secret-side-ledger">x</a>' }];
  const v = checkContent(pages, PUBLIC);
  assert.equal(v.length, 1);
  assert.equal(v[0].kind, 'slug');
  assert.match(v[0].detail, /secret-side-ledger/);
});

test('a bare slug to a non-public repo fails', () => {
  const pages = [{ file: 'resume.html', text: 'see sanlee-ys/hush-hush for details' }];
  assert.equal(checkContent(pages, PUBLIC).length, 1);
});

test('deep links and .git suffixes normalize to the repo name', () => {
  assert.deepEqual([...extractRepoRefs('github.com/sanlee-ys/kb-agent/blob/main/x.md')], ['kb-agent']);
  assert.deepEqual([...extractRepoRefs('git clone github.com/sanlee-ys/portfolio.git')], ['portfolio']);
});

test('other owners and the bare profile URL are not repo refs', () => {
  assert.deepEqual([...extractRepoRefs('github.com/someoneelse/their-private-thing')], []);
  assert.deepEqual([...extractRepoRefs('github.com/sanlee-ys?tab=repositories')], []);
});

test('a repo that drops out of the public set (goes private) starts failing', () => {
  const shrunk = new Set([...PUBLIC].filter((r) => r !== 'notes-api'));
  const pages = [{ file: 'index.html', text: 'github.com/sanlee-ys/notes-api' }];
  assert.equal(checkContent(pages, shrunk).length, 1);
});

// ---- Layer B: disclosure phrases ------------------------------------------

test('disclosure phrases are caught', () => {
  for (const bad of [
    'I also keep a private repo',
    'plus some private repos',
    'all my repos',
    'all of my repos',
    'a few private repositories',
  ]) {
    assert.ok(findDisclosurePhrases(bad).length > 0, `should flag: ${bad}`);
  }
});

test('benign uses of "private" do not false-positive', () => {
  for (const ok of ['a private method', 'privacy policy', 'private beta', 'keeps data private']) {
    assert.deepEqual(findDisclosurePhrases(ok), [], `should not flag: ${ok}`);
  }
});

// ---- Combined -------------------------------------------------------------

test('a clean page yields no violations', () => {
  const pages = [{
    file: 'index.html',
    text: 'Projects: github.com/sanlee-ys/architecture and github.com/sanlee-ys/notes-api. All public work.',
  }];
  assert.deepEqual(checkContent(pages, PUBLIC), []);
});

test('slug and phrase violations are reported together', () => {
  const pages = [{
    file: 'colophon.html',
    text: 'github.com/sanlee-ys/secret-thing — plus some private repos I keep.',
  }];
  const v = checkContent(pages, PUBLIC);
  assert.equal(v.length, 2);
  assert.deepEqual(new Set(v.map((x) => x.kind)), new Set(['slug', 'phrase']));
});

test('a public-repos snapshot of public names passes', () => {
  const pages = [{
    file: 'src/data/public-repos.json',
    text: JSON.stringify({
      repos: [{ name: 'portfolio', url: 'https://github.com/sanlee-ys/portfolio' }],
    }),
  }];
  assert.deepEqual(checkContent(pages, PUBLIC), []);
});

test('a public-repos snapshot that names a non-public repo fails even without a slug URL', () => {
  const pages = [{
    file: 'src/data/public-repos.json',
    text: JSON.stringify({
      repos: [{ name: 'secret-side-ledger', url: 'https://example.com/x' }],
    }),
  }];
  const v = checkContent(pages, PUBLIC);
  assert.ok(v.some((x) => x.kind === 'slug' && /secret-side-ledger/.test(x.detail)));
});

test('a malformed public-repos snapshot fails closed', () => {
  const v = checkSnapshotNames('src/data/public-repos.json', '{', PUBLIC);
  assert.equal(v.length, 1);
  assert.match(v[0].detail, /not valid JSON/);
});
