const { catalog } = require('./public');
const db = require('./_lib/db');
const SITE = 'https://www.clickfor.in';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

module.exports = async function handler(req, res) {
  const urls = ['/', '/products', '/about', '/contact', '/delivery-policy', '/refund-policy'];
  try {
    if (db.configured()) {
      const c = await catalog();
      c.categories.forEach(x => urls.push('/category/' + x.slug));
      c.products.forEach(p => urls.push('/products/' + p.slug));
    }
  } catch (e) { console.error(e); }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => `<url><loc>${esc(SITE + u)}</loc></url>`).join('\n') + '\n</urlset>\n');
};
