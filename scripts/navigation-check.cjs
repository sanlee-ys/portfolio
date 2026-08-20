#!/usr/bin/env node
/*
 * Navigation contract for the built site.
 *
 * This is intentionally separate from link-check.cjs. A site can contain no
 * broken hrefs and still strand a real page because nothing links to it, or
 * render a detail page without the local way back that the page template
 * promises. This gate catches those two failures over the emitted HTML.
 *
 * Run from the repo root after building:
 *   SITE_ROOT=dist node scripts/navigation-check.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();
const ENTRY_PAGE = 'index.html';
const WORK_INDEX = 'work.html';

// These are URL-policy exceptions, not ignored files. 404.html cannot have an
// incoming link by definition. The scroll-storytelling page keeps its stable
// public URL as an archived artifact, but ADR-004 deliberately removed it from
// the portfolio's navigation. Both pages are still parsed; scroll-storytelling
// still has to provide a working visible `.back` link.
const REACHABILITY_EXEMPTIONS = new Set([
  '404.html',
  'lab/scroll-storytelling.html',
]);
const BACK_EXEMPTIONS = new Set(['index.html', '404.html']);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function findHtml(dir = ROOT) {
  const pages = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) pages.push(...findHtml(absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      pages.push(toPosix(path.relative(ROOT, absolute)));
    }
  }
  return pages;
}

function attributes(source) {
  const out = new Map();
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    out.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return out;
}

function syntacticallyHidden(tag, attrs, inherited) {
  if (inherited || tag === 'template' || attrs.has('hidden')) return true;
  if ((attrs.get('aria-hidden') || '').toLowerCase() === 'true') return true;
  const style = (attrs.get('style') || '').replace(/\s+/g, '').toLowerCase();
  return /(?:^|;)display:none(?:!important)?(?:;|$)/.test(style)
    || /(?:^|;)visibility:(?:hidden|collapse)(?:!important)?(?:;|$)/.test(style)
    || /(?:^|;)content-visibility:hidden(?:!important)?(?:;|$)/.test(style)
    || /(?:^|;)opacity:0(?:!important)?(?:;|$)/.test(style);
}

// A small HTML walk rather than an anchor regex: navigation inside `hidden`,
// `aria-hidden`, inline-style-hidden, or `<template>` ancestors is not visible
// navigation. The generated site does not need a browser DOM to establish
// those syntactic states, but it does need ancestor context.
function anchors(html) {
  const out = [];
  const stack = [];
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);
  let cursor = 0;

  while (cursor < html.length) {
    const rawTextParent = stack.at(-1)?.name;
    if (rawTextParent === 'script' || rawTextParent === 'style') {
      const closeAt = html.toLowerCase().indexOf(`</${rawTextParent}`, cursor);
      if (closeAt === -1) break;
      cursor = closeAt;
    }

    const start = html.indexOf('<', cursor);
    if (start === -1) break;
    if (html.startsWith('<!--', start)) {
      const end = html.indexOf('-->', start + 4);
      cursor = end === -1 ? html.length : end + 3;
      continue;
    }

    let end = start + 1;
    let quote = '';
    for (; end < html.length; end++) {
      const char = html[end];
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
    }
    if (end >= html.length) break;

    const token = html.slice(start, end + 1);
    const closing = token.match(/^<\s*\/\s*([a-z][\w:-]*)/i);
    if (closing) {
      const name = closing[1].toLowerCase();
      const frameIndex = stack.map((frame) => frame.name).lastIndexOf(name);
      if (frameIndex !== -1) {
        const removed = stack.splice(frameIndex);
        for (const frame of removed) {
          if (frame.anchor) frame.anchor.content = html.slice(frame.contentStart, start);
        }
      }
      cursor = end + 1;
      continue;
    }

    const opening = token.match(/^<\s*([a-z][\w:-]*)([\s\S]*?)\/?\s*>$/i);
    if (!opening) {
      cursor = end + 1;
      continue;
    }
    const name = opening[1].toLowerCase();
    const attrs = attributes(opening[2]);
    const hidden = syntacticallyHidden(name, attrs, stack.at(-1)?.hidden || false);
    const anchor = name === 'a' ? { attrs, content: '', hidden } : null;
    if (anchor) out.push(anchor);
    if (!voidElements.has(name) && !/\/\s*>$/.test(token)) {
      stack.push({ name, hidden, anchor, contentStart: end + 1 });
    }
    cursor = end + 1;
  }

  return out;
}

function localTarget(page, href, pages) {
  if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return null;
  const clean = href.split('#')[0].split('?')[0];
  // A fragment-only or query-only link stays on its source page. Resolving the
  // page name relative to its own directory would duplicate nested paths.
  if (!clean) return pages.has(page) ? page : null;
  const raw = clean;
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  const base = raw.startsWith('/') ? '' : path.posix.dirname(page);
  let target = path.posix.normalize(path.posix.join(base, decoded.replace(/^\/+/, '')));
  if (target === '.' || target.endsWith('/')) target = `${target === '.' ? '' : target}index.html`;

  const candidates = [target];
  if (!path.posix.extname(target)) {
    candidates.push(`${target}.html`, path.posix.join(target, 'index.html'));
  }
  return candidates.find((candidate) => pages.has(candidate)) ?? null;
}

function hasVisibleBack(pageAnchors, page, pages, graph) {
  for (const anchor of pageAnchors) {
    const classNames = (anchor.attrs.get('class') || '').split(/\s+/);
    if (!classNames.includes('back')) continue;
    const text = anchor.content
      .replace(/<!--[^]*?-->/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, 'x')
      .trim();
    const labelled = (anchor.attrs.get('aria-label') || '').trim();
    const target = localTarget(page, anchor.attrs.get('href'), pages);
    const contextual = target === ENTRY_PAGE || graph.get(target)?.has(page);
    if (!anchor.hidden && (text || labelled) && target && contextual) {
      return true;
    }
  }
  return false;
}

let pageList;
try {
  pageList = findHtml().sort();
} catch (error) {
  console.error(`✗ navigation-check: could not walk ${ROOT}: ${error.message}`);
  process.exit(1);
}

if (pageList.length === 0) {
  console.error(`✗ navigation-check: no HTML found under ${ROOT}. Nothing was checked.`);
  console.error('  Run `npm run build` first, or set SITE_ROOT to a built fixture.');
  process.exit(1);
}

const pages = new Set(pageList);
if (!pages.has(ENTRY_PAGE)) {
  console.error(`✗ navigation-check: ${ENTRY_PAGE} is missing, so reachability has no starting point.`);
  process.exit(1);
}
if (!pages.has(WORK_INDEX)) {
  console.error(`✗ navigation-check: ${WORK_INDEX} is missing, so project-index coverage cannot be checked.`);
  process.exit(1);
}

const pageAnchors = new Map();
const graph = new Map();
for (const page of pageList) {
  const html = fs.readFileSync(path.join(ROOT, ...page.split('/')), 'utf8');
  const found = anchors(html);
  pageAnchors.set(page, found);
  graph.set(page, new Set(found
    .filter((anchor) => !anchor.hidden)
    .map((anchor) => localTarget(page, anchor.attrs.get('href'), pages))
    .filter(Boolean)));
}

const reachable = new Set([ENTRY_PAGE]);
const pending = [ENTRY_PAGE];
while (pending.length) {
  const page = pending.shift();
  for (const target of graph.get(page) || []) {
    if (reachable.has(target)) continue;
    reachable.add(target);
    pending.push(target);
  }
}

let failures = 0;
for (const page of pageList) {
  if (!REACHABILITY_EXEMPTIONS.has(page) && !reachable.has(page)) {
    failures++;
    console.log(`  ORPHAN        ${page}  (not reachable from ${ENTRY_PAGE})`);
  }
  if (!BACK_EXEMPTIONS.has(page) && !hasVisibleBack(pageAnchors.get(page), page, pages, graph)) {
    failures++;
    console.log(`  MISSING BACK  ${page}  (needs a visible .back to home or a parent/index that links here)`);
  }
}

// `work.html` presents itself as the complete professional index. Reachability
// alone is weaker: a project omitted from Work could remain reachable through
// a link buried in another case study. Pin the index claim directly.
const workTargets = graph.get(WORK_INDEX);
for (const page of pageList.filter((candidate) => /^projects\/[^/]+\.html$/.test(candidate))) {
  if (!workTargets.has(page)) {
    failures++;
    console.log(`  MISSING WORK  ${page}  (not linked directly from ${WORK_INDEX})`);
  }
}

if (failures) {
  console.error(`\n✗ navigation-check: ${failures} navigation contract violation(s).`);
  process.exit(1);
}

console.log(`✓ Navigation contract OK across ${pageList.length} pages.`);
