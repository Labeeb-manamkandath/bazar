(function () {
  const B = window.Bazar, esc = B.esc, I = B.ICON;
  const slug = decodeURIComponent((location.pathname.match(/^\/products\/([^/?#]+)/) || [])[1] || '');

  B.boot({ active: 'products' }).then(c => {
    const p = c.products.find(x => x.slug === slug);
    const root = document.getElementById('pdRoot');
    if (!p) {
      root.innerHTML = `<div class="empty-state" style="margin-top:40px"><h3>We could not find this product</h3><p>It may have been removed or is no longer available.</p><a class="btn btn-green" href="/products">See all products</a><a class="btn btn-wa" href="${B.WA_GENERAL}" target="_blank" rel="noopener noreferrer">${I.wa}<span>Ask us on WhatsApp</span></a></div>`;
      return;
    }
    const qty = B.qtyText(p), unit = B.unitText(p.price_unit), url = B.buyUrl(p);
    document.body.classList.toggle('has-buybar', p.in_stock);
    if (!document.title || /^Product not found|^Bazar by/.test(document.title)) document.title = p.name + ' | Bazar by clickfor.in';

    const imgs = p.images.length ? p.images : [];
    // Media = photos, then the video (if any). A video is a YouTube link or an uploaded file.
    const ytId = u => { try { const x = new URL(u), h = x.hostname.replace(/^www\.|^m\./, ''); const id = h === 'youtu.be' ? x.pathname.slice(1) : (h === 'youtube.com' ? (x.searchParams.get('v') || (x.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/) || [])[1]) : ''); return /^[A-Za-z0-9_-]{6,20}$/.test(id || '') ? id : ''; } catch { return ''; } };
    const media = imgs.map(u => ({ type: 'img', src: u }));
    if (p.video) { const id = ytId(p.video); media.push(id ? { type: 'yt', id } : { type: 'file', src: p.video }); }
    const mediaHtml = m => m.type === 'img' ? `<img id="gImg" src="${esc(m.src)}" alt="${esc(p.name)}" width="900" height="900" fetchpriority="high">`
      : m.type === 'yt' ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(m.id)}?rel=0&playsinline=1" title="${esc(p.name)} video" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
      : `<video src="${esc(m.src)}" controls playsinline preload="metadata" aria-label="${esc(p.name)} video"></video>`;
    const playIc = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 001.5.86l11-6.5a1 1 0 000-1.72l-11-6.5A1 1 0 008 5.5z"/></svg>';
    const buyBtn = (cls, label) => p.in_stock
      ? `<a class="btn btn-wa ${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${I.wa}<span>${label}</span></a>`
      : `<button class="btn ${cls}" type="button" disabled>Out of stock</button>`;

    root.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb" style="padding-top:22px;opacity:.75"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/products">Products</a><span aria-hidden="true">/</span><a href="/category/${esc(p.category.slug)}">${esc(p.category.name)}</a></nav>
      <div class="pd">
        <div class="gallery">
          <div class="g-main${media[0] && media[0].type !== 'img' ? ' is-video' : ''}" id="gMain"><div class="g-slot" id="gSlot">${media.length ? mediaHtml(media[0]) : `<div class="p-ph" style="position:absolute;inset:0">${I.bag}</div>`}</div>
            ${media.length > 1 ? `<button class="g-arrow prev" type="button" aria-label="Previous">${I.left}</button><button class="g-arrow next" type="button" aria-label="Next">${I.right}</button>` : ''}
          </div>
          ${media.length > 1 ? `<div class="g-thumbs" id="gThumbs">${media.map((m, i) => `<button type="button" data-i="${i}" aria-label="${m.type === 'img' ? 'Show photo ' + (i + 1) : 'Play video'}" ${i === 0 ? 'aria-current="true"' : ''}${m.type === 'img' ? '' : ' class="vid"'}>${m.type === 'img' ? `<img src="${esc(m.src)}" alt="" loading="lazy" width="72" height="72">` : `<span>${playIc}<br>Video</span>`}</button>`).join('')}</div>` : ''}
        </div>
        <div class="pd-info">
          <p class="p-cat"><a href="/category/${esc(p.category.slug)}">${esc(p.category.name)}</a></p>
          <h1>${esc(p.name)}</h1>
          <div class="pd-price"><strong>${B.money(p.price)}</strong>${unit ? `<span>${esc(unit)}</span>` : ''}</div>
          <div class="facts">
            ${qty ? `<div class="fact"><b>Quantity</b>${esc(qty)}</div>` : ''}
            <div class="fact"><b>Availability</b><span class="avail ${p.in_stock ? '' : 'no'}">${p.in_stock ? 'In stock' : 'Out of stock'}</span></div>
          </div>
          ${p.description ? `<div class="pd-desc"><h2>About this product</h2><p>${esc(p.description)}</p></div>` : ''}
          <div class="pd-buy">
            ${buyBtn('btn-lg', 'Buy on WhatsApp')}
            <p style="font-size:.92rem;opacity:.75">${p.in_stock ? 'Tap the button to open this product on WhatsApp and chat with us to place your order. There is no cart or website checkout.' : 'This product is not available right now. Message us on WhatsApp to ask when it will be back.'}</p>
            ${p.in_stock ? '' : `<a class="btn btn-ghost" href="${B.WA_GENERAL}" target="_blank" rel="noopener noreferrer">${I.wa}<span>Ask on WhatsApp</span></a>`}
          </div>
        </div>
      </div>
      ${p.in_stock ? `<div class="buybar"><div class="bp"><strong>${B.money(p.price)}</strong><span>${esc([unit, qty].filter(Boolean).join(' · '))}</span></div>${buyBtn('', 'Buy on WhatsApp')}</div>` : ''}`;

    // gallery
    if (media.length > 1) {
      let i = 0;
      const slot = document.getElementById('gSlot'), main = document.getElementById('gMain'), thumbs = document.getElementById('gThumbs');
      const show = n => {
        i = (n + media.length) % media.length;
        const m = media[i], img = slot.querySelector('img');
        if (m.type === 'img' && img) img.src = m.src; else slot.innerHTML = mediaHtml(m);
        main.classList.toggle('is-video', m.type !== 'img');
        thumbs.querySelectorAll('button').forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      };
      document.querySelector('.g-arrow.prev').addEventListener('click', () => show(i - 1));
      document.querySelector('.g-arrow.next').addEventListener('click', () => show(i + 1));
      thumbs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); });
      let x0 = null; const m = document.getElementById('gMain');
      m.addEventListener('touchstart', e => { x0 = e.target.closest('video') ? null : e.touches[0].clientX; }, { passive: true });
      m.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
    }

    // related
    const rel = c.products.filter(x => x.category.id === p.category.id && x.id !== p.id).slice(0, 4);
    if (rel.length) { document.getElementById('relatedSec').hidden = false; document.getElementById('relatedGrid').innerHTML = rel.map(B.productCard).join(''); }
  }).catch(() => {
    document.getElementById('pdRoot').innerHTML = '<div class="empty-state" style="margin-top:40px"><h3>We could not load this product</h3><p>Please refresh the page, or message us on WhatsApp.</p></div>';
  });
})();
