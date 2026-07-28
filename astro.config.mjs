// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from './scripts/sitemap-integration.mjs';

const SITE = 'https://sanlee.me';

// The site's URLs are `.html` files, not directories, and they are indexed and
// publicly linked (LinkedIn, Instagram). `build.format: 'file'` is what keeps
// `src/pages/glossary.astro` emitting `dist/glossary.html` rather than Astro's
// default `dist/glossary/index.html`, which would 404 every existing inbound
// link. `trailingSlash: 'never'` is the matching pair the config reference
// prescribes for file format. Neither is a preference — changing either breaks
// live URLs, the same reason `ADR-004` refused to move the `lab/` pages.
export default defineConfig({
  site: SITE,
  build: { format: 'file' },
  trailingSlash: 'never',
  // Astro 7 changed the default from `true` to `'jsx'`, which strips the
  // whitespace between adjacent inline elements the way React does — on these
  // prose-heavy pages that joins words across `<a>`/`<em>`/`<code>` boundaries.
  // `true` is the pre-7 lossless behavior. Not a preference: the 5→7 upgrade
  // was verified by diffing built output, which only holds with this pinned.
  compressHTML: true,
  // Emits `sitemap.xml` from the build output. Not `@astrojs/sitemap`: that
  // always writes `sitemap-index.xml` + `sitemap-0.xml`, which would 404 the
  // live URL `robots.txt` advertises. See the integration's header comment.
  integrations: [sitemap({ site: SITE })],
});
