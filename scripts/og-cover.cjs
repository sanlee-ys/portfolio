#!/usr/bin/env node
/*
 * Render OG cards (1200x630) from HTML templates into public/assets/.
 *
 * Homepage card (unchanged contract):
 *     scripts/og-cover.html  →  public/assets/og-cover.png
 *
 * Per-project cards (same pipeline, parameterized template):
 *     scripts/og-cover-project.html + CARDS below
 *       → public/assets/og-<slug>.png
 *
 * WHY THIS EXISTS AS A SCRIPT. The card that shipped until 2026-07-28 was a
 * hand-made PNG from the site's previous identity: cool near-black ground,
 * a blue keyline, and three rounded pills reading "eval-driven development /
 * contract-first integration / AI product judgment". Every part of that had
 * stopped being true. The ground and the accent were from a theme the site no
 * longer has, and "AI product judgment" is precisely the label-y
 * self-description the colophon's own voice rule warns against — the one
 * surface where the site described itself instead of showing an artifact was
 * the surface every link preview renders.
 *
 * A binary with no source drifts silently, because nobody diffs a PNG. So the
 * card is generated: change the identity, run this, and the preview follows.
 *
 * It renders over the repo's own static server rather than from file://, for
 * the same reason `mobile-qa.cjs` does — the card loads the site's real
 * self-hosted woff2 files by URL, so it is set in the same Geist and Geist
 * Mono the pages are, not in a lookalike the renderer happened to have.
 *
 * That coupling is the point, and it is also the trap: delete a woff2 the card
 * names and this script renders the fallback face without erroring. The serif
 * removal on 2026-07-28 was exactly that case — og-cover.html named two
 * Newsreader files that no longer exist — so the card was repointed and
 * regenerated in the same commit. Check the PNG, not just the exit code.
 *
 * Run from the repo root, after `npm run build`:
 *     node scripts/og-cover.cjs
 *     node scripts/og-cover.cjs --only=false-green
 *
 * `--only=<slug>` regenerates one project card (or `home` for the homepage
 * PNG) without rewriting the others.
 *
 * It is deliberately NOT part of `npm run qa`. The gates check the built site;
 * this writes a source asset. Wiring a generator into a gate is how a check
 * ends up "fixing" what it was supposed to be reporting on.
 */
const fs = require('fs');
const path = require('path');
const { serve } = require('./static-server.cjs');

const REPO = path.resolve(__dirname, '..');
const HOME_SRC = path.join(__dirname, 'og-cover.html');
const PROJECT_SRC = path.join(__dirname, 'og-cover-project.html');
const OUT_DIR = path.join(REPO, 'public', 'assets');
const DIST = path.join(REPO, 'dist');

/**
 * Project cards. Numbers are locked to the page/spec — do not invent figures.
 * `reversed: true` paints the oxide double-rule (li.rev) used for denials.
 */
const CARDS = [
  {
    slug: 'false-green',
    filename: 'og-false-green.png',
    dateline: 'sanlee.me · false green',
    title: 'False Green',
    standfirst:
      'Six gates I built and wired into CI, later caught passing for work that never ran.',
    proof: [
      { claim: 'Review lane green, nothing posted', fig: '36s · 6 denials', reversed: true },
      { claim: 'Font gate saw only what its regex could', fig: '1 of 3 faces', reversed: true },
      { claim: 'Denial counter read a key that never existed', fig: 'denials=0 always', reversed: true },
    ],
  },
  {
    slug: 'faithfulness-judge',
    filename: 'og-faithfulness-judge.png',
    dateline: 'sanlee.me · faithfulness judge',
    title: 'Faithfulness Judge',
    standfirst:
      'How far an LLM judge can be trusted — and the harness bug that nearly shipped a false gap.',
    proof: [
      { claim: 'Nearly published a false tier gap', fig: '39 of 191 cut off', reversed: false },
      { claim: 'Opus binary agreement with gold', fig: 'κ 0.762', reversed: false },
      { claim: 'Premium escalation not evidenced', fig: 'p = 0.51', reversed: false },
    ],
  },
  {
    slug: 'defense-news-classifier',
    filename: 'og-defense-news-classifier.png',
    dateline: 'sanlee.me · defense news classifier',
    title: 'Defense News Classifier',
    standfirst:
      'An LLM classifier, and the eval harness that kept me honest about every upgrade.',
    proof: [
      { claim: 'Added retrieval grounding, cut it', fig: 'fixed 0, broke 4', reversed: true },
      { claim: 'Built the premium-model upgrade, declined it', fig: '0 rows at 1.97× the cost', reversed: true },
      { claim: 'Rebuilt the eval until accuracy fell', fig: '97.3% → 88.9%', reversed: false },
    ],
  },
  {
    slug: 'netops-lab',
    filename: 'og-netops-lab.png',
    dateline: 'sanlee.me · zero-touch',
    title: 'Zero-Touch Provisioning',
    standfirst:
      'A factory-blank router configures itself on one power cycle. The hard part was the host.',
    proof: [
      { claim: 'Wipe to provisioned, one command', fig: '~90s · one cycle', reversed: false },
      { claim: 'Forced password change was interactive-only', fig: 'script never hits it', reversed: false },
      { claim: 'Independent ingress paths enumerated', fig: '3 back doors', reversed: false },
    ],
  },
  {
    slug: 'the-system',
    filename: 'og-the-system.png',
    dateline: 'sanlee.me · the system',
    title: 'The System',
    standfirst:
      'One classifier became four repos. The work was the seams: freeze the contract, make the loop idempotent, write the decision down.',
    proof: [
      { claim: 'Four public repos, independently deployable', fig: '4 repos', reversed: false },
      { claim: 'Contract tests agreed while shapes diverged', fig: 'both CI stayed green', reversed: true },
      { claim: 'Premium escalation measured, declined', fig: '3 times · 0 shipped', reversed: true },
    ],
  },
  {
    slug: 'product-and-program',
    filename: 'og-product-and-program.png',
    dateline: 'sanlee.me · product & program',
    title: 'Product & Program',
    standfirst:
      'The same system from above: user and job, two metric registers, a Now/Next/Later roadmap, and an honest risk register.',
    proof: [
      { claim: 'Category accuracy on human-labeled text', fig: '94.4% · n=300', reversed: false },
      { claim: 'Premium model moved nothing', fig: '0 rows at 1.97×', reversed: true },
      { claim: 'Silent contract drift actually happened', fig: 'High · both CI green', reversed: true },
    ],
  },
  {
    slug: 'loop-replay',
    filename: 'og-loop-replay.png',
    dateline: 'sanlee.me · loop replay',
    title: 'Loop Replay',
    standfirst:
      'A recorded-replay of the autonomous loop: A improved, held-out gold did not, and the gap is the whole point.',
    proof: [
      { claim: 'Training rose while gold held-out fell', fig: 'A +0.179, C -0.025', reversed: true },
      { claim: 'Overfitting gap, baseline to best', fig: '+0.204', reversed: true },
      { claim: 'Real run, threshold stop', fig: '1.5M tokens · iter 2', reversed: false },
    ],
  },
  {
    slug: 'kb-agent-retrieval',
    filename: 'og-kb-agent-retrieval.png',
    dateline: 'sanlee.me · retrieval, measured',
    title: 'Retrieval, Measured',
    standfirst:
      'kb-agent had never measured its own retrieval. Three A/B\'d changes later, the most useful result is the one I did not ship.',
    proof: [
      { claim: 'Model kind-pass rate after steering', fig: '0.370 → 0.889', reversed: false },
      { claim: 'Hybrid built for one miss, declined', fig: 'recall@1 0.741 → 0.704', reversed: true },
      { claim: 'At n=27, one query is the whole lift', fig: '3.7 pts · p=1.0', reversed: true },
    ],
  },
];

// Same two-step browser resolution the other Playwright scripts use: PW_CHROMIUM
// if set, else Playwright's own. No hard-coded path — see CLAUDE.md for the
// stale-revision incident that rule exists to prevent.
function chromium() {
  const { chromium: c } = require(path.join(__dirname, 'node_modules', 'playwright'));
  return c;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Typographic entities that match the homepage card's hand-written HTML. */
function formatFig(fig) {
  return escapeHtml(fig)
    .replace(/×/g, '&times;')
    .replace(/→/g, '&rarr;')
    .replace(/—/g, '&mdash;');
}

function formatClaim(claim) {
  return escapeHtml(claim).replace(/—/g, '&mdash;');
}

function buildProofHtml(proof) {
  return proof
    .map((item, i) => {
      const n = String(i + 1).padStart(2, '0');
      const rev = item.reversed ? ' class="rev"' : '';
      return (
        `    <li${rev}><span class="idx">${n}</span>` +
        `<span class="claim">${formatClaim(item.claim)} &mdash; ` +
        `<span class="fig">${formatFig(item.fig)}</span></span></li>`
      );
    })
    .join('\n');
}

function fillProjectTemplate(template, card) {
  return template
    .replace(/DATELINE/g, escapeHtml(card.dateline).replace(/ · /g, ' &nbsp;·&nbsp; '))
    .replace(/TITLE/g, escapeHtml(card.title))
    .replace(/STANDFIRST/g, formatClaim(card.standfirst))
    .replace(/PROOF_HTML/g, buildProofHtml(card.proof));
}

function parseOnly() {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  if (!arg) return null;
  return arg.slice('--only='.length).trim() || null;
}

async function renderCard(page, html, outPath, label) {
  const staged = path.join(__dirname, `.og-cover.${label}.staged.html`);
  fs.writeFileSync(staged, html);
  try {
    await page.goto('file:///' + staged.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
    // Without this the card can render in the fallback face on a cold cache,
    // which is the one failure mode that looks fine until you compare it.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  } finally {
    if (fs.existsSync(staged)) fs.unlinkSync(staged);
  }

  const buf = fs.readFileSync(outPath);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (w !== 1200 || h !== 630) {
    throw new Error(`${path.basename(outPath)}: wrote ${w}x${h}, expected 1200x630.`);
  }
  console.log(`OK - ${path.basename(outPath)} ${w}x${h}, ${buf.length} bytes.`);
  return outPath;
}

(async () => {
  if (!fs.existsSync(DIST)) {
    console.error('✗ og-cover: dist/ does not exist. Run `npm run build` first —');
    console.error("  the card loads the site's own font files from the built output.");
    process.exit(1);
  }

  const only = parseOnly();
  if (only) {
    const known = new Set(['home', ...CARDS.map((c) => c.slug)]);
    if (!known.has(only)) {
      console.error(`✗ og-cover: unknown --only=${only}. Known: home, ${CARDS.map((c) => c.slug).join(', ')}`);
      process.exit(1);
    }
  }

  const site = await serve(DIST);
  const fontOrigin = site.origin + '/assets/fonts';

  const launchOpts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};
  const browser = await chromium().launch(launchOpts);
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  try {
    const doHome = !only || only === 'home';
    if (doHome) {
      const html = fs.readFileSync(HOME_SRC, 'utf8').replace(/FONTDIR/g, fontOrigin);
      await renderCard(page, html, path.join(OUT_DIR, 'og-cover.png'), 'home');
    }

    const projectTpl = fs.readFileSync(PROJECT_SRC, 'utf8');
    const cards = only && only !== 'home' ? CARDS.filter((c) => c.slug === only) : only === 'home' ? [] : CARDS;
    for (const card of cards) {
      const filled = fillProjectTemplate(projectTpl, card).replace(/FONTDIR/g, fontOrigin);
      await renderCard(page, filled, path.join(OUT_DIR, card.filename), card.slug);
    }
  } catch (err) {
    console.error('✗ og-cover:', err.message || err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await site.close();
  }
})();
