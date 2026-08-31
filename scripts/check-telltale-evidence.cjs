#!/usr/bin/env node
/*
 * Every telltale figure and frame on the built site must agree with
 * src/data/telltale-evidence.json.
 *
 * WHY THIS EXISTS. The telltale page argues one rule: a gauge may state a
 * number, or it may state nothing, but it may not state a number nobody
 * measured. A page that argues that rule and then carries hand-typed counts
 * refutes itself. So `scripts/pull-telltale-evidence.cjs` re-reads the counts
 * from the telltale repository at a pinned commit, writes them to
 * `src/data/telltale-evidence.json`, and this gate compares the rendered page
 * to that record.
 *
 * The telltale project learned the same lesson upstream. Its README frames
 * were drawn by hand, and they drifted several ways at once, including a cost
 * line that showed a derived dollar figure the codebase refuses to compute.
 * They are now emitted by its test suite. This gate is the same control, one
 * repository over.
 *
 * WHY EQUALITY AND NOT A SUBSTRING SEARCH. A page-wide substring search passes
 * when a wrong number sits beside a correct one. This site has a whole page
 * about checks that pass on work that never happened, so the assertion is
 * anchored to the attribute: for each `data-tt` key, the element's rendered
 * text must EQUAL the stored value. A raw-attribute parity counter backs that
 * up, because a marker the pattern cannot read is not a mismatch. It is an
 * absence, and an absence looks exactly like a pass. The same backstop is in
 * `check-published-metrics.cjs`, for the same reason.
 *
 * HOW A NUMBER OPTS IN.
 *     <span data-tt="goldens.total">132</span>
 * HOW A FRAME OPTS IN. The `data-tt-frame` key names the entry in `frames`:
 *     <pre class="tt-frame" data-tt-frame="council" tabindex="0">...</pre>
 *
 * THE TWO MARKER TYPES CARRY DIFFERENT WEIGHT, AND THAT IS DELIBERATE. A figure
 * is typed into the page by hand, so the equality check below is what stops a
 * mistyped count from shipping. A frame is interpolated from the record by the
 * page, so page-versus-record drift is impossible by construction rather than
 * detected after the fact — the stronger guarantee, and the right one for 120
 * columns of terminal output where one retyped space is invisible to a reader
 * and fatal to the alignment. The frame assertions below therefore earn their
 * keep on what is left: that every key on the page resolves to a stored frame,
 * and that every stored line is pure ASCII. Do not read the frame equality
 * check as protection against a hand edit of the page; there is nothing there
 * to hand-edit.
 *
 * DO NOT USE `data-metric` FOR THESE FIGURES. That key space belongs to the
 * classifier artifact, and `check-published-metrics.cjs` exits 1 on a key it
 * does not know.
 *
 * FAILURE POLICY:
 *   - unknown key                      -> exit 1. A typo is checked by nobody.
 *   - rendered text != stored value    -> exit 1. The real guard.
 *   - unparsed marker                  -> exit 1. A published, unchecked figure.
 *   - zero markers on the telltale page-> exit 1. A check that verifies nothing
 *                                         reads as a pass.
 *   - malformed evidence file          -> exit 1.
 *   - a frame line that is not ASCII   -> exit 1. See below.
 *   - a stale `pulledAt`               -> WARNING, never a failure. A time bomb
 *                                         reddens CI on a quiet month, and the
 *                                         page prints the date, so a stale
 *                                         figure is visible to the reader.
 *
 * WHY THE ASCII RULE. A golden file named `-ascii` is not necessarily ASCII:
 * `arena-check-ascii.txt` in the telltale repository carries one non-ASCII
 * character. A non-ASCII character in a pasted frame fails the font-coverage
 * gate later, after the copy is written, so this gate rejects it at the record.
 *
 * Run:  npm run build && SITE_ROOT=dist node scripts/check-telltale-evidence.cjs
 * On Windows, set the variable first; a bare `SITE_ROOT=dist node ...` prefix is
 * POSIX shell syntax. `scripts/gates.cjs` sets it for you.
 */
const fs = require('fs');
const path = require('path');

/*
 * THE PUBLICATION BOUNDARY, RE-APPLIED TO THE RECORD AT BUILD TIME.
 *
 * `scripts/pull-telltale-evidence.cjs` applies the boundary rules when it cuts a
 * window. It runs by hand, on one machine, once. So until this line existed, a
 * hand edit of `src/data/telltale-evidence.json`, or a widened window committed
 * without re-running the puller, reached the public site with every gate green.
 * The puller's own header records that gap and exports these rules to close it.
 *
 * The rules live there and are not copied here on purpose. Two copies of a
 * denylist drift, and the copy that stops matching is the one nobody reads.
 *
 * Requiring the puller runs nothing: it declares constants and functions, and
 * its `main()` sits behind a `require.main === module` check.
 */
const { assertBoundaryLines } = require('./pull-telltale-evidence.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const EVIDENCE_PATH = path.join(REPO_ROOT, 'src', 'data', 'telltale-evidence.json');

// The page whose whole argument is that its numbers are checked. If it carries
// no marker, either the markers were dropped or this gate went inert.
const REQUIRED_PAGE = 'projects/telltale.html';

// A `pulledAt` older than this prints a warning. It never fails.
const STALE_DAYS = 120;

/*
 * Attribute-order tolerant on purpose. `check-published-metrics.cjs` once
 * required its attribute to come first, so a marker written
 * `<span class="..." data-metric="...">` matched nothing and the figure went
 * unguarded while the gate stayed green.
 *
 * `\bdata-tt=` does not match `data-tt-frame=`, because the `=` must follow
 * `tt` immediately. The two raw counters therefore do not double-count.
 */
const FIGURE_RE = /<span\b[^>]*\bdata-tt="([^"]+)"[^>]*>([^<]*)<\/span>/g;
const RAW_FIGURE_RE = /\bdata-tt=/g;
const FRAME_RE = /<pre\b[^>]*\bdata-tt-frame="([^"]+)"[^>]*>([\s\S]*?)<\/pre>/g;
const RAW_FRAME_RE = /\bdata-tt-frame=/g;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHA_RE = /^[0-9a-f]{7,40}$/;

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
 *
 * Ported verbatim from `scripts/figure-contract.cjs` (commit 864c356), where
 * #244 and #264 taught the figure gate this exact lesson. Two copies exist
 * because the two gates are deliberately dependency-free of each other; a
 * change to either copy owes the other a look.
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

// The elements whose content is text for a parser, never markup.
const RAW_TEXT_ELEMENTS = new Set(['style', 'script']);

/*
 * The page with every span a browser does NOT turn into elements removed:
 * comments, and the bodies of <style> and <script> islands. `verify` calls it
 * once per page, so every marker pattern below reads the reduced page and no
 * counter has to remember.
 *
 * WHY IT IS NEEDED. The four marker patterns above run a regex over raw HTML,
 * so markup a comment switched off still reads as markup on the page. Measured
 * 2026-08-30 against this checker before the port (routed from lane B3,
 * PR #264): a commented-out `data-tt` span parses as a LIVE figure and fails
 * the equality check against markup no reader sees, and a `[data-tt="..."]`
 * selector in a style island counts as an unparsed raw marker. Both were
 * latent while the telltale page carried no such markup; a page rewrite makes
 * them live. The cheapest way to green either false failure is to delete the
 * comment or the selector, which is the wrong fix twice.
 *
 * Unlike the figure gate's `contentRegion`, this chokepoint does NOT scope to
 * <main>: a `data-tt` marker anywhere on a page is a published figure, and a
 * <main> scope would silently unguard one that moved outside it.
 *
 * COMMENTS ARE DELETED, NOT BLANKED. Removing a comment node joins the text
 * runs either side of it, which is what the reader sees: `n=<!-- note -->54`
 * renders `n=54`. The pass runs left to right, so position decides precedence:
 * a <style> inside a comment is comment, and a comment inside a <style> is
 * style. Ported from `scripts/figure-contract.cjs` `stripNonMarkup`
 * (commit 864c356); see that copy for the full derivation.
 */
function stripNonMarkup(region) {
  let out = '';
  let i = 0;
  while (i < region.length) {
    const lt = region.indexOf('<', i);
    if (lt === -1) return out + region.slice(i);
    out += region.slice(i, lt);

    if (region.startsWith('<!--', lt)) {
      const end = region.indexOf('-->', lt + 4);
      /*
       * An unterminated comment runs to the end of the region, as it does in a
       * browser. Keeping the tail would be reading markup nobody can see. This
       * is why the branch does not delegate to `closeOfTag`: the two agree on
       * a terminated comment and disagree here.
       */
      if (end === -1) return out;
      i = end + 3;
      continue;
    }

    const gt = closeOfTag(region, lt);
    if (gt === -1) return out + region.slice(lt); // an unclosed tag is text
    const openTag = region.slice(lt, gt + 1);
    out += openTag;
    i = gt + 1;

    const tag = (openTag.match(/^<([a-zA-Z][\w-]*)/) || [])[1];
    if (!tag || openTag.endsWith('/>') || !RAW_TEXT_ELEMENTS.has(tag.toLowerCase())) continue;
    // Raw text runs to the close tag and no `<` inside it opens anything, which
    // is why this cannot be left to the ordinary tag walk above.
    const close = new RegExp(`</${tag}\\s*>`, 'i').exec(region.slice(i));
    if (!close) return out;
    out += close[0];
    i += close.index + close[0].length;
  }
  return out;
}

/*
 * Log nothing raw. Every string here comes from a file this gate read, and a
 * newline in one of them can forge a log line, which in CI is how a real
 * failure hides under a convincing fake success. Same guard as
 * `check-published-metrics.cjs`.
 */
function safe(value, max = 200) {
  return String(value)
    .replace(/\s+/g, ' ')
    .split('')
    .filter((ch) => ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) !== 0x7f)
    .join('')
    .slice(0, max);
}

function matchAll(re, text) {
  const found = [];
  // A fresh RegExp per call. A module-level /g pattern carries `lastIndex`
  // between calls, which silently skips the first marker on the second page.
  const local = new RegExp(re.source, re.flags);
  let m;
  while ((m = local.exec(text)) !== null) found.push(m);
  return found;
}

function countOf(re, text) {
  return (text.match(new RegExp(re.source, re.flags)) || []).length;
}

function figuresIn(html) {
  return matchAll(FIGURE_RE, html).map((m) => [m[1], m[2]]);
}

function unparsedFigures(html) {
  return countOf(RAW_FIGURE_RE, html) - figuresIn(html).length;
}

function framesIn(html) {
  return matchAll(FRAME_RE, html).map((m) => [m[1], m[2]]);
}

function unparsedFrames(html) {
  return countOf(RAW_FRAME_RE, html) - framesIn(html).length;
}

/*
 * The five entities the HTML escaper produces. The frame text is compared byte
 * for byte against the golden lines, so the rendered form has to be decoded
 * first or every frame with a `<` in it reports a false mismatch.
 */
function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function firstNonAscii(line) {
  for (const ch of line) {
    const cp = ch.codePointAt(0);
    if (cp > 0x7f) return cp;
  }
  return null;
}

/*
 * The record's own shape. `kind` has exactly two states and each one owes a
 * different field: a `counted` figure owes the command that produced it, and a
 * `cited` figure owes the source it was read from. There is no third state,
 * because "a number with no provenance" is the thing this page refuses.
 */
function validateEvidence(evidence) {
  const problems = [];
  if (!evidence || typeof evidence !== 'object') {
    return ['the evidence file did not parse as an object.'];
  }

  const source = evidence.source;
  if (!source || typeof source !== 'object') {
    problems.push('`source` is missing.');
  } else {
    if (!SHA_RE.test(String(source.sha || ''))) {
      problems.push(`\`source.sha\` "${safe(source.sha, 60)}" is not a hex commit id.`);
    }
    if (!ISO_DATE_RE.test(String(source.pulledAt || ''))) {
      problems.push(`\`source.pulledAt\` "${safe(source.pulledAt, 60)}" is not an ISO date.`);
    }
    if (!source.repo) problems.push('`source.repo` is missing.');
  }

  const figures = evidence.figures;
  if (!figures || typeof figures !== 'object') {
    problems.push('`figures` is missing.');
  } else {
    for (const [key, fig] of Object.entries(figures)) {
      if (!fig || typeof fig !== 'object') {
        problems.push(`figure "${safe(key)}" is not an object.`);
        continue;
      }
      if (typeof fig.value !== 'string') {
        problems.push(
          `figure "${safe(key)}" must store its value as a string, so the gate ` +
            'compares rendered text to stored text with no number formatting between.'
        );
      }
      if (fig.kind === 'counted') {
        if (!fig.command) {
          problems.push(`figure "${safe(key)}" is counted but names no \`command\`.`);
        }
      } else if (fig.kind === 'cited') {
        if (!fig.cite) {
          problems.push(`figure "${safe(key)}" is cited but names no \`cite\`.`);
        }
      } else {
        problems.push(
          `figure "${safe(key)}" has kind "${safe(fig.kind, 40)}". It must be ` +
            '"counted" or "cited". There is no third state.'
        );
      }
    }
  }

  const frames = evidence.frames || {};
  for (const [key, frame] of Object.entries(frames)) {
    if (!frame || !Array.isArray(frame.lines) || frame.lines.length === 0) {
      problems.push(`frame "${safe(key)}" carries no \`lines\`.`);
      continue;
    }
    if (!frame.path) problems.push(`frame "${safe(key)}" names no source \`path\`.`);
    frame.lines.forEach((line, i) => {
      const cp = firstNonAscii(String(line));
      if (cp !== null) {
        problems.push(
          `frame "${safe(key)}" line ${i + 1} contains U+${cp
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}. A pasted frame must be pure ASCII: an "-ascii" ` +
            'suffix upstream is not proof, and a stray codepoint fails the font gate later.'
        );
      }
    });
    /*
     * The boundary binds the RECORD, not only the puller. See the require at the
     * top of this file for why. A finding here is a publication defect, so the
     * remedy is to move the window in the puller and re-run it. It is never a
     * hand edit of this record.
     */
    for (const finding of assertBoundaryLines(frame.lines)) {
      problems.push(
        `frame "${safe(key)}" line ${finding.line} carries ${finding.rule}.\n` +
          `  Line: ${JSON.stringify(safe(finding.text, 100))}\n` +
          '  The publication boundary binds this record. Move the window in ' +
          'scripts/pull-telltale-evidence.cjs and re-run it. Never hand-edit a frame.'
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
function verify({ pages, evidence }) {
  const problems = validateEvidence(evidence);
  const figures = (evidence && evidence.figures) || {};
  const frames = (evidence && evidence.frames) || {};
  const known = new Set(Object.keys(figures));
  let checked = 0;
  let requiredPageMarkers = 0;
  let sawRequiredPage = false;

  for (const { rel, html: rawHtml } of pages) {
    if (rel === REQUIRED_PAGE) sawRequiredPage = true;

    // The chokepoint: every counter below reads only what a browser turns into
    // elements. See `stripNonMarkup` for the defect class this closes.
    const html = stripNonMarkup(rawHtml);

    const missedFigures = unparsedFigures(html);
    if (missedFigures > 0) {
      problems.push(
        `${safe(rel)}: ${missedFigures} \`data-tt\` attribute(s) this checker could ` +
          'not parse, so those published figures are guarded by nothing.\n' +
          '  A marker must be one <span> carrying data-tt with plain text inside: ' +
          '<span data-tt="goldens.total">132</span> (other attributes are fine).'
      );
    }

    const missedFrames = unparsedFrames(html);
    if (missedFrames > 0) {
      problems.push(
        `${safe(rel)}: ${missedFrames} \`data-tt-frame\` attribute(s) this checker ` +
          'could not parse. A frame must be one <pre> with plain text inside.'
      );
    }

    for (const [key, shown] of figuresIn(html)) {
      if (rel === REQUIRED_PAGE) requiredPageMarkers += 1;
      if (!known.has(key)) {
        problems.push(
          `${safe(rel)}: data-tt key "${safe(key)}" is not in the evidence file.\n` +
            `  Known keys: ${[...known].join(', ')}\n` +
            '  A typo\'d key is checked against nothing and passes forever.'
        );
        continue;
      }
      checked += 1;
      const stored = String(figures[key].value);
      const rendered = decodeEntities(shown);
      if (rendered !== stored) {
        problems.push(
          `${safe(rel)}: "${safe(key)}" renders as "${safe(rendered, 60)}" but the ` +
            `record says "${safe(stored, 60)}".\n` +
            '  Re-run scripts/pull-telltale-evidence.cjs, then fix the page. The ' +
            'record is the source of truth.'
        );
      }
    }

    for (const [key, shown] of framesIn(html)) {
      if (rel === REQUIRED_PAGE) requiredPageMarkers += 1;
      if (!Object.prototype.hasOwnProperty.call(frames, key)) {
        problems.push(
          `${safe(rel)}: data-tt-frame key "${safe(key)}" is not in the evidence file.\n` +
            `  Known frames: ${Object.keys(frames).join(', ')}`
        );
        continue;
      }
      checked += 1;
      const stored = frames[key].lines.join('\n');
      const rendered = decodeEntities(shown);
      if (rendered !== stored) {
        problems.push(
          `${safe(rel)}: frame "${safe(key)}" does not match the stored lines.\n` +
            '  A frame is pasted byte for byte from a golden file. Re-run ' +
            'scripts/pull-telltale-evidence.cjs and paste the stored lines again.'
        );
      }
    }
  }

  if (sawRequiredPage && requiredPageMarkers === 0) {
    problems.push(
      `${REQUIRED_PAGE} carries no data-tt marker.\n` +
        '  Either the markers were dropped or this gate is now inert. Both are ' +
        'failures, because a check that verifies nothing reads as a pass.'
    );
  }

  return { problems, checked, sawRequiredPage };
}

/*
 * Age is reported, never enforced. A hard expiry reddens CI on a month when
 * nothing changed, and the page prints `pulledAt` to the reader, so a stale
 * figure is visible rather than fatal.
 */
function ageWarning(evidence, today = new Date()) {
  const pulledAt = evidence && evidence.source && evidence.source.pulledAt;
  if (!ISO_DATE_RE.test(String(pulledAt || ''))) return null;
  const days = Math.floor((today - new Date(`${pulledAt}T00:00:00Z`)) / 86400000);
  if (days < STALE_DAYS) return null;
  return (
    `WARNING: the telltale evidence was pulled ${days} days ago (${safe(pulledAt)}). ` +
    'Re-run scripts/pull-telltale-evidence.cjs when convenient. This is not a failure.'
  );
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

function main() {
  const siteRoot = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();

  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
  } catch (err) {
    console.error(`✗ check-telltale-evidence: could not read the evidence file.`);
    console.error(`  ${EVIDENCE_PATH}`);
    console.error(`  ${safe(err.message)}`);
    console.error('  Generate it with: node scripts/pull-telltale-evidence.cjs --repo=<path>');
    return 1;
  }

  const rels = findHtml(siteRoot);
  if (rels.length === 0) {
    console.error(`✗ check-telltale-evidence: no HTML found under ${siteRoot}.`);
    console.error('  Nothing was checked. Run `npm run build`, then set SITE_ROOT=dist.');
    return 1;
  }

  const pages = rels.map((rel) => ({
    rel,
    html: fs.readFileSync(path.join(siteRoot, rel), 'utf8'),
  }));

  const { problems, checked, sawRequiredPage } = verify({ pages, evidence });

  if (!sawRequiredPage) {
    problems.push(
      `${REQUIRED_PAGE} was not found under ${safe(siteRoot)}. The page this gate ` +
        'exists for is missing from the build.'
    );
  }

  const warning = ageWarning(evidence);
  if (warning) console.warn(warning);

  if (problems.length) {
    console.error('TELLTALE EVIDENCE DOES NOT MATCH THE RECORD:\n');
    for (const p of problems) console.error(`  ${p}\n`);
    console.error(`Record: ${EVIDENCE_PATH}`);
    console.error('Every figure on that page names the command that produced it. Keep it true.');
    return 1;
  }

  console.log(
    `OK - ${checked} telltale figure(s) and frame(s) match the record ` +
      `(${safe(evidence.source.repo, 60)} at ${safe(evidence.source.sha, 40)}).`
  );
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  stripNonMarkup,
  figuresIn,
  unparsedFigures,
  framesIn,
  unparsedFrames,
  decodeEntities,
  validateEvidence,
  verify,
  ageWarning,
  REQUIRED_PAGE,
  EVIDENCE_PATH,
};
