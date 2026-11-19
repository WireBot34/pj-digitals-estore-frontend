# Frontend notes

Only the frontend changed. No server files were touched; every API call and prop contract is the same.

## Before you deploy: fill in `src/config.js`
The legal pages, order slip and Contact page read your business details from this one file.
Anything left empty shows on the page as a yellow "[add ... in src/config.js]" marker, so a blank cannot go live unnoticed.
Fill in: operator name, address, phone, email, grievance officer, court area (`jurisdiction`).
Policy numbers there (return window 48 h, refund 7 days, delivery estimate, change-of-mind returns) are starting defaults. Edit them to what you really do.
Keep `gstRegistered: false` until you hold a GSTIN. While false the site never says "tax invoice" and never adds GST.
The legal pages are plain-language templates, not legal advice. Have them read once by someone who knows your local rules.

## What is new

**Legal pages** (`/legal/terms`, `privacy`, `refunds`, `shipping`, `contact`): linked from the footer, the phone Account page, and checkout.

**Installable app (PWA)**
- `public/manifest.webmanifest`, icons (`public/icons`, including a maskable one), `public/sw.js`, `public/offline.html`.
- The service worker caches the app shell and build files and shows an offline page. It never touches API calls or other origins.
- Install banner (after 8 s, dismissed for 14 days), an "Install the app" row on the Account page, an iOS "Add to Home Screen" hint, and a "new version ready, Refresh" prompt.
- To force every phone to drop old caches, change `VERSION` in `public/sw.js`.
- Registration only happens in a production build (`pnpm build`), not in `pnpm dev`.

**Checkout, cart and orders**
- Pay on delivery is the default option; the summary says "Pay by".
- Inline validation (10-digit mobile, 6-digit PIN, area required); name and phone are pre-filled from the account.
- Order success page with what happens next, plus a printable **order slip** (also from the Orders page).
- Cart: guest cart that moves into the account on sign-in, free-delivery progress bar, stock caps and low-stock warnings, "Undo" after removing an item.
- Orders: progress tracker, All/Active/Delivered/Cancelled tabs, "Order again", call buttons, confirm sheets instead of browser popups.

**Browsing**
- Filters sheet (sort, area, price range, in stock only) with removable filter chips, recent searches, better empty-results page.
- Product page: swipe and full-screen photo viewer, share button, "More from this shop", "You may also like", recently viewed, COD badge, star picker for reviews.
- Shop pages show opening hours, open/closed and a call button. Scroll position is restored on Back.

**Everywhere**
- Admin, shop and delivery tables turn into stacked cards on phones (`src/tables.js` + CSS). Add class `keep-table` to a table that must stay a table.
- Error states with a Try again button, offline banner, back-to-top button, 404 page, crash screen, per-page browser titles, skip link.
- Notifications page, "Edit profile" on Account, map link on addresses.
- Admin, shop and delivery code loads only for those users (smaller download for customers).
- Delivery workspace keeps the screen on while sharing live location.
- Seasonal colours chosen by date (`src/theme.js`: Vishu, Onam, Diwali, Christmas, New Year). Festival dates move yearly: edit the windows once a year. Preview with `?theme=onam`, back with `?theme=off`.
- New logo mark in `Logo` (`src/ui.jsx`); swap it when you have a real logo.

## Hosting files (for server day)
- `deploy/Dockerfile` and `deploy/nginx.conf`: build the site and serve it with correct cache headers and single-page fallback.
- `vercel.json`: the same rules if it stays on Vercel for now.

## Not done (needs the server, or not started)
Exact delivery fee before ordering (server does not send it), cart grouped by shop (server does not send the shop on cart items), cancel reason, review photos and "helpful" votes, barcode and product catalogue, own image storage, Malayalam translation, charts and CSV import/export for shops, dark mode, tests.

## Verification
No packages could be installed and no build run here. The JSX was syntax- and name-checked with TypeScript. The service worker, offline page, manifest and installability were run in Chromium; the seasonal themes, guest cart, recent lists and address validation were run as unit checks; the table-to-card layout was checked at phone width. The full pages have NOT been looked at in a browser: run `pnpm install && pnpm dev`, check at phone width, then `pnpm build && pnpm preview` to try the offline and install behaviour.
