#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const CHECK = path.join(__dirname, 'navigation-check.cjs');

function site(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-navigation-'));
  for (const [name, html] of Object.entries(files)) {
    const target = path.join(root, ...name.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  }
  return root;
}

function run(files) {
  const root = site(files);
  try {
    return spawnSync(process.execPath, [CHECK], {
      encoding: 'utf8',
      env: { ...process.env, SITE_ROOT: root },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const back = (href) => `<a class="utility back" href="${href}">Back</a>`;

test('passes a connected site and keeps the two documented reachability exemptions narrow', () => {
  const result = run({
    'index.html': '<a href="about.html">About</a><a href="work.html">Work</a>',
    'about.html': `${back('index.html')}<a href="projects/detail.html">Detail</a>`,
    'work.html': `${back('index.html')}<a href="projects/detail.html">Detail</a>`,
    'projects/detail.html': back('../about.html'),
    '404.html': '<h1>Not found</h1>',
    'lab/scroll-storytelling.html': back('../index.html'),
  });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /Navigation contract OK across 6 pages/);
});

test('fails when a published page has a valid back link but no incoming path from index', () => {
  const result = run({
    'index.html': '<a href="about.html">About</a><a href="work.html">Work</a>',
    'about.html': back('index.html'),
    'work.html': back('index.html'),
    'orphan.html': back('index.html'),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /ORPHAN\s+orphan\.html/);
});

test('fails when a reachable detail page has no visible back anchor', () => {
  const result = run({
    'index.html': '<a href="detail.html">Detail</a><a href="work.html">Work</a>',
    'detail.html': '<a class="back" href="index.html" hidden>Back</a>',
    'work.html': back('index.html'),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /MISSING BACK\s+detail\.html/);
});

test('hidden anchors and hidden ancestor containers cannot establish reachability', () => {
  const result = run({
    'index.html': [
      '<a href="work.html">Work</a>',
      '<a hidden href="anchor-hidden.html">Hidden anchor</a>',
      '<section hidden><a href="hidden-ancestor.html">Hidden ancestor</a></section>',
      '<section aria-hidden="true"><a href="aria-hidden.html">ARIA hidden</a></section>',
      '<section style="display: none !important"><a href="style-hidden.html">Style hidden</a></section>',
      '<template><a href="template.html">Template</a></template>',
    ].join(''),
    'work.html': back('index.html'),
    'anchor-hidden.html': back('index.html'),
    'hidden-ancestor.html': back('index.html'),
    'aria-hidden.html': back('index.html'),
    'style-hidden.html': back('index.html'),
    'template.html': back('index.html'),
  });
  assert.notEqual(result.status, 0);
  for (const page of [
    'anchor-hidden.html', 'hidden-ancestor.html', 'aria-hidden.html',
    'style-hidden.html', 'template.html',
  ]) {
    assert.match(result.stdout, new RegExp(`ORPHAN\\s+${page.replace('.', '\\.')}`));
  }
});

test('a back anchor inside a hidden ancestor is not visible navigation', () => {
  const result = run({
    'index.html': '<a href="work.html">Work</a><a href="detail.html">Detail</a>',
    'work.html': back('index.html'),
    'detail.html': '<div hidden><a class="back" href="index.html">Back</a></div>',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /MISSING BACK\s+detail\.html/);
});

test('fails when a back anchor points outside the published pages', () => {
  const result = run({
    'index.html': '<a href="detail.html">Detail</a><a href="work.html">Work</a>',
    'detail.html': back('missing.html'),
    'work.html': back('index.html'),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /MISSING BACK\s+detail\.html/);
});

test('404 is exempt from both rules, but the archived lab page is exempt only from reachability', () => {
  const result = run({
    'index.html': '<a href="work.html">Work</a>',
    'work.html': back('index.html'),
    '404.html': '<main>Not found</main>',
    'lab/scroll-storytelling.html': '<main>Archived but stranded</main>',
  });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /ORPHAN\s+(?:404|lab\/scroll-storytelling)\.html/);
  assert.doesNotMatch(result.stdout, /MISSING BACK\s+404\.html/);
  assert.match(result.stdout, /MISSING BACK\s+lab\/scroll-storytelling\.html/);
});

test('fails when a project is transitively reachable but omitted from the Work index', () => {
  const result = run({
    'index.html': '<a href="work.html">Work</a>',
    'work.html': `${back('index.html')}<a href="projects/listed.html">Listed</a>`,
    'projects/listed.html': `${back('../work.html')}<a href="hidden.html">Hidden project</a>`,
    'projects/hidden.html': back('../work.html'),
  });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /ORPHAN\s+projects\/hidden\.html/);
  assert.match(result.stdout, /MISSING WORK\s+projects\/hidden\.html/);
});

test('a hidden Work anchor does not count as direct project coverage', () => {
  const result = run({
    'index.html': '<a href="work.html">Work</a>',
    'work.html': `${back('index.html')}<template><a href="projects/hidden.html">Hidden</a></template><a href="projects/listed.html">Listed</a>`,
    'projects/listed.html': `${back('../work.html')}<a href="hidden.html">Hidden project</a>`,
    'projects/hidden.html': back('../work.html'),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /MISSING WORK\s+projects\/hidden\.html/);
});

test('a resolved back destination must be home or a visible parent that links to the source', () => {
  const result = run({
    'index.html': '<a href="work.html">Work</a><a href="unrelated.html">Unrelated</a><a href="detail.html">Detail</a>',
    'work.html': back('index.html'),
    'unrelated.html': back('index.html'),
    'detail.html': back('unrelated.html'),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /MISSING BACK\s+detail\.html/);
});

test('fails closed when work.html is absent', () => {
  const result = run({ 'index.html': '<main>Home</main>' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /work\.html is missing/);
});

test('fails closed when the site walk finds zero pages', () => {
  const result = run({ 'asset.txt': 'not a page' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no HTML found/);
});
