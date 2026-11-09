# Bazar by clickfor.in: online store with WhatsApp ordering + Admin Portal

Customers browse products and tap **Buy on WhatsApp**. There is no cart, checkout or payment gateway.
The administrator manages everything at `/admin`.

## What is inside

```
index.html, products.html, product.html, about.html, contact.html, policy.html   Customer pages
admin/                     Admin Portal (login + dashboard + products, categories, homepage, policies)
api/public.js              Read-only data for the website
api/admin.js               Admin API (every action except login needs a signed session)
api/product-page.js        Product pages with correct title, share image and structured data
api/sitemap.js             /sitemap.xml (built from live products)
api/_lib/                  Database, login and helper code
db/schema.sql              Database tables (run once in Supabase)
assets/                    CSS, JS, logo, icons, share image
vercel.json                Routes, security headers, region
```

## How it works

- **Database + photos:** Supabase (Postgres + Storage). The browser never talks to Supabase directly. Only the server functions do, using a secret key.
- **Admin login:** the username and a password *hash* live in Vercel environment variables. Login creates a signed, HttpOnly, SameSite=Strict cookie that expires after 8 hours. Every admin API call checks it on the server. 5 wrong attempts lock the sign-in for 15 minutes.
- **Changing the password:** Admin Portal > Account. The new hash is stored in the database and replaces the one in the environment variable.
- **Buy on WhatsApp:** if a product has a WhatsApp Catalogue link, the button opens it. If not, it opens WhatsApp with a ready message containing the product name.
- **Updates:** admin changes appear on the website within about 10 seconds.

## Environment variables (Vercel)

| Name | What |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key (secret) |
| `ADMIN_USERNAME` | Admin username |
| `ADMIN_PASSWORD_HASH` | Hash of the starter password (never the password itself) |
| `SESSION_SECRET` | Long random text used to sign login cookies |

## Test on your computer (optional)

`node tools/dev-server.js` starts a local copy that stores data in a `.data` folder (no Supabase needed).
Set `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` first.
