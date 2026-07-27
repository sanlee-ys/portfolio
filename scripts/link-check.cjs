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

// Since `ADR-006` the site is a build artifact. SITE_ROOT points this at
// `dist/`; with it unset the script still works from the repo root, which is
// what keeps it runnable by hand.
const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();

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
// A gate that checked nothing must not report success. `ADR-006` named this as
// the silent-failure risk of pointing these scripts at build output.
if (pages.length === 0) {
  console.error(`✗ link-check: no HTML found under ${ROOT}. Nothing was checked.`);
  console.error('  Run `npm run build` first, or unset SITE_ROOT.');
  process.exit(1);
}
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
      continue;
    }

    // The fragment, not just the file. A link to a real page and a dead anchor
    // lands the reader at the top with no sign anything went wrong, and until
    // 2026-07-26 this gate reported that as fine — it split the `#` off and
    // never looked at it. That made every deep link in the site unverified,
    // which mattered the moment `ADR-007` started moving sections between pages.
    const frag = url.includes('#') ? url.split('#')[1].split('?')[0] : '';
    if (!frag || !target.endsWith('.html')) continue;
    const targetHtml = fs.readFileSync(target, 'utf8');
    const hasId = new RegExp(`\\sid=["']${frag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(targetHtml);
    if (!hasId) {
      broken++;
      console.log(`  DEAD ANCHOR  ${page}  ->  ${url}  (no id="${frag}" in ${clean})`);
    }
  }
}

if (broken) {
  console.error(`\n✗ ${broken} broken internal link(s).`);
  process.exit(1);
}
console.log(`✓ Internal links OK across ${pages.length} pages.`);
