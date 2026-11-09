// Public read-only API used by the customer website.
const db = require('./_lib/db');
const U = require('./_lib/util');

const CACHE = 'public, max-age=0, s-maxage=10, stale-while-revalidate=60';

function shapeProduct(p, cat) {
  return {
    id: p.id, name: p.name, slug: p.slug,
    category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
    price: Number(p.price), price_unit: p.price_unit,
    quantity_value: p.quantity_value, quantity_unit: p.quantity_unit,
    description: p.description, images: Array.isArray(p.images) ? p.images : [],
    wa_link: p.wa_link || '', in_stock: p.in_stock !== false,
    featured: !!p.featured, popular: !!p.popular, created_at: p.created_at,
  };
}

async function catalog() {
  const [cats, prods, settings] = await Promise.all([db.all('categories'), db.all('products'), db.getAllSettings()]);
  const activeCats = cats.filter(c => c.active).sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name));
  const catById = Object.fromEntries(activeCats.map(c => [c.id, c]));
  const products = prods.filter(p => p.status === 'active' && catById[p.category_id])
    .map(p => shapeProduct(p, catById[p.category_id]));
  const counts = {};
  products.forEach(p => { counts[p.category.id] = (counts[p.category.id] || 0) + 1; });
  const categories = activeCats.map(c => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, image_url: c.image_url, count: counts[c.id] || 0 }));

  const h = settings.home || {};
  const home = { ...U.DEFAULT_HOME, ...h, hero: { ...U.DEFAULT_HOME.hero, ...(h.hero || {}) } };
  const order = Array.isArray(home.popular_ids) ? home.popular_ids : [];
  const popular = products.filter(p => p.popular)
    .sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib) || new Date(b.created_at) - new Date(a.created_at);
    }).map(p => p.id);
  const homeCats = (Array.isArray(home.category_ids) && home.category_ids.length
    ? home.category_ids.filter(id => catById[id]) : categories.map(c => c.id));
  return { categories, products, home: { hero: home.hero, popular_ids: popular, category_ids: homeCats } };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return U.send(res, 405, { error: 'Method not allowed' });
    if (!db.configured()) return U.send(res, 503, { error: 'not_configured' }, { 'Cache-Control': 'no-store' });
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    if (q.r === 'catalog') return U.send(res, 200, await catalog(), { 'Cache-Control': CACHE });
    if (q.r === 'policy' && ['delivery', 'refund'].includes(q.k)) {
      const s = await db.getSetting('policy_' + q.k);
      const pub = (s && s.published) || U.DEFAULT_POLICIES[q.k];
      return U.send(res, 200, { title: pub.title, sections: pub.sections, published_at: (s && s.published_at) || null }, { 'Cache-Control': CACHE });
    }
    return U.send(res, 404, { error: 'Unknown request' });
  } catch (e) {
    console.error('public api error', e);
    return U.send(res, 500, { error: 'server_error' }, { 'Cache-Control': 'no-store' });
  }
};
module.exports.catalog = catalog;
