#!/usr/bin/env node
/*
 * Verify every published metric on this site against the producer's artifact.
 *
 * WHY THIS EXISTS. On 2026-07-18 this site was found quoting category 88.9% and
 * domain 94.4% while the shipped classifier measured 94.4% and 92.6% — two prompt
 * changes stale, on a live page and on the résumé. Nobody was careless. The
 * numbers had been retyped by hand out of a text report, and nothing ever
 * compared the published text to the source again.
 *
 * The classifier now publishes evals/metrics.json, generated from the same
 * metrics() the CI gate grades. This script asserts the numbers on these pages
 * still match it. A figure that is checked cannot quietly go stale; a figure that
 * is only proofread eventually does.
 *
 * HOW A NUMBER OPTS IN. Wrap it:
 *     <span data-metric="category_accuracy">92.6%</span>
 * Only current figures are marked. Historical columns (v1 synthetic, v2 real...)
 * are deliberately NOT marked — they are frozen records of past runs and must not
 * track the latest artifact.
 *
 * FAILURE POLICY (matches the SYS-018 contract checks):
 *   - mismatch           -> exit 1. The real guard.
 *   - fetch failure      -> exit 0 with a loud warning. A GitHub outage must not
 *                           redden an unrelated build.
 *   - zero marked figures-> exit 1. A check that verifies nothing reads as a pass.
 *   - unknown metric key -> exit 1. A typo'd key would otherwise be checked
 *                           against nothing and silently pass forever.
 *
 * Run:  node scripts/check-published-metrics.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = process.cwd();
const ARTIFACT_URL =
  'https://raw.githubusercontent.com/sanlee-ys/defense-news-classifier/main/evals/metrics.json';

/*
 * Everything logged here is read from somewhere else — an HTTP response, or
 * markup in a checked-in file. Interpolating that straight into console output
 * lets a newline forge a log line, which in CI is how a real failure hides under
 * a convincing fake success. CodeQL flagged this on the file's first run. Low
 * severity at this blast radius, but the fix is one function.
 */
function safe(value, max = 200) {
  // Code-point filter rather than a regex class: keeping literal control
  // characters out of this source file means no editor, diff tool or shell
  // heredoc can silently mangle the guard.
  return String(value)
    .replace(/\s+/g, ' ')
    .split('')
    .filter((ch) => ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) !== 0x7f)
    .join('')
    .slice(0, max);
}

function fetchJson(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`WARNING: HTTP ${safe(res.statusCode)} fetching the metrics artifact.`);
        res.resume();
        return resolve(null);
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          console.warn(`WARNING: artifact was not valid JSON: ${safe(e.message)}`);
          resolve(null);
        }
      });
    });
    req.on('timeout', () => {
      console.warn('WARNING: timed out fetching the metrics artifact.');
      req.destroy();
      resolve(null);
    });
    req.on('error', (e) => {
      console.warn(`WARNING: could not fetch the metrics artifact: ${safe(e.message)}`);
      resolve(null);
    });
  });
}

function htmlFiles(dir, out = []) {
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'scripts') continue;
    const rel = dir === '.' ? name : `${dir}/${name}`;
    const stat = fs.statSync(path.join(ROOT, rel));
    if (stat.isDirectory()) htmlFiles(rel, out);
    else if (name.endsWith('.html')) out.push(rel);
  }
  return out;
}

/*
 * Compare numerically, not as strings. JSON serialises 87.0 as `87`, so a string
 * compare against the page's "87.0%" reports a mismatch that is not one — and a
 * false positive here is as corrosive as a miss, because a check that cries wolf
 * gets silenced.
 */
function sameValue(shown, published) {
  const a = parseFloat(String(shown).replace(/[%\s]/g, '').replace(/&nbsp;/g, ''));
  const b = parseFloat(String(published));
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return String(shown).trim() === String(published).trim();
  }
  // Both sides are rounded at generation (1dp for accuracies, 3dp for macro-F1),
  // so an exact compare is right; the epsilon only absorbs float representation.
  return Math.abs(a - b) < 1e-9;
}

function main() {
  return fetchJson(ARTIFACT_URL).then((artifact) => {
    if (!artifact) {
      console.log('Metrics check SKIPPED (see warning above).');
      return 0;
    }
    const published = artifact.gold || {};
    const known = new Set(Object.keys(published));

    const problems = [];
    let checked = 0;

    for (const file of htmlFiles('.')) {
      const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const re = /<span data-metric="([^"]+)">([^<]+)<\/span>/g;
      let m;
      while ((m = re.exec(html)) !== null) {
        const [, key, shown] = m;
        if (!known.has(key)) {
          problems.push(
            `${safe(file)}: data-metric="${safe(key)}" is not a key in the published artifact.\n` +
              `  Known keys: ${[...known].join(', ')}\n` +
              `  A typo'd key is checked against nothing and passes forever, so this fails.`
          );
          continue;
        }
        checked++;
        if (!sameValue(shown, published[key])) {
          problems.push(
            `${safe(file)}: ${safe(key)} is published as "${safe(shown, 40)}" but the ` +
              `classifier measured ${safe(published[key], 40)}.\n` +
              `  The artifact is the source of truth. Update the page, not the artifact.`
          );
        }
      }
    }

    if (problems.length) {
      console.error('PUBLISHED METRICS ARE STALE:\n');
      for (const p of problems) console.error(`  ${p}\n`);
      console.error(`Artifact: ${ARTIFACT_URL}`);
      console.error(
        'This is the failure that put wrong numbers on a résumé. Do not silence it.'
      );
      return 1;
    }

    if (checked === 0) {
      console.error(
        'No data-metric spans found. Either the markers were dropped, or this ' +
          'check is now inert — both are failures, because a check that verifies ' +
          'nothing reads as a pass.'
      );
      return 1;
    }

    console.log(
      `OK - ${checked} published metric(s) match the classifier artifact ` +
        `(v${safe(artifact.version, 20)}).`
    );
    return 0;
  });
}

main().then((code) => process.exit(code));
