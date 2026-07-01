#!/usr/bin/env node
/*
 * Internal link checker. Scans every .html file for local href/src targets and
 * fails if any points at a file that doesn't exist. External URLs, mailto:,
 * and pure-fragment links are skipped (fragments aren't validated).
 *
 * Run from the repo root:   node scripts/link-check.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

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

let broken = 0;
const pages = findHtml('.').sort();
for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const dir = path.dirname(page);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|#|data:|\/\/)/.test(url)) continue;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean) continue;
    // Root-relative resolves from repo root; otherwise relative to the page.
    const target = clean.startsWith('/')
      ? path.join(ROOT, clean)
      : path.join(ROOT, dir, clean);
    if (!fs.existsSync(target)) {
      broken++;
      console.log(`  BROKEN  ${page}  ->  ${url}`);
    }
  }
}

if (broken) {
  console.error(`\n✗ ${broken} broken internal link(s).`);
  process.exit(1);
}
console.log(`✓ Internal links OK across ${pages.length} pages.`);
