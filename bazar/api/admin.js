// Admin API. Every action except "login" requires a valid signed session cookie.
const db = require('./_lib/db');
const auth = require('./_lib/auth');
const U = require('./_lib/util');
const fs = require('fs');
const path = require('path');

const GUARDED_POST_HEADER = 'x-requested-with';

function fail(res, status, message, extra) { return U.send(res, status, { ok: false, error: message, ...(extra || {}) }, { 'Cache-Control': 'no-store' }); }
function ok(res, data) { return U.send(res, 200, { ok: true, ...(data || {}) }, { 'Cache-Control': 'no-store' }); }

async function uniqueSlug(table, base, selfId) {
  const rows = await db.all(table);
  let slug = base || 'item', n = 1;
  while (rows.some(r => r.slug === slug && r.id !== selfId)) { n += 1; slug = `${base}-${n}`; }
  return slug;
}

function detectImage(buf) {
  if (buf.length > 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

module.exports = async function handler(req, res) {
  try {
    if (!db.configured()) return fail(res, 503, 'The database is not set up yet. Add the Supabase settings in Vercel.');
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const action = q.a;
    const isPost = req.method === 'POST';

    if (isPost && String(req.headers[GUARDED_POST_HEADER] || '') !== 'bazar-admin') return fail(res, 403, 'Request blocked.');
    if (!isPost && req.method !== 'GET') return fail(res, 405, 'Method not allowed.');

    /* ---------- login ---------- */
    if (action === 'login' && isPost) {
      const body = await U.readBody(req, 20000);
      const cred = await auth.getCredentials();
      if (!cred.username || !cred.hash) return fail(res, 503, 'Admin login is not set up yet. Add ADMIN_USERNAME and ADMIN_PASSWORD_HASH in Vercel.');
      const locked = await auth.checkLock(req);
      if (locked) return fail(res, 429, `Too many wrong attempts. Please try again in ${locked} minute${locked > 1 ? 's' : ''}.`);
      const userOk = String(body.username || '') === cred.username;
      const passOk = auth.verifyPassword(String(body.password || ''), cred.hash);
      if (!(userOk && passOk)) {
        await auth.recordFail(req);
        await new Promise(r => setTimeout(r, 700));
        return fail(res, 401, 'Wrong username or password.');
      }
      await auth.clearFails(req);
      auth.setSession(req, res, cred.username);
      return ok(res, { user: cred.username });
    }

    /* ---------- everything below needs a session ---------- */
    const session = auth.getSession(req);
    if (action === 'me') return ok(res, { loggedIn: !!session, user: session ? session.u : null });
    if (!session) return fail(res, 401, 'Please log in.');

    if (action === 'logout' && isPost) { auth.clearSession(req, res); return ok(res); }

    /* ---------- overview: everything the portal needs ---------- */
    if (action === 'overview') {
      const [categories, products, settings] = await Promise.all([db.all('categories'), db.all('products'), db.getAllSettings()]);
      const policies = {};
      ['delivery', 'refund'].forEach(k => {
        const s = settings['policy_' + k];
        policies[k] = s || { draft: U.DEFAULT_POLICIES[k], published: U.DEFAULT_POLICIES[k], published_at: null, is_default: true };
      });
      const videos = settings.product_videos || {};
      products.forEach(p => { p.video = videos[p.id] || ''; });
      return ok(res, { categories, products, home: { ...U.DEFAULT_HOME, ...(settings.home || {}), hero: { ...U.DEFAULT_HOME.hero, ...((settings.home || {}).hero || {}) } }, policies, user: session.u });
    }

    /* ---------- one-time starter import (categories, products, photos) ---------- */
    if (action === 'import.starter' && isPost) {
      const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '_seed', 'starter.json'), 'utf8'));
      const cats = await db.all('categories');
      const byName = {};
      cats.forEach(c => { byName[c.name.toLowerCase()] = c; });
      let maxSort = cats.reduce((m, c) => Math.max(m, c.sort || 0), 0);
      let addedC = 0, addedP = 0, skipped = 0, fixed = 0;
      for (const name of seed.categories) {
        if (byName[name.toLowerCase()]) continue;
        maxSort += 1;
        byName[name.toLowerCase()] = await db.insert('categories', { name, description: '', image_url: '', active: true, slug: await uniqueSlug('categories', U.slugify(name)), sort: maxSort });
        addedC += 1;
      }
      const existing = await db.all('products');
      const popularIds = [];
      for (const p of seed.products) {
        const old = existing.find(x => x.name.toLowerCase() === p.name.toLowerCase());
        if (old) {
          // repair links that were copied with WhatsApp's internal business id instead of the phone number
          if (old.wa_link && old.wa_link.endsWith('/227599762624720')) { await db.update('products', old.id, { wa_link: p.wa }); fixed += 1; } else skipped += 1;
          continue;
        }
        const buf = fs.readFileSync(path.join(__dirname, '_seed', p.img + '.webp'));
        const url = await db.uploadImage(buf, 'image/webp', p.img);
        const cat = byName[p.cat.toLowerCase()];
        const { errors, value } = U.cleanProduct({ name: p.name, category_id: cat.id, price: p.price, price_unit: '', quantity_value: p.qv, quantity_unit: p.qu, description: p.desc, images: [url], wa_link: p.wa, status: 'active', in_stock: true, featured: false, popular: !!p.popular });
        if (Object.keys(errors).length) return fail(res, 500, 'Import data problem: ' + JSON.stringify(errors));
        const saved = await db.insert('products', { ...value, slug: await uniqueSlug('products', U.slugify(value.name)) });
        if (p.popular) popularIds.push(saved.id);
        addedP += 1;
      }
      if (popularIds.length) {
        const home = (await db.getSetting('home')) || {};
        const ids = Array.isArray(home.popular_ids) ? home.popular_ids.slice() : [];
        popularIds.forEach(i => { if (!ids.includes(i)) ids.push(i); });
        await db.setSetting('home', { ...home, popular_ids: ids });
      }
      return ok(res, { added_categories: addedC, added_products: addedP, skipped, fixed });
    }

    /* ---------- products ---------- */
    if (action === 'product.save' && isPost) {
      const body = await U.readBody(req);
      const { errors, value } = U.cleanProduct(body);
      const cats = await db.all('categories');
      if (value.category_id && !cats.some(c => c.id === value.category_id)) errors.category_id = 'That category no longer exists.';
      const products = await db.all('products');
      const dupe = products.find(p => p.id !== body.id && p.name.toLowerCase() === value.name.toLowerCase() && p.category_id === value.category_id && p.quantity_value === value.quantity_value && p.quantity_unit === value.quantity_unit);
      if (dupe) errors.name = 'A product with the same name, category and size already exists.';
      const vid = U.cleanVideo(body.video, db.STORAGE_PUBLIC);
      if (vid.error) errors.video = vid.error;
      if (Object.keys(errors).length) return fail(res, 422, 'Please fix the highlighted fields.', { fields: errors });
      let saved;
      if (body.id) {
        const current = products.find(p => p.id === body.id);
        if (!current) return fail(res, 404, 'Product not found.');
        const patch = { ...value };
        if (current.name !== value.name) patch.slug = await uniqueSlug('products', U.slugify(value.name), body.id);
        saved = await db.update('products', body.id, patch);
      } else {
        saved = await db.insert('products', { ...value, slug: await uniqueSlug('products', U.slugify(value.name)) });
      }
      // Videos live in settings (no database change needed): { productId: url }
      const videos = (await db.getSetting('product_videos')) || {};
      if ((videos[saved.id] || '') !== vid.value) {
        if (vid.value) videos[saved.id] = vid.value; else delete videos[saved.id];
        await db.setSetting('product_videos', videos);
      }
      return ok(res, { product: { ...saved, video: vid.value } });
    }

    if (action === 'product.patch' && isPost) {
      const body = await U.readBody(req, 20000);
      const allowed = {};
      if (typeof body.popular === 'boolean') allowed.popular = body.popular;
      if (typeof body.featured === 'boolean') allowed.featured = body.featured;
      if (typeof body.in_stock === 'boolean') allowed.in_stock = body.in_stock;
      if (body.status === 'active' || body.status === 'inactive') allowed.status = body.status;
      const saved = await db.update('products', body.id, allowed);
      return saved ? ok(res, { product: saved }) : fail(res, 404, 'Product not found.');
    }

    if (action === 'product.delete' && isPost) {
      const body = await U.readBody(req, 20000);
      await db.remove('products', body.id);
      const videos = (await db.getSetting('product_videos')) || {};
      if (videos[body.id]) { delete videos[body.id]; await db.setSetting('product_videos', videos); }
      const home = (await db.getSetting('home')) || {};
      if (Array.isArray(home.popular_ids) && home.popular_ids.includes(body.id)) {
        await db.setSetting('home', { ...home, popular_ids: home.popular_ids.filter(i => i !== body.id) });
      }
      return ok(res);
    }

    /* ---------- categories ---------- */
    if (action === 'category.save' && isPost) {
      const body = await U.readBody(req);
      const name = U.str(body.name, 60);
      const errors = {};
      if (!name) errors.name = 'Please enter a category name.';
      const image = body.image_url && U.isImageUrl(body.image_url) ? body.image_url : '';
      const cats = await db.all('categories');
      if (cats.some(c => c.id !== body.id && c.name.toLowerCase() === name.toLowerCase())) errors.name = 'A category with this name already exists.';
      if (Object.keys(errors).length) return fail(res, 422, 'Please fix the highlighted fields.', { fields: errors });
      const value = { name, description: U.str(body.description, 300), image_url: image, active: body.active !== false };
      if (Number.isInteger(body.sort) && body.sort >= 0 && body.sort < 10000) value.sort = body.sort;
      let saved;
      if (body.id) {
        const current = cats.find(c => c.id === body.id);
        if (!current) return fail(res, 404, 'Category not found.');
        if (current.name !== name) value.slug = await uniqueSlug('categories', U.slugify(name), body.id);
        saved = await db.update('categories', body.id, value);
      } else {
        const maxSort = cats.reduce((m, c) => Math.max(m, c.sort || 0), 0);
        saved = await db.insert('categories', { ...value, slug: await uniqueSlug('categories', U.slugify(name)), sort: maxSort + 1 });
        // A new category also shows on the homepage straight away (it can be hidden or reordered under Homepage).
        const home = await db.getSetting('home');
        if (home && Array.isArray(home.category_ids) && home.category_ids.length && !home.category_ids.includes(saved.id)) {
          await db.setSetting('home', { ...home, category_ids: [...home.category_ids, saved.id] });
        }
      }
      return ok(res, { category: saved });
    }

    if (action === 'category.delete' && isPost) {
      const body = await U.readBody(req, 20000);
      const products = (await db.all('products')).filter(p => p.category_id === body.id);
      if (products.length && !body.reassign_to) {
        return fail(res, 409, `This category has ${products.length} product${products.length > 1 ? 's' : ''}. Move them to another category first.`, { count: products.length });
      }
      if (products.length) {
        if (body.reassign_to === body.id || !(await db.all('categories')).some(c => c.id === body.reassign_to)) return fail(res, 422, 'Choose a different category to move the products to.');
        for (const p of products) await db.update('products', p.id, { category_id: body.reassign_to });
      }
      await db.remove('categories', body.id);
      const home = (await db.getSetting('home')) || {};
      if (Array.isArray(home.category_ids) && home.category_ids.includes(body.id)) {
        await db.setSetting('home', { ...home, category_ids: home.category_ids.filter(i => i !== body.id) });
      }
      return ok(res);
    }

    /* ---------- homepage ---------- */
    if (action === 'home.save' && isPost) {
      const body = await U.readBody(req);
      const h = body.hero || {};
      const errors = {};
      const headline = U.str(h.headline, 120) || U.DEFAULT_HOME.hero.headline, text = U.str(h.text, 300) || U.DEFAULT_HOME.hero.text, number = U.str(h.number, 30), ctaText = U.str(h.cta_text, 40);
      let ctaUrl = U.str(h.cta_url, 500);
      if (!ctaText) errors.cta_text = 'Please enter the button text.';
      if (!ctaUrl) ctaUrl = U.WA_GENERAL;
      if (!(U.isWaLink(ctaUrl) || /^\/[a-z0-9\-\/]*$/i.test(ctaUrl))) errors.cta_url = 'Use a WhatsApp link (https://wa.me/...) or a page like /products.';
      const ban = U.cleanBanners(body.banners);
      Object.assign(errors, ban.errors);
      if (Object.keys(errors).length) return fail(res, 422, Object.keys(ban.errors).length ? Object.values(ban.errors)[0] : 'Please fix the highlighted fields.', { fields: errors });
      const ids = a => (Array.isArray(a) ? a.filter(x => typeof x === 'string').slice(0, 60) : []);
      const home = { hero: { headline, text, number, cta_text: ctaText, cta_url: ctaUrl }, banners: ban.value, popular_ids: ids(body.popular_ids), category_ids: ids(body.category_ids) };
      await db.setSetting('home', home);
      // The "Most Loved" list is the single source of truth for the popular flag.
      const prods = await db.all('products');
      for (const p of prods) {
        const want = home.popular_ids.includes(p.id);
        if (!!p.popular !== want) await db.update('products', p.id, { popular: want });
      }
      return ok(res, { home });
    }

    /* ---------- policies ---------- */
    if (action === 'policy.save' && isPost) {
      const body = await U.readBody(req);
      const key = body.key;
      if (!['delivery', 'refund'].includes(key)) return fail(res, 422, 'Unknown policy.');
      const sections = U.cleanSections(body.sections);
      if (!sections.length) return fail(res, 422, 'Please add at least one section.');
      const existing = (await db.getSetting('policy_' + key)) || { published: U.DEFAULT_POLICIES[key], published_at: null };
      const draft = { title: U.DEFAULT_POLICIES[key].title, sections };
      const next = { draft, published: existing.published, published_at: existing.published_at };
      if (body.publish) { next.published = draft; next.published_at = new Date().toISOString(); }
      await db.setSetting('policy_' + key, next);
      return ok(res, { policy: next });
    }

    /* ---------- video upload: hand out a one-time signed upload link ---------- */
    if (action === 'video.sign' && isPost) {
      const body = await U.readBody(req, 20000);
      const types = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
      const ext = types[body.type];
      if (!ext) return fail(res, 422, 'Please choose an MP4, WebM or MOV video.');
      if (!(body.size > 0) || body.size > 50 * 1024 * 1024) return fail(res, 413, 'This video is too large. The limit is 50 MB.');
      const signed = await db.signVideoUpload(U.slugify(body.name || 'video') || 'video', ext);
      if (!signed) return fail(res, 501, 'Video upload works on the live website only. You can paste a YouTube link instead.');
      return ok(res, signed);
    }

    /* ---------- image upload ---------- */
    if (action === 'upload' && isPost) {
      const body = await U.readBody(req, 5 * 1024 * 1024);
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || ''));
      if (!m) return fail(res, 422, 'Please choose a JPG, PNG or WebP image.');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 3 * 1024 * 1024) return fail(res, 413, 'This image is too large (max 3 MB after resizing).');
      const type = detectImage(buf);
      if (!type) return fail(res, 422, 'This file is not a valid image.');
      const url = await db.uploadImage(buf, type, U.slugify(body.name || 'photo') || 'photo');
      return ok(res, { url });
    }

    /* ---------- change password ---------- */
    if (action === 'password.change' && isPost) {
      const body = await U.readBody(req, 20000);
      const cred = await auth.getCredentials();
      if (!auth.verifyPassword(String(body.current || ''), cred.hash)) return fail(res, 422, 'Your current password is not correct.', { fields: { current: 'Not correct.' } });
      const next = String(body.next || '');
      if (next.length < 10) return fail(res, 422, 'Use at least 10 characters.', { fields: { next: 'At least 10 characters.' } });
      await db.setSetting('admin_account', { hash: auth.hashPassword(next), changed_at: new Date().toISOString() });
      return ok(res);
    }

    return fail(res, 404, 'Unknown action.');
  } catch (e) {
    console.error('admin api error', e);
    const status = e.status && e.status < 600 ? e.status : 500;
    if (e.code === '23505') return fail(res, 409, 'That name is already in use.');
    return fail(res, status === 413 ? 413 : 500, status === 413 ? 'Upload too large.' : 'Something went wrong. Please try again.');
  }
};
