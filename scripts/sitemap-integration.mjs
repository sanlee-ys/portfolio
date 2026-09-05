/**
 * Emit `sitemap.xml` at build time.
 *
 * Why this is ~40 lines of local code rather than `@astrojs/sitemap`:
 * that integration always emits `sitemap-index.xml` plus a numbered
 * `sitemap-0.xml`, and its `filenameBase` option changes the prefix, not the
 * shape. There is no configuration that produces a single `sitemap.xml`. The
 * site already publishes `https://sanlee.me/sitemap.xml`, `robots.txt`
 * advertises it, and GitHub Pages has no redirect mechanism — so adopting the
 * integration would 404 a live, indexed URL. That is `ADR-004` §2's reasoning
 * (the lab pages kept their URLs for exactly this reason), and it outranks a
 * dependency preference.
 *
 * This is deliberately NOT the "home-grown shell generator" `ADR-006` rejected.
 * That would have been an open-ended templating system with one maintainer and
 * a new requirement every time a page changed. This is a frozen, single-purpose
 * spec (sitemaps.org 0.9) with one input — the list of pages the build just
 * produced — and no evolution path.
 *
 * Two things it does better than the hand-maintained file it replaces:
 *   - It cannot list a page that does not exist, or miss one that does, because
 *     it reads the build output. `ADR-004` §4 records the opposite failure: the
 *     hand-maintained file listed three `lab/` URLs after that section was
 *     retired, and the omission was only caught during a later migration.
 *   - `lastmod` comes from the source file's last git commit, not from someone
 *     remembering to retype a date. Where git cannot answer, the entry is
 *     emitted WITHOUT lastmod rather than with a guess — the same posture as
 *     `assets/last-updated.js`, which renders nothing rather than claim "now".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Built pages that stay in the output but are not put forward for indexing.
// A sitemap is a list of what the site RECOMMENDS a crawler spend its time on,
// not an inventory of what exists — so de-listing here never removes a page or
// breaks a URL.
//   - `404.html` is `noindex`; listing it asks a crawler to index the page that
//     exists to say there is nothing here.
//   - `lab/scroll-storytelling.html` is `noindex` since 2026-09-04. It left the
//     professional path and stays at its URL for inbound links (ADR-004).
// `projects/netops-lab.html` left the primary nav and the sitemap in #199
// (2026-08-02). PR #225 (2026-08-17) put it back on the sitemap as the second
// public artifact; ADR-011 in that PR records the career tell, not this
// listing. On main it stays out of the primary nav (`nav.doors`), and the
// homepage About section and work.html link it. That placement is the owner's
// current call (2026-09-04; ADR-011 is Informational and never mentions this
// page). A session that adds it to the nav or delists it updates this line.
const EXCLUDE = new Set(['404.html', 'lab/scroll-storytelling.html']);

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function walkHtml(root, dir = '.', out = []) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    const rel = dir === '.' ? name : `${dir}/${name}`;
    if (fs.statSync(path.join(root, rel)).isDirectory()) walkHtml(root, rel, out);
    else if (name.endsWith('.html')) out.push(rel);
  }
  return out;
}

/**
 * Is this a shallow clone? It matters: `git log -1` in a `fetch-depth: 1`
 * checkout returns the checkout commit for EVERY file, so every page would get
 * the same plausible-looking date regardless of when it actually changed.
 * A format check cannot catch that — the wrong answer is a well-formed date —
 * so the shallowness has to be asked about directly.
 */
function isShallow(repoRoot) {
  try {
    return execFileSync('git', ['-C', repoRoot, 'rev-parse', '--is-shallow-repository'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'true';
  } catch {
    return true; // no git at all -> cannot date anything honestly
  }
}

/** Last commit date (YYYY-MM-DD) for a page's SOURCE file, or null. */
function lastmodFor(repoRoot, rel) {
  // A built page comes either from an .astro source or from a public/ file
  // copied verbatim (resume.html). Ask about whichever exists.
  const candidates = [
    path.join('src', 'pages', rel.replace(/\.html$/, '.astro')),
    path.join('public', rel),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(path.join(repoRoot, candidate))) continue;
    try {
      const out = execFileSync('git', ['-C', repoRoot, 'log', '-1', '--format=%cs', '--', candidate],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
    } catch {
      /* no git, or file untracked -> fall through to no lastmod */
    }
  }
  return null;
}

export default function sitemapIntegration({ site }) {
  return {
    name: 'sitemap-xml',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const repoRoot = process.cwd();
        const base = site.replace(/\/$/, '');

        const pages = walkHtml(outDir)
          .filter((rel) => !EXCLUDE.has(rel))
          // Homepage first, then alphabetical: a stable order keeps the diff
          // between builds readable.
          .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));

        if (pages.length === 0) throw new Error('sitemap: no pages found in build output');

        const shallow = isShallow(repoRoot);
        if (shallow) {
          logger.warn('shallow clone or no git: emitting sitemap WITHOUT lastmod rather than dating every page the same. Use `fetch-depth: 0` to restore dates.');
        }

        const entries = pages.map((rel) => {
          const loc = rel === 'index.html' ? `${base}/` : `${base}/${rel}`;
          const lastmod = shallow ? null : lastmodFor(repoRoot, rel);
          return `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
        fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8');
        const dated = entries.filter((e) => e.includes('<lastmod>')).length;
        logger.info(`sitemap.xml: ${pages.length} pages, ${dated} with lastmod from git`);
      },
    },
  };
}
