#!/usr/bin/env node
/*
 * Rendered text-contrast gate (WCAG AA).
 *
 * Exists because of a bug no other checker could see: a provenance subline
 * declared --muted (5.8:1 on paper, compliant) rendered at 3.80:1, because an
 * `opacity: 0.8` sat on top of it. The declared colour was innocent; the
 * COMPOSITED colour failed. Devtools' contrast readout, the stylesheet's own
 * token-contrast comment block, and any lint that reads declared values all
 * report the declared number — the fade is invisible everywhere except the
 * rendered page. So this gate measures the rendered page.
 *
 * For every built page, in BOTH themes (light and dark are one `data-theme`
 * attribute apart), every element that directly contains visible text is
 * measured: computed colour, multiplied through the opacity chain, composited
 * over the resolved background, against WCAG AA — 4.5:1 for body text, 3:1 for
 * large text (≥24px, or ≥18.66px at weight ≥700).
 *
 * What it deliberately does NOT check, so a green run is read honestly:
 *   - SVG text. Its backdrop is geometry (knockout rects, edge lines), not a
 *     resolvable CSS background. The diagram/plot labels are token-coloured and
 *     covered by the declared-contrast comment in style.css.
 *   - Pseudo-element content (the ✓/○ rung markers, folio numbers). Site rule:
 *     no state is findable by colour alone, so each mark has a text channel.
 *   - `aria-hidden="true"` subtrees — the platform's own marker for "not
 *     content" (the résumé's decorative `·` separators). If it's hidden from a
 *     screen reader, it isn't text a reader is meant to read.
 *   - `:disabled` controls — WCAG 1.4.3 exempts inactive UI components.
 *
 * And what it refuses to guess at: text over a background-image or gradient,
 * an unparseable computed colour, or a group `opacity` above the element that
 * supplies the background (which fades text and backdrop together — correct
 * handling needs full compositing, not this arithmetic). Those FAIL as
 * "unresolvable" rather than being skipped. A skip that exits 0 is how a gate
 * ends up not checking what it appears to; this repo has had three of those.
 *
 * Pages render with prefers-reduced-motion: reduce, which is the site's own
 * stable no-animation state — otherwise scroll-driven keyframes would be
 * caught mid-fade at whatever opacity the load happened to land on.
 *
 * Run from the repo root:   node scripts/contrast-check.cjs
 * SITE_ROOT points it at the build (gates.cjs sets dist/); it fails on a
 * zero-page walk and on any page contributing zero measured elements.
 */
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
  console.error('contrast-check error: Playwright is not installed. From the repo root, run:');
  console.error('  npm --prefix scripts ci');
  console.error('  npm --prefix scripts exec -- playwright install chromium');
  process.exit(1);
}

const { serve } = require('./static-server.cjs');

const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : process.cwd();
const THEMES = ['light', 'dark'];

function findHtml(dir) {
  const out = [];
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'scripts') continue;
    const rel = dir === '.' ? name : `${dir}/${name}`;
    const stat = fs.statSync(path.join(ROOT, rel));
    if (stat.isDirectory()) out.push(...findHtml(rel));
    else if (name.endsWith('.html')) out.push(rel);
  }
  return out;
}

/*
 * Everything below `measurePage` runs inside the page. It returns plain data;
 * all pass/fail policy stays out here in node, where the exit code lives.
 */
function measurePage() {
  const violations = [];
  const unresolvable = [];
  let checked = 0;

  // Computed colours arrive as legacy rgb()/rgba() for ordinary declarations
  // and as color(srgb …) once color-mix is involved. Anything else (an oklch
  // sneaking in, a future syntax) is unresolvable, not assumed.
  function parseColor(str) {
    let m = str.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    m = str.match(/^rgba?\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)$/);
    if (m) return [+m[1], +m[2], +m[3], alpha(m[4])];
    m = str.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)$/);
    if (m) return [255 * +m[1], 255 * +m[2], 255 * +m[3], alpha(m[4])];
    return null;
  }
  function alpha(tok) {
    if (tok === undefined) return 1;
    return tok.endsWith('%') ? parseFloat(tok) / 100 : +tok;
  }

  function luminance([r, g, b]) {
    const f = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function ratio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  }
  // Source-over: opacity/alpha blending happens in device sRGB, which is what
  // the browser itself does — no gamma correction here on purpose.
  function over(top, bottom) {
    const a = top[3];
    return [
      top[0] * a + bottom[0] * (1 - a),
      top[1] * a + bottom[1] * (1 - a),
      top[2] * a + bottom[2] * (1 - a),
      1,
    ];
  }
  const hex = ([r, g, b]) =>
    '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

  function describe(el) {
    const bits = [];
    for (let n = el, depth = 0; n && n !== document.body && depth < 3; n = n.parentElement, depth++) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      else if (typeof n.className === 'string' && n.className.trim())
        s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.');
      bits.unshift(s);
    }
    return bits.join(' > ');
  }

  // Walk up from the element collecting background layers until one is opaque.
  // Alpha washes (the chip fills, the highlight) composite over what's under
  // them, which is how the measured background matches the rendered one.
  function resolveBackground(el) {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none')
        return { error: `background-image under text (${describe(n)})` };
      const c = parseColor(cs.backgroundColor);
      if (!c) return { error: `unparseable background-color "${cs.backgroundColor}"` };
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 1) {
        let acc = layers.pop();
        while (layers.length) acc = over(layers.pop(), acc);
        return { color: acc, provider: n };
      }
    }
    let acc = [255, 255, 255, 1]; // the browser's default canvas
    while (layers.length) acc = over(layers.pop(), acc);
    return { color: acc, provider: null };
  }

  const all = document.body.querySelectorAll('*');
  for (const el of all) {
    let text = '';
    for (const node of el.childNodes)
      if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue;
    if (!/\S/.test(text)) continue;

    if (el.closest('svg')) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.closest(':disabled, [disabled]')) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.visibility === 'collapse') continue;
    const rects = el.getClientRects();
    if (rects.length === 0) continue; // display:none somewhere up the chain
    if (rects[0].width <= 1 || rects[0].height <= 1) continue; // sr-only clip patterns

    const bg = resolveBackground(el);
    if (bg.error) {
      unresolvable.push({ where: describe(el), why: bg.error });
      continue;
    }

    // Opacity below the background provider fades the text toward that
    // background — that is the founding bug, and plain arithmetic covers it.
    // Opacity AT or ABOVE the provider fades text and background together
    // toward something deeper, which this arithmetic cannot represent, so it
    // is refused rather than approximated.
    let fade = 1;
    for (let n = el; n && n !== bg.provider; n = n.parentElement)
      fade *= parseFloat(getComputedStyle(n).opacity);
    for (let n = bg.provider; n; n = n.parentElement) {
      if (parseFloat(getComputedStyle(n).opacity) < 1) {
        unresolvable.push({ where: describe(el), why: `group opacity above the background (${describe(n)})` });
        fade = NaN;
        break;
      }
    }
    if (Number.isNaN(fade)) continue;
    if (fade <= 0.01) continue; // invisible, not low-contrast

    const declared = parseColor(cs.color);
    if (!declared) {
      unresolvable.push({ where: describe(el), why: `unparseable color "${cs.color}"` });
      continue;
    }
    let fg = declared[3] < 1 ? over(declared, bg.color) : declared;
    if (fade < 1) fg = over([fg[0], fg[1], fg[2], fade], bg.color);

    const size = parseFloat(cs.fontSize);
    const weight = parseFloat(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const threshold = large ? 3.0 : 4.5;

    checked++;
    const r = ratio(fg, bg.color);
    if (r < threshold) {
      violations.push({
        where: describe(el),
        snippet: text.trim().replace(/\s+/g, ' ').slice(0, 60),
        fg: hex(fg),
        bg: hex(bg.color),
        ratio: Math.round(r * 100) / 100,
        threshold,
        size: Math.round(size * 10) / 10,
      });
    }
  }
  return { checked, violations, unresolvable };
}

(async () => {
  const pages = findHtml('.').sort();
  // A gate that rendered no pages must not report success (ADR-006).
  if (pages.length === 0) {
    console.error(`contrast-check error: no HTML found under ${ROOT}. Nothing was rendered.`);
    console.error('  Run `npm run build` first, or unset SITE_ROOT.');
    process.exit(1);
  }

  const exe = process.env.PW_CHROMIUM;
  if (exe && !fs.existsSync(exe)) {
    console.error(`contrast-check error: PW_CHROMIUM is set to "${exe}" but nothing exists there.`);
    console.error('Unset it to use the Chromium from `npm --prefix scripts exec -- playwright install chromium`.');
    process.exit(1);
  }

  const site = await serve(ROOT);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});

  let failed = 0;
  let totalChecked = 0;
  /*
   * A context per theme, with the theme set BEFORE the page loads, rather than
   * one page toggled between them. Toggling looks equivalent and is not:
   * `body` carries `transition: background-color 0.2s`, so flipping the
   * attribute and measuring immediately reads the NEW ink over the OLD paper —
   * dark text on a light ground that exists for 200ms and never renders as a
   * finished state. The first run of this gate reported 400+ such phantoms.
   *
   * Setting `localStorage.theme` in an init script hands the decision to the
   * page's own bootstrap (it prefers a stored choice over the OS signal), so
   * the theme under test is the one a returning reader actually gets, and it
   * is correct from first paint. `colorScheme` is emulated to match so no
   * media query disagrees with the attribute, and transitions/animations are
   * killed outright: a contrast gate measures resting states, and anything
   * mid-interpolation is a number that was never on screen long enough to read.
   */
  for (const theme of THEMES) {
    const context = await browser.newContext({ colorScheme: theme, reducedMotion: 'reduce' });
    await context.addInitScript((t) => {
      try { localStorage.setItem('theme', t); } catch (e) { /* bootstrap's catch arm covers this */ }
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    // Same origin filter as mobile-qa: block analytics and anything external so
    // the run is fast and deterministic offline. Fonts are self-hosted, so text
    // still renders in the faces whose metrics the thresholds care about.
    await context.route('**/*', (r) => (r.request().url().startsWith(site.origin) ? r.continue() : r.abort()));
    const page = await context.newPage();

    for (const rel of pages) {
      // 'load', not 'domcontentloaded': computed styles before the stylesheet
      // arrives are the browser defaults, and measuring those measures nothing.
      await page.goto(`${site.origin}/${rel}`, { waitUntil: 'load', timeout: 15000 });
      await page.addStyleTag({
        content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
      });
      // Assert the theme actually took rather than trusting the injection: a
      // page whose bootstrap changed shape would otherwise get measured twice
      // in the same theme and report a clean sweep of half the site.
      const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      if (applied !== theme) {
        console.error(`  FAIL  ${rel} [${theme}]: theme did not apply (data-theme="${applied}"). Not measured.`);
        failed++;
        continue;
      }
      const result = await page.evaluate(measurePage);
      if (result.checked === 0) {
        // A page with no measurable text on this site is a walker bug, not a
        // page property — every page here, 404 included, says something.
        console.error(`  FAIL  ${rel} [${theme}]: zero text elements measured. The walker is broken or the page is empty.`);
        failed++;
        continue;
      }
      totalChecked += result.checked;
      for (const u of result.unresolvable) {
        console.error(`  FAIL  ${rel} [${theme}]  unresolvable: ${u.why} at ${u.where}`);
        failed++;
      }
      for (const v of result.violations) {
        console.error(
          `  FAIL  ${rel} [${theme}]  ${v.ratio}:1 < ${v.threshold}:1  ${v.fg} on ${v.bg} @${v.size}px  ${v.where}  "${v.snippet}"`
        );
        failed++;
      }
    }
  }
  await browser.close();
  await site.close();

  if (failed) {
    console.error(`\n✗ ${failed} contrast finding(s) across ${pages.length} pages × ${THEMES.length} themes.`);
    console.error('  A declared colour can pass while the RENDERED colour fails — fix the colour, do not fade it.');
    process.exit(1);
  }
  console.log(
    `✓ Text contrast AA — ${pages.length} pages × ${THEMES.length} themes, ${totalChecked} text elements measured.`
  );
})().catch((e) => { console.error('contrast-check error:', e.message); process.exit(1); });
