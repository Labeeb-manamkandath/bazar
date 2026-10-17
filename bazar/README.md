# Bazar by clickfor.in — Coming Soon landing page

A single-page, pre-launch site for Bazar. Plain HTML, CSS and JavaScript with no build step and no dependencies.

## Structure

```
index.html          The whole page (styles and scripts inline)
assets/brand/       Logo files made from the supplied logo (transparent + light versions)
assets/img/         Concept product mockups, each in two sizes (-sm = 800px, full = up to 1600px)
assets/             Favicons, apple-touch-icon, og-coming-soon.jpg (1200×630 share image)
```

## Sections

1. Coming Soon banner with the playable "Catch the Essentials" game
2. About Bazar (translated from the Malayalam brief)
3. A Little Preview of Bazar: concept product and packaging mockups (complete order, filled bag, pantry essentials, fresh produce, packaging close-ups) with a lightbox
4. Contact (phone + WhatsApp), plus a floating WhatsApp button

## Run locally

```
npx serve .
# or
python3 -m http.server 8000
```

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `npx vercel` inside it).
2. In Vercel, import the repo. Framework preset: **Other**. No build command. Output directory: `.`
3. Deploy.

## Before going live — please review

- **WhatsApp link.** All WhatsApp buttons use `https://wa.me/message/TOTXU35IP3ANE1`
  (contact button, footer, floating button).
- **Mockups are illustrated concepts**, not photographs. Swap any file in `assets/img/` for a real
  photo with the same name (keep both sizes) when photos are available.
