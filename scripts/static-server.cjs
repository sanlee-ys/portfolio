/**
 * A minimal static file server for the QA gates.
 *
 * Why this exists: the site's shared layout emits root-absolute asset paths
 * (`/assets/style.css`), because one layout serves pages at several directory
 * depths and cannot carry a per-depth relative prefix. Root-absolute paths do
 * not resolve over `file://` -- they point at the filesystem root -- so the
 * gates that used to open pages as files now have to serve the build instead.
 *
 * This was predicted in `ADR-006` before the migration and is the single
 * largest change the gates took. Anything that loads a built page in a browser
 * must go through here; opening `dist/*.html` with `file://` renders it
 * unstyled and silently changes what the page reports.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

/**
 * Serve `root` on an ephemeral port. Resolves to `{ origin, close }`.
 */
function serve(root) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    // Contain the served path inside root: a `..` in the request must not be
    // able to walk out of the build directory.
    const target = path.join(root, path.normalize(rel).replace(/^([/\\])+/, ''));
    if (!target.startsWith(path.resolve(root))) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(target, (err, buf) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

module.exports = { serve };
