const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export async function api(path, { token, method = "GET", body, headers = {} } = {}) {
  if (!API_URL) throw new Error("VITE_API_URL is missing. Add it to your .env file.");
  const isForm = body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
