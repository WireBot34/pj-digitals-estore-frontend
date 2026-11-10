import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "./api";
import { cx } from "./ui";

const linkOf = (ad) => (ad.product ? `/product/${ad.product}` : `/shop?shop=${ad.shop?._id || ""}`);

/** Loads the ads for one placement and reports impressions once per page view. */
function useAds(placement, { shop, limit = 8 } = {}) {
  const [ads, setAds] = useState([]);
  const sent = useRef(false);
  useEffect(() => {
    let live = true;
    sent.current = false;
    api(`/api/ads?placement=${placement}&limit=${limit}${shop ? `&shop=${shop}` : ""}`)
      .then((r) => { if (live) setAds(r.data || []); })
      .catch(() => {});
    return () => { live = false; };
  }, [placement, shop, limit]);
  useEffect(() => {
    if (!ads.length || sent.current) return;
    sent.current = true;
    api("/api/ads/impressions", { method: "POST", body: { ids: ads.map((a) => a._id) } }).catch(() => {});
  }, [ads]);
  const click = (ad) => api(`/api/ads/${ad._id}/click`, { method: "POST" }).catch(() => {});
  return { ads, click };
}

/** Full-width rotating banner (home page). */
export function AdHero({ placement = "home" }) {
  const { ads, click } = useAds(placement, { limit: 6 });
  const [i, setI] = useState(0);
  useEffect(() => {
    if (ads.length < 2) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % ads.length), 5000);
    return () => clearInterval(id);
  }, [ads.length]);
  if (!ads.length) return null;
  const ad = ads[Math.min(i, ads.length - 1)];
  return <section className="mx-auto max-w-7xl px-5 pt-8">
    <div className="relative overflow-hidden rounded-3xl bg-slate-900">
      <Link to={linkOf(ad)} onClick={() => click(ad)} className="block">
        {ad.image ? <img src={ad.image} alt={ad.title} className="h-48 w-full object-cover opacity-90 sm:h-64 md:h-80"/> : <div className="h-48 sm:h-64 md:h-80"/>}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent"/>
        <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-end p-6 text-white md:p-10">
          <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur">Sponsored{ad.shop?.name ? ` · ${ad.shop.name}` : ""}</span>
          <h2 className="mt-3 font-display text-2xl font-extrabold md:text-4xl">{ad.title}</h2>
          {ad.description && <p className="mt-2 line-clamp-2 text-sm text-white/85">{ad.description}</p>}
        </div>
      </Link>
      {ads.length > 1 && <>
        <button aria-label="Previous" onClick={() => setI((i - 1 + ads.length) % ads.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2"><ChevronLeft size={18}/></button>
        <button aria-label="Next" onClick={() => setI((i + 1) % ads.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2"><ChevronRight size={18}/></button>
        <div className="absolute bottom-3 right-5 flex gap-1.5">{ads.map((a, n) => <button key={a._id} aria-label={`Ad ${n + 1}`} onClick={() => setI(n)} className={cx("h-1.5 rounded-full transition-all", n === i ? "w-6 bg-white" : "w-1.5 bg-white/50")}/>)}</div>
      </>}
    </div>
  </section>;
}

/** Horizontal strip of ad cards (catalogue, shops list, product page). */
export function AdStrip({ placement, shop, title = "Offers from local shops", className = "" }) {
  const { ads, click } = useAds(placement, { shop, limit: 8 });
  if (!ads.length) return null;
  return <section className={cx("mb-8", className)}>
    <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">{title}</p>
    <div className="mt-3 flex gap-4 overflow-x-auto pb-2">{ads.map((ad) => <Link key={ad._id} to={linkOf(ad)} onClick={() => click(ad)} className="relative min-w-[260px] max-w-[300px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg">
      {ad.image && <img src={ad.image} alt={ad.title} className="h-32 w-full object-cover"/>}
      <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Ad</span>
      <div className="p-4"><h3 className="font-bold">{ad.title}</h3>{ad.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{ad.description}</p>}{ad.shop && <p className="mt-2 text-xs font-semibold text-indigo-600">{ad.shop.name}{ad.shop.location ? ` · ${ad.shop.location}` : ""}</p>}</div>
    </Link>)}</div>
  </section>;
}

export const AD_PLACEMENT_LABELS = { home: "Home page banner", catalogue: "Shop / catalogue page", shops: "Shops directory", product: "Product pages" };
