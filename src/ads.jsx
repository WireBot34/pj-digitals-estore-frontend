import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, sized } from "./api";
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
    const id = setInterval(() => setI((n) => (n + 1) % ads.length), 6000);
    return () => clearInterval(id);
  }, [ads.length]);
  if (!ads.length) return null;
  const ad = ads[Math.min(i, ads.length - 1)];
  return <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8">
    <div className="relative overflow-hidden rounded-xl bg-slate-200">
      <Link to={linkOf(ad)} onClick={() => click(ad)} className="block">
        {ad.image ? <img src={ad.image} alt={ad.title} className="h-44 w-full object-cover sm:h-64 md:h-80"/> : <div className="h-44 sm:h-64 md:h-80"/>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent sm:bg-gradient-to-r sm:from-black/60 sm:via-black/10"/>
        <div className="absolute inset-0 flex flex-col justify-end p-4 text-white sm:max-w-xl sm:p-8">
          <span className="w-fit rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-slate-800">Ad{ad.shop?.name ? ` · ${ad.shop.name}` : ""}</span>
          <h2 className="mt-2 font-display text-xl font-bold leading-tight sm:text-3xl">{ad.title}</h2>
          {ad.description && <p className="mt-1 line-clamp-2 text-sm text-white/90">{ad.description}</p>}
        </div>
      </Link>
      {ads.length > 1 && <>
        <button aria-label="Previous" onClick={() => setI((i - 1 + ads.length) % ads.length)} className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 sm:grid"><ChevronLeft size={18}/></button>
        <button aria-label="Next" onClick={() => setI((i + 1) % ads.length)} className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 sm:grid"><ChevronRight size={18}/></button>
        <div className="absolute right-4 top-4 flex gap-1.5">{ads.map((a, n) => <button key={a._id} aria-label={`Ad ${n + 1}`} onClick={() => setI(n)} className={cx("h-1.5 rounded-full transition-all", n === i ? "w-5 bg-white" : "w-1.5 bg-white/60")}/>)}</div>
      </>}
    </div>
  </section>;
}

/** Horizontal strip of ad cards (catalogue, shops list, product page). */
export function AdStrip({ placement, shop, title = "Offers from local shops", className = "" }) {
  const { ads, click } = useAds(placement, { shop, limit: 8 });
  if (!ads.length) return null;
  return <section className={cx("mb-8", className)}>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <div className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">{ads.map((ad) => <Link key={ad._id} to={linkOf(ad)} onClick={() => click(ad)} className="relative w-[78%] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-xl border border-slate-200 bg-white sm:w-[280px]">
      {ad.image && <img src={sized(ad.image, "md")} alt={ad.title} loading="lazy" className="h-28 w-full object-cover sm:h-32"/>}
      <span className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">Ad</span>
      <div className="p-3.5"><h3 className="line-clamp-1 text-sm font-semibold">{ad.title}</h3>{ad.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{ad.description}</p>}{ad.shop && <p className="mt-2 text-xs font-medium text-brand-700">{ad.shop.name}{ad.shop.location ? `, ${ad.shop.location}` : ""}</p>}</div>
    </Link>)}</div>
  </section>;
}

export const AD_PLACEMENT_LABELS = { home: "Home page banner", catalogue: "Shop / catalogue page", shops: "Shops directory", product: "Product pages" };
