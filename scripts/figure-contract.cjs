#!/usr/bin/env node
/*
 * The figure contract, checked against the BUILT site.
 *
 * WHY THIS EXISTS. This site argues that a published number must name the
 * artifact it came from. Its figures did not obey that rule, and nothing
 * checked them. A hand-drawn plate is markup that a person types, so a count
 * inside one is a published figure with no producer and no gate. ADR-013 states
 * the rule this gate enforces: a hand-drawn figure carries no digit, a
 * generated figure carries its digits and names its artifact, and every other
 * digit lives in prose or in a caption, where the metric gates already read it.
 *
 * THE THREE RULES.
 *   R-D  A <text> node inside an <svg> in the content region fails if its
 *        DECODED text carries a digit. Two exits: the <svg> declares
 *        data-fig-generated="true", or the figure sits in the baseline.
 *   R-C  Every <figure> that carries data-fig must hold a <figcaption> with a
 *        non-empty .fig-what and a non-empty .fig-limit.
 *   R-N  Every <figure> in the content region that is not in the baseline must
 *        carry data-fig. Without R-N a new figure escapes R-C by omitting the
 *        attribute.
 *
 * WHY THE BASELINE, AND WHY IT IS NOT OPTIONAL. Measured on 2026-08-30 against
 * a fresh build: 30 SVG <text> nodes carry a digit, across 9 pages. The
 * doctrine is right and the site does not obey it yet. A gate with no baseline
 * therefore reddens 9 pages on the day it lands, and the cheapest way to green
 * is to delete the figures. ADR-004 and ADR-007 forbid that: a gate that forces
 * a deletion is a substance deletion with a build failure in front of it. So
 * the baseline records what already ships, with a reason for each entry, and
 * the gate binds NEW work only.
 *
 * WHY IT WALKS dist/ AND NOT src/. The rule is about what a reader sees. In
 * `netops-lab.astro` the plate reads `wipe &#8594; cfg`. The digits belong to
 * the entity reference, and the reader sees an arrow. A gate that read the
 * source would fail a correct figure, and the lane would "fix" a plate that was
 * never wrong. So the text is decoded before it is tested, which is only
 * meaningful against the built page.
 *
 * WHY AN UNKNOWN ENTITY IS A FAILURE. `&frac12;` spells a digit and renders
 * none. A decoder that passes an entity through un-decoded therefore invents a
 * violation, and one that ignores what it cannot read goes quietly blind. Both
 * are worse than a loud stop. `font-coverage.cjs` made the same call for the
 * same reason; ENTITIES below is the same table, kept separate because that
 * gate does its work at module load and cannot be required.
 *
 * WHY THE BASELINE CANNOT ROT. Every stored text value must still be on the
 * page. An exemption for a figure that changed is an exemption nobody granted,
 * and it is how a frozen record gets edited in silence. `.ci-plot` and
 * `.eval-plate` are frozen historical measurements, and this is what freezes
 * them.
 *
 * Run:  npm run build && SITE_ROOT=dist node scripts/figure-contract.cjs
 * On Windows set the variable first: `$env:SITE_ROOT='dist'; node scripts/...`.
 * A bare `SITE_ROOT=dist node ...` prefix is POSIX shell syntax.
 * `scripts/gates.cjs` sets it for you.
 *
 * Re-seed the baseline (a deliberate act, never a routine one):
 *       npm run build && SITE_ROOT=dist node scripts/figure-contract.cjs --seed
 * It prints the measured inventory as JSON. It never writes the file, because a
 * gate that can rewrite its own baseline can green itself.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(REPO_ROOT, 'scripts', 'figure-contract-baseline.json');

/*
 * Log nothing raw. Every string here comes from a file this gate read, and a
 * newline in one of them can forge a log line, which in CI is how a real
 * failure hides under a convincing fake success. Same guard as
 * `check-telltale-evidence.cjs`.
 */
function safe(value, max = 120) {
  return String(value)
    .replace(/\s+/g, ' ')
    .split('')
    .filter((ch) => ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) !== 0x7f)
    .join('')
    .slice(0, max);
}

/*
 * The named entities this site emits. Numeric references are decoded
 * arithmetically below, so only names need a table. An unrecognised NAME is a
 * hard failure — see the header.
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
}));

const ENTITY_RE = /&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/*
 * Returns { text, unknown }. `unknown` names every entity the table could not
 * resolve, so the caller can fail with the name rather than with a wrong
 * verdict about a digit.
 */
function decodeEntities(input) {
  const unknown = [];
  const text = String(input).replace(new RegExp(ENTITY_RE.source, 'g'), (whole, ref) => {
    if (ref.startsWith('#')) {
      const cp = ref[1] === 'x' || ref[1] === 'X'
        ? parseInt(ref.slice(2), 16)
        : parseInt(ref.slice(1), 10);
      if (Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff) return String.fromCodePoint(cp);
      unknown.push(`#${ref.slice(1)}`);
      return whole;
    }
    if (ENTITIES.has(ref)) return String.fromCodePoint(ENTITIES.get(ref));
    unknown.push(ref);
    return whole;
  });
  return { text, unknown };
}

// One space between words, no leading or trailing space. The source indents its
// SVG markup, so a re-indent must not read as a changed figure.
function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/*
 * The content region: the page's <main>, which on every page of this site
 * carries `wrap` and on all but one also `article-body`. Scoping here is what
 * keeps site chrome — the nav, the footer, the theme toggle — outside a rule
 * written for editorial figures. <main> does not nest, so the first open tag
 * and the first close tag bound it.
 */
function contentRegion(html) {
  const open = /<main\b[^>]*>/.exec(html);
  if (!open) return null;
  const cls = (open[0].match(/\bclass="([^"]*)"/) || [, ''])[1].split(/\s+/);
  if (!cls.includes('wrap') && !cls.includes('article-body')) return null;
  const start = open.index + open[0].length;
  const end = html.indexOf('</main>', start);
  return end === -1 ? html.slice(start) : html.slice(start, end);
}

function matchAll(source, flags, text) {
  // A fresh RegExp per call. A module-level /g pattern carries `lastIndex`
  // between calls, which silently skips the first match on the second page.
  const local = new RegExp(source, flags);
  const found = [];
  let m;
  while ((m = local.exec(text)) !== null) found.push(m);
  return found;
}

function classToken(openTag) {
  const cls = (openTag.match(/\bclass="([^"]*)"/) || [, ''])[1].trim();
  if (cls) return `.${cls.split(/\s+/)[0]}`;
  const id = (openTag.match(/\bid="([^"]*)"/) || [, ''])[1].trim();
  if (id) return `#${id}`;
  return '(unnamed)';
}

/*
 * One key, built in one place.
 *
 * A baseline entry is identified by its page and its figure together, so the
 * two have to be joined. The separator is a NUL because neither a page path nor
 * a class token can contain one, which makes a collision impossible: without it
 * `a.html` + `.p b` and `a.html .p` + `b` are the same key.
 *
 * A NUL is also invisible, and that is exactly why this function exists rather
 * than eight copies of the join. Eight hand-written copies of a character
 * nobody can see is a defect waiting for the first editor who normalises one of
 * them, and the gate would then silently stop matching its own baseline.
 */
const KEY_SEP = '\u0000';
function figureKey(page, figure) {
  return `${page}${KEY_SEP}${figure}`;
}

function svgsIn(region) {
  return matchAll('<svg\\b[^>]*>[\\s\\S]*?<\\/svg>', 'g', region).map((m) => {
    const open = /<svg\b[^>]*>/.exec(m[0])[0];
    return {
      name: classToken(open),
      generated: /\bdata-fig-generated="true"/.test(open),
      body: m[0],
    };
  });
}

/*
 * The index of the `>` that closes the tag opening at `start`, or -1.
 *
 * Quoted attribute values are skipped, so `<a title="a>b">` closes at the last
 * `>` and not the one inside the title.
 *
 * A comment ends at `-->` and not at the first `>` inside it. Every plate on
 * this site is preceded by a comment that records its design rationale, and
 * those comments hold `>` characters. Without this branch the tail of such a
 * comment reads as page text.
 */
function closeOfTag(markup, start) {
  if (markup.startsWith('<!--', start)) {
    const end = markup.indexOf('-->', start + 4);
    return end === -1 ? -1 : end + 2;
  }
  let quote = null;
  for (let i = start + 1; i < markup.length; i += 1) {
    const ch = markup[i];
    if (quote !== null) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

/*
 * The text content of a markup fragment: every character that sits outside a
 * tag, with `joiner` written where each tag was.
 *
 * THIS IS NOT A SANITIZER, and nothing in this file ever writes HTML. The
 * result is tested for a digit and printed through `safe()`.
 *
 * It is hand-written rather than a `replace(/<[^>]*>/g, '')` for two reasons,
 * and CodeQL is right about the first. That pattern is an incomplete
 * multi-character sanitization: an attribute value holding a `>` ends the match
 * early and leaves markup in the "text". This gate reads real page markup, so
 * that is a correctness bug here and not only a lint. The second reason is that
 * the pattern reads as a sanitizer to every later reader, and one of them will
 * eventually reuse it where the output does reach a page.
 */
function textOf(markup, joiner) {
  let out = '';
  let i = 0;
  while (i < markup.length) {
    const lt = markup.indexOf('<', i);
    if (lt === -1) return out + markup.slice(i);
    out += markup.slice(i, lt);
    const gt = closeOfTag(markup, lt);
    if (gt === -1) return out + markup.slice(lt); // an unclosed tag is text
    out += joiner;
    i = gt + 1;
  }
  return out;
}

function textNodesIn(svg) {
  // The joiner is empty: an SVG <tspan> is an inline run of the same string, so
  // a space between runs would invent a word break that does not render.
  return matchAll('<text\\b[^>]*>([\\s\\S]*?)<\\/text>', 'g', svg)
    .map((m) => textOf(m[1], ''));
}

function figuresIn(region) {
  // <figure> does not nest on this site, so a non-greedy body is exact.
  return matchAll('<figure\\b[^>]*>[\\s\\S]*?<\\/figure>', 'g', region).map((m) => {
    const open = /<figure\b[^>]*>/.exec(m[0])[0];
    return {
      name: classToken(open),
      declared: /\bdata-fig="[^"]*"/.test(open),
      body: m[0],
    };
  });
}

/*
 * The parity counter. A `data-fig` written on something this pattern cannot
 * read produces no complaint, and an absence looks exactly like a pass. The
 * same backstop sits in `check-telltale-evidence.cjs` and
 * `check-published-metrics.cjs`, for the same reason.
 */
function unparsedFigureMarkers(region) {
  const raw = (region.match(/\bdata-fig=/g) || []).length;
  const parsed = figuresIn(region).filter((f) => f.declared).length;
  return raw - parsed;
}

/*
 * The index of the close tag that balances an already-open `<tag>`, starting the
 * search at `from`. Returns the end of the string when nothing closes it.
 *
 * Depth is counted, and a non-greedy match to the first close tag is not
 * enough. The caption contract puts the exact numbers inside a `data-metric` or
 * `data-tt` span INSIDE `.fig-what`, so same-name nesting is the normal case.
 * A first-close read returns the fragment before the nested span, which is a
 * silent truncation rather than a visible failure.
 */
function closingIndexOf(markup, tag, from) {
  const openRe = new RegExp(`^<${tag}\\b`, 'i');
  const closeRe = new RegExp(`^</${tag}\\s*>$`, 'i');
  let depth = 0;
  let i = from;
  while (i < markup.length) {
    const lt = markup.indexOf('<', i);
    if (lt === -1) break;
    const gt = closeOfTag(markup, lt);
    if (gt === -1) break;
    const piece = markup.slice(lt, gt + 1);
    if (closeRe.test(piece)) {
      if (depth === 0) return lt;
      depth -= 1;
    } else if (openRe.test(piece) && !piece.endsWith('/>')) {
      depth += 1;
    }
    i = gt + 1;
  }
  return markup.length;
}

/*
 * The text of one caption slot, or null when the slot is absent.
 *
 * The class is matched as a WHOLE TOKEN, split on whitespace. A `\b`-anchored
 * pattern also accepts `fig-what-extra`, because a hyphen is a word boundary,
 * and a required slot that a near-miss class name satisfies is a required slot
 * with a hole in it.
 */
function slotText(figureBody, slot) {
  let i = 0;
  while (i < figureBody.length) {
    const lt = figureBody.indexOf('<', i);
    if (lt === -1) return null;
    const gt = closeOfTag(figureBody, lt);
    if (gt === -1) return null;
    const openTag = figureBody.slice(lt, gt + 1);
    const tag = (openTag.match(/^<([a-zA-Z][\w-]*)/) || [])[1];
    const cls = (openTag.match(/\bclass="([^"]*)"/) || [, ''])[1];
    if (tag && cls.trim().split(/\s+/).includes(slot)) {
      const body = figureBody.slice(gt + 1, closingIndexOf(figureBody, tag, gt + 1));
      return normalize(decodeEntities(textOf(body, ' ')).text);
    }
    i = gt + 1;
  }
  return null;
}

/*
 * The measured inventory of digit-bearing SVG text, keyed the way a baseline
 * entry is keyed. `--seed` prints this; `verify` compares against it.
 */
function inventory({ pages }) {
  const plates = new Map();
  const undeclared = new Map();
  const unknownEntities = [];
  let regions = 0;
  let svgCount = 0;

  for (const { rel, html } of pages) {
    const region = contentRegion(html);
    if (region === null) continue;
    regions += 1;

    for (const svg of svgsIn(region)) {
      svgCount += 1;
      for (const raw of textNodesIn(svg.body)) {
        const { text, unknown } = decodeEntities(raw);
        for (const name of unknown) unknownEntities.push({ rel, name, sample: normalize(raw) });
        const value = normalize(text);
        if (!/[0-9]/.test(value)) continue;
        const key = figureKey(rel, svg.name);
        if (!plates.has(key)) {
          plates.set(key, { page: rel, figure: svg.name, generated: svg.generated, texts: [] });
        }
        const entry = plates.get(key);
        if (!entry.texts.includes(value)) entry.texts.push(value);
      }
    }

    for (const fig of figuresIn(region)) {
      if (fig.declared) continue;
      const key = figureKey(rel, fig.name);
      if (!undeclared.has(key)) undeclared.set(key, { page: rel, figure: fig.name });
    }
  }

  return {
    plates: [...plates.values()],
    undeclaredFigures: [...undeclared.values()],
    unknownEntities,
    regions,
    svgCount,
  };
}

function validateBaseline(baseline) {
  const problems = [];
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) {
    return ['the baseline file did not parse as an object.'];
  }
  for (const field of ['digitPlates', 'undeclaredFigures']) {
    if (!Array.isArray(baseline[field])) {
      problems.push(`\`${field}\` is missing or is not an array.`);
    }
  }
  if (problems.length) return problems;

  for (const e of baseline.digitPlates) {
    const where = `digitPlates entry "${safe(e && e.figure, 40)}" on "${safe(e && e.page, 60)}"`;
    if (!e || !e.page || !e.figure) {
      problems.push('a digitPlates entry names no `page` or no `figure`.');
      continue;
    }
    if (!Array.isArray(e.texts) || e.texts.length === 0
      || e.texts.some((t) => typeof t !== 'string')) {
      problems.push(`${where} must list its exact text values as strings in \`texts\`.`);
    }
    if (!e.reason) {
      problems.push(
        `${where} carries no \`reason\`. An exemption with no recorded reason is a `
        + 'rule nobody decided to break.'
      );
    }
  }
  for (const e of baseline.undeclaredFigures) {
    if (!e || !e.page || !e.figure) {
      problems.push('an undeclaredFigures entry names no `page` or no `figure`.');
      continue;
    }
    if (!e.reason) {
      problems.push(
        `undeclaredFigures entry "${safe(e.figure, 40)}" on "${safe(e.page, 60)}" carries `
        + 'no `reason`.'
      );
    }
  }
  return problems;
}

/*
 * `pages` is a list of `{ rel, html }`. Taking parsed pages rather than a
 * directory is what lets the adversarial suite drive every failure mode with
 * fixtures it builds itself, with no build and no `dist/`.
 */
function verify({ pages, baseline }) {
  const problems = validateBaseline(baseline);
  if (problems.length) return { problems, checked: 0 };

  const inv = inventory({ pages });
  let checked = 0;

  /*
   * An unresolved entity stops the run here, before any page verdict. The gate
   * cannot say what that text renders, so every verdict below it would be a
   * guess — and the guess is wrong in both directions: `&frac12;` spells a
   * digit and renders none, `&#52;` spells none and renders one. One loud stop
   * with the entity's name is the only honest report.
   */
  for (const { rel, name, sample } of inv.unknownEntities) {
    problems.push(
      `${safe(rel)}: SVG text uses the entity "&${safe(name, 40)};", which this gate `
      + 'cannot resolve, so its rendered text went unchecked.\n'
      + `  Text: ${JSON.stringify(safe(sample, 80))}\n`
      + '  Add the entity to ENTITIES in scripts/figure-contract.cjs. An entity that is '
      + 'passed through un-decoded can spell a digit that never renders.'
    );
  }
  if (problems.length) return { problems, checked: 0, regions: inv.regions, svgCount: inv.svgCount };

  // --- R-D, the digit rule ---------------------------------------------------
  const platesByKey = new Map(
    baseline.digitPlates.map((e) => [figureKey(e.page, e.figure), e])
  );

  for (const live of inv.plates) {
    if (live.generated) continue; // a PLOT names its artifact and its commit
    const key = figureKey(live.page, live.figure);
    const entry = platesByKey.get(key);
    if (!entry) {
      problems.push(
        `${safe(live.page)}: the hand-drawn figure "${safe(live.figure, 40)}" holds a digit `
        + `in its SVG text: ${live.texts.map((t) => JSON.stringify(safe(t, 60))).join(', ')}\n`
        + '  A hand-drawn figure carries no digit (ADR-013). Move the number into the '
        + 'caption, into kept prose, or into a `data-metric` / `data-tt` span, where a gate '
        + 'reads it.\n'
        + '  If the geometry is interpolated from a named artifact, mark the <svg> '
        + '`data-fig-generated="true"` and name the artifact and the commit in `.fig-what`.'
      );
      continue;
    }
    checked += 1;
    for (const value of live.texts) {
      if (!entry.texts.includes(value)) {
        problems.push(
          `${safe(live.page)}: "${safe(live.figure, 40)}" now renders the digit text `
          + `${JSON.stringify(safe(value, 60))}, which the baseline does not list.\n`
          + '  The baseline exempts what already shipped. It does not exempt a new number '
          + 'added to an old figure.'
        );
      }
    }
  }

  // Anti-rot for R-D. A stale exemption is an exemption nobody granted.
  for (const entry of baseline.digitPlates) {
    const key = figureKey(entry.page, entry.figure);
    const live = inv.plates.find((p) => figureKey(p.page, p.figure) === key);
    if (!live) {
      problems.push(
        `the baseline exempts "${safe(entry.figure, 40)}" on "${safe(entry.page, 60)}", but `
        + 'no such figure with digit text is on the built site.\n'
        + '  Either the figure moved, or it is gone. Delete the entry deliberately; do not '
        + 'leave an exemption standing for something nobody can see.'
      );
      continue;
    }
    for (const value of entry.texts) {
      if (!live.texts.includes(value)) {
        problems.push(
          `the baseline records ${JSON.stringify(safe(value, 60))} inside `
          + `"${safe(entry.figure, 40)}" on "${safe(entry.page, 60)}", and the built page no `
          + 'longer renders it.\n'
          + '  These are frozen historical records. A changed figure is a changed published '
          + 'claim, so it is a decision, not an edit. Update the entry only with an ADR line.'
        );
      }
    }
  }

  // --- R-C and R-N, per page -------------------------------------------------
  const undeclaredAllowed = new Set(
    baseline.undeclaredFigures.map((e) => figureKey(e.page, e.figure))
  );

  for (const { rel, html } of pages) {
    const region = contentRegion(html);
    if (region === null) continue;

    const missed = unparsedFigureMarkers(region);
    if (missed > 0) {
      problems.push(
        `${safe(rel)}: ${missed} \`data-fig\` attribute(s) this gate could not parse, so `
        + 'those figures are checked by nothing.\n'
        + '  A figure must be one <figure> element carrying data-fig, closed by </figure>.'
      );
    }

    for (const fig of figuresIn(region)) {
      if (!fig.declared) {
        const key = figureKey(rel, fig.name);
        if (!undeclaredAllowed.has(key)) {
          problems.push(
            `${safe(rel)}: the figure "${safe(fig.name, 40)}" carries no \`data-fig\`.\n`
            + '  Every new figure declares its kind: data-fig="plate", "strip", "map", '
            + '"plot", "frame", or "table". Without the attribute a figure escapes the '
            + 'caption rule.'
          );
        }
        continue;
      }
      checked += 1;
      for (const slot of ['fig-what', 'fig-limit']) {
        const value = slotText(fig.body, slot);
        if (value === null) {
          problems.push(
            `${safe(rel)}: the figure "${safe(fig.name, 40)}" declares data-fig but holds no `
            + `\`.${slot}\` in its <figcaption>.\n`
            + '  The caption has two slots and both are required: .fig-what states what the '
            + 'figure argues, and .fig-limit states what it does not show.'
          );
        } else if (value === '') {
          problems.push(
            `${safe(rel)}: \`.${slot}\` inside "${safe(fig.name, 40)}" is empty.\n`
            + '  An empty .fig-limit is the failure this slot exists to stop: a figure that '
            + 'ends on a win while the caveat sits somewhere else (ADR-007).'
          );
        }
      }
    }
  }

  // --- the inert-gate check --------------------------------------------------
  if (inv.regions === 0) {
    problems.push(
      'no page carried a <main> content region, so this gate checked nothing.\n'
      + '  A check that verifies nothing reads exactly like a clean run.'
    );
  } else if (inv.svgCount === 0) {
    problems.push(
      `${inv.regions} page(s) were read and not one carried an <svg> in its content region.\n`
      + '  Every figure on this site is an inline SVG, so zero means the pattern broke, not '
      + 'that the site is clean.'
    );
  }

  return { problems, checked, regions: inv.regions, svgCount: inv.svgCount };
}

function findHtml(root, dir = '.', out = []) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const rel = dir === '.' ? name : `${dir}/${name}`;
    if (fs.statSync(path.join(root, rel)).isDirectory()) findHtml(root, rel, out);
    else if (name.endsWith('.html')) out.push(rel);
  }
  return out;
}

function readPages(siteRoot) {
  const rels = findHtml(siteRoot);
  return rels.map((rel) => ({
    rel,
    html: fs.readFileSync(path.join(siteRoot, rel), 'utf8'),
  }));
}

function main(argv) {
  const siteRoot = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();

  let pages;
  try {
    pages = readPages(siteRoot);
  } catch (err) {
    console.error(`✗ figure-contract: could not read ${safe(siteRoot)}.`);
    console.error(`  ${safe(err.message)}`);
    console.error('  Run `npm run build` first, then point SITE_ROOT at dist.');
    return 1;
  }

  if (pages.length === 0) {
    console.error(`✗ figure-contract: no HTML found under ${safe(siteRoot)}.`);
    console.error('  Nothing was checked. Run `npm run build`, then set SITE_ROOT=dist.');
    return 1;
  }

  if (argv.includes('--seed')) {
    const inv = inventory({ pages });
    console.log(JSON.stringify({
      digitPlates: inv.plates.map((p) => ({
        page: p.page,
        figure: p.figure,
        texts: p.texts,
        reason: 'TODO: record why this figure already ships a digit.',
      })),
      undeclaredFigures: inv.undeclaredFigures.map((f) => ({
        page: f.page,
        figure: f.figure,
        reason: 'TODO: record why this figure predates the contract.',
      })),
      unknownEntities: inv.unknownEntities,
    }, null, 2));
    console.error(
      `\n(seed only: ${inv.plates.length} digit-bearing figure(s), `
      + `${inv.undeclaredFigures.length} undeclared figure(s), across ${inv.regions} page(s). `
      + 'Nothing was written. Paste this into scripts/figure-contract-baseline.json and '
      + 'replace every reason.)'
    );
    return 0;
  }

  let baseline;
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch (err) {
    console.error('✗ figure-contract: could not read the baseline.');
    console.error(`  ${BASELINE_PATH}`);
    console.error(`  ${safe(err.message)}`);
    return 1;
  }

  const { problems, checked, regions, svgCount } = verify({ pages, baseline });

  if (problems.length) {
    console.error('THE FIGURE CONTRACT IS BROKEN:\n');
    for (const p of problems) console.error(`  ${p}\n`);
    console.error(`Baseline: ${BASELINE_PATH}`);
    console.error('Rules and reasoning: decisions/ADR-013-diagram-led-narrative.md');
    return 1;
  }

  console.log(
    `OK - the figure contract holds. ${checked} figure(s) checked across ${regions} page(s) `
    + `and ${svgCount} content SVG(s).`
  );
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = {
  decodeEntities,
  normalize,
  contentRegion,
  svgsIn,
  textNodesIn,
  figuresIn,
  unparsedFigureMarkers,
  slotText,
  inventory,
  validateBaseline,
  verify,
  textOf,
  BASELINE_PATH,
};
