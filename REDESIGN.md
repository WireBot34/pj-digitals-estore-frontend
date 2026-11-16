# Redesign notes

Only the frontend changed. No server files were touched and every API call, route and prop contract is the same.

## How the look is controlled
- `tailwind.config.js` holds the design tokens. The old code used Tailwind's `slate` and `indigo`; `slate` is now a warm stone neutral and `indigo` is the brand green, so every workspace page picked up the new palette without edits. Corner radii are tightened and shadows softened.
- `src/index.css` holds fonts, buttons (`btn-primary`, `btn-secondary`), inputs, mobile rules (16px inputs so iOS does not zoom, 44px touch targets, modals become bottom sheets on phones).
- Fonts: Bricolage Grotesque (headings) and Hanken Grotesk (text), loaded in `index.html`.
- To change the brand colour, edit the `brand` scale in `tailwind.config.js`.

## Rewritten
- `src/App.jsx` store shell: slim header, desktop nav with active state, **bottom tab bar on phones**, scroll-to-top on navigation.
- `src/ui.jsx`: toast (sits above the tab bar on phones), skeleton loaders, empty states, `Page` / `PageTitle` helpers.
- `src/pages/Customer.jsx`: home (search first, category chips), catalogue (sticky filters, chips, skeletons), product page (photo gallery, sticky add-to-cart bar on phones, discount shown), cart, checkout, orders, account (now also a menu hub on phones), wishlist, shops, notifications.
- `src/ads.jsx`: banner and strips (swipeable on phones).
- `src/pages/WorkspaceFrame.jsx`: shop and delivery workspace header and scrolling tabs.

## Restyled by the tokens plus small responsive fixes
Admin, Shop owner, Delivery, Partner, Support pages: new palette and radii, tables still scroll sideways inside their card on phones, admin sidebar already collapses to a drawer.

## Not verified
This was written without being able to install packages, build or open a browser. The JSX was syntax-checked with TypeScript only. Run `pnpm install && pnpm dev` and look at it at phone width before deploying.
