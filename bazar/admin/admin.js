/* Bazar Admin Portal. All data goes through /api/admin, which checks the login session on the server. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    home: svg('<path d="M3 11l9-8 9 8M5 10v10h14V10"/>'), box: svg('<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'),
    tag: svg('<path d="M20 12l-8 8-9-9V3h8zM7.5 7.5h.01"/>'), layout: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
    doc: svg('<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h6"/>'), user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'), edit: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>'),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/>'), up: svg('<path d="M6 15l6-6 6 6"/>'), down: svg('<path d="M6 9l6 6 6-6"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'), close: svg('<path d="M6 6l12 12M18 6L6 18"/>'), ext: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>'),
    out: svg('<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>'),
  };

  let S = null;                       // data from the server
  let me = null;
  const ui = { q: '', cat: '', status: '' };

  /* ---------- api ---------- */
  async function api(action, body) {
    const opt = { credentials: 'same-origin', headers: { 'X-Requested-With': 'bazar-admin' } };
    if (body !== undefined) { opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    let res, data;
    try { res = await fetch('/api/admin?a=' + action, opt); data = await res.json(); }
    catch (e) { return { ok: false, error: 'Could not reach the server. Check your internet and try again.' }; }
    if (res.status === 401 && action !== 'login') { showLogin('Your session has ended. Please log in again.'); }
    return data;
  }

  function toast(msg, err) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), err ? 6000 : 3200);
  }

  /* ---------- dialogs ---------- */
  const dlg = $('#dlg');
  function openDlg(html, cls) { dlg.className = 'dlg ' + (cls || ''); dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); return dlg; }
  function closeDlg() { if (dlg.open) dlg.close(); dlg.innerHTML = ''; }
  dlg.addEventListener('click', e => { if (e.target === dlg && dlg.dataset.lock !== '1') closeDlg(); });
  function confirmBox({ title, text, ok = 'Confirm', danger }) {
    return new Promise(res => {
      openDlg(`<div class="dlg-head"><h2>${esc(title)}</h2></div><div class="dlg-body"><p>${text}</p></div>
        <div class="dlg-foot"><button class="btn btn-ghost" data-r="0" type="button">Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-orange'}" data-r="1" type="button">${esc(ok)}</button></div>`, 'sm');
      dlg.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { const v = b.dataset.r === '1'; closeDlg(); res(v); }));
      dlg.addEventListener('close', () => res(false), { once: true });
    });
  }

  /* ---------- helpers ---------- */
  const money = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(+n) ? 0 : 2, maximumFractionDigits: 2 });
  const fdate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const catName = id => (S.categories.find(c => c.id === id) || {}).name || 'No category';
  const priceLine = p => money(p.price) + (p.price_unit && p.price_unit !== 'other' ? ' / ' + p.price_unit : '');
  const qtyLine = p => [p.quantity_value, p.quantity_unit && p.quantity_unit !== 'other' ? p.quantity_unit : ''].filter(Boolean).join(' ');
  const thumb = (url, name) => url ? `<img class="thumb" src="${esc(url)}" alt="" loading="lazy">` : `<div class="thumb ph" aria-hidden="true">${esc((name || '?').charAt(0).toUpperCase())}</div>`;
  const fieldErr = (f, k) => f && f[k] ? `<span class="err" role="alert">${esc(f[k])}</span>` : '';

  async function refresh() {
    const d = await api('overview');
    if (d.ok) { S = d; me = d.user; }
    return d.ok;
  }

  /* ---------- login ---------- */
  function showLogin(msg) {
    S = null; closeDlg();
    $('#app').hidden = true; $('#login').hidden = false;
    const e = $('#loginError'); if (msg) { e.textContent = msg; e.hidden = false; } else e.hidden = true;
    $('#lp').value = '';
  }
  $('#pwToggle').addEventListener('click', e => {
    const i = $('#lp'), show = i.type === 'password';
    i.type = show ? 'text' : 'password'; e.target.textContent = show ? 'Hide' : 'Show';
    e.target.setAttribute('aria-pressed', show); e.target.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#loginBtn'), err = $('#loginError');
    err.hidden = true; btn.disabled = true; btn.textContent = 'Logging in…';
    const r = await api('login', { username: $('#lu').value.trim(), password: $('#lp').value });
    btn.disabled = false; btn.textContent = 'Log in';
    if (!r.ok) { err.textContent = r.error || 'Could not log in.'; err.hidden = false; $('#lp').value = ''; $('#lp').focus(); return; }
    await start();
  });

  /* ---------- shell ---------- */
  const NAV = [['dashboard', 'Dashboard', IC.home], ['products', 'Products', IC.box], ['categories', 'Categories', IC.tag], ['homepage', 'Homepage', IC.layout], ['policies', 'Policies', IC.doc], ['account', 'Account', IC.user]];
  const route = () => (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0];

  function shell() {
    $('#login').hidden = true;
    const app = $('#app'); app.hidden = false;
    app.innerHTML = `<div class="topbar"><button class="icon-btn" id="sideOpen" aria-label="Open menu">${IC.menu}</button><img src="/assets/brand/logo-light.png" width="852" height="332" alt="Bazar"><a class="icon-btn" href="/" target="_blank" rel="noopener" aria-label="View website">${IC.ext}</a></div>
    <div class="shell"><aside class="side" id="side"><div class="logo"><img src="/assets/brand/logo-light.png" width="852" height="332" alt="clickfor.in Bazar"><span class="badge-admin">Admin Portal</span></div>
      <nav aria-label="Admin">${NAV.map(n => `<a class="nav-i" href="#/${n[0]}" data-n="${n[0]}">${n[2]}<span>${n[1]}</span></a>`).join('')}</nav>
      <div class="spacer"></div>
      <a class="nav-i" href="/" target="_blank" rel="noopener">${IC.ext}<span>View website</span></a>
      <button class="nav-i" id="logout" type="button">${IC.out}<span>Log out</span></button></aside>
      <main class="main" id="view"></main></div>`;
    $('#sideOpen').addEventListener('click', () => $('#side').classList.add('open'));
    $('#side').addEventListener('click', e => { if (e.target.closest('a.nav-i[data-n]')) $('#side').classList.remove('open'); if (e.target === $('#side')) $('#side').classList.remove('open'); });
    document.addEventListener('click', e => { const s = $('#side'); if (s && s.classList.contains('open') && !e.target.closest('#side') && !e.target.closest('#sideOpen')) s.classList.remove('open'); });
    $('#logout').addEventListener('click', async () => { await api('logout', {}); location.hash = ''; showLogin(); });
  }

  function render() {
    if (!S) return;
    const r = route();
    $$('.nav-i[data-n]').forEach(a => a.toggleAttribute('aria-current', a.dataset.n === r));
    $$('.nav-i[data-n]').forEach(a => { if (a.dataset.n === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const old = $('#view'), v = old.cloneNode(false); old.replaceWith(v); // fresh element: drops the previous view's listeners
    ({ dashboard, products, categories, homepage, policies, account }[r] || dashboard)(v);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  /* ---------- Dashboard ---------- */
  function dashboard(v) {
    const P = S.products, active = P.filter(p => p.status === 'active');
    const missing = P.filter(p => !p.wa_link);
    const recent = P.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    v.innerHTML = `<div class="page-title"><h1>Dashboard</h1></div>
      <div class="stats"><div class="stat hi"><b>${P.length}</b><span>Total products</span></div><div class="stat"><b>${active.length}</b><span>Active products</span></div><div class="stat"><b>${S.categories.length}</b><span>Categories</span></div><div class="stat"><b>${P.filter(p => p.popular).length}</b><span>Most loved</span></div></div>
      ${P.some(p => (p.wa_link || '').endsWith('/227599762624720')) ? `<div class="warn"><span><b>Some WhatsApp product links need a quick fix.</b> They will show "invalid item link" in WhatsApp.</span><button class="btn btn-sm btn-orange" id="fixLinks" type="button">Fix links now</button></div>` : ''}
      ${missing.length ? `<div class="warn"><span><b>${missing.length} product${missing.length > 1 ? 's are' : ' is'} missing a WhatsApp catalogue link.</b> Customers will get a WhatsApp message with the product name instead of the catalogue page.</span><a class="btn btn-sm btn-orange" href="#/products" data-filter="missing">Show them</a></div>` : ''}
      <div class="card"><h2>Quick actions</h2><div class="actions">
        <button class="action" data-go="new"><span class="ai">${IC.plus}</span>Add New Product</button>
        <a class="action" href="#/products"><span class="ai">${IC.box}</span>Manage Products</a>
        <a class="action" href="#/categories"><span class="ai">${IC.tag}</span>Manage Categories</a>
        <a class="action" href="#/homepage"><span class="ai">${IC.layout}</span>Manage Homepage</a>
        <a class="action" href="#/policies"><span class="ai">${IC.doc}</span>Manage Policies</a></div></div>
      <div class="card"><h2>Recently added</h2>${recent.length ? `<ul class="ol">${recent.map(p => `<li>${thumb(p.images[0], p.name)}<div class="t">${esc(p.name)}<small>${esc(catName(p.category_id))} · ${priceLine(p)} · added ${fdate(p.created_at)}</small></div><button class="btn btn-sm btn-ghost" data-edit="${p.id}">Edit</button></li>`).join('')}</ul>` : `<div class="empty"><h2>No products yet</h2><p class="muted">Add your first product to show it on the website.</p><button class="btn btn-orange" id="seedBtn" type="button">Import starter products</button></div>`}</div>`;
    const fl = v.querySelector('#fixLinks');
    if (fl) fl.addEventListener('click', async () => {
      fl.disabled = true; fl.textContent = 'Fixing…';
      const r = await api('import.starter', {});
      if (!r.ok) { fl.disabled = false; fl.textContent = 'Fix links now'; return toast(r.error, true); }
      await refresh(); render(); toast(`Fixed ${r.fixed} product link${r.fixed === 1 ? '' : 's'}.`);
    });
    const sb = v.querySelector('#seedBtn');
    if (sb) sb.addEventListener('click', async () => {
      if (!(await confirmBox({ title: 'Import starter products?', text: 'This adds 4 categories and 8 products (with photos and WhatsApp links). Anything already added is skipped.', ok: 'Yes, import' }))) return;
      sb.disabled = true; sb.textContent = 'Importing…';
      const r = await api('import.starter', {});
      if (!r.ok) { sb.disabled = false; sb.textContent = 'Import starter products'; return toast(r.error, true); }
      await refresh(); render(); toast(`Done. Added ${r.added_categories} categories and ${r.added_products} products.`);
    });
    v.querySelector('[data-go="new"]').addEventListener('click', () => productForm(null));
    v.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => productForm(S.products.find(p => p.id === b.dataset.edit))));
    const f = v.querySelector('[data-filter]'); if (f) f.addEventListener('click', () => { ui.status = 'missing'; });
  }

  /* ---------- Products ---------- */
  function filteredProducts() {
    const q = ui.q.trim().toLowerCase();
    return S.products.filter(p =>
      (!q || p.name.toLowerCase().includes(q)) && (!ui.cat || p.category_id === ui.cat) &&
      (!ui.status || (ui.status === 'missing' ? !p.wa_link : ui.status === 'popular' ? p.popular : ui.status === 'oos' ? !p.in_stock : p.status === ui.status)))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  function products(v) {
    v.innerHTML = `<div class="page-title"><h1>Products</h1><button class="btn btn-orange" id="addP" type="button">${IC.plus} Add product</button></div>
      <div class="filters"><input type="search" id="fq" placeholder="Search products" aria-label="Search products" value="${esc(ui.q)}">
        <select id="fc" aria-label="Filter by category"><option value="">All categories</option>${S.categories.map(c => `<option value="${c.id}" ${ui.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <select id="fs" aria-label="Filter by status">${[['', 'All products'], ['active', 'Active'], ['inactive', 'Inactive'], ['popular', 'Most loved'], ['oos', 'Out of stock'], ['missing', 'Missing WhatsApp link']].map(o => `<option value="${o[0]}" ${ui.status === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
      <div id="plist"></div>`;
    $('#addP').addEventListener('click', () => productForm(null));
    $('#fq').addEventListener('input', e => { ui.q = e.target.value; drawProducts(); });
    $('#fc').addEventListener('change', e => { ui.cat = e.target.value; drawProducts(); });
    $('#fs').addEventListener('change', e => { ui.status = e.target.value; drawProducts(); });
    drawProducts();
  }

  function pills(p) {
    return `<button class="pill ${p.status === 'active' ? 'ok' : 'off'}" data-t="status" data-id="${p.id}" type="button" title="Click to switch ${p.status === 'active' ? 'off' : 'on'}">${p.status === 'active' ? 'Active' : 'Inactive'}</button>
      <button class="pill ${p.popular ? 'pop' : ''}" data-t="popular" data-id="${p.id}" type="button" title="Click to ${p.popular ? 'remove from' : 'add to'} Most Loved">${p.popular ? '★ Most loved' : '☆ Most loved'}</button>
      ${p.in_stock ? '' : '<button class="pill bad" data-t="stock" data-id="' + p.id + '" type="button" title="Click to mark in stock">Out of stock</button>'}
      ${p.wa_link ? '' : '<span class="pill warn" title="No WhatsApp catalogue link">No WhatsApp link</span>'}`;
  }

  function drawProducts() {
    const list = filteredProducts(), box = $('#plist');
    if (!S.products.length) { box.innerHTML = `<div class="card empty"><h2>No products yet</h2><p class="muted" style="margin-bottom:16px">Add your first product. It will appear on the website right away.</p><button class="btn btn-orange" id="addP2" type="button">${IC.plus} Add product</button></div>`; $('#addP2').addEventListener('click', () => productForm(null)); return; }
    if (!list.length) { box.innerHTML = `<div class="card empty"><h2>No products match</h2><p class="muted">Try a different search or filter.</p></div>`; return; }
    box.innerHTML = `<div class="card tblcard" style="padding:6px 8px"><table class="tbl"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Status</th><th>Updated</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${list.map(p => `<tr>
        <td><div class="pname">${thumb(p.images[0], p.name)}<div><b>${esc(p.name)}</b><small>${esc(qtyLine(p))}</small></div></div></td>
        <td>${esc(catName(p.category_id))}</td><td><b>${priceLine(p)}</b></td><td><div style="display:flex;gap:6px;flex-wrap:wrap">${pills(p)}</div></td><td>${fdate(p.updated_at)}</td>
        <td><div class="row-actions"><button class="icon-btn" data-edit="${p.id}" aria-label="Edit ${esc(p.name)}" title="Edit">${IC.edit}</button><button class="icon-btn danger" data-del="${p.id}" aria-label="Delete ${esc(p.name)}" title="Delete">${IC.trash}</button></div></td></tr>`).join('')}</tbody></table></div>
      <div class="cards">${list.map(p => `<div class="pc">${thumb(p.images[0], p.name)}<div><b>${esc(p.name)}</b><div class="small muted">${esc(catName(p.category_id))} · ${priceLine(p)}${qtyLine(p) ? ' · ' + esc(qtyLine(p)) : ''}</div><div class="meta">${pills(p)}</div><div class="small muted">Updated ${fdate(p.updated_at)}</div></div>
        <div class="row-actions"><button class="btn btn-sm btn-ghost" data-edit="${p.id}">${IC.edit} Edit</button><button class="btn btn-sm btn-ghost" data-del="${p.id}">${IC.trash} Delete</button></div></div>`).join('')}</div>`;
    box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => productForm(S.products.find(p => p.id === b.dataset.edit))));
    box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteProduct(S.products.find(p => p.id === b.dataset.del))));
    box.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', async () => {
      const p = S.products.find(x => x.id === b.dataset.id), t = b.dataset.t;
      const patch = { id: p.id };
      if (t === 'status') patch.status = p.status === 'active' ? 'inactive' : 'active';
      if (t === 'popular') patch.popular = !p.popular;
      if (t === 'stock') patch.in_stock = true;
      const r = await api('product.patch', patch);
      if (!r.ok) return toast(r.error, true);
      await refresh(); drawProducts(); toast('Saved. The website is updated.');
    }));
  }

  async function deleteProduct(p) {
    const yes = await confirmBox({ title: 'Delete this product?', text: `<b>${esc(p.name)}</b> will be removed from the website for good. This cannot be undone. If you only want to hide it, set it to Inactive instead.`, ok: 'Yes, delete', danger: true });
    if (!yes) return;
    const r = await api('product.delete', { id: p.id });
    if (!r.ok) return toast(r.error, true);
    await refresh(); render(); toast('Product deleted.');
  }

  /* ---------- image upload (resize in the browser, then upload with progress) ---------- */
  async function resizeToDataUrl(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.');
    if (file.size > 20 * 1024 * 1024) throw new Error('This image is very large (over 20 MB). Please choose a smaller one.');
    const bmp = await createImageBitmap(file);
    const max = 1400, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blobOf = (type, q) => new Promise(r => c.toBlob(r, type, q));
    let blob = await blobOf('image/webp', 0.82);
    if (!blob || blob.type !== 'image/webp') blob = await blobOf('image/jpeg', 0.85);
    for (let q = 0.7; blob.size > 2.6 * 1024 * 1024 && q > 0.3; q -= 0.15) blob = await blobOf(blob.type, q);
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
  }

  function uploadWithProgress(dataUrl, name, onProgress) {
    return new Promise(res => {
      const x = new XMLHttpRequest();
      x.open('POST', '/api/admin?a=upload');
      x.setRequestHeader('Content-Type', 'application/json'); x.setRequestHeader('X-Requested-With', 'bazar-admin');
      x.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = () => { try { res(JSON.parse(x.responseText)); } catch { res({ ok: false, error: 'Upload failed.' }); } };
      x.onerror = () => res({ ok: false, error: 'Upload failed. Check your internet and try again.' });
      x.send(JSON.stringify({ data: dataUrl, name }));
    });
  }

  // Reusable image grid. items: [{url, id, progress}] ; onChange called after edits.
  function imageManager(root, items, { max = 8, single = false, onChange }) {
    const draw = () => {
      root.innerHTML = `<div class="imgs">${items.map((it, i) => `<div class="im ${it.uploading ? 'up' : ''}"><img src="${esc(it.url)}" alt="Photo ${i + 1}">${!single && i === 0 && !it.uploading ? '<span class="tag">Main photo</span>' : ''}
        ${it.uploading ? `<div class="bar"><i style="width:${Math.round((it.progress || 0) * 100)}%"></i></div>` : `<div class="tools"><span>${!single && i > 0 ? `<button type="button" data-main="${i}" title="Make main photo" aria-label="Make this the main photo">★</button>` : ''}</span><button type="button" data-rm="${i}" title="Remove photo" aria-label="Remove photo ${i + 1}">${IC.trash}</button></div>`}</div>`).join('')}
        ${items.length < max ? `<label class="add-img"><span><b>+</b>Add photo${single ? '' : 's'}</span><input type="file" accept="image/jpeg,image/png,image/webp" ${single ? '' : 'multiple'} hidden></label>` : ''}</div>
        <p class="hint" style="margin-top:8px">${single ? 'JPG, PNG or WebP.' : 'The first photo is the main photo. Up to ' + max + ' photos. JPG, PNG or WebP.'} Photos are resized automatically.</p><p class="err" data-imgerr></p>`;
    };
    draw();
    root.addEventListener('click', e => {
      const rm = e.target.closest('[data-rm]'), mk = e.target.closest('[data-main]');
      if (rm) { items.splice(+rm.dataset.rm, 1); draw(); onChange && onChange(); }
      if (mk) { const [it] = items.splice(+mk.dataset.main, 1); items.unshift(it); draw(); onChange && onChange(); }
    });
    root.addEventListener('change', async e => {
      if (e.target.type !== 'file') return;
      const files = Array.from(e.target.files).slice(0, max - items.length); e.target.value = '';
      const err = root.querySelector('[data-imgerr]'); err.textContent = '';
      for (const f of files) {
        const it = { url: URL.createObjectURL(f), uploading: true, progress: 0 }; items.push(it); draw(); onChange && onChange();
        try {
          const data = await resizeToDataUrl(f);
          const r = await uploadWithProgress(data, f.name.replace(/\.[^.]+$/, ''), p => { it.progress = p; const bar = root.querySelectorAll('.im')[items.indexOf(it)]; if (bar && bar.querySelector('.bar i')) bar.querySelector('.bar i').style.width = Math.round(p * 100) + '%'; });
          if (!r.ok) throw new Error(r.error || 'Upload failed.');
          it.url = r.url; it.uploading = false;
        } catch (ex) { items.splice(items.indexOf(it), 1); draw(); root.querySelector('[data-imgerr]').textContent = (f.name + ': ' + (ex.message || 'could not upload.')); }
        draw(); onChange && onChange();
      }
    });
    return { busy: () => items.some(i => i.uploading) };
  }

  /* ---------- Product form ---------- */
  const UNITS = ['', 'kg', 'g', 'litre', 'ml', 'piece', 'pack', 'dozen', 'box', 'bottle', 'other'];
  const unitOpts = (sel, blank) => UNITS.map(u => `<option value="${u}" ${u === sel ? 'selected' : ''}>${u === '' ? blank : u}</option>`).join('');

  function productForm(p) {
    if (!S.categories.length) {
      openDlg(`<div class="dlg-head"><h2>Add a category first</h2><button class="icon-btn" data-x aria-label="Close">${IC.close}</button></div><div class="dlg-body"><p>Every product belongs to a category. Create your first category, then add products.</p></div><div class="dlg-foot"><button class="btn btn-ghost" data-x type="button">Cancel</button><button class="btn btn-orange" id="goCat" type="button">Create a category</button></div>`, 'sm');
      dlg.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', closeDlg));
      $('#goCat').addEventListener('click', () => { closeDlg(); location.hash = '#/categories'; setTimeout(() => categoryForm(null), 50); });
      return;
    }
    const isNew = !p; p = p || { status: 'active', in_stock: true, popular: false, featured: false, images: [], price_unit: '', quantity_unit: '' };
    const items = (p.images || []).map(u => ({ url: u }));
    const html = `<form id="pf" novalidate>
      <div class="dlg-head"><h2>${isNew ? 'Add product' : 'Edit product'}</h2><button class="icon-btn" type="button" data-x aria-label="Close">${IC.close}</button></div>
      <div class="dlg-body">
        <p class="form-error" id="pfErr" role="alert" hidden></p>
        <div class="field" data-f="name"><label for="f_name">Product name *</label><input id="f_name" type="text" maxlength="120" value="${esc(p.name || '')}" required><span data-e></span></div>
        <div class="field" data-f="category_id"><label for="f_cat">Category *</label>
          <select id="f_cat"><option value="">Choose a category</option>${S.categories.map(c => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name)}${c.active ? '' : ' (hidden)'}</option>`).join('')}<option value="__new">+ Create a new category…</option></select>
          <div id="newCat" hidden style="display:none;gap:8px;margin-top:6px"><input id="newCatName" type="text" maxlength="60" placeholder="New category name"><button class="btn btn-sm btn-green" id="newCatAdd" type="button">Add</button></div><span data-e></span></div>
        <div class="row">
          <div class="field" data-f="price"><label for="f_price">Price (₹) *</label><input id="f_price" type="number" inputmode="decimal" min="0" step="0.01" value="${p.price != null ? p.price : ''}" required><span data-e></span></div>
          <div class="field" data-f="price_unit"><label for="f_pu">Price is per</label><select id="f_pu">${unitOpts(p.price_unit, 'Not specified')}</select><span class="hint">Shown like “₹85 / pack”.</span><span data-e></span></div>
        </div>
        <div class="row">
          <div class="field" data-f="quantity_value"><label for="f_qv">Quantity or size</label><input id="f_qv" type="text" maxlength="30" placeholder="e.g. 350" value="${esc(p.quantity_value || '')}"><span data-e></span></div>
          <div class="field" data-f="quantity_unit"><label for="f_qu">Quantity unit</label><select id="f_qu">${unitOpts(p.quantity_unit, 'No unit')}</select><span data-e></span></div>
        </div>
        <div class="field" data-f="description"><label for="f_desc">Description</label><textarea id="f_desc" maxlength="4000">${esc(p.description || '')}</textarea><span data-e></span></div>
        <div class="field"><span class="label">Product photos</span><div id="imgRoot"></div></div>
        <div class="field" data-f="wa_link"><label for="f_wa">WhatsApp catalogue product link</label><input id="f_wa" type="url" inputmode="url" placeholder="https://wa.me/p/…" value="${esc(p.wa_link || '')}" autocapitalize="none" spellcheck="false"><span class="hint">In WhatsApp Business: open Catalogue, tap the product, then Share and Copy link. Paste it here. Customers who tap “Buy on WhatsApp” will land on this product.</span><span data-e></span><span id="waNote"></span></div>
        <div class="row">
          <label class="switch"><input type="checkbox" id="f_active" ${p.status !== 'inactive' ? 'checked' : ''}><div><b>Active</b><span>Show this product on the website</span></div></label>
          <label class="switch"><input type="checkbox" id="f_stock" ${p.in_stock !== false ? 'checked' : ''}><div><b>In stock</b><span>Off shows “Out of stock” and hides the buy button</span></div></label>
          <label class="switch"><input type="checkbox" id="f_pop" ${p.popular ? 'checked' : ''}><div><b>Most loved</b><span>Show in the Most Loved section</span></div></label>
          <label class="switch"><input type="checkbox" id="f_feat" ${p.featured ? 'checked' : ''}><div><b>Featured</b><span>Shown first in lists</span></div></label>
        </div>
      </div>
      <div class="dlg-foot"><button class="btn btn-ghost" type="button" data-x>Cancel</button><button class="btn btn-orange" type="submit" id="pfSave">${isNew ? 'Add product' : 'Save changes'}</button></div></form>`;
    openDlg(html);
    dlg.dataset.lock = '1';
    const form = $('#pf'); let dirty = false;
    const mgr = imageManager($('#imgRoot'), items, { onChange: () => { dirty = true; } });
    form.addEventListener('input', () => { dirty = true; });
    form.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', async () => {
      if (!dirty) { dlg.dataset.lock = ''; closeDlg(); return; }
      const yes = window.confirm('Discard your changes? They are not saved.');
      if (yes) { dlg.dataset.lock = ''; closeDlg(); }
    }));
    dlg.addEventListener('cancel', e => { if (dirty && !window.confirm('Discard your changes? They are not saved.')) e.preventDefault(); else dlg.dataset.lock = ''; }, { once: true });

    const waNote = () => { const v = $('#f_wa').value.trim(); $('#waNote').innerHTML = v ? `<a class="small" href="${esc(v)}" target="_blank" rel="noopener noreferrer">Test this link ↗</a>` : '<span class="pill warn" style="align-self:flex-start">No catalogue link yet. Customers will get a WhatsApp message with the product name instead.</span>'; };
    waNote(); $('#f_wa').addEventListener('input', waNote);

    // inline new category
    const catSel = $('#f_cat'), nc = $('#newCat');
    catSel.addEventListener('change', () => { const on = catSel.value === '__new'; nc.hidden = !on; nc.style.display = on ? 'flex' : 'none'; if (on) $('#newCatName').focus(); });
    $('#newCatAdd').addEventListener('click', async () => {
      const name = $('#newCatName').value.trim(); if (!name) return;
      const r = await api('category.save', { name });
      if (!r.ok) return toast((r.fields && r.fields.name) || r.error, true);
      await refresh();
      catSel.innerHTML = `<option value="">Choose a category</option>` + S.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') + '<option value="__new">+ Create a new category…</option>';
      catSel.value = r.category.id; nc.hidden = true; nc.style.display = 'none'; $('#newCatName').value = ''; toast('Category created.');
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (mgr.busy()) return toast('Please wait for the photos to finish uploading.', true);
      $$('[data-f]', form).forEach(f => { f.classList.remove('invalid'); const s = f.querySelector('[data-e]'); if (s) s.innerHTML = ''; });
      $('#pfErr').hidden = true;
      const body = {
        id: p.id, name: $('#f_name').value.trim(), category_id: catSel.value === '__new' ? '' : catSel.value, price: $('#f_price').value,
        price_unit: $('#f_pu').value, quantity_value: $('#f_qv').value.trim(), quantity_unit: $('#f_qu').value, description: $('#f_desc').value.trim(),
        images: items.map(i => i.url), wa_link: $('#f_wa').value.trim(), status: $('#f_active').checked ? 'active' : 'inactive',
        in_stock: $('#f_stock').checked, popular: $('#f_pop').checked, featured: $('#f_feat').checked,
      };
      const btn = $('#pfSave'); btn.disabled = true; const label = btn.textContent; btn.textContent = 'Saving…';
      const r = await api('product.save', body);
      btn.disabled = false; btn.textContent = label;
      if (!r.ok) {
        if (r.fields) Object.entries(r.fields).forEach(([k, m]) => { const f = form.querySelector(`[data-f="${k}"]`); if (f) { f.classList.add('invalid'); f.querySelector('[data-e]').innerHTML = `<span class="err" role="alert">${esc(m)}</span>`; } });
        const first = form.querySelector('.invalid'); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
        $('#pfErr').textContent = r.error || 'Could not save.'; $('#pfErr').hidden = false; return;
      }
      dirty = false; dlg.dataset.lock = ''; closeDlg();
      await refresh(); render();
      toast(isNew ? 'Product added. It is now on the website.' : 'Saved. The website is updated.');
    });
  }

  /* ---------- Categories ---------- */
  function categories(v) {
    const counts = {}; S.products.forEach(p => { counts[p.category_id] = (counts[p.category_id] || 0) + 1; });
    v.innerHTML = `<div class="page-title"><h1>Categories</h1><button class="btn btn-orange" id="addC" type="button">${IC.plus} Add category</button></div>
      ${S.categories.length ? `<ul class="ol">${S.categories.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0)).map((c, i, arr) => `<li>${thumb(c.image_url, c.name)}<div class="t">${esc(c.name)} ${c.active ? '' : '<span class="pill off">Hidden</span>'}<small>${counts[c.id] || 0} product${(counts[c.id] || 0) === 1 ? '' : 's'}${c.description ? ' · ' + esc(c.description) : ''}</small></div>
        <button class="icon-btn" data-up="${c.id}" aria-label="Move ${esc(c.name)} up" ${i === 0 ? 'disabled' : ''}>${IC.up}</button><button class="icon-btn" data-dn="${c.id}" aria-label="Move ${esc(c.name)} down" ${i === arr.length - 1 ? 'disabled' : ''}>${IC.down}</button>
        <button class="icon-btn" data-edit="${c.id}" aria-label="Edit ${esc(c.name)}">${IC.edit}</button><button class="icon-btn danger" data-del="${c.id}" aria-label="Delete ${esc(c.name)}">${IC.trash}</button></li>`).join('')}</ul>` : `<div class="card empty"><h2>No categories yet</h2><p class="muted" style="margin-bottom:16px">Create categories like “Snacks” or “Rice & Grains”, then add products to them.</p></div>`}`;
    $('#addC').addEventListener('click', () => categoryForm(null));
    v.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => categoryForm(S.categories.find(c => c.id === b.dataset.edit))));
    v.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteCategory(S.categories.find(c => c.id === b.dataset.del), counts[b.dataset.del] || 0)));
    const move = async (id, dir) => {
      const arr = S.categories.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0)), i = arr.findIndex(c => c.id === id), j = i + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      for (let k = 0; k < arr.length; k++) if ((arr[k].sort || 0) !== k + 1) { const c = arr[k]; await api('category.save', { id: c.id, name: c.name, description: c.description, image_url: c.image_url, active: c.active, sort: k + 1 }); }
      await refresh(); render();
    };
    v.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => move(b.dataset.up, -1)));
    v.querySelectorAll('[data-dn]').forEach(b => b.addEventListener('click', () => move(b.dataset.dn, 1)));
  }

  function categoryForm(c) {
    const isNew = !c; c = c || { active: true };
    const items = c.image_url ? [{ url: c.image_url }] : [];
    openDlg(`<form id="cf" novalidate><div class="dlg-head"><h2>${isNew ? 'Add category' : 'Edit category'}</h2><button class="icon-btn" type="button" data-x aria-label="Close">${IC.close}</button></div>
      <div class="dlg-body"><p class="form-error" id="cfErr" role="alert" hidden></p>
        <div class="field" data-f="name"><label for="c_name">Category name *</label><input id="c_name" type="text" maxlength="60" value="${esc(c.name || '')}" required><span data-e></span></div>
        <div class="field"><label for="c_desc">Short description</label><input id="c_desc" type="text" maxlength="300" value="${esc(c.description || '')}"></div>
        <div class="field"><span class="label">Category image</span><div id="cImg"></div></div>
        <label class="switch"><input type="checkbox" id="c_active" ${c.active !== false ? 'checked' : ''}><div><b>Active</b><span>Hidden categories and their products do not show on the website</span></div></label></div>
      <div class="dlg-foot"><button class="btn btn-ghost" type="button" data-x>Cancel</button><button class="btn btn-orange" type="submit" id="cfSave">${isNew ? 'Add category' : 'Save changes'}</button></div></form>`, 'sm');
    const mgr = imageManager($('#cImg'), items, { max: 1, single: true });
    dlg.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', closeDlg));
    $('#cf').addEventListener('submit', async e => {
      e.preventDefault(); if (mgr.busy()) return toast('Please wait for the photo to finish uploading.', true);
      const f = $('#cf [data-f="name"]'); f.classList.remove('invalid'); f.querySelector('[data-e]').innerHTML = ''; $('#cfErr').hidden = true;
      const btn = $('#cfSave'); btn.disabled = true;
      const body = { id: c.id, name: $('#c_name').value.trim(), description: $('#c_desc').value.trim(), image_url: items[0] ? items[0].url : '', active: $('#c_active').checked };
      if (c.sort) body.sort = c.sort;
      const r = await api('category.save', body); btn.disabled = false;
      if (!r.ok) { if (r.fields && r.fields.name) { f.classList.add('invalid'); f.querySelector('[data-e]').innerHTML = `<span class="err">${esc(r.fields.name)}</span>`; } $('#cfErr').textContent = r.error; $('#cfErr').hidden = false; return; }
      closeDlg(); await refresh(); render(); toast(isNew ? 'Category added.' : 'Saved. The website is updated.');
    });
  }

  async function deleteCategory(c, count) {
    if (!count) {
      if (!(await confirmBox({ title: 'Delete this category?', text: `<b>${esc(c.name)}</b> will be removed. This cannot be undone.`, ok: 'Yes, delete', danger: true }))) return;
      const r = await api('category.delete', { id: c.id }); if (!r.ok) return toast(r.error, true);
      await refresh(); render(); return toast('Category deleted.');
    }
    const others = S.categories.filter(x => x.id !== c.id);
    if (!others.length) return openDlg(`<div class="dlg-head"><h2>Cannot delete yet</h2></div><div class="dlg-body"><p><b>${esc(c.name)}</b> has ${count} product${count > 1 ? 's' : ''} and there is no other category to move them to. Create another category first.</p></div><div class="dlg-foot"><button class="btn btn-orange" id="ok" type="button">OK</button></div>`, 'sm') || $('#ok').addEventListener('click', closeDlg);
    openDlg(`<div class="dlg-head"><h2>Move products first</h2></div><div class="dlg-body"><p style="margin-bottom:14px"><b>${esc(c.name)}</b> has <b>${count} product${count > 1 ? 's' : ''}</b>. Choose where to move ${count > 1 ? 'them' : 'it'}, then the category will be deleted.</p>
      <div class="field"><label for="mv">Move products to</label><select id="mv">${others.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></div></div>
      <div class="dlg-foot"><button class="btn btn-ghost" id="mvNo" type="button">Cancel</button><button class="btn btn-danger" id="mvYes" type="button">Move and delete category</button></div>`, 'sm');
    $('#mvNo').addEventListener('click', closeDlg);
    $('#mvYes').addEventListener('click', async () => {
      const r = await api('category.delete', { id: c.id, reassign_to: $('#mv').value }); if (!r.ok) return toast(r.error, true);
      closeDlg(); await refresh(); render(); toast('Products moved and category deleted.');
    });
  }

  /* ---------- Homepage ---------- */
  function homepage(v) {
    const h = JSON.parse(JSON.stringify(S.home));
    const order = Array.isArray(h.popular_ids) ? h.popular_ids : [];
    let pop = S.products.filter(p => p.popular).sort((a, b) => { const x = order.indexOf(a.id), y = order.indexOf(b.id); return (x < 0 ? 1e6 : x) - (y < 0 ? 1e6 : y); }).map(p => p.id);
    let cats = (h.category_ids && h.category_ids.length ? h.category_ids.filter(id => S.categories.some(c => c.id === id)) : S.categories.filter(c => c.active).sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(c => c.id));
    let dirty = false;
    const mark = () => { dirty = true; const s = $('#hState'); s.textContent = 'You have unsaved changes'; s.className = 'state dirty'; };

    v.innerHTML = `<div class="page-title"><h1>Homepage</h1><a class="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener">View website ${IC.ext}</a></div>
      <p class="form-error" id="hErr" role="alert" hidden></p>
      <div class="card"><h2>Hero banner</h2>
        <div class="field" data-f="headline"><label for="h_head">Main headline *</label><input id="h_head" type="text" maxlength="120" value="${esc(h.hero.headline)}"><span class="hint">The word “WhatsApp” is highlighted in orange automatically.</span><span data-e></span></div>
        <div class="field"><label for="h_text">Supporting text</label><textarea id="h_text" maxlength="300" style="min-height:80px">${esc(h.hero.text)}</textarea></div>
        <div class="row"><div class="field"><label for="h_num">WhatsApp number shown on the banner</label><input id="h_num" type="text" maxlength="30" value="${esc(h.hero.number)}"><span class="hint">This is only the text customers see.</span></div>
          <div class="field" data-f="cta_text"><label for="h_cta">Button text *</label><input id="h_cta" type="text" maxlength="40" value="${esc(h.hero.cta_text)}"><span data-e></span></div></div>
        <div class="field" data-f="cta_url"><label for="h_url">Button destination</label><input id="h_url" type="text" maxlength="500" value="${esc(h.hero.cta_url)}"><span class="hint">A WhatsApp link (https://wa.me/…) or a page on the site like /products.</span><span data-e></span></div></div>
      <div class="card"><h2>Most Loved Products</h2><p class="hint" style="margin-bottom:12px">Products listed here appear in the Most Loved section, in this order. Only active products are shown to customers.</p><ul class="ol" id="popList"></ul>
        <div class="row" style="margin-top:12px;grid-template-columns:1fr auto"><select id="popAdd" aria-label="Add a product"></select><button class="btn btn-sm btn-ghost" id="popAddBtn" type="button">${IC.plus} Add</button></div></div>
      <div class="card"><h2>Categories on the homepage</h2><p class="hint" style="margin-bottom:12px">Choose which categories are shown and in what order. If the list is empty, all active categories are shown.</p><ul class="ol" id="catList"></ul>
        <div class="row" style="margin-top:12px;grid-template-columns:1fr auto"><select id="catAdd" aria-label="Add a category"></select><button class="btn btn-sm btn-ghost" id="catAddBtn" type="button">${IC.plus} Add</button></div></div>
      <div class="savebar"><button class="btn btn-orange" id="hSave" type="button">Save and publish</button><span class="state clean" id="hState">All changes saved</span></div>`;

    const arrows = (id, i, n, k) => `<button class="icon-btn" data-${k}-up="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${IC.up}</button><button class="icon-btn" data-${k}-dn="${i}" aria-label="Move down" ${i === n - 1 ? 'disabled' : ''}>${IC.down}</button><button class="icon-btn danger" data-${k}-rm="${i}" aria-label="Remove">${IC.close}</button>`;
    const draw = () => {
      $('#popList').innerHTML = pop.length ? pop.map((id, i) => { const p = S.products.find(x => x.id === id); return p ? `<li>${thumb(p.images[0], p.name)}<div class="t">${esc(p.name)}<small>${priceLine(p)}${p.status === 'inactive' ? ' · Inactive (hidden)' : ''}</small></div>${arrows(id, i, pop.length, 'p')}</li>` : ''; }).join('') : '<li><div class="t muted">No products yet. Add some below.</div></li>';
      $('#catList').innerHTML = cats.length ? cats.map((id, i) => { const c = S.categories.find(x => x.id === id); return c ? `<li>${thumb(c.image_url, c.name)}<div class="t">${esc(c.name)}</div>${arrows(id, i, cats.length, 'c')}</li>` : ''; }).join('') : '<li><div class="t muted">Empty: all active categories will be shown.</div></li>';
      const pa = S.products.filter(p => !pop.includes(p.id)); $('#popAdd').innerHTML = pa.length ? pa.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('') : '<option value="">All products are already added</option>'; $('#popAddBtn').disabled = !pa.length;
      const ca = S.categories.filter(c => !cats.includes(c.id)); $('#catAdd').innerHTML = ca.length ? ca.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') : '<option value="">All categories are already added</option>'; $('#catAddBtn').disabled = !ca.length;
    };
    draw();
    const mv = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
    v.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      for (const [k, arr] of [['p', pop], ['c', cats]]) {
        for (const act of ['up', 'dn', 'rm']) { const a = b.getAttribute(`data-${k}-${act}`); if (a !== null) { const i = +a; if (act === 'rm') arr.splice(i, 1); else mv(arr, i, act === 'up' ? -1 : 1); draw(); mark(); return; } }
      }
    });
    $('#popAddBtn').addEventListener('click', () => { const id = $('#popAdd').value; if (id) { pop.push(id); draw(); mark(); } });
    $('#catAddBtn').addEventListener('click', () => { const id = $('#catAdd').value; if (id) { cats.push(id); draw(); mark(); } });
    v.addEventListener('input', e => { if (e.target.matches('input,textarea')) mark(); });
    $('#hSave').addEventListener('click', async () => {
      $$('[data-f]', v).forEach(f => { f.classList.remove('invalid'); f.querySelector('[data-e]').innerHTML = ''; }); $('#hErr').hidden = true;
      const btn = $('#hSave'); btn.disabled = true; btn.textContent = 'Saving…';
      const r = await api('home.save', { hero: { headline: $('#h_head').value, text: $('#h_text').value, number: $('#h_num').value, cta_text: $('#h_cta').value, cta_url: $('#h_url').value }, popular_ids: pop, category_ids: cats });
      btn.disabled = false; btn.textContent = 'Save and publish';
      if (!r.ok) { if (r.fields) Object.entries(r.fields).forEach(([k, m]) => { const f = v.querySelector(`[data-f="${k}"]`); if (f) { f.classList.add('invalid'); f.querySelector('[data-e]').innerHTML = `<span class="err">${esc(m)}</span>`; } }); $('#hErr').textContent = r.error; $('#hErr').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      await refresh(); dirty = false; $('#hState').textContent = 'All changes saved'; $('#hState').className = 'state clean'; toast('Saved. The homepage is updated.');
    });
  }

  /* ---------- Policies ---------- */
  function policyBody(text) {
    return String(text).split(/\n{2,}/).map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length && lines.every(l => /^[-•*]\s+/.test(l))) return '<ul>' + lines.map(l => `<li>${esc(l.replace(/^[-•*]\s+/, ''))}</li>`).join('') + '</ul>';
      return '<p>' + esc(lines.join(' ')) + '</p>';
    }).join('');
  }

  let polTab = 'delivery';
  function policies(v) {
    const pol = JSON.parse(JSON.stringify(S.policies));
    const cur = () => pol[polTab];
    const sync = () => { cur().draft.sections = $$('.sec-ed', v).map(e => ({ heading: e.querySelector('[data-h]').value, body: e.querySelector('[data-b]').value })); };
    v.addEventListener('input', () => { if (!$('#secs')) return; sync(); const s = $('#polState'); if (s) { const sm = same(); s.textContent = sm ? 'Same as published' : 'Changes not published yet'; s.className = 'state ' + (sm ? 'clean' : 'dirty'); } });
    const same = () => JSON.stringify(cur().draft.sections) === JSON.stringify(cur().published.sections);
    const draw = () => {
      const c = cur(), name = polTab === 'delivery' ? 'Delivery Policy' : 'Refund Policy';
      v.innerHTML = `<div class="page-title"><h1>Policies</h1><a class="btn btn-ghost btn-sm" href="/${polTab}-policy" target="_blank" rel="noopener">View public page ${IC.ext}</a></div>
        <div class="tabs" role="tablist"><button class="tab" role="tab" data-tab="delivery" aria-selected="${polTab === 'delivery'}">Delivery Policy</button><button class="tab" role="tab" data-tab="refund" aria-selected="${polTab === 'refund'}">Refund Policy</button></div>
        <p class="hint" style="margin-bottom:14px">Write in plain text. Leave a blank line between paragraphs. Start lines with “- ” to make a bullet list. Customers see only what you <b>publish</b>.</p>
        <p class="form-error" id="polErr" role="alert" hidden></p>
        <div id="secs">${c.draft.sections.map((s, i) => `<div class="sec-ed"><div class="top"><input type="text" data-h="${i}" value="${esc(s.heading)}" placeholder="Section heading" aria-label="Section ${i + 1} heading" maxlength="120"><button class="icon-btn" data-su="${i}" aria-label="Move section up" ${i === 0 ? 'disabled' : ''}>${IC.up}</button><button class="icon-btn" data-sd="${i}" aria-label="Move section down" ${i === c.draft.sections.length - 1 ? 'disabled' : ''}>${IC.down}</button><button class="icon-btn danger" data-sr="${i}" aria-label="Remove section">${IC.trash}</button></div><textarea data-b="${i}" aria-label="Section ${i + 1} text" maxlength="8000">${esc(s.body)}</textarea></div>`).join('')}</div>
        <button class="btn btn-ghost btn-sm" id="addSec" type="button">${IC.plus} Add section</button>
        <div class="savebar"><button class="btn btn-ghost" id="polSave" type="button">Save draft</button><button class="btn btn-ghost" id="polPrev" type="button">Preview</button><button class="btn btn-orange" id="polPub" type="button">Publish ${esc(name)}</button>
          <span class="state ${same() ? 'clean' : 'dirty'}" id="polState">${same() ? (c.published_at ? 'Published ' + fdate(c.published_at) : 'Showing the starter text') : 'Changes not published yet'}</span></div>`;
      v.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { polTab = b.dataset.tab; draw(); }));
      v.querySelectorAll('[data-su],[data-sd],[data-sr]').forEach(b => b.addEventListener('click', () => { sync(); const a = c.draft.sections; if (b.dataset.sr !== undefined) a.splice(+b.dataset.sr, 1); else { const i = +(b.dataset.su ?? b.dataset.sd), j = b.dataset.su !== undefined ? i - 1 : i + 1;[a[i], a[j]] = [a[j], a[i]]; } draw(); }));
      $('#addSec').addEventListener('click', () => { sync(); c.draft.sections.push({ heading: '', body: '' }); draw(); const t = $$('[data-h]', v); t[t.length - 1].focus(); });
      const save = async publish => {
        sync();
        if (publish && !(await confirmBox({ title: 'Publish this policy?', text: `Customers will see the new ${esc(name)} on the website right away.`, ok: 'Publish' }))) return;
        const r = await api('policy.save', { key: polTab, sections: c.draft.sections, publish });
        if (!r.ok) { $('#polErr').textContent = r.error; $('#polErr').hidden = false; return; }
        await refresh(); pol[polTab] = JSON.parse(JSON.stringify(S.policies[polTab])); draw();
        toast(publish ? 'Published. The website is updated.' : 'Draft saved. Not published yet.');
      };
      $('#polSave').addEventListener('click', () => save(false));
      $('#polPub').addEventListener('click', () => save(true));
      $('#polPrev').addEventListener('click', () => { sync(); openDlg(`<div class="dlg-head"><h2>Preview: ${esc(name)}</h2><button class="icon-btn" data-x aria-label="Close">${IC.close}</button></div><div class="dlg-body"><div class="preview">${c.draft.sections.filter(s => s.heading || s.body).map(s => `<h2>${esc(s.heading)}</h2>${policyBody(s.body)}`).join('')}</div><p class="hint" style="margin-top:10px">This is a preview. It is not on the website until you publish.</p></div><div class="dlg-foot"><button class="btn btn-orange" data-x type="button">Close</button></div>`); dlg.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', closeDlg)); });
    };
    draw();
  }

  /* ---------- Account ---------- */
  function account(v) {
    v.innerHTML = `<div class="page-title"><h1>Account</h1></div>
      <div class="card" style="max-width:520px"><h2>Your login</h2><p style="margin-bottom:16px">You are logged in as <b>${esc(me)}</b>.</p>
        <form id="pwForm" novalidate><p class="form-error" id="pwErr" role="alert" hidden></p>
          <div class="field" data-f="current"><label for="pw0">Current password</label><input id="pw0" type="password" autocomplete="current-password"><span data-e></span></div>
          <div class="field" data-f="next"><label for="pw1">New password</label><input id="pw1" type="password" autocomplete="new-password"><span class="hint">At least 10 characters. Use a long phrase that only you know.</span><span data-e></span></div>
          <div class="field" data-f="again"><label for="pw2">Repeat new password</label><input id="pw2" type="password" autocomplete="new-password"><span data-e></span></div>
          <button class="btn btn-orange" type="submit" id="pwBtn">Change password</button></form></div>`;
    $('#pwForm').addEventListener('submit', async e => {
      e.preventDefault(); $$('[data-f]', v).forEach(f => { f.classList.remove('invalid'); f.querySelector('[data-e]').innerHTML = ''; }); $('#pwErr').hidden = true;
      const bad = (k, m) => { const f = v.querySelector(`[data-f="${k}"]`); f.classList.add('invalid'); f.querySelector('[data-e]').innerHTML = `<span class="err">${m}</span>`; };
      const cur = $('#pw0').value, n1 = $('#pw1').value, n2 = $('#pw2').value;
      if (!cur) return bad('current', 'Enter your current password.');
      if (n1.length < 10) return bad('next', 'Use at least 10 characters.');
      if (n1 !== n2) return bad('again', 'The two passwords do not match.');
      const btn = $('#pwBtn'); btn.disabled = true;
      const r = await api('password.change', { current: cur, next: n1 }); btn.disabled = false;
      if (!r.ok) { if (r.fields && r.fields.current) bad('current', esc(r.fields.current)); $('#pwErr').textContent = r.error; $('#pwErr').hidden = false; return; }
      $('#pwForm').reset(); toast('Password changed. Use it next time you log in.');
    });
  }

  /* ---------- start ---------- */
  async function start() {
    const ok = await refresh();
    if (!ok) return showLogin();
    shell(); render();
  }
  (async function init() {
    const m = await api('me');
    if (m.ok && m.loggedIn) await start(); else showLogin();
  })();
})();
