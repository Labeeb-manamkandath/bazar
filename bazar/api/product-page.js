// Serves product.html with product-specific title, description, Open Graph and structured data,
// so shared links (WhatsApp, Google) show the right product.
const fs = require('fs');
const path = require('path');
const { catalog } = require('./public');
const db = require('./_lib/db');

const SITE = 'https://www.clickfor.in';
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = async function handler(req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  // Template copy lives next to this function so it is always bundled on Vercel.
  let html = '';
  for (const f of [path.join(__dirname, '_seed', 'product.html'), path.join(process.cwd(), 'product.html')]) {
    try { html = fs.readFileSync(f, 'utf8'); break; } catch (e) { /* try next */ }
  }
  if (!html) {
    res.statusCode = 302; res.setHeader('Location', '/products'); return res.end();
  }
  let status = 200, seo = '';
  try {
    const c = db.configured() ? await catalog() : { products: [] };
    const p = c.products.find(x => x.slug === q.slug);
    if (p) {
      const qty = [p.quantity_value, p.quantity_unit].filter(Boolean).join(' ');
      const title = `${p.name}${qty ? ' ' + qty : ''} | Bazar by clickfor.in`;
      const desc = (p.description || `Buy ${p.name} from Bazar on WhatsApp.`).replace(/\s+/g, ' ').slice(0, 155);
      const img = p.images[0] ? (p.images[0].startsWith('/') ? SITE + p.images[0] : p.images[0]) : SITE + '/assets/og-image.jpg';
      const url = `${SITE}/products/${p.slug}`;
      const ld = {
        '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description || undefined,
        image: p.images.length ? p.images : undefined, category: p.category && p.category.name,
        offers: { '@type': 'Offer', priceCurrency: 'INR', price: p.price, url,
          availability: p.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
      };
      seo = `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Bazar by clickfor.in">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
    } else {
      status = 404;
      seo = '<title>Product not found | Bazar by clickfor.in</title><meta name="robots" content="noindex">';
    }
  } catch (e) { console.error(e); seo = '<title>Bazar by clickfor.in</title>'; }
  html = html.replace('<!--SEO-->', seo);
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=60');
  res.end(html);
};
