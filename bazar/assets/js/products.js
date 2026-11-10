(function () {
  const B = window.Bazar, esc = B.esc;
  const $ = id => document.getElementById(id);
  let catalog, state = { q: '', sort: 'popular', cat: '', popular: false };

  const catSlugFromPath = () => { const m = /^\/category\/([^/]+)/.exec(location.pathname); return m ? decodeURIComponent(m[1]) : ''; };

  function readUrl() {
    const sp = new URLSearchParams(location.search);
    state.q = sp.get('q') || '';
    state.sort = ['popular', 'low', 'high', 'new'].includes(sp.get('sort')) ? sp.get('sort') : 'popular';
    state.popular = sp.get('filter') === 'popular';
    const slug = catSlugFromPath();
    const c = slug && catalog.categories.find(x => x.slug === slug);
    state.cat = c ? c.id : '';
  }

  function writeUrl() {
    const cat = catalog.categories.find(x => x.id === state.cat);
    const sp = new URLSearchParams();
    if (state.q) sp.set('q', state.q);
    if (state.sort !== 'popular') sp.set('sort', state.sort);
    if (state.popular) sp.set('filter', 'popular');
    const url = (cat ? '/category/' + cat.slug : '/products') + (sp.toString() ? '?' + sp : '');
    history.replaceState(null, '', url);
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    let list = catalog.products.filter(p =>
      (!state.cat || p.category.id === state.cat) &&
      (!state.popular || p.popular) &&
      (!q || (p.name + ' ' + p.description + ' ' + p.category.name).toLowerCase().includes(q)));
    const by = {
      popular: (a, b) => (b.popular - a.popular) || (b.featured - a.featured) || new Date(b.created_at) - new Date(a.created_at),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      new: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    }[state.sort];
    return list.sort(by);
  }

  function render() {
    const list = filtered();
    const cat = catalog.categories.find(x => x.id === state.cat);
    $('pageTitle').textContent = cat ? cat.name : state.popular ? 'Most Loved Products' : 'All Products';
    $('pageSub').textContent = cat && cat.description ? cat.description : 'Pick what you love, then tap Buy on WhatsApp.';
    $('crumbNow').textContent = cat ? cat.name : 'Products';
    document.title = (cat ? cat.name + ' | ' : 'Products | ') + 'Bazar by clickfor.in';
    $('count').textContent = list.length + (list.length === 1 ? ' product' : ' products');
    const dirty = state.q || state.cat || state.popular || state.sort !== 'popular';
    $('clearAll').hidden = !dirty;
    $('qClear').hidden = !state.q;
    $('sort').value = state.sort;
    $('filter').value = state.popular ? 'popular' : state.cat ? 'cat:' + state.cat : 'all';
    if (!catalog.products.length) {
      $('grid').innerHTML = B.emptyProducts({ title: 'The shelves are being stocked', text: 'New products are being added. Message us on WhatsApp to ask what is available.' }, false);
    } else if (!list.length) {
      $('grid').innerHTML = B.emptyProducts({ title: state.q ? `No products match “${state.q}”` : 'No products found', text: 'Try a different word, or clear the filters to see everything. You can also ask us on WhatsApp.' }, true);
    } else {
      $('grid').innerHTML = list.map(B.productCard).join('');
    }
  }

  function update() { writeUrl(); render(); }

  B.boot({ active: 'products' }).then(c => {
    catalog = c; readUrl();
    $('filter').insertAdjacentHTML('beforeend', c.categories.map(x => `<option value="cat:${esc(x.id)}">${esc(x.name)}</option>`).join(''));
    $('q').value = state.q;
    $('filter').addEventListener('change', e => {
      const v = e.target.value;
      state.popular = v === 'popular';
      state.cat = v.startsWith('cat:') ? v.slice(4) : '';
      update();
    });
    let t;
    $('q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; update(); }, 150); });
    $('qClear').addEventListener('click', () => { $('q').value = ''; state.q = ''; update(); $('q').focus(); });
    $('sort').addEventListener('change', e => { state.sort = e.target.value; update(); });
    const clearAll = () => { state = { q: '', sort: 'popular', cat: '', popular: false }; $('q').value = ''; update(); };
    $('clearAll').addEventListener('click', clearAll);
    $('grid').addEventListener('click', e => { if (e.target.closest('[data-clear]')) clearAll(); });
    render();
  }).catch(() => {
    $('count').textContent = '';
    $('grid').innerHTML = B.emptyProducts({ title: 'We could not load products', text: 'Please refresh the page, or message us on WhatsApp and we will help you.' }, false);
  });
})();
