(function () {
  const B = window.Bazar, esc = B.esc;
  const isExternal = u => /^https?:\/\//i.test(u);

  function banners(list) {
    list = list.filter(b => b && b.image).slice(0, 4);
    if (!list.length) return;
    const slides = document.getElementById('slides'), dots = document.getElementById('slDots');
    const prev = document.getElementById('slPrev'), next = document.getElementById('slNext');
    // The welcome banner always stays first; offer banners follow it.
    const n = list.length + 1;
    slides.querySelector('.slide-welcome').setAttribute('aria-label', `1 of ${n}`);
    slides.insertAdjacentHTML('beforeend', list.map((b, i) => {
      // Blurred copy behind, whole banner in front: nothing gets cut off when the slide is taller than 3:1 (phones).
      const img = `<img class="bg" src="${esc(b.image)}" alt="" aria-hidden="true" loading="lazy" decoding="async"><img class="fg" src="${esc(b.image)}" alt="${esc(b.alt || 'Offer banner ' + (i + 1))}" width="1500" height="500" loading="lazy" decoding="async">`;
      const link = b.link ? `<a href="${esc(b.link)}"${isExternal(b.link) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${img}</a>` : img;
      return `<div class="slide slide-img" role="group" aria-roledescription="slide" aria-label="${i + 2} of ${n}">${link}</div>`;
    }).join(''));

    prev.hidden = next.hidden = dots.hidden = false;
    dots.innerHTML = Array.from({ length: n }, (_, i) => `<button type="button" aria-label="Show banner ${i + 1}"${i ? '' : ' aria-current="true"'}></button>`).join('');
    const dotBtns = [...dots.children];
    let cur = 0;
    const go = (i, smooth = true) => {
      cur = (i + n) % n;
      slides.scrollTo({ left: cur * slides.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    };
    slides.addEventListener('scroll', () => {
      const i = Math.round(slides.scrollLeft / Math.max(1, slides.clientWidth));
      if (i !== cur) cur = i;
      dotBtns.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    }, { passive: true });
    prev.addEventListener('click', () => { go(cur - 1); restart(); });
    next.addEventListener('click', () => { go(cur + 1); restart(); });
    dotBtns.forEach((d, k) => d.addEventListener('click', () => { go(k); restart(); }));
    window.addEventListener('resize', () => go(cur, false));

    // Auto-advance every 5 seconds; pause while the visitor is touching, hovering or focused on it.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slider = document.getElementById('slider');
    let timer = null, paused = false;
    const restart = () => { clearInterval(timer); if (!still) timer = setInterval(() => { if (!paused && !document.hidden) go(cur + 1); }, 5000); };
    ['mouseenter', 'focusin', 'touchstart'].forEach(e => slider.addEventListener(e, () => { paused = true; }, { passive: true }));
    ['mouseleave', 'focusout', 'touchend'].forEach(e => slider.addEventListener(e, () => { paused = false; }, { passive: true }));
    restart();
  }

  B.boot({ active: 'home' }).then(c => {
    // --- welcome text + WhatsApp bar (editable in the admin) ---
    const h = c.home.hero;
    document.getElementById('welcomeTitle').innerHTML = esc(h.headline).replace(/(whatsapp)/i, '<span class="hl">$1</span>');
    document.getElementById('welcomeText').textContent = h.text;
    document.getElementById('pageTitle').textContent = 'Bazar by clickfor.in: ' + h.headline;

    // --- welcome banner art: up to 3 product photos (Most Loved first) on the orange circle ---
    const picks = [...c.home.popular_ids.map(id => c.byId[id]), ...c.products].filter((p, i, a) => p && p.images[0] && a.indexOf(p) === i).slice(0, 3);
    document.getElementById('welcomeArt').innerHTML = picks.map((p, i) => `<span class="sw-pic p${i + 1}"><img src="${esc(p.images[0])}" alt="" width="300" height="300" decoding="async"></span>`).join('');

    // --- offer banners (max 4), shown after the welcome banner ---
    banners(c.home.banners || []);
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
