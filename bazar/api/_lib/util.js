// Shared helpers: HTTP, validation, defaults.
const WA_GENERAL = 'https://wa.me/message/TOTXU35IP3ANE1';
const WA_PHONE = '918086777790';

function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(data));
}

async function readBody(req, limit = 4 * 1024 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
    if (Buffer.isBuffer(req.body)) { try { return JSON.parse(req.body.toString()); } catch { return {}; } }
    return req.body;
  }
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

const PRICE_UNITS = ['', 'kg', 'g', 'litre', 'ml', 'piece', 'pack', 'dozen', 'box', 'bottle', 'other'];
const QTY_UNITS = ['', 'kg', 'g', 'litre', 'ml', 'piece', 'pack', 'dozen', 'box', 'bottle', 'other'];

function isWaLink(u) {
  if (!u) return true;
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:') return false;
    return ['wa.me', 'www.whatsapp.com', 'whatsapp.com', 'api.whatsapp.com', 'l.wl.co'].includes(x.hostname);
  } catch { return false; }
}

function isImageUrl(u) {
  return typeof u === 'string' && (u.startsWith('/uploads/') || /^https:\/\/[^\s"'<>]+$/.test(u));
}

function cleanProduct(b, existing) {
  const errors = {};
  const name = str(b.name, 120);
  if (!name) errors.name = 'Please enter a product name.';
  const price = Number(b.price);
  if (b.price === '' || b.price == null || !isFinite(price) || price < 0) errors.price = 'Please enter a valid price (0 or more).';
  if (price > 10000000) errors.price = 'That price looks too high.';
  const priceUnit = str(b.price_unit, 20);
  if (!PRICE_UNITS.includes(priceUnit)) errors.price_unit = 'Please choose a price unit from the list.';
  const quantityUnit = str(b.quantity_unit, 20);
  if (!QTY_UNITS.includes(quantityUnit)) errors.quantity_unit = 'Please choose a quantity unit from the list.';
  const wa = str(b.wa_link, 500);
  if (!isWaLink(wa)) errors.wa_link = 'This does not look like a WhatsApp link. It should start with https://wa.me/ or https://www.whatsapp.com/.';
  const images = Array.isArray(b.images) ? b.images.filter(isImageUrl).slice(0, 8) : [];
  if (!b.category_id) errors.category_id = 'Please choose a category.';
  const status = b.status === 'inactive' ? 'inactive' : 'active';
  return {
    errors,
    value: {
      name,
      category_id: b.category_id || null,
      price: isFinite(price) ? Math.round(price * 100) / 100 : 0,
      price_unit: priceUnit,
      quantity_value: str(b.quantity_value, 30),
      quantity_unit: quantityUnit,
      description: str(b.description, 4000),
      images,
      wa_link: wa,
      status,
      in_stock: b.in_stock === false || b.in_stock === 'false' ? false : true,
      featured: !!b.featured,
      popular: !!b.popular,
    },
  };
}

const DEFAULT_HOME = {
  hero: {
    headline: 'Your favourites are just one WhatsApp away!',
    text: 'Explore our products, pick what you love and message us directly to place your order.',
    number: '+91 8086 7777 90',
    cta_text: 'Shop on WhatsApp',
    cta_url: WA_GENERAL,
  },
  banners: [],
  popular_ids: [],
  category_ids: [],
};

// Offer banners on the homepage (max 4). Each: { image, link, alt }.
const MAX_BANNERS = 4;
function isSiteLink(u) { return /^\/(?!\/)[a-z0-9\-\/?=&#]*$/i.test(u); }
function cleanBanners(list) {
  const errors = {};
  const out = (Array.isArray(list) ? list : []).slice(0, MAX_BANNERS).map((b, i) => {
    const image = str(b && b.image, 600), link = str(b && b.link, 500), alt = str(b && b.alt, 140);
    if (!image || !isImageUrl(image)) errors['banner_' + i] = 'Banner ' + (i + 1) + ': please add a banner image.';
    else if (link && !(isWaLink(link) || isSiteLink(link))) errors['banner_' + i] = 'Banner ' + (i + 1) + ': the link should be a WhatsApp link (https://wa.me/...) or a page like /products.';
    return { image, link, alt };
  });
  return { errors, value: out };
}

const DEFAULT_POLICIES = {
  delivery: {
    title: 'Delivery Policy',
    sections: [
      { heading: 'Delivery coverage', body: '' },
      { heading: 'Delivery availability', body: '' },
      { heading: 'Delivery timelines', body: '' },
      { heading: 'Delivery charges', body: '' },
      { heading: 'Order confirmation', body: 'Orders are placed through WhatsApp. We confirm each order with you on WhatsApp before it is packed.' },
      { heading: 'Delivery delays', body: '' },
      { heading: 'Customer responsibilities', body: 'Please share a correct address and phone number, and keep your phone reachable on the delivery day.' },
      { heading: 'Contact us', body: 'Questions about a delivery? Message us on WhatsApp or call +91 8086 7777 90.' },
    ],
  },
  refund: {
    title: 'Refund Policy',
    sections: [
      { heading: 'Return eligibility', body: '' },
      { heading: 'Damaged products', body: '' },
      { heading: 'Incorrect products', body: '' },
      { heading: 'Refund eligibility', body: '' },
      { heading: 'Refund processing', body: '' },
      { heading: 'Non-refundable situations', body: '' },
      { heading: 'How to report an issue', body: 'Message us on WhatsApp with your order details and, if possible, a photo of the issue.' },
      { heading: 'Contact us', body: 'Message us on WhatsApp or call +91 8086 7777 90.' },
    ],
  },
};

function cleanSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.slice(0, 30).map(s => ({ heading: str(s && s.heading, 120), body: str(s && s.body, 8000) }))
    .filter(s => s.heading || s.body);
}

// Product video: a YouTube link, or a video file uploaded to our own storage.
function youtubeId(u) {
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:') return '';
    const h = x.hostname.replace(/^www\.|^m\./, '');
    let id = '';
    if (h === 'youtu.be') id = x.pathname.slice(1);
    else if (h === 'youtube.com' || h === 'youtube-nocookie.com') id = x.searchParams.get('v') || (x.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/) || [])[1] || '';
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : '';
  } catch { return ''; }
}
function cleanVideo(v, storagePublic) {
  const u = str(v, 600);
  if (!u) return { value: '' };
  if (youtubeId(u)) return { value: u };
  if ((storagePublic && u.startsWith(storagePublic + 'videos/')) || /^\/uploads\/[\w.-]+\.(mp4|webm|mov)$/i.test(u)) return { value: u };
  return { value: '', error: 'Use a YouTube link, or upload a video file.' };
}

module.exports = { youtubeId, cleanVideo, cleanBanners, MAX_BANNERS, isSiteLink, send, readBody, slugify, str, cleanProduct, cleanSections, isWaLink, isImageUrl, DEFAULT_HOME, DEFAULT_POLICIES, WA_GENERAL, WA_PHONE, PRICE_UNITS };
