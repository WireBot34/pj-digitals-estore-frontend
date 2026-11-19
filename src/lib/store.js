/** Small browser-side stores: guest cart, recent searches, recently viewed products. All safe if storage is blocked. */

const read = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
};
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } };

/* ------------------------------------------------------------ guest cart */
const CART = "pj_guest_cart";
const same = (a, b) => a.id === b.id && (a.size || "") === (b.size || "");
const announce = () => { try { window.dispatchEvent(new Event("pj-guest-cart")); } catch { /* ignore */ } };

export const guestCart = {
  items: () => read(CART, []),
  count: () => read(CART, []).reduce((n, i) => n + Number(i.quantity || 0), 0),
  /** item: { id, name, price, image, size, quantity, stock } */
  add(item) {
    const list = read(CART, []);
    const found = list.find((i) => same(i, item));
    const cap = Number(item.stock) > 0 ? Number(item.stock) : 99;
    if (found) { found.quantity = Math.min(cap, found.quantity + item.quantity); found.price = item.price; found.stock = item.stock; }
    else list.push({ ...item, quantity: Math.min(cap, item.quantity) });
    write(CART, list); announce();
  },
  setQuantity(item, quantity) {
    const list = read(CART, []).map((i) => (same(i, item) ? { ...i, quantity } : i)).filter((i) => i.quantity > 0);
    write(CART, list); announce();
  },
  remove(item) { write(CART, read(CART, []).filter((i) => !same(i, item))); announce(); },
  clear() { write(CART, []); announce(); },
};

/* -------------------------------------------------------- recent searches */
const SEARCHES = "pj_recent_searches";
export const recentSearches = {
  list: () => read(SEARCHES, []),
  add(term) {
    const t = String(term || "").trim();
    if (t.length < 2) return;
    write(SEARCHES, [t, ...read(SEARCHES, []).filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6));
  },
  remove(term) { write(SEARCHES, read(SEARCHES, []).filter((x) => x !== term)); },
  clear() { write(SEARCHES, []); },
};

/* ------------------------------------------------------ recently viewed */
const VIEWED = "pj_recently_viewed";
export const recentlyViewed = {
  list: () => read(VIEWED, []),
  /** Stores a small snapshot so the home page can show it without extra requests. */
  add(p) {
    if (!p?._id) return;
    const snap = { _id: p._id, name: p.name, price: p.price, comparePrice: p.comparePrice, images: (p.images || []).slice(0, 1), stock: p.stock, shop: p.shop ? { name: p.shop.name, location: p.shop.location } : undefined, category: p.category };
    write(VIEWED, [snap, ...read(VIEWED, []).filter((x) => x._id !== p._id)].slice(0, 12));
  },
  clear() { write(VIEWED, []); },
};
