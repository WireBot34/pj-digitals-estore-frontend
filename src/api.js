const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Admin "manage as" mode: while set, shop / delivery requests carry the x-shop-id / x-driver-id
// header, so the backend runs them as that shop or driver (admin tokens only).
const actAs = { shop: "", driver: "" };
export const setActAs = (next = {}) => { actAs.shop = next.shop || ""; actAs.driver = next.driver || ""; };

export async function api(path, { token, method = "GET", body, headers = {} } = {}) {
  if (!API_URL) throw new Error("VITE_API_URL is missing. Add it to your .env file.");
  const actHeaders = {};
  if (actAs.shop && (path.startsWith("/api/shop/") || (path.startsWith("/api/products") && method === "POST"))) actHeaders["x-shop-id"] = actAs.shop;
  if (actAs.driver && path.startsWith("/api/delivery/")) actHeaders["x-driver-id"] = actAs.driver;
  const isForm = body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...actHeaders,
      ...headers,
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw || "Unexpected server response" }; }
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
export const imageOf = (images) => Array.isArray(images) ? (typeof images[0] === "string" ? images[0] : images[0]?.url || images[0]?.secure_url || "") : "";
export const unwrap = (res, key = "data") => res?.[key] ?? res?.data ?? res;

/** Builds "?a=1&b=2" from an object, skipping empty values. Returns "" when nothing is set. */
export const qs = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
};

/** Downloads a CSV (or any file) from an authenticated endpoint. */
export async function download(path, token, filename) {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
