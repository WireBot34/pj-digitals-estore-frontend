// The coupon the customer typed is remembered for this browser tab (cart and checkout share it), and
// every price quote asks the server about it: the browser never works out a discount itself.
const KEY = "pj_coupon";

export const cleanCode = (raw) => String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");

export const getCoupon = () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } };
export const setCoupon = (code) => { try { const c = cleanCode(code); if (c) sessionStorage.setItem(KEY, c); else sessionStorage.removeItem(KEY); } catch { /* private mode: it just won't be remembered */ } };

/** The quote URL, with the address and/or coupon when there are any. */
export const quotePath = ({ addressId, coupon } = {}) => {
  const q = [];
  if (addressId) q.push(`addressId=${encodeURIComponent(addressId)}`);
  if (coupon) q.push(`coupon=${encodeURIComponent(cleanCode(coupon))}`);
  return `/api/orders/quote${q.length ? `?${q.join("&")}` : ""}`;
};
