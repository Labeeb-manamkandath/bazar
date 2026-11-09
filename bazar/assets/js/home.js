(function () {
  const B = window.Bazar, esc = B.esc;
  const isExternal = u => /^https?:\/\//i.test(u);

  B.boot({ active: 'home' }).then(c => {
    // --- hero (editable in the admin) ---
    const h = c.home.hero;
    const title = document.getElementById('hero-title');
    title.innerHTML = esc(h.headline).replace(/(whatsapp)/i, '<span class="hl">$1</span>');
    document.getElementById('heroText').textContent = h.text;
    document.getElementById('heroNumberText').textContent = h.number || B.SHOW_PHONE;
    document.getElementById('ctaNum').textContent = h.number || B.SHOW_PHONE;
    document.getElementById('heroCtaText').textContent = h.cta_text;
    const cta = document.getElementById('heroCta');
    cta.href = h.cta_url;
    if (isExternal(h.cta_url)) { cta.target = '_blank'; cta.rel = 'noopener noreferrer'; } else { cta.removeAttribute('target'); cta.removeAttribute('rel'); }

    // --- categories ---
    const cats = c.home.category_ids.map(id => c.categories.find(x => x.id === id)).filter(Boolean);
    if (cats.length) {
      document.getElementById('categories').hidden = false;
      document.getElementById('catGrid').innerHTML = cats.map(x => `
        <a class="cat-tile" href="/category/${esc(x.slug)}">
          <div class="pic">${x.image_url ? `<img src="${esc(x.image_url)}" alt="" loading="lazy" decoding="async" width="130" height="130">` : `<div class="ph">${esc(x.name.charAt(0).toUpperCase())}</div>`}</div>
          <div class="txt"><div><h3>${esc(x.name)}</h3><small>${x.count} product${x.count === 1 ? '' : 's'}</small></div><span class="arrow">${B.ICON.arrow}</span></div>
        </a>`).join('');
    }

    // --- most loved ---
    const loved = c.home.popular_ids.map(id => c.byId[id]).filter(Boolean).slice(0, 8);
    if (loved.length) {
      document.getElementById('loved').hidden = false;
      document.getElementById('lovedGrid').innerHTML = loved.map(B.productCard).join('');
    }

    // --- explore all products ---
    const grid = document.getElementById('exploreGrid'), chips = document.getElementById('exploreChips'), all = document.getElementById('exploreAll');
    let current = '';
    const draw = () => {
      const list = c.products.filter(p => !current || p.category.id === current).slice(0, 8);
      grid.innerHTML = list.length ? list.map(B.productCard).join('')
        : B.emptyProducts({ title: c.products.length ? 'Nothing here yet' : 'The shelves are being stocked', text: c.products.length ? 'There are no products in this category right now.' : 'New products are being added. Message us on WhatsApp to ask what is available.' }, false);
      const cat = c.categories.find(x => x.id === current);
      all.href = cat ? '/category/' + cat.slug : '/products';
      chips.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === current)));
    };
    if (c.categories.length > 1) {
      chips.hidden = false;
      chips.innerHTML = `<button class="chip" type="button" data-id="" aria-pressed="true">All</button>` + c.categories.filter(x => x.count).map(x => `<button class="chip" type="button" data-id="${esc(x.id)}" aria-pressed="false">${esc(x.name)}</button>`).join('');
      chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { current = b.dataset.id; draw(); } });
    }
    draw();

    // --- final banner ---
    const ctaBtn = document.getElementById('ctaBtn');
    ctaBtn.href = h.cta_url;
    if (!isExternal(h.cta_url)) { ctaBtn.removeAttribute('target'); ctaBtn.removeAttribute('rel'); }
  }).catch(() => {
    document.getElementById('exploreGrid').innerHTML = B.emptyProducts({ title: 'We could not load products', text: 'Please refresh the page, or message us on WhatsApp and we will help you.' }, false);
  });
})();
