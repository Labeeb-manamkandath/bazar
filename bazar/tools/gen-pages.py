# Generates the static HTML pages from shared pieces (run once; the output files are what gets deployed).
import pathlib, textwrap
root = pathlib.Path(__file__).resolve().parent.parent

def head(title, desc, path, extra='', og='/assets/og-image.jpg', robots=''):
    url = 'https://www.clickfor.in' + path
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{title_block(title, desc, url, og, robots)}
<meta name="theme-color" content="#122915">
<link rel="icon" href="/assets/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=Figtree:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/assets/css/site.css">
{extra}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header id="site-header" class="nav"></header>
'''

def title_block(title, desc, url, og, robots):
    if title is None:
        return '<!--SEO-->'
    full_og = 'https://www.clickfor.in' + og
    r = f'<meta name="robots" content="{robots}">\n' if robots else ''
    return f'''<title>{title}</title>
<meta name="description" content="{desc}">
{r}<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bazar by clickfor.in">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{full_og}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">'''

def foot(scripts):
    return f'''<footer id="site-footer"></footer>
<script src="/assets/js/site.js"></script>
{scripts}</body>
</html>
'''

HERO_ART = '''<svg viewBox="0 0 440 520" role="img" aria-label="A phone showing a WhatsApp chat where a customer orders a product from Bazar">
  <g class="float">
    <rect x="104" y="26" width="232" height="450" rx="38" fill="#0B1C0E"/>
    <rect x="116" y="38" width="208" height="426" rx="28" fill="#F5EFDC"/>
    <rect x="116" y="38" width="208" height="64" rx="28" fill="#1B3E1F"/>
    <rect x="116" y="70" width="208" height="32" fill="#1B3E1F"/>
    <circle cx="148" cy="70" r="19" fill="#E4762C"/>
    <text x="148" y="77" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="800" font-size="19" fill="#34140A">B</text>
    <text x="176" y="66" font-family="Figtree, sans-serif" font-weight="800" font-size="15" fill="#FAF4E2">Bazar</text>
    <text x="176" y="84" font-family="Figtree, sans-serif" font-size="11.5" fill="#9bd8ab">online</text>
    <!-- incoming -->
    <rect x="130" y="118" width="128" height="44" rx="14" fill="#fff"/>
    <text x="142" y="136" font-family="Figtree, sans-serif" font-weight="600" font-size="12.5" fill="#34140A">Hi! Welcome to Bazar.</text>
    <text x="142" y="152" font-family="Figtree, sans-serif" font-size="12.5" fill="#34140A">What can we pack today?</text>
    <!-- product card sent by customer -->
    <rect x="178" y="176" width="136" height="104" rx="14" fill="#D9F6C6"/>
    <rect x="186" y="184" width="120" height="58" rx="9" fill="#ECE6D7"/>
    <g transform="translate(226 190)" fill="none" stroke="#1B3E1F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 14h36l-3 27a3 3 0 01-3 2.700H8a3 3 0 01-3-2.700z"/><path d="M12 14v-3a8 8 0 0116 0v3"/></g>
    <text x="188" y="259" font-family="Figtree, sans-serif" font-weight="800" font-size="12.5" fill="#34140A">Your favourite pick</text>
    <text x="188" y="273" font-family="Figtree, sans-serif" font-size="11" fill="#34140A" opacity=".7">From the Bazar catalogue</text>
    <!-- confirmation -->
    <rect x="130" y="296" width="150" height="62" rx="14" fill="#fff"/>
    <text x="142" y="316" font-family="Figtree, sans-serif" font-weight="600" font-size="12.5" fill="#34140A">Got it! We'll confirm</text>
    <text x="142" y="332" font-family="Figtree, sans-serif" font-weight="600" font-size="12.5" fill="#34140A">your order right here</text>
    <circle cx="146" cy="347" r="0" fill="none"/>
    <rect x="198" y="372" width="116" height="34" rx="14" fill="#D9F6C6"/>
    <text x="210" y="394" font-family="Figtree, sans-serif" font-weight="700" font-size="12.5" fill="#34140A">Order placed</text>
    <path d="M292 389l5 5 9-11" fill="none" stroke="#128C4A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- input bar -->
    <rect x="128" y="424" width="152" height="28" rx="14" fill="#fff"/>
    <circle cx="302" cy="438" r="14" fill="#25D366"/>
    <path d="M296 438h12M303 432l6 6-6 6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g transform="rotate(-8 93 87)"><g class="float b">
    <rect x="18" y="64" width="150" height="46" rx="23" fill="#FAF4E2"/>
    <text x="93" y="93" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="800" font-size="13" fill="#34140A">Just message us!</text>
  </g></g>
  <g class="float c">
    <circle cx="372" cy="392" r="42" fill="#FAF4E2"/>
    <circle cx="372" cy="392" r="34" fill="#1B3E1F"/>
    <text x="372" y="404" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="800" font-size="34" fill="#E4762C">₹</text>
  </g>
  <g transform="translate(22 380)"><g class="float b">
    <path d="M6 24h72l-6 66a8 8 0 01-8 7.200H20a8 8 0 01-8-7.200z" fill="#C99A63"/>
    <path d="M24 24v-8a18 18 0 0136 0v8" fill="none" stroke="#8E6A3A" stroke-width="6" stroke-linecap="round"/>
    <circle cx="42" cy="62" r="11" fill="#E4762C"/>
  </g></g>
  <g transform="translate(340 150) rotate(14)"><g class="float">
    <path d="M0 40C0 14 22 0 52 0c0 26-18 44-44 44-3 0-6-1-8-4z" fill="#25D366"/>
    <path d="M6 38C16 24 28 14 44 8" fill="none" stroke="#0B2E14" stroke-width="3" stroke-linecap="round" opacity=".5"/>
  </g></g>
</svg>'''

def write(name, content):
    p = root / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)

# ---------------- HOME ----------------
home = head('Bazar by clickfor.in | Order Daily Essentials on WhatsApp',
            'Browse Bazar by clickfor.in and order your daily essentials directly on WhatsApp. Pick what you love, tap Buy on WhatsApp and we take it from there.',
            '/') + f'''<main id="main">
<section class="hero" aria-labelledby="hero-title">
  <div class="awning" aria-hidden="true"></div>
  <div class="hero-sun" aria-hidden="true"></div><div class="hero-ring" aria-hidden="true"></div>
  <div class="hero-dots" aria-hidden="true"><span style="left:8%;top:20%;width:18px;height:18px"></span><span style="left:46%;top:12%;width:10px;height:10px;animation-delay:-3s"></span><span style="left:55%;bottom:5%;width:24px;height:24px;animation-delay:-6s"></span></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Order on WhatsApp</p>
      <h1 id="hero-title">Your favourites are just one <span class="hl">WhatsApp</span> away!</h1>
      <p class="support" id="heroText">Explore our products, pick what you love and message us directly to place your order.</p>
      <a class="hero-number" id="heroNumber" href="https://wa.me/message/TOTXU35IP3ANE1" target="_blank" rel="noopener noreferrer">
        <span class="ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg></span>
        <span><small>WhatsApp us on</small><strong id="heroNumberText">+91 8086 7777 90</strong></span>
      </a>
      <div class="hero-actions">
        <a class="btn btn-wa btn-lg" id="heroCta" href="https://wa.me/message/TOTXU35IP3ANE1" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg><span id="heroCtaText">Shop on WhatsApp</span></a>
        <a class="btn btn-ghost-light btn-lg" href="/products">Browse products</a>
      </div>
    </div>
    <div class="hero-art">{HERO_ART}</div>
  </div>
</section>

<section class="steps" aria-label="How ordering works">
  <div class="wrap"><ol>
    <li><span class="n">1</span><div><b>Pick what you love</b><span class="d">Browse our products and categories.</span></div></li>
    <li><span class="n">2</span><div><b>Tap Buy on WhatsApp</b><span class="d">The product opens right in our WhatsApp catalogue.</span></div></li>
    <li><span class="n">3</span><div><b>Chat and confirm</b><span class="d">No cart, no website checkout. We confirm on WhatsApp.</span></div></li>
  </ol></div>
</section>

<section class="section" id="categories" aria-labelledby="cat-title" hidden>
  <div class="wrap">
    <div class="section-head"><div><p class="eyebrow">Shop by category</p><h2 id="cat-title">Find your <em>favourites</em></h2></div><a class="link" href="/products">All products</a></div>
    <div class="cat-grid" id="catGrid"></div>
  </div>
</section>

<section class="section" id="loved" aria-labelledby="loved-title" style="background:var(--rice)" hidden>
  <div class="wrap">
    <div class="section-head"><div><p class="eyebrow">Popular right now</p><h2 id="loved-title">Most Loved <em>Products</em></h2></div></div>
    <div class="p-grid" id="lovedGrid"></div>
  </div>
</section>

<section class="section" id="explore" aria-labelledby="explore-title">
  <div class="wrap">
    <div class="section-head"><div><p class="eyebrow">Fresh on the shelf</p><h2 id="explore-title">Explore our <em>products</em></h2></div></div>
    <div class="chips" id="exploreChips" role="group" aria-label="Filter by category" hidden></div>
    <div class="p-grid" id="exploreGrid" style="margin-top:18px"><div class="empty-state"><p style="margin:0">Loading products…</p></div></div>
    <p style="text-align:center;margin-top:30px"><a class="btn btn-green btn-lg" id="exploreAll" href="/products">Explore All Products <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></p>
    <div class="ordernote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/></svg><span><b>Ordering happens on WhatsApp.</b> There is no cart or website checkout. Tap Buy on WhatsApp on any product and we will take it from there.</span></div>
  </div>
</section>

<section class="section" aria-labelledby="about-title" style="background:var(--sand)">
  <div class="wrap" style="display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr);gap:clamp(24px,5vw,64px);align-items:center" id="aboutTeaser">
    <div class="seal-wrap" aria-hidden="true" style="position:static"><div class="seal" style="width:min(100%,260px)"><svg class="seal-text" viewBox="0 0 400 400"><defs><path id="circ" d="M200 200 m-160 0 a160 160 0 1 1 320 0 a160 160 0 1 1 -320 0"/></defs><text><textPath href="#circ">Checked · Tested · Then listed · Checked · Tested · Then listed ·</textPath></text></svg><div class="seal-core"><span>B<i></i></span></div></div></div>
    <div>
      <p class="eyebrow">About Bazar</p>
      <h2 id="about-title" style="font-weight:800;font-size:clamp(1.5rem,3.2vw,2.4rem);margin:12px 0 14px">Everyday essentials, made <em>easier.</em></h2>
      <p class="lead" style="margin-bottom:20px">Bazar is an online store from clickfor.in for the things you use every day. Every product joins our list only after it has been checked and we are sure it is worth it.</p>
      <a class="btn btn-green" href="/about">Read our story</a>
    </div>
  </div>
</section>

<section class="cta-band" aria-labelledby="cta-title">
  <div class="wrap cta-inner">
    <div><h2 id="cta-title">Ready to order? Message us!</h2><p>Pick your products, tap Buy on WhatsApp and chat with us to place your order.</p><p class="cta-num" id="ctaNum">+91 8086 7777 90</p></div>
    <a class="btn btn-wa btn-lg" href="https://wa.me/message/TOTXU35IP3ANE1" target="_blank" rel="noopener noreferrer" id="ctaBtn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg><span>Shop on WhatsApp</span></a>
  </div>
</section>
</main>
''' + foot('<script src="/assets/js/home.js"></script>\n')
write('index.html', home)

# ---------------- PRODUCTS ----------------
products = head('Products | Bazar by clickfor.in',
                'Browse all Bazar products. Search, filter by category and buy directly on WhatsApp.',
                '/products') + '''<main id="main">
<div class="page-head"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span id="crumbNow">Products</span></nav><h1 id="pageTitle">All Products</h1><p id="pageSub">Pick what you love, then tap Buy on WhatsApp.</p></div></div>
<div class="toolbar"><div class="wrap">
  <div class="tb-row">
    <div class="search"><label class="sr-only" for="q">Search products</label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="q" type="search" placeholder="Search products" autocomplete="off" enterkeyhint="search"><button class="clear" type="button" id="qClear" aria-label="Clear search" hidden>&times;</button></div>
    <label class="sr-only" for="sort">Sort products</label>
    <select class="select" id="sort"><option value="popular">Popularity</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="new">Newest First</option></select>
  </div>
  <div class="chips" id="chips" role="group" aria-label="Filter by category"></div>
</div></div>
<div class="wrap" style="padding-bottom:clamp(40px,6vw,80px)">
  <div class="results-bar"><span class="count" id="count" aria-live="polite">Loading…</span><button class="linkbtn" type="button" id="clearAll" hidden>Clear filters</button></div>
  <div class="p-grid" id="grid"></div>
  <div class="ordernote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/></svg><span><b>Ordering happens on WhatsApp.</b> There is no cart or website checkout.</span></div>
</div>
</main>
''' + foot('<script src="/assets/js/products.js"></script>\n')
write('products.html', products)

# ---------------- PRODUCT DETAIL ----------------
product = head(None, '', '/products') + '''<main id="main">
<div class="wrap" id="pdRoot"><div class="empty-state" style="margin-top:40px"><p style="margin:0">Loading product…</p></div></div>
<section class="section" id="relatedSec" style="background:var(--rice)" hidden><div class="wrap"><div class="section-head"><div><p class="eyebrow">You may also like</p><h2 style="font-weight:800;font-size:clamp(1.4rem,3vw,2.2rem);margin-top:12px">Related <em>products</em></h2></div></div><div class="p-grid" id="relatedGrid"></div></div></section>
</main>
''' + foot('<script src="/assets/js/product.js"></script>\n')
write('product.html', product)

# ---------------- ABOUT ----------------
about = head('About Bazar | Bazar by clickfor.in',
             'Bazar is an online store from clickfor.in for everyday essentials. Learn how we choose every product and why we build it one product at a time.',
             '/about') + '''<main id="main">
<div class="page-head"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>About</span></nav><h1>About Bazar</h1><p>Everyday essentials, made easier.</p></div></div>
<div class="wrap about-grid">
  <div class="seal-wrap" aria-hidden="true">
    <div class="seal"><svg class="seal-text" viewBox="0 0 400 400"><defs><path id="circ" d="M200 200 m-160 0 a160 160 0 1 1 320 0 a160 160 0 1 1 -320 0"/></defs><text><textPath href="#circ">Checked · Tested · Then listed · Checked · Tested · Then listed ·</textPath></text></svg><div class="seal-core"><span>B<i></i></span></div></div>
    <div class="seal-badge">Built together, one product at a time</div>
  </div>
  <div class="story">
    <p class="lead" style="margin-bottom:20px">Bazar is an online store from clickfor.in for the things you use every day. We build it carefully, one product at a time.</p>
    <p>Bazar is run by a group of people who share one goal. Everyone in the team looks for new products and suppliers, compares prices and tries samples. A product joins the Bazar list only after it has been checked and we are sure it is worth it.</p>
    <p>Our range has a soft spot for traditional Kerala favourites. We keep adding what works and leave out what doesn’t.</p>
    <ul class="promises">
      <li><div><h3>Good quality, fair prices</h3><p>We look for products that are good and priced fairly.</p></div></li>
      <li><div><h3>Made to last</h3><p>We choose items with a good shelf life, so they stay fresh in your kitchen.</p></div></li>
      <li><div><h3>Packed to travel well</h3><p>We pick products that store and travel safely, so less gets damaged along the way.</p></div></li>
      <li><div><h3>Worth buying again</h3><p>We want Bazar to be full of things you’ll come back for.</p></div></li>
      <li><div><h3>More convenient</h3><p>Where newer, smarter products make life easier, we want to bring them to you.</p></div></li>
    </ul>
    <p class="together">With everyone’s help and support, we’ll grow together.</p>
    <p style="margin-top:26px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-green" href="/products">Shop our products</a><a class="btn btn-wa" href="https://wa.me/message/TOTXU35IP3ANE1" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/></svg>Chat on WhatsApp</a></p>
  </div>
</div>
</main>
''' + foot('<script>Bazar.boot({active:"about"});</script>\n')
write('about.html', about)

# ---------------- CONTACT ----------------
contact = head('Contact | Bazar by clickfor.in',
               'Contact Bazar by clickfor.in on WhatsApp or by phone. Message us to ask about products or place an order.',
               '/contact') + '''<main id="main">
<div class="page-head"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Contact</span></nav><h1>Contact us</h1><p>Have a question or want to know more about Bazar? We’d love to hear from you.</p></div></div>
<div class="wrap contact-grid">
  <div class="c-card wa">
    <h2>Message us on WhatsApp</h2>
    <p>The quickest way to reach us. Ask about a product, or place your order right in the chat.</p>
    <a class="c-num" href="https://wa.me/message/TOTXU35IP3ANE1" target="_blank" rel="noopener noreferrer">+91 8086 7777 90</a>
    <div class="c-actions"><a class="btn btn-wa btn-lg" href="https://wa.me/message/TOTXU35IP3ANE1" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>Chat on WhatsApp</a></div>
  </div>
  <div class="c-card">
    <h2>Prefer a call?</h2>
    <p>You can also call us on the same number.</p>
    <a class="c-num" href="tel:+918086777790" aria-label="Call +91 8086 7777 90" style="color:var(--green)">+91 8086 7777 90</a>
    <div class="c-actions"><a class="btn btn-green" href="tel:+918086777790">Call us</a><button class="btn btn-ghost" id="copyBtn" type="button">Copy number</button></div>
  </div>
</div>
<div class="wrap" style="padding-bottom:clamp(40px,6vw,80px)"><div class="notice"><b>How ordering works.</b> Browse our <a href="/products"><u>products</u></a>, tap Buy on WhatsApp, and chat with us to confirm. There is no cart and no website checkout. See our <a href="/delivery-policy"><u>Delivery Policy</u></a> and <a href="/refund-policy"><u>Refund Policy</u></a>.</div></div>
</main>
''' + '''<footer id="site-footer"></footer>
<script src="/assets/js/site.js"></script>
<script>
Bazar.boot({active:"contact"});
document.getElementById('copyBtn').addEventListener('click', function(){
  var b=this, t='+91 8086 7777 90';
  var done=function(){ b.textContent='Copied'; setTimeout(function(){ b.textContent='Copy number'; },1800); };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done,function(){ b.textContent=t; }); } else { b.textContent=t; }
});
</script>
</body>
</html>
'''
write('contact.html', contact)

# ---------------- POLICY ----------------
policy = head('Policy | Bazar by clickfor.in', 'Bazar by clickfor.in policies.', '/delivery-policy') + '''<main id="main">
<div class="page-head"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span id="crumbNow">Policy</span></nav><h1 id="ph">Policy</h1></div></div>
<div class="wrap"><div class="prose" id="policy"><p>Loading…</p></div></div>
</main>
''' + foot('<script src="/assets/js/policy.js"></script>\n')
write('policy.html', policy)
print('pages written')
