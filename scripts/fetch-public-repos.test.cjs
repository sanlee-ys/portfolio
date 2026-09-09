/*
 * Adversarial suite for fetch-public-repos. Drives the pure snapshot builder
 * with fixtures — no network. Run:
 *
 *     node --test scripts/fetch-public-repos.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert');
const {
  ALLOWLIST,
  ROW_KEYS,
  isoDate,
  selectFields,
  toSnapshot,
  resolveSnapshot,
} = require('./fetch-public-repos.cjs');

const LINKED = [
  'agent-ops',
  'architecture',
  'defense-news-classifier',
  'faithfulness-judge',
  'kb-agent',
  'learning-notes',
  'netops-lab',
  'notes-api',
  'portfolio',
  'telltale',
];

function apiRepo(overrides) {
  return {
    name: 'telltale',
    private: false,
    description: 'Dispatch room for five vendor CLIs.',
    language: 'Go',
    pushed_at: '2026-09-05T14:26:29Z',
    html_url: 'https://github.com/sanlee-ys/telltale',
    stargazers_count: 99,
    forks_count: 3,
    watchers_count: 99,
    ...overrides,
  };
}

test('the allowlist is the already-linked public set, not the full public list', () => {
  assert.equal(ALLOWLIST.size, LINKED.length);
  for (const name of LINKED) assert.ok(ALLOWLIST.has(name), name);
  assert.ok(!ALLOWLIST.has('winget-pkgs'));
  assert.ok(!ALLOWLIST.has('sanlee-ys'));
});

test('isoDate keeps the calendar day and drops the time', () => {
  assert.equal(isoDate('2026-09-05T14:26:29Z'), '2026-09-05');
  assert.equal(isoDate('not-a-date'), null);
  assert.equal(isoDate(null), null);
});

test('toSnapshot drops names outside the allowlist, including public noise', () => {
  const snapshot = toSnapshot(
    [
      apiRepo({ name: 'telltale' }),
      apiRepo({ name: 'winget-pkgs', description: 'Microsoft community manifests', language: null }),
      apiRepo({ name: 'sanlee-ys', description: 'profile', language: 'Python' }),
    ],
    { fetchedAt: '2026-09-09' }
  );
  assert.deepEqual(snapshot.repos.map((r) => r.name), ['telltale']);
});

test('toSnapshot drops a private repo even if the name is allowlisted', () => {
  const snapshot = toSnapshot(
    [apiRepo({ name: 'telltale', private: true })],
    { fetchedAt: '2026-09-09' }
  );
  assert.deepEqual(snapshot.repos, []);
});

test('toSnapshot writes only the live fields and never a star count', () => {
  const snapshot = toSnapshot([apiRepo()], { fetchedAt: '2026-09-09' });
  assert.equal(snapshot.repos.length, 1);
  assert.deepEqual(Object.keys(snapshot.repos[0]), ROW_KEYS);
  const json = JSON.stringify(snapshot);
  assert.equal(json.includes('stargazers'), false);
  assert.equal(json.includes('forks_count'), false);
  assert.equal(json.includes('watchers'), false);
  assert.equal(json.includes('"99"'), false);
});

test('selectFields constructs the repo URL and does not copy html_url', () => {
  const row = selectFields(
    apiRepo({ html_url: 'https://evil.example/telltale', name: 'telltale' })
  );
  assert.equal(row.url, 'https://github.com/sanlee-ys/telltale');
});

test('empty description and language become null, not a guessed string', () => {
  const row = selectFields(apiRepo({ description: '  ', language: null }));
  assert.equal(row.description, null);
  assert.equal(row.language, null);
});

test('rows sort by last push descending, then by name', () => {
  const snapshot = toSnapshot(
    [
      apiRepo({ name: 'architecture', pushed_at: '2026-08-19T18:37:41Z' }),
      apiRepo({ name: 'portfolio', pushed_at: '2026-09-09T09:28:07Z' }),
      apiRepo({ name: 'notes-api', pushed_at: '2026-09-05T22:33:38Z' }),
      apiRepo({ name: 'telltale', pushed_at: '2026-09-05T14:26:29Z' }),
    ],
    { fetchedAt: '2026-09-09' }
  );
  assert.deepEqual(
    snapshot.repos.map((r) => r.name),
    ['portfolio', 'notes-api', 'telltale', 'architecture']
  );
});

test('a failed fetch keeps the previous snapshot', () => {
  const previous = toSnapshot([apiRepo()], { fetchedAt: '2026-01-01' });
  const out = resolveSnapshot(previous, { ok: false, error: new Error('HTTP 403') });
  assert.equal(out.kept, true);
  assert.deepEqual(out.snapshot, previous);
});

test('a successful fetch drops an allowlisted repo that is no longer returned', () => {
  const previous = toSnapshot(
    [apiRepo({ name: 'telltale' }), apiRepo({ name: 'portfolio' })],
    { fetchedAt: '2026-01-01' }
  );
  const out = resolveSnapshot(previous, {
    ok: true,
    fetchedAt: '2026-09-09',
    apiRepos: [apiRepo({ name: 'portfolio' })],
  });
  assert.equal(out.kept, false);
  assert.deepEqual(out.snapshot.repos.map((r) => r.name), ['portfolio']);
});
