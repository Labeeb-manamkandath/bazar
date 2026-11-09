/* Bazar storefront: shared header, footer, data loading and product helpers. */
(function () {
  'use strict';
  const WA_GENERAL = 'https://wa.me/message/TOTXU35IP3ANE1';
  const WA_PHONE = '918086777790';
  const SHOW_PHONE = '+91 8086 7777 90';
  const SITE = 'https://www.clickfor.in';

  const ICON = {
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    chev: '<svg viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M1 1l5 5 5-5"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    bag: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22h40l-3 32a4 4 0 01-4 3.6H19a4 4 0 01-4-3.6z"/><path d="M22 22v-4a10 10 0 0120 0v4"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/></svg>',
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- formatting ---------- */
  function money(n) {
    const v = Number(n) || 0;
    return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  }
  function unitText(u) { return u && u !== 'other' ? '/ ' + u : ''; }
  function qtyText(p) { return [p.quantity_value, p.quantity_unit && p.quantity_unit !== 'other' ? p.quantity_unit : ''].filter(Boolean).join(' '); }
  function priceUnitHtml(p) { const u = unitText(p.price_unit); return u ? `<span>${esc(u)}</span>` : ''; }

  /* ---------- WhatsApp purchase link ---------- */
  // Product-specific catalogue link when the admin added one; otherwise a pre-filled message to the Bazar number.
  function buyUrl(p) {
    if (p.wa_link) return p.wa_link;
    const q = qtyText(p);
    const text = `Hi Bazar! I'd like to order: ${p.name}${q ? ' (' + q + ')' : ''}, ${money(p.price)}${unitText(p.price_unit) ? ' ' + unitText(p.price_unit) : ''}.\n${SITE}/products/${p.slug}`;
    return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;
  }

  /* ---------- data ---------- */
  let catalogPromise = null;
  function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('/api/public?r=catalog', { headers: { Accept: 'application/json' } })
        .then(r => { if (!r.ok) throw new Error('catalog ' + r.status); return r.json(); })
        .then(c => { c.byId = Object.fromEntries(c.products.map(p => [p.id, p])); return c; });
    }
    return catalogPromise;
  }

  /* ---------- product card ---------- */
  function productCard(p) {
    const img = p.images[0];
    const media = img
      ? `<div class="p-media loading"><img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="600" height="600"></div>`
      : `<div class="p-media"><div class="p-ph">${ICON.bag}</div></div>`;
    const badges = (p.popular ? '<span class="badge">Most loved</span>' : '') + (!p.in_stock ? '<span class="badge oos">Out of stock</span>' : '');
    const q = qtyText(p);
    const buy = p.in_stock
      ? `<a class="btn btn-wa" href="${esc(buyUrl(p))}" target="_blank" rel="noopener noreferrer" aria-label="Buy ${esc(p.name)} on WhatsApp">${ICON.wa}<span>Buy on WhatsApp</span></a>`
      : `<button class="btn" type="button" disabled>Out of stock</button>`;
    return `<article class="p-card${p.in_stock ? '' : ' oos'}">
      <div style="position:relative">${media}<div class="badges">${badges}</div></div>
      <div class="p-body">
        <span class="p-cat">${esc(p.category ? p.category.name : '')}</span>
        <h3 class="p-name"><a href="/products/${esc(p.slug)}">${esc(p.name)}</a></h3>
        ${q ? `<span class="p-qty">${esc(q)}</span>` : ''}
        <div class="p-price"><strong>${money(p.price)}</strong>${priceUnitHtml(p)}</div>
        ${buy}
      </div>
    </article>`;
  }

  function emptyProducts(msg, withClear) {
    return `<div class="empty-state"><h3>${esc(msg.title)}</h3><p>${esc(msg.text)}</p>
      ${withClear ? '<button class="btn btn-green" type="button" data-clear>Clear search and filters</button>' : ''}
      <a class="btn btn-wa" href="${WA_GENERAL}" target="_blank" rel="noopener noreferrer">${ICON.wa}<span>Ask us on WhatsApp</span></a></div>`;
  }

  /* ---------- header / footer ---------- */
  function renderHeader(active) {
    const h = document.getElementById('site-header');
    if (!h) return;
    h.className = 'nav';
    h.innerHTML = `<div class="wrap nav-inner">
      <a class="brand-link" href="/" aria-label="Bazar by clickfor.in, home"><img src="/assets/brand/logo-light.png" width="852" height="332" alt="clickfor.in Bazar"></a>
      <a class="btn btn-wa nav-wa-mobile" href="${WA_GENERAL}" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">${ICON.wa}<span>Order</span></a>
      <button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="navLinks" aria-label="Open menu">${ICON.menu}</button>
      <nav class="nav-links" id="navLinks" aria-label="Main">
        <a href="/" ${active === 'home' ? 'class="active" aria-current="page"' : ''}>Home</a>
        <a href="/products" ${active === 'products' ? 'class="active" aria-current="page"' : ''}>Products</a>
        <div class="nav-cat">
          <button class="nav-cat-btn" id="catBtn" type="button" aria-expanded="false" aria-controls="catMenu">Categories${ICON.chev}</button>
          <div class="cat-menu" id="catMenu"><p class="empty">Loading…</p></div>
        </div>
        <a href="/about" ${active === 'about' ? 'class="active" aria-current="page"' : ''}>About</a>
        <a href="/contact" ${active === 'contact' ? 'class="active" aria-current="page"' : ''}>Contact</a>
        <a class="btn btn-wa" href="${WA_GENERAL}" target="_blank" rel="noopener noreferrer">${ICON.wa}<span>WhatsApp us</span></a>
      </nav></div>`;

    const links = document.getElementById('navLinks'), btn = document.getElementById('menuBtn');
    const catBtn = document.getElementById('catBtn'), catMenu = document.getElementById('catMenu');
    const setMenu = open => {
      links.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      btn.innerHTML = open ? ICON.close : ICON.menu;
      document.body.style.overflow = open && matchMedia('(max-width:900px)').matches ? 'hidden' : '';
    };
    const setCat = open => { catMenu.classList.toggle('open', open); catBtn.setAttribute('aria-expanded', open); };
    btn.addEventListener('click', () => setMenu(!links.classList.contains('open')));
    catBtn.addEventListener('click', e => { e.stopPropagation(); setCat(!catMenu.classList.contains('open')); });
    document.addEventListener('click', e => { if (!e.target.closest('.nav-cat')) setCat(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { setCat(false); setMenu(false); } });
    links.addEventListener('click', e => { if (e.target.closest('a[href]')) setMenu(false); });
    matchMedia('(min-width:901px)').addEventListener('change', () => setMenu(false));
    const onScroll = () => h.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();

    getCatalog().then(c => {
      catMenu.innerHTML = `<a href="/products"><span>All products</span></a>` + (c.categories.length
        ? c.categories.map(x => `<a href="/category/${esc(x.slug)}"><span>${esc(x.name)}</span><small>${x.count}</small></a>`).join('')
        : '');
    }).catch(() => { catMenu.innerHTML = '<a href="/products"><span>All products</span></a>'; });
  }

  function renderFooter() {
    const f = document.getElementById('site-footer');
    if (!f) return;
    f.className = 'footer';
    f.innerHTML = `<div class="wrap"><div class="foot-grid">
      <div class="foot-brand"><a href="/" aria-label="Bazar home"><img src="/assets/brand/logo-light.png" width="852" height="332" alt="clickfor.in Bazar" loading="lazy"></a><p>clickfor.in · Your online store for daily essentials.</p></div>
      <div><h3>Explore</h3><ul><li><a href="/">Home</a></li><li><a href="/products">All products</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li></ul></div>
      <div><h3>Categories</h3><ul id="footCats"><li><a href="/products">All products</a></li></ul></div>
      <div><h3>Talk to us</h3><ul><li><a href="tel:+918086777790">${SHOW_PHONE}</a></li><li><a href="${WA_GENERAL}" target="_blank" rel="noopener noreferrer">WhatsApp</a></li></ul></div>
      <div><h3>Policies</h3><ul><li><a href="/delivery-policy">Delivery Policy</a></li><li><a href="/refund-policy">Refund Policy</a></li></ul></div>
    </div><div class="foot-bottom"><span>© ${new Date().getFullYear()} clickfor.in. All rights reserved.</span><span>Bazar · Order on WhatsApp</span></div></div>`;
    getCatalog().then(c => {
      if (c.categories.length) document.getElementById('footCats').innerHTML = c.categories.map(x => `<li><a href="/category/${esc(x.slug)}">${esc(x.name)}</a></li>`).join('');
    }).catch(() => {});
  }

  function renderFab(hide) {
    if (hide) return;
    const a = document.createElement('a');
    a.className = 'fab-wa';
    a.href = WA_GENERAL; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Chat with Bazar on WhatsApp');
    a.innerHTML = ICON.wa;
    document.body.appendChild(a);
  }

  function boot(opts) {
    opts = opts || {};
    renderHeader(opts.active);
    renderFooter();
    renderFab(false);
    // product images: remove shimmer when loaded; show placeholder if an image fails
    document.addEventListener('load', e => {
      if (e.target.tagName === 'IMG' && e.target.closest('.p-media')) e.target.closest('.p-media').classList.remove('loading');
    }, true);
    document.addEventListener('error', e => {
      const t = e.target;
      if (t.tagName === 'IMG' && t.closest('.p-media')) {
        const m = t.closest('.p-media'); m.classList.remove('loading');
        t.remove(); m.insertAdjacentHTML('beforeend', `<div class="p-ph">${ICON.bag}</div>`);
      }
    }, true);
    return getCatalog();
  }

  window.Bazar = { boot, getCatalog, productCard, emptyProducts, buyUrl, money, qtyText, unitText, esc, ICON, WA_GENERAL, WA_PHONE, SHOW_PHONE, SITE };
})();
