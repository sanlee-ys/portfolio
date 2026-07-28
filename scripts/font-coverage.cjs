#!/usr/bin/env node
/*
 * Font-coverage gate — does every character in the built copy have a glyph in a
 * font this site actually ships?
 *
 * The failure this exists to catch is invisible three ways at once. A codepoint
 * the fonts do not carry still RENDERS: the browser silently borrows it from a
 * platform face. So it survives every other gate here, it looks correct on the
 * machine that wrote it, and it changes shape on someone else's laptop. U+2192
 * shipped that way for months — the proof figures and the card links were
 * drawing two different arrows on one page, from two different platform fonts,
 * and nothing was red.
 *
 * Three checks, and the second is the one that keeps the first honest:
 *
 *   1. UNCOVERED   — a character in the copy that no self-hosted face has.
 *   2. DECLARED-ONLY — a @font-face unicode-range claims a codepoint that the
 *                    woff2 behind it does not contain. This is the drift that
 *                    happens when a range is widened without re-cutting.
 *   3. STALE MANIFEST — the recorded sha256 no longer matches the woff2 on
 *                    disk, i.e. the fonts were re-cut without refreshing the
 *                    manifest, so checks 1 and 2 would be reasoning about a
 *                    file that is no longer there.
 *
 * Why a manifest rather than reading the woff2 files directly: a woff2 is a
 * brotli-compressed table stream, and parsing one in Node means either a
 * dependency or a few hundred lines of binary plumbing. CI here has Node and a
 * stdlib-only Python 3; it has no font toolchain, and `scripts/gates.cjs` must
 * stay a faithful mirror of `qa.yml`, so a gate that needs fontTools locally
 * but cannot run in CI is worse than no gate. Instead `scripts/subset-fonts.py`
 * — which cuts every font in `public/assets/fonts/` — records what it produced,
 * and check 3 is what makes that record trustworthy: the manifest is not
 * believed, it is verified against the bytes.
 *
 * Run from the repo root (SITE_ROOT points it at the build):
 *
 *     SITE_ROOT=dist node scripts/font-coverage.cjs
 *
 * With SITE_ROOT unset it walks the repo root, which is what keeps it usable by
 * hand; note that aiming it at the repo root while `dist/` and `public/` both
 * exist walks both copies of every page, which is harmless here — it only ever
 * unions codepoints — but doubles the page count it reports.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();
const MANIFEST_PATH = path.join(REPO_ROOT, 'scripts', 'font-coverage.json');

/*
 * Codepoints with no glyph in ANY upstream face here, checked against the
 * variable sources rather than assumed. These fall to `--symbol-tail` and the
 * platform draws them; that is a deliberate, recorded choice, not a gap to fix.
 */
const EXPECTED = new Map([
  [0x03ba, 'kappa: the judge page\'s agreement statistic; no Greek in any of the three faces'],
  [0x2600, 'sun: theme toggle; no dingbats in any of the three faces'],
  [0x263d, 'moon: theme toggle; no dingbats in any of the three faces'],
]);

/*
 * DECLARED-ONLY exceptions: the range claims it, the file lacks it, and no
 * re-cut can fix that because the upstream face has no such glyph either. The
 * Google ranges are family-wide rather than a per-file promise, so a gap like
 * this is upstream's, not drift introduced here.
 */
const EXPECTED_DECLARED = new Map([
  [0x20a9, 'won sign: inside Google\'s latin-ext range U+20A0-20AB, but absent from '
    + 'Geist and Geist Mono upstream. Newsreader has it, so site prose is covered; '
    + 'only resume.html, whose stack is Geist-only, falls to the platform.'],
]);

/*
 * Named entities are resolved from this table rather than by a parser, because
 * Node has no HTML entity decoder in its standard library. The table only needs
 * to cover what this site emits — but "only needs to cover" is exactly how a
 * gate goes quietly blind, so an unrecognised named entity is a hard FAILURE
 * below, not a skip. Adding copy that uses a new entity reddens this gate with
 * a message naming the entity, which is the intended way to find out.
 */
const ENTITIES = new Map(Object.entries({
  amp: 0x26, lt: 0x3c, gt: 0x3e, quot: 0x22, apos: 0x27,
  nbsp: 0xa0, middot: 0xb7, times: 0xd7, minus: 0x2212, divide: 0xf7,
  eacute: 0xe9, egrave: 0xe8, agrave: 0xe0, ccedil: 0xe7, uuml: 0xfc,
  ouml: 0xf6, auml: 0xe4, ntilde: 0xf1, aring: 0xe5, oslash: 0xf8,
  mdash: 0x2014, ndash: 0x2013, hellip: 0x2026,
  lsquo: 0x2018, rsquo: 0x2019, ldquo: 0x201c, rdquo: 0x201d,
  lsaquo: 0x2039, rsaquo: 0x203a, laquo: 0xab, raquo: 0xbb,
  larr: 0x2190, uarr: 0x2191, rarr: 0x2192, darr: 0x2193,
  kappa: 0x03ba, deg: 0xb0, plusmn: 0xb1, frac12: 0xbd,
  copy: 0xa9, reg: 0xae, trade: 0x2122, hearts: 0x2665,
  euro: 0x20ac, pound: 0xa3, yen: 0xa5, cent: 0xa2, sect: 0xa7,
  dagger: 0x2020, Dagger: 0x2021, bull: 0x2022, prime: 0x2032, Prime: 0x2033,
  ge: 0x2265, le: 0x2264, ne: 0x2260, asymp: 0x2248, infin: 0x221e,
  shy: 0xad, ensp: 0x2002, emsp: 0x2003, thinsp: 0x2009, zwj: 0x200d, zwnj: 0x200c,
}).map(([k, v]) => [k, v]));

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

/*
 * Attributes whose value is drawn on screen. The Python original this replaces
 * used HTMLParser and read element text only, which meant the ellipsis in the
 * glossary filter's `placeholder` — rendered text, in the page's own font — was
 * never checked by the audit that existed to check exactly that.
 *
 * `aria-label` is deliberately absent: it is announced, not painted, so a glyph
 * gap there costs nothing and including it would invent findings.
 */
const TEXT_ATTRS = /\s(?:placeholder|alt|title|value)="([^"]*)"/gi;

/*
 * Script and style bodies are code, not copy, and are stripped whole before
 * tags. Two details matter, and CodeQL caught the second one:
 *
 * - The opening tag is matched lazily to the closer rather than with
 *   `[^>]*>`, so a `>` inside an attribute value cannot end it early.
 * - `</script >` — whitespace before the bracket — is a VALID end tag, and a
 *   pattern requiring `</script>` does not match it. That is not cosmetic
 *   here: the lazy match would run on to the next `</script>` and swallow
 *   every character of real copy in between, so glyphs would go unchecked and
 *   this gate would report OK. A gate written to stop things going quietly
 *   blind is the last place that should have that bug.
 */
const SCRIPT_OR_STYLE = /<(script|style)\b[\s\S]*?<\/\1\s*>/gi;

function textOf(html) {
  const chunks = [];
  const stripped = html.replace(SCRIPT_OR_STYLE, ' ');
  for (const m of stripped.matchAll(TEXT_ATTRS)) chunks.push(m[1]);
  chunks.push(stripped.replace(/<[^>]*>/g, ' '));
  return chunks.join(' ');
}

/*
 * Returns {codepoints: Map<cp, sample>, unknownEntities: Map<name, sample>}.
 * Entities are resolved here rather than decoded into a string first so that an
 * unrecognised one can be reported by name.
 */
function scanText(text, page, cps, unknown) {
  const remember = (cp, sample) => {
    if (cp > 0x7f && !cps.has(cp)) cps.set(cp, { page, sample: sample.trim().slice(0, 70) });
  };

  for (const m of text.matchAll(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g)) {
    const ref = m[1];
    const around = text.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, ' ');
    if (ref.startsWith('#')) {
      const cp = ref[1] === 'x' || ref[1] === 'X'
        ? parseInt(ref.slice(2), 16)
        : parseInt(ref.slice(1), 10);
      if (Number.isFinite(cp)) remember(cp, around);
    } else if (ENTITIES.has(ref)) {
      remember(ENTITIES.get(ref), around);
    } else if (!unknown.has(ref)) {
      unknown.set(ref, { page, sample: around });
    }
  }

  // Literal (already-decoded) characters, entities stripped so their ASCII
  // spelling does not read as text.
  const literal = text.replace(/&(?:#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, ' ');
  for (const ch of literal) {
    const cp = ch.codePointAt(0);
    if (cp > 0x7f) {
      const i = literal.indexOf(ch);
      remember(cp, literal.slice(Math.max(0, i - 30), i + 40).replace(/\s+/g, ' '));
    }
  }
}

function parseRanges(spec) {
  const out = [];
  for (const tok of spec.split(',')) {
    const t = tok.trim().replace(/^[uU]\+/, '');
    if (!t) continue;
    if (t.includes('-')) {
      const [a, b] = t.split('-');
      out.push([parseInt(a, 16), parseInt(b, 16)]);
    } else {
      const cp = parseInt(t, 16);
      out.push([cp, cp]);
    }
  }
  return out;
}

const inRanges = (ranges, cp) => ranges.some(([a, b]) => cp >= a && cp <= b);

/*
 * Every @font-face on the site, from the shared stylesheet and from any page
 * carrying its own inline rules. Not special-cased to resume.html: that page is
 * standalone today, and a gate that hard-codes the one known exception stops
 * covering the next one.
 */
function collectFaces(pages) {
  const sources = [];
  for (const rel of ['assets/style.css', 'style.css']) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p)) sources.push([rel, fs.readFileSync(p, 'utf8'), path.dirname(p)]);
  }
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    if (html.includes('@font-face')) {
      sources.push([page, html, path.dirname(path.join(ROOT, page))]);
    }
  }

  const faces = [];
  for (const [label, text, baseDir] of sources) {
    for (const block of text.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
      const body = block[1];
      const fam = /font-family:\s*"([^"]+)"/.exec(body);
      const url = /url\("([^"]+)"\)/.exec(body);
      const rng = /unicode-range:\s*([^;]+);/.exec(body);
      if (!fam || !url || !rng) continue;
      const style = /font-style:\s*(\w+)/.exec(body);
      faces.push({
        label: `${fam[1]}/${style ? style[1] : 'normal'}`,
        sheet: label,
        file: path.basename(url[1]),
        filePath: path.resolve(baseDir, url[1]),
        ranges: parseRanges(rng[1]),
      });
    }
  }
  return faces;
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`✗ font-coverage: no manifest at ${path.relative(REPO_ROOT, MANIFEST_PATH)}.`);
  console.error('  Generate it: uv run --with "fonttools[woff]" python scripts/subset-fonts.py --manifest-only');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')).fonts;

const pages = findHtml('.').sort();
// Every walking gate here fails on an empty walk. A gate aimed at an unbuilt or
// empty directory would otherwise pass while checking nothing, which is the
// silent failure ADR-006 named as the main risk of reading build output.
if (pages.length === 0) {
  console.error(`✗ font-coverage: no HTML found under ${ROOT}. Nothing was checked.`);
  console.error('  Run `npm run build` first, or unset SITE_ROOT.');
  process.exit(1);
}

const faces = collectFaces(pages);
if (faces.length === 0) {
  console.error(`✗ font-coverage: no @font-face rules found under ${ROOT}. Nothing was checked.`);
  process.exit(1);
}

const problems = [];

// --- check 3, first: is the manifest still describing these files? ----------
const seenFiles = new Set();
for (const face of faces) {
  if (seenFiles.has(face.file)) continue;
  seenFiles.add(face.file);
  const entry = manifest[face.file];
  if (!entry) {
    problems.push(`manifest has no entry for ${face.file} (declared in ${face.sheet}). `
      + 'Re-run scripts/subset-fonts.py --manifest-only.');
    continue;
  }
  if (!fs.existsSync(face.filePath)) {
    problems.push(`${face.sheet} declares ${face.file} but the file is missing at `
      + path.relative(ROOT, face.filePath));
    continue;
  }
  const bytes = fs.readFileSync(face.filePath);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sha !== entry.sha256) {
    problems.push(`${face.file} does not match the manifest (recorded ${entry.bytes} bytes / `
      + `${entry.sha256.slice(0, 12)}…, found ${bytes.length} / ${sha.slice(0, 12)}…). `
      + 'The fonts were changed without refreshing the manifest — re-run '
      + 'scripts/subset-fonts.py --manifest-only.');
  }
}
if (problems.length) {
  console.error('✗ font-coverage: the manifest does not describe the shipped fonts.\n');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

// --- collect what the copy uses --------------------------------------------
const cps = new Map();
const unknownEntities = new Map();
for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  scanText(textOf(html), page, cps, unknownEntities);
}

if (unknownEntities.size) {
  console.error('✗ font-coverage: HTML entities this gate cannot resolve, so their');
  console.error('  glyph coverage went unchecked. Add them to ENTITIES in this file:\n');
  for (const [name, { page, sample }] of unknownEntities) {
    console.error(`  &${name};  ${page}: ${JSON.stringify(sample)}`);
  }
  process.exit(1);
}

// --- checks 1 and 2 ---------------------------------------------------------
const uncovered = [];
const declaredOnly = [];
let coveredCount = 0;

for (const cp of [...cps.keys()].sort((a, b) => a - b)) {
  const { page, sample } = cps.get(cp);
  const covered = [];
  const claimed = [];
  for (const face of faces) {
    if (!inRanges(face.ranges, cp)) continue;
    const entry = manifest[face.file];
    if (entry && inRanges(entry.ranges, cp)) covered.push(face.label);
    else claimed.push(`${face.label} (${face.sheet})`);
  }

  const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  const char = cp === 0xa0 ? 'nbsp' : String.fromCodePoint(cp);

  if (claimed.length && !EXPECTED_DECLARED.has(cp)) {
    declaredOnly.push(`${hex} ${char} — declared by ${[...new Set(claimed)].join(', ')}`);
  }
  if (covered.length) {
    coveredCount += 1;
    const note = EXPECTED_DECLARED.has(cp) && claimed.length ? '  [declared-gap noted]' : '';
    console.log(`  ${hex} ${char.padStart(4)}  covered   ${[...new Set(covered)].join(', ')}${note}`);
  } else if (EXPECTED_DECLARED.has(cp)) {
    console.log(`  ${hex} ${char.padStart(4)}  expected  ${EXPECTED_DECLARED.get(cp).split('.')[0]}`);
  } else if (EXPECTED.has(cp)) {
    console.log(`  ${hex} ${char.padStart(4)}  expected  ${EXPECTED.get(cp)}`);
  } else {
    uncovered.push(`${hex} ${char} — ${page}: ${JSON.stringify(sample)}`);
    console.log(`  ${hex} ${char.padStart(4)}  UNCOVERED ${page}`);
  }
}

let failed = false;
if (declaredOnly.length) {
  failed = true;
  console.error('\n✗ DECLARED-ONLY — a unicode-range claims a codepoint its woff2 lacks.');
  console.error('  Re-cut with scripts/subset-fonts.py, or narrow the range:');
  for (const line of declaredOnly) console.error(`  ${line}`);
}
if (uncovered.length) {
  failed = true;
  console.error('\n✗ UNCOVERED — no self-hosted face has these, so the platform draws them');
  console.error('  and they change shape between machines. Add them to');
  console.error('  scripts/subset-fonts.py and re-cut, or record them in EXPECTED here:');
  for (const line of uncovered) console.error(`  ${line}`);
}
if (failed) process.exit(1);

console.log(`\n✓ Font coverage OK — ${cps.size} non-ASCII codepoint(s) across ${pages.length} pages: `
  + `${coveredCount} self-hosted, ${cps.size - coveredCount} recorded exception(s). `
  + `${seenFiles.size} font file(s) match the manifest.`);
