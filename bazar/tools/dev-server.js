// Local test server: serves the site, runs the /api functions, mimics vercel.json rewrites.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const PORT = process.env.PORT || 8790;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain', '.json': 'application/json' };
const handlers = { '/api/admin': require('../api/admin'), '/api/public': require('../api/public'), '/api/sitemap': require('../api/sitemap'), '/api/product-page': require('../api/product-page') };
const rewrites = [
  [/^\/products\/([^/]+)$/, m => '/api/product-page?slug=' + m[1]],
  [/^\/category\/[^/]+$/, () => '/products.html'],
  [/^\/(delivery|refund)-policy$/, () => '/policy.html'],
  [/^\/admin$/, () => '/admin/index.html'],
  [/^\/sitemap\.xml$/, () => '/api/sitemap'],
];
http.createServer((req, res) => {
  let url = req.url;
  const p0 = url.split('?')[0];
  for (const [re, f] of rewrites) { const m = re.exec(p0); if (m) { url = f(m); break; } }
  const u = new URL(url, 'http://x');
  if (handlers[u.pathname]) {
    req.query = Object.fromEntries(u.searchParams);
    req.url = url;
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (raw) { try { req.body = JSON.parse(raw); } catch { req.body = {}; } }
      Promise.resolve(handlers[u.pathname](req, res)).catch(e => { console.error(e); res.statusCode = 500; res.end('error'); });
    });
    return;
  }
  let file = u.pathname;
  if (file.startsWith('/uploads/')) file = '/.data' + file;
  if (/^\/(about|contact|products|admin)$/.test(file)) file += file === '/admin' ? '/index.html' : '.html';
  if (file === '/') file = '/index.html';
  const full = path.join(root, file);
  if (!full.startsWith(root) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', types[path.extname(full)] || 'application/octet-stream');
  fs.createReadStream(full).pipe(res);
}).listen(PORT, () => console.log('dev server on http://localhost:' + PORT));
