import { useEffect, useMemo } from "react";
import { DEFAULT_BRAND, businessFrom, mergeBrand } from "./brand.core.js";
import { useMeta } from "./meta";

/**
 * Branding comes from the server (brand.json, see deploy/setup-brand.sh) through /api/meta.
 * config.js only holds the fallback used until the server answers, or if it can't be reached.
 * The last answer is kept in localStorage so the next visit paints the right name straight away.
 */
const CACHE_KEY = "pj_brand";
export { DEFAULT_BRAND, businessFrom, mergeBrand };

let cached = null;
/** For code outside React (the Razorpay sheet). */
const readCache = () => {
  if (cached) return cached;
  try { const raw = localStorage.getItem(CACHE_KEY); if (raw) cached = mergeBrand(JSON.parse(raw)); } catch { /* blocked or corrupt */ }
  return cached || mergeBrand(null);
};

export const currentBrand = () => readCache();

/** The brand to show right now: the server's once /api/meta has answered, the last known one before that. */
export function useBrand() {
  const meta = useMeta();
  const fromServer = meta?.brand;
  return useMemo(() => {
    if (!fromServer) return readCache();
    const merged = mergeBrand(fromServer);
    cached = merged;
    return merged;
  }, [fromServer]);
}

export function useBusiness() {
  const brand = useBrand();
  const meta = useMeta();
  return useMemo(() => businessFrom(brand, meta), [brand, meta.gstRegistered, meta.gstin]);
}

/** Remembers the server's brand for the next first paint (called once per answer from MetaProvider). */
export function rememberBrand(brand) {
  if (!brand) return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(brand)); } catch { /* ignore */ }
}

/** Keeps the tab's colour bar and the Apple title in step with brand.json. Mount once, high in the tree. */
export function BrandHead() {
  const b = useBrand();
  useEffect(() => {
    const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val); };
    if (!document.documentElement.classList.contains("dark")) set('meta[name="theme-color"]', "content", b.colors.themeColor);
    set('meta[name="apple-mobile-web-app-title"]', "content", b.shortName || b.name);
    set('meta[property="og:site_name"]', "content", b.name);
  }, [b.colors.themeColor, b.shortName, b.name]);
  return null;
}
