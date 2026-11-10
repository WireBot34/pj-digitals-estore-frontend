# PJ Digitals E-Store frontend

React + Vite storefront and admin workspace for the PJ Digitals backend (Express, MongoDB, Clerk, Razorpay).

## What's in it

**Customer storefront** - home with live shop ads, catalogue (search, category, sort, shop/location filters), product details with reviews and wishlist, cart, checkout (saved or new address, UPI/Card via Razorpay or cash on delivery), order history with delivery tracking, cancel and "pay now" for unpaid orders, saved addresses, shop directory, wishlist, notification bell.

**Admin workspace** (shown when `GET /api/admin/stats` succeeds) - dashboard, products (including inactive ones), orders with status updates, payments, shop and delivery-partner approvals, delivery assignment, ad moderation.

**Work with us** (`/partner`) - signed-in customers can apply to sell (`POST /api/shops/apply`) or deliver (`POST /api/delivery/apply`). A banner under the header shows the application status (pending, approved, rejected or suspended, with the admin's reason). Role and status come from `GET /api/me`.

**Shop-owner workspace** (`/workspace`, role `shop_owner`, approved shop) - overview stats, add/edit/delete products with images, quick stock +/-, orders (accept or cancel, see delivery progress), advertisements (draft, submit for review, see rejection reasons), payouts, shop profile and an open/closed switch.

**Delivery-partner workspace** (`/workspace`, role `delivery_partner`, approved) - online/offline switch, optional live-location sharing, active jobs that refresh every 30 s (accept/reject, picked up, on the way, delivered, can't deliver, with directions, call links and cash-to-collect), history and profile.

Both land in their workspace after login and have an "Open store" button; the store header shows a link back. Suspended or pending accounts see their status instead.

## Setup

```bash
cp .env.example .env     # set VITE_CLERK_PUBLISHABLE_KEY and VITE_API_URL
pnpm install
pnpm dev                 # http://localhost:5173
pnpm build               # production build
```

`VITE_API_URL` is the backend address (`http://localhost:3000` locally). Only the Clerk **publishable** key belongs in this project.

## How it talks to the backend

- `src/api.js` - fetch wrapper, `qs()` query builder, formatting helpers. Pages receive `token` as a **function** (Clerk tokens are short-lived) and call `await token()` per request.
- `src/meta.jsx` - loads `GET /api/meta` once (categories, locations, status labels such as `shipping` -> "Dispatched", and whether cash on delivery / online payments are enabled). Defaults are used if the call fails.
- `src/razorpay.js` - opens Razorpay checkout from the `payment` object returned by `POST /api/orders`, then calls `POST /api/payments/verify`. Abandoned payments are resumed from My orders via `POST /api/payments/create`.
- `src/pages/Customer.jsx`, `src/pages/Admin.jsx` - the screens; `src/App.jsx` - auth, role detection and routing.

Full endpoint list: `API.md` in the backend project.

## Backend configuration to check

- If the backend sets `CLIENT_URL`, include this app's origin (e.g. `http://localhost:5173`) and your deployed domain.
- The Clerk publishable key must belong to the same Clerk application as the backend's secret key.
- Razorpay: the backend needs `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; otherwise `/api/meta` reports online payments as off and checkout only offers cash on delivery (if `ALLOW_COD` isn't `false`).

## v5 additions
- Ads show in 4 places: home banner carousel, /shop strip, /shops strip, product page; views and clicks are tracked.
- Admin console: Overview, Products, Orders, Deliveries, Shops (create/edit/manage-as), Delivery partners, Users (block/role), Advertisements, Payouts (owed, settlements, requests, drivers & COD, reports/CSV), Support, Activity log, Settings + broadcast.
- "Manage shop" / "Manage jobs" opens the real shop-owner / delivery workspace as that account (banner "Admin mode", button "Back to admin").
- Shop workspace: payout account, payout requests, settlement detail, CSV, ad placements and stats, Help. Delivery workspace: Earnings tab (fees, COD, settlements, payout account), Help.
- Customers: /support page (Help) and storefront announcement banner.
