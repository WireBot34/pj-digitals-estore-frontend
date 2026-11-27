// The coupon the customer typed is remembered for this browser tab (cart and checkout share it), and
// every price quote asks the server about it: the browser never works out a discount itself.
const KEY = "pj_coupon";

export const cleanCode = (raw) => String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");

export const getCoupon = () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } };
export const setCoupon = (code) => { try { const c = cleanCode(code); if (c) sessionStorage.setItem(KEY, c); else sessionStorage.removeItem(KEY); } catch { /* private mode: it just won't be remembered */ } };

// "Use my loyalty points" is remembered the same way; the server decides how many points can be used.
const PKEY = "pj_points";
export const getUsePoints = () => { try { return sessionStorage.getItem(PKEY) === "1"; } catch { return false; } };
export const setUsePoints = (on) => { try { if (on) sessionStorage.setItem(PKEY, "1"); else sessionStorage.removeItem(PKEY); } catch { /* private mode */ } };

/** The quote URL, with the address, coupon and/or points flag when there are any. */
export const quotePath = ({ addressId, coupon, points } = {}) => {
  const q = [];
  if (points) q.push("points=1");
  if (addressId) q.push(`addressId=${encodeURIComponent(addressId)}`);
  if (coupon) q.push(`coupon=${encodeURIComponent(cleanCode(coupon))}`);
  return `/api/orders/quote${q.length ? `?${q.join("&")}` : ""}`;
};
