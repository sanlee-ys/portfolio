#!/usr/bin/env node
/*
 * The plot generator. It reads a named artifact in a sibling repository at a
 * pinned commit, computes pixel geometry from the values it read, and writes
 * `src/data/figures.json`. The page then INTERPOLATES that geometry into its
 * SVG. It never types a coordinate and it never types a number.
 *
 * WHY. `.ci-plot` on the classifier page is the precedent, and it is the only
 * figure on this site whose geometry came from a measurement rather than from a
 * hand. Every other plate is markup somebody typed, so a number inside one is a
 * published figure with no producer. `scripts/figure-contract.cjs` now fails
 * the build on exactly that, and it grants one exit: an <svg> that carries
 * `data-fig-generated="true"`. This script is what earns that attribute.
 *
 * Drift is impossible by construction rather than detected after the fact. That
 * is the same mechanism `data-tt-frame` already uses on the telltale page, and
 * it is a stronger guarantee than any comparison a gate can make afterwards.
 *
 * WHY IT IS NOT IN `npm run qa`. It reads sibling repositories. A gate that
 * reaches outside this repository reddens for reasons that have nothing to do
 * with the site: a clone that is missing, a commit that was never fetched, a
 * checkout on another machine. `pull-telltale-evidence.cjs` and `og-cover.cjs`
 * sit outside the runner for the same reason. The gate that DOES run in CI is
 * the figure contract, and it reads the built page.
 *
 * WHY IT READS AT A COMMIT AND NOT FROM THE WORKING TREE. A published figure
 * names the commit it came from, and a reader must be able to re-run the
 * command and get the same numbers. A working tree is not a citable state.
 * `git show <sha>:<path>` is spawned directly, with no shell, so the colon
 * survives on Windows. Through Git Bash the same string is mangled.
 *
 * WHY THE WHOLE FILE IS REGENERATED. `src/data/figures.json` is a generated
 * aggregate, and a generated aggregate cannot be merged. It is written from
 * PLOTS below, in one hand at a time, so two lanes never hold two halves of it.
 * A lane adds its plot definition to PLOTS, runs this script, and commits both.
 *
 * Run:
 *     node scripts/build-plots.cjs --repo=C:\Users\sanle\code\defense-news-classifier
 *     node scripts/build-plots.cjs --repo=<path> --check
 *
 * `--repo` may be given more than once. `--check` computes everything and
 * writes nothing, and exits 1 if the result differs from the committed file.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(REPO_ROOT, 'src', 'data', 'figures.json');

/*
 * ---------------------------------------------------------------------------
 * THE PLOT REGISTRY
 * ---------------------------------------------------------------------------
 * A plot definition asserts what an artifact says, so only a lane that read the
 * artifact may add one. Each entry below names the file it read, and the caption
 * on the page repeats that name and the commit.
 *
 * A definition carries six fields. Copy this shape:
 *
 *   {
 *     key: 'dnc1-power',                 // the id the page interpolates by
 *     repo: 'defense-news-classifier',   // the DIRECTORY name under the code root
 *     ref: 'v2.1.0',                     // a tag or a sha. It is resolved and pinned.
 *     artifact: 'evals/scale_eval.txt',  // the path INSIDE that repository
 *     viewBox: [0, 0, 260, 132],
 *     extract(text) {                    // artifact text in, values out
 *       // Return a list of { label, value }. Throw on anything unexpected:
 *       // a silent zero is a published figure nobody measured.
 *       return [];
 *     },
 *     layout(values, viewBox) {          // values in, pixel geometry out
 *       // Return plain numbers only. The page reads them and draws.
 *       return {};
 *     },
 *   }
 *
 * RULES A DEFINITION OBEYS.
 *   1. `extract` throws rather than returns a default. An artifact that does
 *      not parse is a stop, not a zero.
 *   2. `layout` returns numbers, never strings. A string in the geometry is a
 *      number somebody typed.
 *   3. Every digit the page shows comes from `values`. The caption names the
 *      repository, the artifact, and the commit, in `.fig-what`.
 */
const PLOTS = [
  /*
   * dnc1-power, on `src/pages/projects/defense-news-classifier.astro`.
   *
   * WHAT IT ARGUES. One pre-registered bar, and one prompt clause measured twice
   * against it. The first run reverted at p=0.0522. A re-run on twice the rows
   * landed at p=0.0002 and shipped. The bar never moved. Prose can only assert
   * that a threshold held; a shared axis draws it.
   *
   * WHY THIS ARTIFACT. The pre-registration is the one committed file that
   * carries all three numbers: the bar, and both verdicts. Both eval reports
   * name it as canonical for the decision rule. Each p-value was also read in
   * the report that produced it, at this same commit:
   * `evals/region_clause_ab.txt` gives 0.0522 and `evals/region_clause_rerun.txt`
   * gives 0.0002. Two readings agree, so the page publishes one.
   *
   * WHY A LOG AXIS, AND WHY IT IS NOT A KINDNESS. A p-value is read in decades.
   * On a linear axis 0.0002 and zero paint the same pixel, and the reader loses
   * the whole gain of the second run. On a log axis the first run lands about
   * one pixel off the bar, which is the honest picture: it missed by 0.0022, and
   * the page says the experiment lacked the power to decide. The verdict word on
   * each row is what carries the outcome, because one pixel cannot.
   */
  {
    key: 'dnc1-power',
    repo: 'defense-news-classifier',
    ref: 'v3.2.1',
    artifact: 'docs/specs/global-boundary-clause-rerun.md',
    viewBox: [0, 0, 260, 132],
    extract(text) {
      const one = (label, pattern) => {
        const m = pattern.exec(text);
        if (!m) {
          throw new Error(
            `dnc1-power: "${label}" is not in this artifact at this commit.\n`
            + '  The spec was reformatted, or the wrong file is pinned. Re-read it and fix the '
            + 'pattern. A missing p-value must never become a default.'
          );
        }
        const value = Number(m[1]);
        if (!Number.isFinite(value) || value <= 0 || value > 1) {
          throw new Error(`dnc1-power: "${label}" read as "${m[1]}", which is not a p-value.`);
        }
        return { label, value };
      };
      return [
        one('pre-registered bar', /^\|\s*Pre-registered bar\s*\|\s*p < ([0-9.]+)\s*\|/m),
        one(
          'first run, region McNemar p',
          /^\|\s*McNemar exact, two-sided\s*\|\s*\*\*p = ([0-9.]+)\*\*\s*\|/m
        ),
        one('re-run, region McNemar p', /^\|\s*1\. Region [^|]*\|[^|]*\bp = ([0-9.]+)\)[^|]*\|/m),
      ];
    },
    layout(values) {
      const at = (label) => {
        const found = values.find((v) => v.label === label);
        if (!found) throw new Error(`dnc1-power: layout wanted "${label}" and did not get it.`);
        return found.value;
      };
      // The axis spans four decades, p = 1 down to p = 0.0001. Left is less
      // evidence, right is more.
      const DECADES = [0, -4];
      const TRACK = [24, 200];
      const x = (p) => {
        if (p < 1e-4 || p > 1) {
          throw new Error(
            `dnc1-power: p=${p} sits outside the drawn axis (1 down to 0.0001).\n`
            + '  Widen the axis deliberately. Never clamp a point onto a bar it did not reach.'
          );
        }
        return scale(DECADES, TRACK, Math.log10(p));
      };
      return {
        axisX0: TRACK[0],
        axisX1: TRACK[1],
        barX: x(at('pre-registered bar')),
        firstX: x(at('first run, region McNemar p')),
        rerunX: x(at('re-run, region McNemar p')),
      };
    },
  },
];

/*
 * ---------------------------------------------------------------------------
 * Geometry helpers. A definition uses these rather than its own arithmetic, so
 * two plots on two pages place a bar the same way.
 * ---------------------------------------------------------------------------
 */

// Map a value from a data domain onto a pixel range. The range may run
// downwards, which is the usual case for an SVG y axis.
function scale([d0, d1], [r0, r1], value) {
  if (d1 === d0) throw new Error('scale: the domain has zero width.');
  const t = (value - d0) / (d1 - d0);
  return round(r0 + t * (r1 - r0));
}

// Two decimal places. An SVG coordinate needs no more, and a long float in a
// committed artifact is noise in every future diff.
function round(n) {
  if (!Number.isFinite(n)) throw new Error(`round: ${n} is not a finite number.`);
  return Math.round(n * 100) / 100;
}

/*
 * ---------------------------------------------------------------------------
 * Reading an artifact at a pinned commit.
 * ---------------------------------------------------------------------------
 */

function git(repoPath, args) {
  const proc = spawnSync('git', ['-C', repoPath, ...args], { encoding: 'utf8' });
  if (proc.error) throw new Error(`git ${args[0]} failed to start: ${proc.error.message}`);
  if (proc.status !== 0) {
    throw new Error(`git ${args.join(' ')} exited ${proc.status}: ${(proc.stderr || '').trim()}`);
  }
  return proc.stdout;
}

function resolveSha(repoPath, ref) {
  const sha = git(repoPath, ['rev-parse', ref]).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`"${ref}" did not resolve to a commit.`);
  return sha;
}

function readAtCommit(repoPath, sha, artifact) {
  // Forward slashes: git's object paths are POSIX even on Windows.
  return git(repoPath, ['show', `${sha}:${artifact.split(path.sep).join('/')}`]);
}

function remoteName(repoPath) {
  try {
    const url = git(repoPath, ['config', '--get', 'remote.origin.url']).trim();
    const m = /([^/:]+\/[^/]+?)(?:\.git)?$/.exec(url);
    return m ? m[1] : path.basename(repoPath);
  } catch {
    return path.basename(repoPath);
  }
}

/*
 * ---------------------------------------------------------------------------
 * The run.
 * ---------------------------------------------------------------------------
 */

function buildPlot(def, repoPaths) {
  const repoPath = repoPaths.get(def.repo);
  if (!repoPath) {
    throw new Error(
      `plot "${def.key}" needs the "${def.repo}" repository. `
      + `Pass it: --repo=<path to ${def.repo}>`
    );
  }
  const sha = resolveSha(repoPath, def.ref);
  const text = readAtCommit(repoPath, sha, def.artifact);
  const values = def.extract(text);
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`plot "${def.key}": extract returned no values.`);
  }
  for (const v of values) {
    if (typeof v.label !== 'string' || typeof v.value !== 'number' || !Number.isFinite(v.value)) {
      throw new Error(`plot "${def.key}": every value needs a string label and a finite number.`);
    }
  }
  return {
    repo: remoteName(repoPath),
    sha,
    artifact: def.artifact,
    // The command a reader re-runs. It is the provenance, so it is stored as
    // text rather than rebuilt by whoever reads the file.
    command: `git -C <${def.repo}> show ${sha}:${def.artifact}`,
    viewBox: def.viewBox,
    values,
    geometry: def.layout(values, def.viewBox),
  };
}

function main(argv) {
  const repoPaths = new Map();
  let check = false;

  for (const arg of argv) {
    if (arg === '--check') { check = true; continue; }
    if (arg.startsWith('--repo=')) {
      const p = path.resolve(arg.slice('--repo='.length));
      if (!fs.existsSync(path.join(p, '.git'))) {
        console.error(`✗ build-plots: "${p}" is not a git repository.`);
        return 1;
      }
      repoPaths.set(path.basename(p), p);
      continue;
    }
    console.error(`✗ build-plots: unknown argument "${arg}".`);
    console.error('  Usage: node scripts/build-plots.cjs --repo=<path> [--repo=<path>] [--check]');
    return 1;
  }

  const plots = {};
  for (const def of PLOTS) {
    try {
      plots[def.key] = buildPlot(def, repoPaths);
    } catch (err) {
      console.error(`✗ build-plots: ${err.message}`);
      console.error('  Nothing was written. A partial record is worse than none, because the');
      console.error('  page would interpolate half of it and look correct.');
      return 1;
    }
  }

  const record = {
    note: 'Generated by scripts/build-plots.cjs. Do not edit by hand. Every geometry '
      + 'number here was computed from the named artifact at the named commit, and every '
      + 'page that draws one interpolates it. A hand edit here is a hand-typed figure with '
      + 'a provenance line in front of it.',
    generatedBy: 'scripts/build-plots.cjs',
    generatedAt: new Date().toISOString().slice(0, 10),
    plots,
  };

  const json = `${JSON.stringify(record, null, 2)}\n`;

  if (check) {
    const current = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';
    // `generatedAt` moves every day and says nothing about the figures, so it
    // is not part of the comparison.
    const strip = (s) => s.replace(/"generatedAt": "[^"]*"/, '"generatedAt": "-"');
    if (strip(current) !== strip(json)) {
      console.error('✗ build-plots: src/data/figures.json is not what the registry produces.');
      console.error('  Re-run without --check, then commit the result.');
      return 1;
    }
    console.log(`OK - src/data/figures.json matches the registry (${Object.keys(plots).length} plot(s)).`);
    return 0;
  }

  fs.writeFileSync(OUT_PATH, json);
  console.log(`OK - wrote ${path.relative(REPO_ROOT, OUT_PATH)} with ${Object.keys(plots).length} plot(s).`);
  if (PLOTS.length === 0) {
    console.log('  The registry is empty. Add a plot definition to PLOTS in this file.');
  }
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { scale, round, PLOTS, OUT_PATH };
