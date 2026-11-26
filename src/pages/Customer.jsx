import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SignInButton, useClerk } from "@clerk/clerk-react";
import { ArrowRight, Bell, Check, ChevronLeft, ChevronRight, Clock, Download, Edit3, Heart, LifeBuoy, MapPin, Minus, Package, Phone, Plus, Printer, RotateCcw, Search, Share2, ShoppingBag, SlidersHorizontal, Store, Trash2, Truck, UserRound, X, Camera, ThumbsUp, ShieldCheck } from "lucide-react";
import { api, imageOf, money, qs, sized } from "../api";
import { useBrand, useBusiness } from "../brand";
import { getCoupon, quotePath, setCoupon } from "../coupon.core";
import { cancelLabel, useMeta, statusLabel } from "../meta";
import { payForCheckout, paymentErrorMessage } from "../razorpay";
import { AdHero, AdStrip } from "../ads";
import { guestCart, recentSearches, recentlyViewed } from "../lib/store";
import { useInstall } from "../pwa";
import { AuthPrompt, Empty, ErrorState, Page, PageTitle, Pager, Pill, ProductGridSkeleton, ReasonSheet, Skeleton, Stars, Steps, cx, orderTone, payTone, prettify, useConfirm, usePageTitle } from "../ui";
import { LEGAL } from "./Legal";

// 8-80 plain characters; the server ignores anything else
const newAttemptKey = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");

const imagesOf = (images) => (Array.isArray(images) ? images.map((i) => (typeof i === "string" ? i : i?.url || i?.secure_url || "")).filter(Boolean) : []);
const discountOf = (p) => (p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0);
const hasPin = (a) => a && a.latitude !== "" && a.longitude !== "" && a.latitude != null && a.longitude != null && Number.isFinite(Number(a.latitude)) && Number.isFinite(Number(a.longitude));
const mapsLink = (a) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hasPin(a) ? `${a.latitude},${a.longitude}` : [a.street, a.location, a.city, a.state, a.zipCode].filter(Boolean).join(", "))}`;
/** The map pin of an address form as API fields: both numbers, or null to clear it. */
const pinFields = (f) => (hasPin(f) ? { latitude: Number(f.latitude), longitude: Number(f.longitude) } : { latitude: null, longitude: null });
const chip = (active) => cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", active ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-900");
const shopName = (o) => (o.shop && typeof o.shop === "object" ? o.shop.name : "");

/* ------------------------------------------------------------------ Home */
export function Home() {
  usePageTitle();
  const meta = useMeta();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [assured, setAssured] = useState([]);
  const [fresh, setFresh] = useState([]);
  const [shops, setShops] = useState([]);
  const [q, setQ] = useState("");
  const [hint, setHint] = useState(() => { try { return !localStorage.getItem("pj_hint_seen"); } catch { return false; } });
  useEffect(() => {
    // each row loads on its own, so one slow or failing request never blanks the page
    api("/api/products" + qs({ featured: "true", limit: 8 })).then((r) => setFeatured(r.data || [])).catch(() => {});
    api("/api/products" + qs({ assured: "true", limit: 8 })).then((r) => setAssured(r.data || [])).catch(() => {});
    api("/api/products" + qs({ sort: "newest", limit: 8 })).then((r) => setFresh(r.data || [])).catch(() => {});
    api("/api/shops" + qs({ limit: 6 })).then((r) => setShops(r.data || [])).catch(() => {});
  }, []);
  // "Just added" shouldn't repeat what is already shown above it
  const shown = new Set([...featured, ...assured].map((p) => p._id));
  const justAdded = fresh.filter((p) => !shown.has(p._id)).slice(0, 8);
  const search = (e) => { e.preventDefault(); recentSearches.add(q); navigate("/shop" + qs({ search: q.trim() })); };
  const closeHint = () => { try { localStorage.setItem("pj_hint_seen", "1"); } catch { /* ignore */ } setHint(false); };

  return <main>
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pb-14 sm:pt-14">
        {hint && <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <Truck size={18} className="mt-0.5 shrink-0"/>
          <p className="flex-1">We deliver in {meta.locations.join(" and ")}.{meta.cashOnDelivery ? " You can pay cash when your order arrives." : ""}</p>
          <button onClick={closeHint} aria-label="Dismiss" className="-m-1 shrink-0 p-1"><X size={16}/></button>
        </div>}
        <h1 className="max-w-2xl font-display text-[2rem] font-bold leading-[1.1] sm:text-5xl">Buy from the shops in your town.</h1>
        <p className="mt-3 max-w-xl text-base text-slate-600 sm:mt-4 sm:text-lg">Everyday things from local stores in {meta.locations.join(" and ")}, delivered to your door.</p>
        <form onSubmit={search} className="mt-6 flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a product" aria-label="Search products" enterKeyHint="search" className="input h-12 pl-10"/>
          </div>
          <button className="btn-primary h-12 px-5">Search</button>
        </form>
        <div className="no-scrollbar mt-5 -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {meta.categories.map((c) => <Link key={c} to={`/shop?category=${encodeURIComponent(c)}`} className="shrink-0 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-900">{c}</Link>)}
        </div>
      </div>
    </section>

    <AdHero placement="home"/>

    {featured.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Featured</h2>
        <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">All products <ArrowRight size={15}/></Link>
      </div>
      <ProductGrid products={featured}/>
    </section>}

    {assured.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold sm:text-2xl"><ShieldCheck size={22} className="text-green-700"/> Assured picks</h2>
        <Link to="/shop?assured=true" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">See all <ArrowRight size={15}/></Link>
      </div>
      <ProductGrid products={assured}/>
    </section>}

    {justAdded.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Just added</h2>
        <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Browse all <ArrowRight size={15}/></Link>
      </div>
      <ProductGrid products={justAdded}/>
    </section>}

    {shops.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Our shops</h2>
        <Link to="/shops" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">All shops <ArrowRight size={15}/></Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shops.map((s) => <Link key={s._id} to={`/shop?shop=${s._id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">{s.logo ? <img src={sized(s.logo, "sm")} alt="" loading="lazy" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-slate-400"><Store size={22} strokeWidth={1.5}/></div>}</div>
        <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate font-semibold">{s.name}</h3><span className={cx("h-2 w-2 shrink-0 rounded-full", s.isOpen === false ? "bg-red-500" : "bg-emerald-500")} title={s.isOpen === false ? "Closed now" : "Open"}/></div>{s.location && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} className="shrink-0"/>{s.location}</p>}</div>
      </Link>)}</div>
    </section>}

    <RecentlyViewed className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14"/>

    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
        {[
          [Store, "Local shops", "Every product comes from a shop you can actually visit."],
          [Truck, "Delivered by partners nearby", "Track your order from the shop to your door."],
          [ShoppingBag, "Pay on delivery", "Pay in cash when it arrives, or online where the shop allows it."],
        ].map(([Icon, title, body]) => <div key={title} className="bg-paper p-5 sm:p-6">
          <Icon size={20} className="text-brand-700" strokeWidth={1.75}/>
          <h3 className="mt-3 font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{body}</p>
        </div>)}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-slate-500">Delivering in</span>
        {meta.locations.map((l) => <Link key={l} to={`/shops?location=${encodeURIComponent(l)}`} className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-brand-700"><MapPin size={15}/>{l}</Link>)}
      </div>
    </section>
  </main>;
}

/* ------------------------------------------------------------- Catalogue */
export function ProductCard({ p }) {
  const img = imageOf(p.images);
  const off = discountOf(p);
  const out = !(p.stock > 0);
  const meta = useMeta();
  return <Link to={`/product/${p._id}`} className="group block">
    <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-slate-200/60">
      {img
        ? <img src={sized(img, "md")} alt={p.name} loading="lazy" decoding="async" className={cx("h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]", out && "opacity-60")}/>
        : <div className="grid h-full place-items-center text-slate-400"><Package size={32} strokeWidth={1.25}/></div>}
      {off > 0 && !out && <span className="absolute left-2 top-2 rounded bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-white">{off}% off</span>}
      {out && <span className="absolute left-2 top-2 rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">Sold out</span>}
      {p.isAssured && <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-green-700 shadow-sm"><ShieldCheck size={12}/> Assured</span>}
    </div>
    <div className="mt-2.5">
      <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-900 sm:text-[15px]">{p.name}</h3>
      <p className="price mt-1 text-sm font-semibold sm:text-base">
        {money(p.price)}
        {p.comparePrice > p.price && <span className="ml-2 text-xs font-normal text-slate-400 line-through">{money(p.comparePrice)}</span>}
      </p>
      {p.shop?.name && <p className="mt-0.5 truncate text-xs text-slate-500">{p.shop.name}{p.shop.location ? `, ${p.shop.location}` : ""}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
        {p.ratings?.count > 0 && <span className="flex items-center gap-1"><Stars value={p.ratings.average} size={12}/>{p.ratings.count}</span>}
        {meta.cashOnDelivery && !out && <span className="text-brand-700">Pay on delivery</span>}
      </div>
    </div>
  </Link>;
}

export const ProductGrid = ({ products, children }) => <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => children ? children(p) : <ProductCard key={p._id} p={p}/>)}</div>;

/** A row of products the visitor opened recently (kept in this browser only). */
function RecentlyViewed({ exclude, className = "" }) {
  const [list, setList] = useState([]);
  useEffect(() => { setList(recentlyViewed.list().filter((p) => p._id !== exclude).slice(0, 4)); }, [exclude]);
  if (!list.length) return null;
  return <section className={className}>
    <div className="mb-5 flex items-baseline justify-between"><h2 className="font-display text-xl font-bold sm:text-2xl">Recently viewed</h2><button onClick={() => { recentlyViewed.clear(); setList([]); }} className="text-sm font-medium text-slate-500 hover:text-slate-900">Clear</button></div>
    <ProductGrid products={list}/>
  </section>;
}

/** Filters in a bottom sheet on phones, a centred panel on larger screens. */
function FilterSheet({ open, close, values, apply, areas, hideArea }) {
  const [v, setV] = useState(values);
  useEffect(() => { if (open) setV(values); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);
  if (!open) return null;
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return <div className="fixed inset-0 z-[110] grid place-items-end bg-black/45 sm:place-items-center sm:p-4" onClick={close}>
    <div role="dialog" aria-modal="true" aria-label="Filters" onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-xl" style={{ paddingBottom: "calc(1.25rem + var(--safe-bottom))" }}>
      <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Filters</h2><button onClick={close} aria-label="Close" className="-m-2 p-2"><X size={20}/></button></div>
      <div className="mt-5 space-y-5">
        <div><label className="label" htmlFor="f-sort">Sort by</label>
          <select id="f-sort" className="input mt-1 w-full" value={v.sort} onChange={set("sort")}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option><option value="name">Name</option></select></div>
        {!hideArea && <div><label className="label" htmlFor="f-area">Delivery area</label>
          <select id="f-area" className="input mt-1 w-full" value={v.location} onChange={set("location")}><option value="">All areas</option>{areas.map((l) => <option key={l}>{l}</option>)}</select></div>}
        <div><span className="label">Price (₹)</span>
          <div className="mt-1 flex items-center gap-2"><input aria-label="Minimum price" className="input w-full" inputMode="numeric" placeholder="Min" value={v.minPrice} onChange={(e) => setV({ ...v, minPrice: e.target.value.replace(/\D/g, "") })}/><span className="text-slate-400">to</span><input aria-label="Maximum price" className="input w-full" inputMode="numeric" placeholder="Max" value={v.maxPrice} onChange={(e) => setV({ ...v, maxPrice: e.target.value.replace(/\D/g, "") })}/></div></div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={v.inStock === "true"} onChange={(e) => setV({ ...v, inStock: e.target.checked ? "true" : "" })}/> Show only items in stock</label>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={v.assured === "true"} onChange={(e) => setV({ ...v, assured: e.target.checked ? "true" : "" })}/> Assured products only</label>
      </div>
      <div className="mt-6 flex gap-3"><button onClick={() => apply({ sort: "newest", location: "", minPrice: "", maxPrice: "", inStock: "", assured: "" })} className="btn-secondary flex-1">Reset</button><button onClick={() => apply(v)} className="btn-primary flex-1">Show results</button></div>
    </div>
  </div>;
}

export function Shop({ tell }) {
  const meta = useMeta();
  const [sp, setSp] = useSearchParams();
  const category = sp.get("category") || "";
  const sort = sp.get("sort") || "newest";
  const location = sp.get("location") || "";
  const shop = sp.get("shop") || "";
  const minPrice = sp.get("minPrice") || "";
  const maxPrice = sp.get("maxPrice") || "";
  const inStock = sp.get("inStock") || "";
  const assured = sp.get("assured") || "";
  const page = Number(sp.get("page")) || 1;
  const [search, setSearch] = useState(sp.get("search") || "");
  const [focused, setFocused] = useState(false);
  const [recents, setRecents] = useState(() => recentSearches.list());
  // product name suggestions while typing (the server forgives typos and word order)
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    const t = search.trim();
    if (!focused || t.length < 2) { setSuggestions([]); return undefined; }
    let live = true;
    const timer = setTimeout(() => { api("/api/products/suggest" + qs({ q: t })).then((r) => live && setSuggestions(r.data || [])).catch(() => live && setSuggestions([])); }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [search, focused]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [shopInfo, setShopInfo] = useState(null);
  const [sheet, setSheet] = useState(false);
  usePageTitle(shopInfo ? shopInfo.name : category || "Products");

  const setParams = useCallback((changes, keepPage = false) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
      if (!keepPage) next.delete("page");
      return next;
    }, { replace: true });
  }, [setSp]);
  const setParam = useCallback((key, value) => setParams({ [key]: value }, key === "page"), [setParams]);

  // search box is debounced into the URL
  useEffect(() => {
    const t = setTimeout(() => setParam("search", search.trim()), 350);
    return () => clearTimeout(t);
  }, [search, setParam]);

  useEffect(() => {
    if (!shop) { setShopInfo(null); return; }
    api(`/api/shops/${shop}`).then((r) => setShopInfo(r.data)).catch(() => setShopInfo(null));
  }, [shop]);

  const query = sp.toString();
  useEffect(() => {
    let live = true;
    setLoading(true); setFailed(false);
    api("/api/products" + qs({ page, limit: 12, search: sp.get("search"), category, sort, location, shop, minPrice, maxPrice, inStock, assured }))
      .then((r) => { if (live) { setProducts(r.data || []); setPagination(r.pagination); } })
      .catch((e) => { if (live) { setFailed(true); tell(e.message, "error"); } })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [query, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitSearch = (term) => { recentSearches.add(term); setRecents(recentSearches.list()); };
  const pickRecent = (term) => { setSearch(term); setFocused(false); commitSearch(term); };
  const activeFilters = [
    location && !shop && { key: "location", label: location },
    (minPrice || maxPrice) && { key: "price", label: `₹${minPrice || 0} to ${maxPrice ? "₹" + maxPrice : "any"}` },
    inStock && { key: "inStock", label: "In stock" },
    assured && { key: "assured", label: "Assured" },
    sp.get("search") && { key: "search", label: `"${sp.get("search")}"` },
  ].filter(Boolean);
  const remove = (key) => {
    if (key === "price") setParams({ minPrice: "", maxPrice: "" });
    else { if (key === "search") setSearch(""); setParam(key, ""); }
  };
  const filterCount = [location && !shop, minPrice || maxPrice, inStock, assured, sort !== "newest"].filter(Boolean).length;
  const clearAll = () => { setSearch(""); setSp(shop ? { shop } : {}, { replace: true }); };

  return <Page>
    <AdStrip placement="catalogue" shop={shop}/>
    {shopInfo ? <header className="mb-6 flex flex-wrap items-start gap-4 sm:mb-8">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">{shopInfo.logo ? <img src={sized(shopInfo.logo, "sm")} alt="" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-slate-400"><Store size={26} strokeWidth={1.5}/></div>}</div>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{shopInfo.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{shopInfo.location}{shopInfo.addressLine ? `, ${shopInfo.addressLine}` : ""}</p>
        {shopInfo.description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{shopInfo.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Pill tone={shopInfo.isOpen === false ? "red" : "green"}>{shopInfo.isOpen === false ? "Closed now" : "Open"}</Pill>
          {shopInfo.openingHours && <span className="inline-flex items-center gap-1 text-slate-600"><Clock size={14}/>{shopInfo.openingHours}</span>}
          {shopInfo.phone && <a href={`tel:${shopInfo.phone}`} className="btn-secondary px-3 py-1.5 text-xs"><Phone size={14}/> Call shop</a>}
        </div>
      </div>
    </header> : <PageTitle>{category || "Products"}</PageTitle>}

    <div className="sticky top-14 z-30 -mx-4 border-b border-slate-200 bg-paper px-4 py-3 sm:top-16 sm:-mx-6 sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex gap-2 lg:w-96">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/>
            <input value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => { setRecents(recentSearches.list()); setFocused(true); }} onBlur={() => { setTimeout(() => setFocused(false), 150); if (search.trim()) commitSearch(search); }} onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }} placeholder="Search products" aria-label="Search products" enterKeyHint="search" className="input w-full pl-10"/>
            {focused && search.trim().length >= 2 && suggestions.length > 0 && <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg" role="listbox" aria-label="Suggestions">
              {suggestions.map((x) => <Link key={x._id} to={`/product/${x._id}`} onMouseDown={(e) => e.preventDefault()} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-slate-50" role="option"><span className="truncate">{x.name}</span><span className="shrink-0 text-xs text-slate-400">{x.category}</span></Link>)}
            </div>}
            {focused && !search && recents.length > 0 && <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500"><span>Recent searches</span><button onMouseDown={(e) => e.preventDefault()} onClick={() => { recentSearches.clear(); setRecents([]); }} className="font-medium hover:text-slate-900">Clear</button></div>
              {recents.map((r) => <div key={r} className="flex items-center hover:bg-slate-50"><button onMouseDown={(e) => e.preventDefault()} onClick={() => pickRecent(r)} className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm"><Clock size={14} className="text-slate-400"/>{r}</button><button onMouseDown={(e) => e.preventDefault()} onClick={() => { recentSearches.remove(r); setRecents(recentSearches.list()); }} aria-label={`Remove ${r}`} className="px-3 py-2.5 text-slate-400 hover:text-slate-900"><X size={14}/></button></div>)}
            </div>}
          </div>
          <button onClick={() => setSheet(true)} className="btn-secondary relative shrink-0 px-3.5" aria-label="Filters and sorting"><SlidersHorizontal size={17}/><span className="hidden sm:inline">Filters</span>{filterCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">{filterCount}</span>}</button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-1 lg:px-0">
          <button onClick={() => setParam("category", "")} className={chip(!category)}>All</button>
          {meta.categories.map((c) => <button key={c} onClick={() => setParam("category", c)} className={chip(category === c)}>{c}</button>)}
        </div>
      </div>
    </div>

    <FilterSheet open={sheet} close={() => setSheet(false)} hideArea={Boolean(shop)} areas={meta.locations} values={{ sort, location, minPrice, maxPrice, inStock, assured }} apply={(v) => { setParams({ sort: v.sort === "newest" ? "" : v.sort, location: v.location, minPrice: v.minPrice, maxPrice: v.maxPrice, inStock: v.inStock, assured: v.assured }); setSheet(false); }}/>

    {(activeFilters.length > 0 || shop) && <div className="mt-4 flex flex-wrap items-center gap-2">
      {shop && <button onClick={() => setParam("shop", "")} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold">Showing one shop <X size={13}/></button>}
      {activeFilters.map((f) => <button key={f.key} onClick={() => remove(f.key)} aria-label={`Remove filter ${f.label}`} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold">{f.label} <X size={13}/></button>)}
      {activeFilters.length > 1 && <button onClick={clearAll} className="text-xs font-semibold text-brand-700 underline">Clear all</button>}
    </div>}

    <div className="mt-6" aria-live="polite">
      {loading ? <ProductGridSkeleton/> : failed ? <ErrorState title="Could not load products" onRetry={() => setRetry((n) => n + 1)}/> : products.length
        ? <><p className="mb-4 text-sm text-slate-500">{pagination?.total ?? products.length} {(pagination?.total ?? products.length) === 1 ? "product" : "products"}</p><ProductGrid products={products}/><Pager pagination={pagination} onPage={(n) => setParam("page", String(n))}/></>
        : <Empty title="No products found" detail={sp.get("search") ? "Check the spelling or try fewer words. You can also browse a category." : "Try removing a filter or browsing a category."} action={<div className="flex flex-wrap justify-center gap-2">{(activeFilters.length > 0 || category) && <button onClick={() => { clearAll(); setParam("category", ""); }} className="btn-primary">Clear filters</button>}{meta.categories.slice(0, 4).map((c) => <button key={c} onClick={() => { clearAll(); setParam("category", c); }} className={chip(false)}>{c}</button>)}</div>}/>}
    </div>
  </Page>;
}

/* --------------------------------------------------------------- Product */
function StarPicker({ value, onChange }) {
  return <div role="radiogroup" aria-label="Your rating" className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className="p-1"><svg width="28" height="28" viewBox="0 0 24 24" className={n <= value ? "fill-amber-500 text-amber-500" : "fill-none text-slate-300"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg></button>)}
    <span className="ml-1 text-sm text-slate-600">{["", "Poor", "Fair", "Good", "Very good", "Excellent"][value]}</span>
  </div>;
}

const REVIEW_PHOTOS = 3;
const REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const REVIEW_PHOTO_MAX = 12 * 1024 * 1024;
const REVIEW_SORTS = [["recent", "Newest"], ["helpful", "Most helpful"], ["high", "Highest rating"], ["low", "Lowest rating"]];

function ReviewSummary({ average, count, breakdown }) {
  if (!count) return null;
  return <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <div><p className="font-display text-4xl font-bold leading-none">{Number(average || 0).toFixed(1)}</p><div className="mt-2"><Stars value={average}/></div><p className="mt-1 text-xs text-slate-500">{count} review{count === 1 ? "" : "s"}</p></div>
    <ul className="min-w-[200px] flex-1 space-y-1">{[5, 4, 3, 2, 1].map((n) => { const c = breakdown?.[n] || 0; return <li key={n} className="flex items-center gap-2 text-xs text-slate-600"><span className="w-3 text-right">{n}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(c / count) * 100}%` }}/></div><span className="w-6 text-right text-slate-400">{c}</span></li>; })}</ul>
  </div>;
}

function Reviews({ productId, token, signedIn, tell, onChanged, ratings }) {
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [kept, setKept] = useState([]); // photos of my existing review that stay
  const [files, setFiles] = useState([]); // new photos: [{ file, url }]
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null); // { images, index }
  const filled = useRef(false);

  // signed-in requests carry the token so each review can say "you found this helpful"
  const fetchPage = useCallback(async (page, sortKey) => {
    const t = signedIn ? await token() : undefined;
    return api(`/api/products/${productId}/reviews?limit=10&page=${page}&sort=${sortKey}`, t ? { token: t } : undefined);
  }, [productId, signedIn, token]);
  const load = useCallback(async () => {
    try { const r = await fetchPage(1, sort); setList(r.data || []); setPagination(r.pagination); setBreakdown(r.breakdown); } catch { /* the section just stays empty */ } finally { setLoading(false); }
  }, [fetchPage, sort]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  const more = async () => {
    try { const r = await fetchPage((pagination?.page || 1) + 1, sort); setList((l) => [...l, ...(r.data || [])]); setPagination(r.pagination); } catch (e) { tell(e.message, "error"); }
  };

  // my own review fills the form once, so posting again edits it (and keeps its photos)
  const mine = list.find((r) => r.isMine);
  useEffect(() => {
    if (mine && !filled.current) { filled.current = true; setRating(mine.rating); setComment(mine.comment || ""); setKept(mine.images || []); }
  }, [mine]);
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (e) => {
    const chosen = [...e.target.files];
    e.target.value = "";
    const room = REVIEW_PHOTOS - kept.length - files.length;
    const ok = [];
    for (const f of chosen) {
      if (!REVIEW_PHOTO_TYPES.includes(f.type)) { tell(`${f.name} must be a JPG, PNG, WEBP or AVIF photo.`, "error"); continue; }
      if (f.size > REVIEW_PHOTO_MAX) { tell(`${f.name} is larger than 12 MB.`, "error"); continue; }
      ok.push({ file: f, url: URL.createObjectURL(f) });
    }
    if (ok.length > room) tell(`You can add up to ${REVIEW_PHOTOS} photos.`, "error");
    setFiles((cur) => [...cur, ...ok.slice(0, Math.max(0, room))]);
  };
  const dropNew = (i) => setFiles((cur) => { URL.revokeObjectURL(cur[i].url); return cur.filter((_, k) => k !== i); });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("rating", String(rating));
      fd.append("comment", comment);
      fd.append("keepImages", JSON.stringify(kept));
      files.forEach((f) => fd.append("images", f.file));
      await api(`/api/products/${productId}/reviews`, { token: await token(), method: "POST", body: fd });
      tell(mine ? "Review updated." : "Thanks for your review.");
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]); filled.current = false;
      await load(); onChanged?.();
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };

  const vote = async (r) => {
    if (!signedIn) { tell("Sign in to mark a review as helpful.", "error"); return; }
    const flip = (v, n) => setList((l) => l.map((x) => (x._id === r._id ? { ...x, iVoted: v, helpfulCount: n } : x)));
    flip(!r.iVoted, Math.max(0, (r.helpfulCount || 0) + (r.iVoted ? -1 : 1))); // instant, then the server's answer wins
    try { const res = await api(`/api/products/${productId}/reviews/${r._id}/helpful`, { token: await token(), method: "POST" }); flip(res.data.iVoted, res.data.helpfulCount); }
    catch (err) { flip(r.iVoted, r.helpfulCount || 0); tell(err.message, "error"); }
  };
  const remove = async (r) => {
    if (!(await confirm({ title: "Delete your review?", message: "This removes your rating and photos.", confirmLabel: "Delete", cancelLabel: "Keep it", tone: "danger" }))) return;
    try { await api(`/api/products/${productId}/reviews/${r._id}`, { token: await token(), method: "DELETE" }); tell("Review deleted."); filled.current = false; setRating(5); setComment(""); setKept([]); await load(); onChanged?.(); }
    catch (err) { tell(err.message, "error"); }
  };

  const slots = REVIEW_PHOTOS - kept.length - files.length;
  return <section className="mt-12 border-t border-slate-200 pt-8">
    <h2 className="font-display text-xl font-bold">Reviews</h2>
    <ReviewSummary average={ratings?.average} count={ratings?.count ?? pagination?.total ?? 0} breakdown={breakdown}/>
    {signedIn && <form onSubmit={submit} className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <span className="label">{mine ? "Your review" : "Your rating"}</span>
      <div className="mt-1"><StarPicker value={rating} onChange={setRating}/></div>
      <textarea aria-label="Your review" className="input mt-3 w-full" rows="3" maxLength={1000} placeholder="Share your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)}/>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {kept.map((u) => <div key={u} className="relative h-16 w-16 overflow-hidden rounded-lg bg-slate-200"><img src={sized(u, "sm")} alt="" className="h-full w-full object-cover"/><button type="button" aria-label="Remove photo" onClick={() => setKept((k) => k.filter((x) => x !== u))} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"><X size={12}/></button></div>)}
        {files.map((f, i) => <div key={f.url} className="relative h-16 w-16 overflow-hidden rounded-lg bg-slate-200"><img src={f.url} alt="" className="h-full w-full object-cover"/><button type="button" aria-label="Remove photo" onClick={() => dropNew(i)} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"><X size={12}/></button></div>)}
        {slots > 0 && <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-slate-500"><Camera size={20}/><span className="sr-only">Add photos</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={pick}/></label>}
        <span className="text-xs text-slate-500">{slots > 0 ? `Add up to ${REVIEW_PHOTOS} photos` : "Photo limit reached"}</span>
      </div>
      <button disabled={busy} className="btn-primary mt-3 w-full sm:w-auto">{busy ? "Saving..." : mine ? "Update review" : "Submit review"}</button>
      <p className="mt-2 text-xs text-slate-500">You can review a product after your order has been delivered.</p>
    </form>}
    {list.length > 1 && <div className="mt-5 flex items-center justify-end gap-2 text-sm"><label htmlFor="rev-sort" className="text-slate-500">Sort by</label><select id="rev-sort" className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value)}>{REVIEW_SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>}
    <div className="mt-3 divide-y divide-slate-200">
      {loading ? <p className="py-2 text-sm text-slate-500">Loading reviews...</p> : list.length ? list.map((r) => <div key={r._id} className="py-4">
        <div className="flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Stars value={r.rating}/><span className="text-sm font-semibold">{r.isMine ? "You" : r.user?.name || "Customer"}</span>{r.verifiedPurchase && <span className="text-xs font-medium text-brand-700">Verified purchase</span>}</div><span className="shrink-0 text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span></div>
        {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>}
        {r.images?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{r.images.map((u, i) => <button key={u} type="button" onClick={() => setViewer({ images: r.images, index: i })} className="h-20 w-20 overflow-hidden rounded-lg bg-slate-200" aria-label={`Open photo ${i + 1} of ${r.images.length}`}><img src={sized(u, "sm")} alt="" loading="lazy" className="h-full w-full object-cover"/></button>)}</div>}
        <div className="mt-3 flex items-center gap-4 text-xs">
          {!r.isMine ? <button type="button" onClick={() => vote(r)} aria-pressed={!!r.iVoted} className={cx("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold", r.iVoted ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600 hover:border-slate-500")}><ThumbsUp size={14}/> Helpful{r.helpfulCount > 0 ? ` (${r.helpfulCount})` : ""}</button>
            : <>{r.helpfulCount > 0 && <span className="text-slate-500">{r.helpfulCount} found this helpful</span>}<button type="button" onClick={() => remove(r)} className="font-semibold text-slate-500 hover:text-red-700">Delete</button></>}
        </div>
      </div>) : <p className="py-2 text-sm text-slate-500">No reviews yet.</p>}
    </div>
    {pagination && pagination.page < pagination.pages && <div className="mt-3 text-center"><button type="button" onClick={more} className="btn-secondary">Show more reviews</button></div>}
    {viewer && <Lightbox images={viewer.images} index={viewer.index} setIndex={(i) => setViewer((v) => ({ ...v, index: i }))} close={() => setViewer(null)} alt="Review photo"/>}
  </section>;
}

/** Full-screen photo viewer: swipe, arrows, Escape. */
function Lightbox({ images, index, setIndex, close, alt }) {
  const touch = useRef(null);
  const go = useCallback((d) => setIndex((index + d + images.length) % images.length), [index, images.length, setIndex]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [go, close]);
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90" role="dialog" aria-modal="true" aria-label="Product photos" onClick={close}
    onTouchStart={(e) => { touch.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (touch.current == null || images.length < 2) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touch.current = null; }}>
    <button onClick={close} aria-label="Close" className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"><X size={22}/></button>
    <img src={images[index]} alt={alt} className="max-h-[88dvh] max-w-full object-contain" onClick={(e) => e.stopPropagation()}/>
    {images.length > 1 && <>
      <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo" className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white sm:grid"><ChevronLeft size={22}/></button>
      <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo" className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white sm:grid"><ChevronRight size={22}/></button>
      <p className="absolute bottom-5 left-0 right-0 text-center text-sm text-white/80">{index + 1} / {images.length}</p>
    </>}
  </div>;
}

export function ProductDetail({ token, signedIn, refreshCartCount, tell }) {
  const brand = useBrand();
  const BUSINESS = useBusiness();
  const { id } = useParams();
  const navigate = useNavigate();
  const meta = useMeta();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("");
  const [wished, setWished] = useState(false);
  const [shot, setShot] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [added, setAdded] = useState(false);
  const [more, setMore] = useState({ shop: [], similar: [] });
  const swipe = useRef(null);
  usePageTitle(p?.name);

  const loadProduct = useCallback(() => { setFailed(false); return api(`/api/products/${id}`).then((r) => setP(r.data)).catch((e) => { setFailed(true); tell(e.message, "error"); }).finally(() => setLoading(false)); }, [id, tell]);
  useEffect(() => { setLoading(true); setShot(0); setQty(1); setSize(""); setAdded(false); loadProduct(); }, [loadProduct]);
  useEffect(() => { if (p?._id === id) recentlyViewed.add(p); }, [p, id]);
  useEffect(() => {
    if (!signedIn) { setWished(false); return; }
    token().then((t) => api("/api/wishlist", { token: t })).then((r) => setWished((r.data || []).some((x) => x._id === id))).catch(() => {});
  }, [signedIn, token, id]);
  // "more from this shop" and "you may also like"
  useEffect(() => {
    if (!p || p._id !== id) return undefined;
    let live = true;
    const clean = (r) => (r.data || []).filter((x) => x._id !== p._id).slice(0, 4);
    const shopId = p.shop?._id;
    Promise.all([
      shopId ? api("/api/products" + qs({ shop: shopId, limit: 5 })).then(clean).catch(() => []) : Promise.resolve([]),
      api("/api/products" + qs({ category: p.category, limit: 6 })).then(clean).catch(() => []),
    ]).then(([fromShop, similar]) => { if (live) setMore({ shop: fromShop, similar: similar.filter((x) => !fromShop.some((s) => s._id === x._id)).slice(0, 4) }); });
    return () => { live = false; };
  }, [p, id]);

  if (loading) return <Page><div className="grid gap-8 md:grid-cols-2"><Skeleton className="aspect-square"/><div><Skeleton className="h-8 w-3/4"/><Skeleton className="mt-4 h-6 w-1/4"/><Skeleton className="mt-6 h-24"/></div></div></Page>;
  if (failed && !p) return <Page narrow><ErrorState title="Could not load this product" onRetry={() => { setLoading(true); loadProduct(); }}/></Page>;
  if (!p) return <Page narrow><Empty title="Product unavailable" detail="This product may have been removed." action={<Link to="/shop" className="btn-secondary">Browse products</Link>}/></Page>;

  const add = async () => {
    if (p.sizes?.length > 0 && !size) { tell("Please choose a size.", "error"); return; }
    const toCart = { label: "View cart", onClick: () => navigate("/cart") };
    try {
      if (!signedIn) {
        guestCart.add({ id: p._id, name: p.name, price: p.price, image: imageOf(p.images), size: size || "", quantity: qty, stock: p.stock });
      } else {
        await api("/api/cart/add", { token: await token(), method: "POST", body: { productId: p._id, quantity: qty, size: size || undefined } });
      }
      await refreshCartCount();
      setAdded(true); window.setTimeout(() => setAdded(false), 2500);
      tell(signedIn ? "Added to cart." : "Added to cart. Sign in at checkout to order.", "success", toCart);
    } catch (e) { tell(e.message, "error"); }
  };
  const toggleWish = async () => {
    if (!signedIn) { tell("Sign in to save items to your wishlist.", "error"); return; }
    try { await api(`/api/wishlist/${p._id}`, { token: await token(), method: wished ? "DELETE" : "POST" }); setWished(!wished); tell(wished ? "Removed from wishlist." : "Saved to wishlist."); } catch (e) { tell(e.message, "error"); }
  };
  const share = async () => {
    const data = { title: p.name, text: `${p.name} for ${money(p.price)} on ${brand.name}`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); tell("Link copied."); }
    } catch { /* the person closed the share sheet */ }
  };
  const imgs = imagesOf(p.images);
  const off = discountOf(p);
  const stepShot = (d) => setShot((shot + d + imgs.length) % imgs.length);

  return <Page className="pb-28 md:pb-10">
    <AdStrip placement="product" title="Sponsored" className="mb-6"/>
    <nav className="mb-4 flex items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
      <Link to="/shop" className="hover:text-slate-900">Products</Link><ChevronRight size={12}/>
      <Link to={`/shop?category=${encodeURIComponent(p.category)}`} className="hover:text-slate-900">{p.category}</Link>
    </nav>
    <div className="grid gap-6 md:grid-cols-2 md:gap-12">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-200/60"
          onTouchStart={(e) => { swipe.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { if (swipe.current == null || imgs.length < 2) return; const dx = e.changedTouches[0].clientX - swipe.current; if (Math.abs(dx) > 50) stepShot(dx < 0 ? 1 : -1); swipe.current = null; }}>
          {imgs[shot]
            ? <button onClick={() => setZoom(true)} aria-label="Enlarge photo" className="block h-full w-full cursor-zoom-in"><img src={imgs[shot]} className="h-full w-full object-cover" alt={p.name}/></button>
            : <div className="grid h-full place-items-center text-slate-400"><Package size={48} strokeWidth={1.25}/></div>}
          {imgs.length > 1 && <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">{shot + 1} / {imgs.length}</span>}
        </div>
        {imgs.length > 1 && <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">{imgs.map((src, i) => <button key={src} onClick={() => setShot(i)} aria-label={`Photo ${i + 1}`} className={cx("h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2", i === shot ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}><img src={sized(src, "sm")} alt="" className="h-full w-full object-cover"/></button>)}</div>}
      </div>

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{p.name}</h1>
          {p.isAssured && <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800"><ShieldCheck size={14}/> Assured: checked and vouched for by us</p>}
          <button onClick={share} aria-label="Share this product" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50"><Share2 size={18}/></button>
        </div>
        {(p.brand || p.unit) && <p className="mt-1 text-sm text-slate-500">{[p.brand, p.unit].filter(Boolean).join(" · ")}</p>}
        {p.ratings?.count > 0 && <div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Stars value={p.ratings.average} size={16}/>{p.ratings.average} <span className="text-slate-400">({p.ratings.count})</span></div>}
        <p className="price mt-4 flex flex-wrap items-baseline gap-x-3 text-3xl font-bold">
          {money(p.price)}
          {p.comparePrice > p.price && <><span className="text-base font-normal text-slate-400 line-through">{money(p.comparePrice)}</span><span className="text-sm font-semibold text-brand-700">{off}% off</span></>}
        </p>
        <p className={cx("mt-2 text-sm font-medium", p.stock > 0 ? (p.stock <= 5 ? "text-amber-700" : "text-brand-700") : "text-red-700")}>{p.stock > 0 ? (p.stock <= 5 ? `Only ${p.stock} left` : "In stock") : "Currently out of stock"}</p>

        <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
          <li className="flex items-center gap-2"><Truck size={16} className="text-brand-700"/>Delivered in {meta.locations.join(" and ")}. Delivery fee is shown on your order slip.</li>
          {meta.cashOnDelivery && <li className="flex items-center gap-2"><ShoppingBag size={16} className="text-brand-700"/>Pay on delivery available</li>}
          <li className="flex items-center gap-2"><RotateCcw size={16} className="text-brand-700"/><span>Damaged or wrong item? Tell us within {BUSINESS.returnWindowHours} hours. <Link to="/legal/refunds" className="font-medium underline">Returns policy</Link></span></li>
        </ul>

        {p.shop?.name && <Link to={`/shop?shop=${p.shop._id}`} className="mt-5 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-400">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><Store size={18}/></span>
          <span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">Sold by</span><span className="block truncate text-sm font-semibold">{p.shop.name}{p.shop.location ? `, ${p.shop.location}` : ""}</span></span>
          <ChevronRight size={16} className="text-slate-400"/>
        </Link>}

        {p.sizes?.length > 0 && <div className="mt-6"><span className="label">Size</span><div className="mt-2 flex flex-wrap gap-2">{p.sizes.map((s) => <button type="button" onClick={() => setSize(s)} aria-pressed={size === s} className={cx("min-w-[44px] rounded-lg border px-3.5 py-2 text-sm font-semibold", size === s ? "border-ink bg-ink text-white" : "border-slate-300 bg-white hover:border-slate-900")} key={s}>{s}</button>)}</div></div>}

        {/* On phones this bar sits above the tab bar so the main action is always within reach */}
        <div className="fixed inset-x-0 bottom-[calc(4rem+var(--safe-bottom))] z-30 flex items-center gap-2 border-t border-slate-200 bg-paper px-4 py-3 md:static md:mt-7 md:border-0 md:bg-transparent md:p-0">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white">
            <button type="button" aria-label="Decrease" className="grid h-11 w-10 place-items-center" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16}/></button>
            <span className="w-7 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
            <button type="button" aria-label="Increase" disabled={qty >= (p.stock || 1)} className="grid h-11 w-10 place-items-center" onClick={() => setQty(Math.min(p.stock || 1, qty + 1))}><Plus size={16}/></button>
          </div>
          <button disabled={!p.stock} onClick={add} className="btn-primary h-11 flex-1">{added ? <><Check size={18}/> Added</> : <><ShoppingBag size={18}/> Add to cart</>}</button>
          <button onClick={toggleWish} aria-label={wished ? "Remove from wishlist" : "Save to wishlist"} aria-pressed={wished} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50"><Heart size={19} className={wished ? "fill-red-600 text-red-600" : "text-slate-600"}/></button>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-sm font-semibold">About this product</h2><p className="mt-2 whitespace-pre-line leading-7 text-slate-700">{p.description}</p></div>
      </div>
    </div>

    {more.shop.length > 0 && <section className="mt-12"><h2 className="mb-5 font-display text-xl font-bold">More from {p.shop?.name}</h2><ProductGrid products={more.shop}/></section>}
    {more.similar.length > 0 && <section className="mt-12"><h2 className="mb-5 font-display text-xl font-bold">You may also like</h2><ProductGrid products={more.similar}/></section>}
    <Reviews productId={p._id} token={token} signedIn={signedIn} tell={tell} onChanged={loadProduct} ratings={p.ratings}/>
    <RecentlyViewed exclude={p._id} className="mt-12 border-t border-slate-200 pt-8"/>
    {zoom && imgs.length > 0 && <Lightbox images={imgs} index={shot} setIndex={setShot} close={() => setZoom(false)} alt={p.name}/>}
  </Page>;
}

/* ------------------------------------------------------------------ Cart */
function FreeDeliveryBar({ subtotal }) {
  const meta = useMeta();
  const need = Number(meta.freeShippingThreshold) || 0;
  if (need <= 0) return null;
  const left = Math.max(0, need - subtotal);
  return <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
    <p className="text-sm">{left > 0 ? <>Add <b className="price">{money(left)}</b> more for free delivery</> : <span className="font-medium text-brand-700">You get free delivery on this order</span>}</p>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, (subtotal / need) * 100)}%` }}/></div>
  </div>;
}

/** The cart for visitors who have not signed in yet. It is kept in this browser and moves into the account after sign-in. */
function GuestCartView() {
  const [items, setItems] = useState(guestCart.items());
  useEffect(() => {
    const sync = () => setItems(guestCart.items());
    window.addEventListener("pj-guest-cart", sync);
    return () => window.removeEventListener("pj-guest-cart", sync);
  }, []);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (!items.length) return <Empty title="Your cart is empty" detail="Add something from the shop to get started." action={<Link to="/shop" className="btn-primary">Browse products</Link>}/>;
  return <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-10">
    <div>
      <FreeDeliveryBar subtotal={total}/>
      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {items.map((it) => <li key={`${it.id}-${it.size}`} className="flex gap-3 py-4 sm:gap-4">
          <Link to={`/product/${it.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200/60 sm:h-24 sm:w-24">{it.image && <img src={sized(it.image, "sm")} className="h-full w-full object-cover" alt=""/>}</Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 text-sm font-medium sm:text-base">{it.name}</h3><p className="mt-0.5 text-xs text-slate-500">{it.size ? `Size ${it.size} · ` : ""}{money(it.price)} each</p></div><p className="price shrink-0 text-sm font-semibold sm:text-base">{money(it.price * it.quantity)}</p></div>
            <div className="mt-auto flex items-center justify-between pt-3">
              <div className="flex items-center gap-2"><button className="qty" aria-label="Decrease" onClick={() => guestCart.setQuantity(it, it.quantity - 1)}><Minus size={15}/></button><span className="w-6 text-center text-sm font-semibold">{it.quantity}</span><button className="qty" aria-label="Increase" disabled={Number(it.stock) > 0 && it.quantity >= it.stock} onClick={() => guestCart.setQuantity(it, it.quantity + 1)}><Plus size={15}/></button></div>
              <button onClick={() => guestCart.remove(it)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-700"><Trash2 size={15}/> Remove</button>
            </div>
          </div>
        </li>)}
      </ul>
    </div>
    <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
      <h2 className="font-semibold">Order summary</h2>
      <div className="mt-4 flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="price font-medium">{money(total)}</span></div>
      <p className="mt-3 text-xs text-slate-500">Sign in to place your order. Your items stay in your cart, and prices are confirmed at checkout.</p>
      <SignInButton mode="modal"><button className="btn-primary mt-5 w-full">Sign in to check out</button></SignInButton>
    </aside>
  </div>;
}

/** One product row in the cart. */
function CartLine({ it, update, remove }) {
  const p = it.product || {};
  const stock = Number(p.stock);
  const gone = p.isActive === false || stock === 0;
  return <li className="flex gap-3 py-4 sm:gap-4">
                      <Link to={p._id ? `/product/${p._id}` : "#"} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200/60 sm:h-24 sm:w-24">{imageOf(p.images) && <img src={sized(imageOf(p.images), "sm")} className="h-full w-full object-cover" alt=""/>}</Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><h3 className="line-clamp-2 text-sm font-medium sm:text-base">{p.name || "Product"}</h3><p className="mt-0.5 text-xs text-slate-500">{it.size ? `Size ${it.size} · ` : ""}{money(it.price)} each</p>
                            {gone ? <p className="mt-1 text-xs font-semibold text-red-700">No longer available. Remove it to continue.</p> : stock > 0 && stock <= 5 && <p className="mt-1 text-xs font-semibold text-amber-700">Only {stock} left</p>}</div>
                          <p className="price shrink-0 text-sm font-semibold sm:text-base">{money(it.price * it.quantity)}</p>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="flex items-center gap-2"><button className="qty" aria-label="Decrease" onClick={() => update(it, it.quantity - 1)}><Minus size={15}/></button><span className="w-6 text-center text-sm font-semibold">{it.quantity}</span><button className="qty" aria-label="Increase" disabled={stock > 0 && it.quantity >= stock} onClick={() => update(it, it.quantity + 1)}><Plus size={15}/></button></div>
                          <button onClick={() => remove(it)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-700"><Trash2 size={15}/> Remove</button>
                        </div>
                      </div>
                    </li>;
}

/** Splits cart items into one group per shop (same order as the server's quote), attaching that shop's price quote. */
const groupCart = (items, quote) => {
  const map = new Map();
  for (const it of items) {
    const shop = it.product?.shop && typeof it.product.shop === "object" ? it.product.shop : null;
    const key = shop?._id || "platform";
    if (!map.has(key)) map.set(key, { key, shop, items: [], quote: quote?.groups?.find((g) => (g.shop?._id || "platform") === key) || null });
    map.get(key).items.push(it);
  }
  const list = [...map.values()];
  list.sort((a, b) => (a.shop?.name ?? "\uffff").localeCompare(b.shop?.name ?? "\uffff"));
  return list;
};

/** Delivery line for a group: exact fee, or "Free". */
const feeText = (n) => (n === 0 ? "Free" : money(n));

export function Cart({ token, signedIn, refreshCartCount, tell }) {
  const BUSINESS = useBusiness();
  usePageTitle("Cart");
  const meta = useMeta();
  const [cart, setCart] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => { if (!signedIn) { setLoading(false); return; } setFailed(false); try { const t = await token(); const [r, q] = await Promise.all([api("/api/cart", { token: t }), api(quotePath({ coupon: getCoupon() }), { token: t }).catch(() => null)]); setCart(r.cart || r.data); setQuote(q?.data || null); } catch (e) { setFailed(true); tell(e.message, "error"); } finally { setLoading(false); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);
  const idOf = (item) => item.product?._id || item.product;
  const update = async (item, quantity) => { try { await api(`/api/cart/item/${idOf(item)}`, { token: await token(), method: "PUT", body: { quantity, size: item.size } }); await load(); await refreshCartCount(); } catch (e) { tell(e.message, "error"); } };
  const undo = async (item) => { try { await api("/api/cart/add", { token: await token(), method: "POST", body: { productId: idOf(item), quantity: item.quantity, size: item.size || undefined } }); await load(); await refreshCartCount(); } catch (e) { tell(e.message, "error"); } };
  const remove = async (item) => {
    try {
      await api(`/api/cart/item/${idOf(item)}` + qs({ size: item.size }), { token: await token(), method: "DELETE" });
      await load(); await refreshCartCount();
      tell(`${item.product?.name || "Item"} removed.`, "success", { label: "Undo", onClick: () => undo(item) });
    } catch (e) { tell(e.message, "error"); }
  };

  const items = cart?.items || [];
  const groups = groupCart(items, quote);
  const blocked = quote && !quote.canCheckout && quote.issues?.length ? quote.issues[0] : null;
  return <Page className="max-w-5xl">
    <Steps current={0}/>
    <PageTitle>Cart</PageTitle>
    {!signedIn ? <GuestCartView/>
      : loading ? <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-24"/>)}</div>
        : failed ? <ErrorState title="Could not load your cart" onRetry={() => { setLoading(true); load(); }}/>
          : !items.length ? <Empty title="Your cart is empty" detail="Add something from the shop to get started." action={<Link to="/shop" className="btn-primary">Browse products</Link>}/>
            : <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-10">
              <div>
                {groups.map((g) => <section key={g.key} className="mb-6">
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-semibold">{g.shop?.name || BUSINESS.name}{g.shop?.location && <span className="ml-2 text-xs font-normal text-slate-500">{g.shop.location}</span>}</h3>
                    {g.shop && g.shop.isOpen === false && <span className="text-xs font-semibold text-red-700">Closed right now</span>}
                  </div>
                  <ul className="divide-y divide-slate-200 border-y border-slate-200">{g.items.map((it, i) => <CartLine key={`${it.product?._id || i}-${it.size}`} it={it} update={update} remove={remove}/>)}</ul>
                </section>)}
              </div>
              <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
                <h2 className="font-semibold">Order summary</h2>
                <CouponBox quote={quote} onChange={load}/>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-600">Subtotal</dt><dd className="price font-medium">{money(quote ? quote.summary.subtotal : cart.totalAmount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-600">Delivery{quote?.delivery?.location ? ` to ${quote.delivery.location}` : ""}</dt><dd className="price font-medium">{quote ? feeText(quote.summary.shippingCost) : <span className="text-slate-500">Added when you order</span>}</dd></div>
                  {quote?.summary.discount > 0 && <div className="flex justify-between text-green-700"><dt>Coupon {quote.coupon?.code}</dt><dd className="price font-medium">−{money(quote.summary.discount)}</dd></div>}
                  {quote?.summary.tax > 0 && <div className="flex justify-between"><dt className="text-slate-600">GST</dt><dd className="price font-medium">{money(quote.summary.tax)}</dd></div>}
                </dl>
                <div className="my-4 border-t border-slate-200"/>
                <div className="flex justify-between font-semibold"><span>{quote ? "Total" : "Total so far"}</span><span className="price">{money(quote ? quote.summary.totalAmount : cart.totalAmount)}</span></div>
                {quote?.delivery?.addForFree != null && <p className="mt-2 text-xs font-medium text-brand-700">Add {money(quote.delivery.addForFree)} more for free delivery</p>}
                {quote && quote.summary.orders > 1 && <p className="mt-2 text-xs text-slate-500">One delivery fee covers items from all {quote.summary.orders} shops.</p>}
                {meta.cashOnDelivery && <p className="mt-3 text-xs text-slate-500">Pay on delivery is available.</p>}
                {blocked && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800"><b>{blocked.name}</b> {blocked.message}. Update your cart to continue.</p>}
                {blocked ? <button disabled className="btn-primary mt-5 w-full">Checkout <ArrowRight size={17}/></button> : <Link to="/checkout" className="btn-primary mt-5 w-full">Checkout <ArrowRight size={17}/></Link>}
              </aside>
            </div>}
  </Page>;
}

/* -------------------------------------------------------------- Checkout */
const blankAddress = { fullName: "", phone: "", street: "", city: "", state: "", zipCode: "", country: "India", location: "", landmark: "", latitude: "", longitude: "" };
const ADDRESS_FIELDS = ["fullName", "phone", "street", "city", "state", "zipCode", "country", "location", "landmark"];

/** "+91 98765 43210", "098765 43210" and "9876543210" all become 9876543210. */
export const normalizePhone = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
};

export function validateAddress(f) {
  const e = {};
  if (!f.fullName.trim()) e.fullName = "Enter the name of the person receiving the order";
  if (!/^[6-9]\d{9}$/.test(normalizePhone(f.phone))) e.phone = "Enter a 10-digit mobile number";
  if (f.street.trim().length < 5) e.street = "Enter the full street address";
  if (!f.location) e.location = "Choose your delivery area";
  if (!f.city.trim()) e.city = "Enter the city or town";
  if (!f.state.trim()) e.state = "Enter the state";
  if (!/^\d{6}$/.test(f.zipCode.trim())) e.zipCode = "Enter a 6-digit PIN code";
  if (!f.country.trim()) e.country = "Enter the country";
  return e;
}

/** Optional map pin: the phone's own location, so the delivery partner can open the exact spot in Maps. */
function PinField({ form, setForm }) {
  const [state, setState] = useState("");
  const locate = () => {
    if (!navigator.geolocation) { setState("This phone can't share its location."); return; }
    setState("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm({ ...form, latitude: Number(pos.coords.latitude.toFixed(6)), longitude: Number(pos.coords.longitude.toFixed(6)) }); setState(""); },
      (err) => setState(err.code === 1 ? "Location permission is off. You can still order without a pin." : "Could not get your location. You can still order without a pin."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };
  return <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-sm">
    <p className="font-medium">Map pin <span className="font-normal text-slate-500">(optional, helps the delivery partner find you)</span></p>
    {hasPin(form)
      ? <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-green-700">Pin saved</span><a className="underline" href={mapsLink(form)} target="_blank" rel="noreferrer">Check in Maps</a><button type="button" className="underline" onClick={() => setForm({ ...form, latitude: "", longitude: "" })}>Remove pin</button></p>
      : <button type="button" onClick={locate} className="btn-secondary mt-2 px-3 py-1.5 text-xs"><MapPin size={14}/> Use my current location</button>}
    {state && <p className="mt-1 text-xs text-slate-600" role="status">{state}</p>}
  </div>;
}

export function AddressFields({ form, setForm, locations, errors = {} }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const bad = (k) => ({ "aria-invalid": errors[k] ? "true" : undefined, "aria-describedby": errors[k] ? `err-${k}` : undefined });
  const Err = ({ k }) => (errors[k] ? <p id={`err-${k}`} className="mt-1 text-xs font-medium text-red-700">{errors[k]}</p> : null);
  const cls = (k) => cx("input mt-1 w-full", errors[k] && "border-red-500");
  return <div className="grid gap-4 sm:grid-cols-2">
    <div><label className="label" htmlFor="a-name">Recipient name</label><input id="a-name" className={cls("fullName")} autoComplete="name" value={form.fullName} onChange={set("fullName")} {...bad("fullName")}/><Err k="fullName"/></div>
    <div><label className="label" htmlFor="a-phone">Mobile number</label><input id="a-phone" className={cls("phone")} inputMode="tel" autoComplete="tel" placeholder="10-digit number" value={form.phone} onChange={set("phone")} {...bad("phone")}/><Err k="phone"/></div>
    <div className="sm:col-span-2"><label className="label" htmlFor="a-street">Street address</label><input id="a-street" className={cls("street")} autoComplete="street-address" value={form.street} onChange={set("street")} {...bad("street")}/><Err k="street"/></div>
    <div><label className="label" htmlFor="a-area">Delivery area</label><select id="a-area" className={cls("location")} value={form.location} onChange={set("location")} {...bad("location")}><option value="">Select area</option>{locations.map((l) => <option key={l}>{l}</option>)}</select><Err k="location"/></div>
    <div><label className="label" htmlFor="a-landmark">Landmark (optional)</label><input id="a-landmark" className="input mt-1 w-full" value={form.landmark} onChange={set("landmark")}/></div>
    <div><label className="label" htmlFor="a-city">City or town</label><input id="a-city" className={cls("city")} value={form.city} onChange={set("city")} {...bad("city")}/><Err k="city"/></div>
    <div><label className="label" htmlFor="a-state">State</label><input id="a-state" className={cls("state")} value={form.state} onChange={set("state")} {...bad("state")}/><Err k="state"/></div>
    <div><label className="label" htmlFor="a-pin">PIN code</label><input id="a-pin" className={cls("zipCode")} inputMode="numeric" autoComplete="postal-code" maxLength={6} value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value.replace(/\D/g, "") })} {...bad("zipCode")}/><Err k="zipCode"/></div>
    <div><label className="label" htmlFor="a-country">Country</label><input id="a-country" className={cls("country")} value={form.country} onChange={set("country")} {...bad("country")}/><Err k="country"/></div>
    <PinField form={form} setForm={setForm}/>
  </div>;
}

const focusFirstError = () => window.setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 30);
const choice = (on) => cx("flex cursor-pointer gap-3 rounded-lg border p-4 transition", on ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-300 bg-white hover:border-slate-500");

export function Checkout({ token, signedIn, user, refreshCartCount, tell }) {
  const attemptKey = useRef(null); // one key per checkout attempt, so a retry or double tap can't place the order twice
  const BUSINESS = useBusiness();
  usePageTitle("Checkout");
  const meta = useMeta();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [addressId, setAddressId] = useState(""); // "" = enter a new address
  const [form, setForm] = useState(blankAddress);
  const [errors, setErrors] = useState({});
  const [saveAddress, setSaveAddress] = useState(true);
  const [payment, setPayment] = useState("cod");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(null); // exact per-shop prices from the server

  const load = useCallback(async () => {
    if (!signedIn) { setLoading(false); return; }
    setFailed(false);
    try {
      const t = await token();
      const [c, a, q] = await Promise.all([api("/api/cart", { token: t }), api("/api/address", { token: t }), api(quotePath({ coupon: getCoupon() }), { token: t }).catch(() => null)]);
      setCart(c.cart || c.data);
      setQuote(q?.data || null);
      const list = Array.isArray(a.data) ? a.data : [];
      setAddresses(list);
      setAddressId((list.find((x) => x.isDefault) || list[0])?._id || "");
    } catch (e) { setFailed(true); tell(e.message, "error"); } finally { setLoading(false); }
  }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);
  // the delivery fee depends on the chosen address's area, so ask the server again when it changes
  const quoted = useRef("");
  useEffect(() => {
    if (!signedIn || loading) return;
    if (quoted.current === "") { quoted.current = addressId || "-"; return; } // the first quote came with the page
    if (quoted.current === (addressId || "-")) return;
    quoted.current = addressId || "-";
    (async () => { try { const q = await api(quotePath({ addressId, coupon: getCoupon() }), { token: await token() }); setQuote(q?.data || null); } catch { /* keep the last quote; the server re-checks when the order is placed */ } })();
  }, [addressId, signedIn, loading, token]);

  const reloadQuote = async () => { try { const q = await api(quotePath({ addressId, coupon: getCoupon() }), { token: await token() }); setQuote(q?.data || null); } catch { /* the server re-checks when the order is placed */ } };

  // fill in what the account already knows
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, fullName: f.fullName || user.fullName || "", phone: f.phone || normalizePhone(user.primaryPhoneNumber?.phoneNumber) }));
  }, [user]);

  // only offer payment options the server says are enabled
  const codOk = meta.cashOnDelivery && quote?.cod?.allowed !== false; // false when this order is over the cash limit
  useEffect(() => {
    if (payment === "online" && !meta.onlinePayments && codOk) setPayment("cod");
    if (payment === "cod" && !codOk && meta.onlinePayments) setPayment("online");
  }, [meta.onlinePayments, codOk, payment]);

  const submit = async (e) => {
    e.preventDefault();
    if (!addressId) {
      const found = validateAddress(form);
      setErrors(found);
      if (Object.keys(found).length) { tell("Please fix the highlighted fields.", "error"); focusFirstError(); return; }
    }
    setBusy(true);
    try {
      const t = await token();
      if (!attemptKey.current) attemptKey.current = newAttemptKey();
      const body = { paymentMethod: payment, notes: notes || undefined, idempotencyKey: attemptKey.current, couponCode: quote?.coupon?.code || undefined };
      if (addressId) {
        body.addressId = addressId;
      } else {
        const address = { ...Object.fromEntries(ADDRESS_FIELDS.map((k) => [k, form[k]])), ...(hasPin(form) ? pinFields(form) : {}), phone: normalizePhone(form.phone) };
        if (saveAddress) {
          const saved = await api("/api/address", { token: t, method: "POST", body: { ...address, isDefault: !addresses.length } });
          body.addressId = saved.data._id;
        } else {
          body.shippingAddress = address;
        }
      }

      const placed = await api("/api/orders", { token: t, method: "POST", body });
      attemptKey.current = null; // placed: the next checkout is a new attempt
      setCoupon(""); // a coupon is used up with the order
      await refreshCartCount();

      let paid = false;
      if (placed.payment) {
        try {
          await payForCheckout(placed.payment, token);
          paid = true;
        } catch (err) {
          tell(paymentErrorMessage(err), "error");
          navigate("/orders");
          return;
        }
      }
      navigate("/order-success", { state: { orders: placed.data || [], summary: placed.summary || null, method: payment, paid } });
    } catch (err) {
      tell(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;
  if (loading) return <Page className="max-w-5xl"><Skeleton className="h-64"/></Page>;
  if (failed) return <Page narrow><ErrorState title="Could not load checkout" onRetry={() => { setLoading(true); load(); }}/></Page>;
  const items = cart?.items || [];
  if (!items.length) return <Page narrow><Empty title="Your cart is empty" detail="Add items before checking out." action={<Link to="/shop" className="btn-primary">Browse products</Link>}/></Page>;
  const noPayment = !meta.onlinePayments && !codOk;
  const unavailable = quote ? !quote.canCheckout : items.some((it) => it.product?.isActive === false || Number(it.product?.stock) === 0);
  const total = quote ? quote.summary.totalAmount : Number(cart.totalAmount);
  const gst = !!(quote?.gstRegistered ?? meta.gstRegistered ?? BUSINESS.gstRegistered);

  return <Page className="max-w-5xl">
    <Steps current={1}/>
    <PageTitle sub="Choose where to deliver and how to pay.">Checkout</PageTitle>
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-10">
      <div className="space-y-8">
        <section>
          <h2 className="font-semibold">1. Delivery address</h2>
          <div className="mt-3 space-y-2">
            {addresses.map((a) => <label key={a._id} className={choice(addressId === a._id)}>
              <input type="radio" name="addr" checked={addressId === a._id} onChange={() => setAddressId(a._id)} className="mt-1"/>
              <div className="min-w-0 text-sm"><p className="font-semibold">{a.fullName || "Recipient"} {a.phone && <span className="font-normal text-slate-500">· {a.phone}</span>} {a.isDefault && <Pill tone="blue">default</Pill>}</p><p className="mt-0.5 text-slate-600">{a.street}, {a.city}, {a.state} {a.zipCode}</p>{a.location && <p className="text-xs text-slate-500">{a.location}{a.landmark ? ` · near ${a.landmark}` : ""}</p>}</div>
            </label>)}
            <label className={choice(addressId === "")}><input type="radio" name="addr" checked={addressId === ""} onChange={() => setAddressId("")} className="mt-1"/><span className="text-sm font-semibold">Use a new address</span></label>
          </div>
          {addressId === "" && <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><AddressFields form={form} setForm={setForm} locations={meta.locations} errors={errors}/><label className="mt-4 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)}/> Save this address to my account</label></div>}
        </section>

        <section>
          <h2 className="font-semibold">2. Payment</h2>
          <div className="mt-3 space-y-2">
            {codOk && <label className={choice(payment === "cod")}><input type="radio" name="pay" checked={payment === "cod"} onChange={() => setPayment("cod")} className="mt-1"/><div className="text-sm"><p className="font-semibold">Pay on delivery</p><p className="text-slate-600">Pay <b>{money(total)}</b> in cash to the delivery partner when your order arrives. Please keep the exact amount ready.</p></div></label>}
            {meta.cashOnDelivery && !codOk && <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500"><p className="font-semibold text-slate-700">Pay on delivery isn't available for this order</p><p>{quote?.cod?.reason || "Cash on delivery is not available right now."}</p></div>}
            {meta.onlinePayments && <label className={choice(payment === "online")}><input type="radio" name="pay" checked={payment === "online"} onChange={() => setPayment("online")} className="mt-1"/><div className="text-sm"><p className="font-semibold">Pay online</p><p className="text-slate-600">UPI, cards, net banking and wallets, secured by Razorpay.</p></div></label>}
            {noPayment && <p className="text-sm font-semibold text-red-700">No payment method is available right now. Please try again later.</p>}
          </div>
          <div className="mt-4"><label className="label" htmlFor="notes">Order notes (optional)</label><textarea id="notes" className="input mt-1 w-full" rows="2" placeholder="For example: call before arriving" value={notes} onChange={(e) => setNotes(e.target.value)}/></div>
        </section>
      </div>

      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">Order summary</h2>
        {quote ? <div className="mt-4 space-y-4">{quote.groups.map((g) => <div key={g.shop?._id || "platform"}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.shop?.name || BUSINESS.name}</p>
          <ul className="mt-1.5 space-y-1.5">{g.items.map((it, i) => <li key={i} className="flex justify-between gap-3 text-sm"><span className="text-slate-600">{it.name} <span className="text-slate-400">× {it.quantity}</span></span><span className="price shrink-0 font-medium">{money(it.price * it.quantity)}</span></li>)}</ul>
        </div>)}</div>
        : <ul className="mt-4 space-y-2.5">{items.map((it, i) => <li key={i} className="flex justify-between gap-3 text-sm"><span className="text-slate-600">{it.product?.name || "Product"} <span className="text-slate-400">× {it.quantity}</span></span><span className="price shrink-0 font-medium">{money(it.price * it.quantity)}</span></li>)}</ul>}
        <div className="my-4 border-t border-slate-200"/>
        <CouponBox quote={quote} onChange={reloadQuote}/>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-600">Subtotal</dt><dd className="price font-medium">{money(quote ? quote.summary.subtotal : cart.totalAmount)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-600">Delivery{quote?.delivery?.location ? ` to ${quote.delivery.location}` : ""}</dt><dd className="price font-medium">{quote ? feeText(quote.summary.shippingCost) : <span className="text-slate-500">Added on your order slip</span>}</dd></div>
          {quote?.summary.discount > 0 && <div className="flex justify-between text-green-700"><dt>Coupon {quote.coupon?.code}</dt><dd className="price font-medium">−{money(quote.summary.discount)}</dd></div>}
          {quote?.summary.tax > 0 && <div className="flex justify-between"><dt className="text-slate-600">GST</dt><dd className="price font-medium">{money(quote.summary.tax)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><dt>{payment === "cod" ? "Pay in cash" : "Total"}</dt><dd className="price">{money(total)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-600">Pay by</dt><dd className="font-medium">{payment === "cod" ? "Cash on delivery" : "Online"}</dd></div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-slate-500">{quote?.delivery?.addForFree != null && <b className="block text-brand-700">Add {money(quote.delivery.addForFree)} more for free delivery. </b>}Items from different shops arrive as separate orders, with one delivery fee for all. {gst ? "" : "No GST is added; prices are final."}</p>
        {unavailable && <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800">{quote?.issues?.length ? <ul className="space-y-1">{quote.issues.map((x, i) => <li key={i}><b>{x.name}</b> {x.message}.</li>)}</ul> : "An item in your cart is no longer available."} <Link to="/cart" className="underline">Update your cart</Link></div>}
        <button disabled={busy || noPayment || unavailable} className="btn-primary mt-5 w-full">{busy ? "Please wait..." : payment === "online" ? "Place order and pay" : "Place order"}</button>
        <p className="mt-3 text-center text-xs text-slate-500">By placing your order you agree to our <Link to="/legal/terms" className="underline">terms</Link> and <Link to="/legal/refunds" className="underline">returns policy</Link>.</p>
      </aside>
    </form>
  </Page>;
}

/* ------------------------------------------------------------ Coupon box */
/** Enter / remove a coupon code. The server prices it; this only remembers the code and asks for a new quote. */
function CouponBox({ quote, onChange }) {
  const [code, setCode] = useState(getCoupon());
  const applied = quote?.coupon;
  const apply = (e) => { e.preventDefault(); setCoupon(code); onChange(); };
  const remove = () => { setCoupon(""); setCode(""); onChange(); };
  if (applied) return <p className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-green-50 p-2.5 text-sm text-green-800"><span>Coupon <b>{applied.code}</b> applied{applied.description ? ` · ${applied.description}` : ""}</span><button type="button" onClick={remove} className="text-xs font-semibold underline">Remove</button></p>;
  return <form onSubmit={apply} className="mt-3">
    <div className="flex gap-2"><input className="input min-w-0 flex-1 uppercase" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="Coupon code" aria-label="Coupon code"/><button className="btn-secondary px-3 py-2 text-sm" disabled={!code.trim()}>Apply</button></div>
    {quote?.couponError && <p className="mt-1.5 text-xs text-red-700" role="alert">{quote.couponError}</p>}
  </form>;
}

/* ------------------------------------------------------------ Order slip */
/** Printable slip. Kept off-screen and revealed only when printing. Never says "tax invoice" unless a GSTIN is set in config. */
function Slip({ orders, method }) {
  const BUSINESS = useBusiness();
  const meta = useMeta();
  const gst = !!(meta.gstRegistered ?? BUSINESS.gstRegistered);
  const gstin = meta.gstin || BUSINESS.gstin;
  const date = (d) => new Date(d || Date.now()).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  return <div id="slip" className="slip-offscreen p-6 text-sm text-black">
    <div className="flex items-start justify-between border-b border-black pb-3"><div><p className="text-lg font-bold">{BUSINESS.name}</p><p className="text-xs">{BUSINESS.domain}</p>{gst && gstin && <p className="text-xs">GSTIN: {gstin}</p>}</div><p className="text-right text-xs font-bold uppercase">{orders.some((o) => o.invoiceNumber) ? "Invoice" : gst ? "Order slip" : "Order slip (not a tax invoice)"}</p></div>
    {orders.map((o) => {
      const a = o.shippingAddress || {};
      const sub = o.subtotal ?? (o.items || []).reduce((s, it) => s + it.price * it.quantity, 0);
      return <section key={o._id || o.orderNumber} className="mt-4 break-inside-avoid border-b border-dashed border-black pb-4">
        {o.invoiceNumber && <div className="flex justify-between"><b>Invoice No. {o.invoiceNumber}</b><span>{date(o.invoiceDate || o.deliveredAt)}</span></div>}
        <div className="flex justify-between"><b>Order {o.orderNumber}</b><span>{date(o.createdAt)}</span></div>
        {shopName(o) && <p>Sold by: {shopName(o)}{o.shop?.addressLine ? `, ${o.shop.addressLine}` : ""}</p>}
        {(a.fullName || a.street) && <p>Deliver to: {[a.fullName, a.phone, a.street, a.location, a.city, a.state, a.zipCode].filter(Boolean).join(", ")}</p>}
        <table className="keep-table mt-2 w-full text-left"><thead><tr><th className="py-1">Item</th><th>Qty</th><th className="text-right">Amount</th></tr></thead><tbody>{(o.items || []).map((it, i) => <tr key={i}><td className="py-0.5">{it.name || it.product?.name}{it.size ? ` (${it.size})` : ""}</td><td>{it.quantity}</td><td className="text-right">{money(it.price * it.quantity)}</td></tr>)}</tbody></table>
        <div className="mt-2 ml-auto w-56 space-y-0.5"><p className="flex justify-between"><span>Subtotal</span><span>{money(sub)}</span></p><p className="flex justify-between"><span>Delivery</span><span>{money(o.shippingCost || 0)}</span></p>{o.tax > 0 && <p className="flex justify-between"><span>Tax</span><span>{money(o.tax)}</span></p>}<p className="flex justify-between border-t border-black pt-1 font-bold"><span>Total</span><span>{money(o.totalAmount)}</span></p></div>
        <p className="mt-2 text-xs">{(o.paymentMethod || method) === "cod" ? `Pay ${money(o.totalAmount)} in cash on delivery.` : `Payment: ${o.paymentStatus || "pending"}`}</p>
      </section>;
    })}
    {orders.some((o) => o.invoiceNumber) && !gst && <p className="mt-3 text-xs">GST is not charged on this invoice (seller not registered under GST).</p>}
    <p className="mt-4 text-xs">Questions? {BUSINESS.phone || "Use the Help page"}{BUSINESS.email ? ` · ${BUSINESS.email}` : ""} · {BUSINESS.domain}/legal/contact</p>
  </div>;
}

export function OrderSuccess() {
  usePageTitle("Order placed");
  const { state } = useLocation();
  const meta = useMeta();
  if (!state?.orders?.length) return <Navigate to="/orders" replace/>;
  const { orders, summary, method, paid } = state;
  const total = summary?.totalAmount ?? orders.reduce((s, o) => s + o.totalAmount, 0);
  const cod = method === "cod";
  return <Page narrow>
    <Steps current={2}/>
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white"><Check size={26}/></span>
      <h1 className="mt-4 font-display text-2xl font-bold">{cod ? "Order placed" : paid ? "Payment received. Order confirmed" : "Order placed"}</h1>
      <p className="mt-1 text-sm text-slate-600">{orders.length > 1 ? `Your items are split into ${orders.length} orders, one for each shop.` : "The shop has been told about your order."}</p>
      <ul className="mt-5 space-y-1 text-sm">{orders.map((o) => <li key={o._id || o.orderNumber}><span className="text-slate-500">Order number </span><b>{o.orderNumber}</b>{shopName(o) ? <span className="text-slate-500"> · {shopName(o)}</span> : null}</li>)}</ul>
      <div className="mx-auto mt-5 max-w-xs rounded-lg bg-slate-100 p-4">
        <p className="text-xs text-slate-500">{cod ? "Cash to pay on delivery" : "Total"}</p>
        <p className="price mt-0.5 text-2xl font-bold">{money(total)}</p>
        {cod && <p className="mt-1 text-xs text-slate-600">Includes the delivery fee. Please keep this amount ready.</p>}
      </div>
    </div>

    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">What happens next</h2>
      <ol className="mt-3 space-y-3 text-sm">
        {[["The shop accepts and packs your order.", Store], ["A delivery partner picks it up and brings it to you.", Truck], [cod ? "You pay the delivery partner in cash." : "Your delivery arrives. Check it before you accept.", ShoppingBag]].map(([t, Icon], i) => <li key={i} className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon size={15}/></span><span className="pt-0.5">{t}</span></li>)}
      </ol>
      <p className="mt-4 text-xs text-slate-500">We deliver in {meta.locations.join(" and ")}. You will see each step on the Orders page.</p>
    </section>

    <div className="no-print mt-6 flex flex-col gap-2 sm:flex-row">
      <Link to="/orders" className="btn-primary flex-1">Track my order</Link>
      <Link to="/shop" className="btn-secondary flex-1">Continue shopping</Link>
      <button onClick={() => window.print()} className="btn-secondary flex-1"><Printer size={16}/> Print order slip</button>
    </div>
    <Slip orders={orders} method={method}/>
  </Page>;
}

/* ---------------------------------------------------------------- Orders */
const FLOW = ["placed", "processing", "shipping", "delivered"];

function OrderTrack({ status }) {
  const meta = useMeta();
  if (status === "cancelled") return <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">This order was cancelled.</p>;
  const at = Math.max(0, FLOW.indexOf(status));
  return <ol className="mt-4 flex items-start" aria-label="Order progress">
    {FLOW.map((s, i) => <li key={s} className="relative flex-1 text-center" aria-current={i === at ? "step" : undefined}>
      {i > 0 && <span className={cx("absolute right-1/2 top-3 h-0.5 w-full", i <= at ? "bg-brand-600" : "bg-slate-200")} aria-hidden="true"/>}
      <span className={cx("relative mx-auto grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold", i < at ? "bg-brand-600 text-white" : i === at ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-slate-200 text-slate-500")}>{i < at ? <Check size={13}/> : i + 1}</span>
      <span className={cx("mt-1.5 block text-[11px] leading-tight sm:text-xs", i <= at ? "font-semibold text-slate-900" : "text-slate-500")}>{statusLabel(meta, s)}</span>
    </li>)}
  </ol>;
}

function Tracking({ orderId, token, shop }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { token().then((t) => api(`/api/orders/${orderId}/tracking`, { token: t })).then((r) => setData(r.data)).catch((e) => setError(e.message)); }, [orderId, token]);
  if (error) return <p className="mt-3 text-xs text-red-700">{error}</p>;
  if (!data) return <p className="mt-3 text-xs text-slate-500">Loading tracking...</p>;
  const d = data.delivery;
  return <div className="mt-4 rounded-lg bg-slate-100 p-4 text-sm">
    {!d ? <p className="text-xs text-slate-600">A delivery partner has not been assigned yet.</p> : <>
      <p className="font-semibold capitalize">Delivery: {prettify(d.status)}</p>
      {d.driver && <p className="mt-1 break-words text-slate-600">{d.driver.fullName}{d.driver.vehicleNumber ? ` · ${d.driver.vehicleNumber}` : ""}</p>}
      <ol className="mt-3 space-y-2 border-l-2 border-slate-300 pl-3">{(d.timeline || []).map((t, i) => <li key={i} className="text-xs text-slate-600"><span className="font-semibold capitalize text-slate-900">{prettify(t.status)}</span> · {new Date(t.at).toLocaleString()}</li>)}</ol></>}
    <div className="mt-3 flex flex-wrap gap-2">
      {d?.driver?.phone && <a href={`tel:${d.driver.phone}`} className="btn-secondary px-3 py-1.5 text-xs"><Phone size={14}/> Call delivery partner</a>}
      {shop?.phone && <a href={`tel:${shop.phone}`} className="btn-secondary px-3 py-1.5 text-xs"><Phone size={14}/> Call shop</a>}
    </div>
  </div>;
}

const TABS = [["all", "All"], ["active", "Active"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]];
const inTab = (o, tab) => tab === "all" || (tab === "active" ? !["delivered", "cancelled"].includes(o.orderStatus) : o.orderStatus === tab);

export function Orders({ token, signedIn, refreshCartCount, tell }) {
  usePageTitle("Orders");
  const meta = useMeta();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [tab, setTab] = useState("all");
  const [printing, setPrinting] = useState(null);
  const load = useCallback(async () => { if (!signedIn) { setLoading(false); return; } setFailed(false); try { const r = await api("/api/orders", { token: await token() }); setOrders(r.data || []); } catch (e) { setFailed(true); tell(e.message, "error"); } finally { setLoading(false); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!printing) return undefined;
    const t = setTimeout(() => { window.print(); setPrinting(null); }, 60);
    return () => clearTimeout(t);
  }, [printing]);

  const [cancelling, setCancelling] = useState(null); // the order being cancelled (asks for a reason first)
  const doCancel = async ({ reason, note }) => {
    const o = cancelling;
    setBusyId(o._id);
    try { await api(`/api/orders/${o._id}/cancel`, { token: await token(), method: "PUT", body: { reason, note } }); tell("Order cancelled."); setCancelling(null); await load(); } catch (e) { tell(e.message, "error"); } finally { setBusyId(""); }
  };
  const invoice = async (o) => {
    setBusyId(o._id);
    try { const r = await api(`/api/orders/${o._id}/invoice`, { token: await token(), method: "POST" }); setPrinting(r.data); load(); } // the server gives it its number the first time
    catch (e) { tell(e.message, "error"); } finally { setBusyId(""); }
  };
  const payNow = async (o) => {
    setBusyId(o._id);
    try {
      const r = await api("/api/payments/create", { token: await token(), method: "POST", body: { checkoutId: o.checkoutId } });
      await payForCheckout(r.payment, token);
      tell("Payment successful. Your order is confirmed.");
    } catch (e) { tell(paymentErrorMessage(e), "error"); } finally { setBusyId(""); await load(); }
  };
  const reorder = async (o) => {
    setBusyId(o._id);
    let ok = 0;
    try {
      const t = await token();
      for (const it of o.items || []) {
        const productId = it.product?._id || it.product;
        if (!productId) continue;
        try { await api("/api/cart/add", { token: t, method: "POST", body: { productId, quantity: it.quantity, size: it.size || undefined } }); ok += 1; } catch { /* sold out or removed */ }
      }
      await refreshCartCount();
      if (!ok) tell("These items are not available right now.", "error");
      else { tell(ok === (o.items || []).length ? "Items added to your cart." : "Some items were no longer available. The rest are in your cart."); navigate("/cart"); }
    } finally { setBusyId(""); }
  };

  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;
  const shown = orders.filter((o) => inTab(o, tab));
  return <Page narrow>
    <PageTitle>Orders</PageTitle>
    {!loading && !failed && orders.length > 0 && <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter orders">
      {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={chip(tab === k)}>{label} <span className={tab === k ? "text-white/70" : "text-slate-400"}>{orders.filter((o) => inTab(o, k)).length}</span></button>)}
    </div>}
    <div className="space-y-4">{loading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-44"/>) : failed ? <ErrorState title="Could not load your orders" onRetry={() => { setLoading(true); load(); }}/> : shown.length ? shown.map((o) => {
      const awaitingPayment = o.paymentMethod === "razorpay" && o.paymentStatus === "pending" && o.orderStatus !== "cancelled";
      const canCancel = o.orderStatus === "placed" && o.paymentStatus !== "paid";
      return <article key={o._id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{o.orderNumber || o._id}</p><p className="mt-0.5 text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString()}{shopName(o) ? ` · ${shopName(o)}` : ""}</p></div>
          <div className="flex flex-wrap gap-1.5"><Pill tone={payTone(o.paymentStatus)}>{o.paymentMethod === "cod" ? "COD · " : ""}{o.paymentStatus}</Pill><Pill tone={orderTone(o.orderStatus)}>{statusLabel(meta, o.orderStatus)}</Pill></div>
        </div>
        <OrderTrack status={o.orderStatus}/>
        {o.orderStatus === "cancelled" && (o.cancelledBy || o.cancelReason) && <p className="mt-2 text-xs text-slate-600">Cancelled by {o.cancelledBy === "customer" ? "you" : o.cancelledBy === "shop" ? (shopName(o) || "the shop") : "our team"}{cancelLabel(meta, o) ? <>: <b>{cancelLabel(meta, o)}</b></> : ""}{o.cancelNote ? ` (${o.cancelNote})` : ""}.</p>}
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">{(o.items || []).map((it, i) => <li key={i} className="flex items-center gap-3 text-sm">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-200/60">{(it.image || imageOf(it.product?.images)) && <img src={sized(it.image || imageOf(it.product?.images), "sm")} loading="lazy" className="h-full w-full object-cover" alt=""/>}</div>
          <span className="min-w-0 flex-1 text-slate-700">{it.name || it.product?.name}{it.size ? ` (${it.size})` : ""} <span className="text-slate-400">× {it.quantity}</span></span>
          <span className="price shrink-0 font-medium">{money(it.price * it.quantity)}</span>
        </li>)}</ul>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">{o.shippingCost ? `Includes ${money(o.shippingCost)} delivery` : "Total"}</span><strong className="price text-base">{money(o.totalAmount)}</strong></div>
        {o.paymentMethod === "cod" && !["delivered", "cancelled"].includes(o.orderStatus) && <p className="mt-3 rounded-lg bg-slate-100 p-3 text-xs text-slate-700">Keep <b>{money(o.totalAmount)}</b> in cash ready for the delivery partner.</p>}
        {o.deliveryCode && <p className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-slate-800" data-testid="delivery-code">Delivery code <b className="mx-1 rounded bg-white px-2 py-0.5 font-mono text-lg tracking-widest">{o.deliveryCode}</b> Tell it to the delivery partner when your order arrives. Please do not share it before.</p>}
        {awaitingPayment && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Payment pending. Unpaid online orders are cancelled automatically after a short time.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {awaitingPayment && <button disabled={busyId === o._id} onClick={() => payNow(o)} className="btn-primary px-4 py-2">Pay now</button>}
          {canCancel && <button disabled={busyId === o._id} onClick={() => setCancelling(o)} className="btn-secondary px-4 py-2">Cancel order</button>}
          {o.orderStatus !== "cancelled" && <button onClick={() => setTracking(tracking === o._id ? null : o._id)} className="btn-secondary px-4 py-2">{tracking === o._id ? "Hide details" : "Delivery details"}</button>}
          <button disabled={busyId === o._id} onClick={() => reorder(o)} className="btn-secondary px-4 py-2"><RotateCcw size={15}/> Order again</button>
          {o.orderStatus === "delivered"
            ? <button disabled={busyId === o._id} onClick={() => invoice(o)} className="btn-secondary px-4 py-2"><Printer size={15}/> Invoice</button>
            : <button onClick={() => setPrinting(o)} className="btn-secondary px-4 py-2"><Printer size={15}/> Order slip</button>}
        </div>
        {tracking === o._id && <Tracking orderId={o._id} token={token} shop={o.shop && typeof o.shop === "object" ? o.shop : null}/>}
      </article>;
    }) : <Empty title={orders.length ? "No orders here" : "No orders yet"} detail={orders.length ? "Try another tab." : "Your orders will appear here after checkout."} action={!orders.length && <Link to="/shop" className="btn-primary">Browse products</Link>}/>}</div>
    {printing && <Slip orders={[printing]} method={printing.paymentMethod}/>}
    {cancelling && <ReasonSheet message={`${cancelling.orderNumber || "This order"} will be cancelled. You can order again any time.`} reasons={meta.cancelReasons?.customer || []} onConfirm={doCancel} onClose={() => setCancelling(null)}/>}
  </Page>;
}

/* --------------------------------------------------------------- Account */
export function Account({ token, signedIn, user, role, tell }) {
  usePageTitle("Account");
  const meta = useMeta();
  const confirm = useConfirm();
  const { openUserProfile } = useClerk();
  const { canInstall, install } = useInstall();
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | address
  const [form, setForm] = useState({ ...blankAddress, type: "Home", isDefault: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => { if (!signedIn) return; try { const r = await api("/api/address", { token: await token() }); setAddresses(Array.isArray(r.data) ? r.data : []); } catch (e) { tell(e.message, "error"); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm({ ...blankAddress, type: "Home", isDefault: !addresses.length, fullName: user?.fullName || "", phone: normalizePhone(user?.primaryPhoneNumber?.phoneNumber) }); setErrors({}); setEditing("new"); };
  const startEdit = (a) => { setForm({ ...blankAddress, ...Object.fromEntries(Object.entries(a).filter(([k, v]) => typeof v === "string" || typeof v === "boolean" || ((k === "latitude" || k === "longitude") && typeof v === "number"))), type: a.type || "Home" }); setErrors({}); setEditing(a); };
  const submit = async (e) => {
    e.preventDefault();
    const found = validateAddress(form);
    setErrors(found);
    if (Object.keys(found).length) { focusFirstError(); return; }
    setLoading(true);
    try {
      const t = await token();
      const body = { ...Object.fromEntries(ADDRESS_FIELDS.map((k) => [k, form[k]])), ...pinFields(form), phone: normalizePhone(form.phone), type: form.type, isDefault: !!form.isDefault };
      if (editing === "new") await api("/api/address", { token: t, method: "POST", body });
      else await api(`/api/address/${editing._id}`, { token: t, method: "PUT", body });
      setEditing(null); await load(); tell("Address saved.");
    } catch (err) { tell(err.message, "error"); } finally { setLoading(false); }
  };
  const remove = async (a) => {
    if (!(await confirm({ title: "Delete this address?", message: `${a.street}, ${a.city}`, confirmLabel: "Delete", cancelLabel: "Keep it", tone: "danger" }))) return;
    try { await api(`/api/address/${a._id}`, { token: await token(), method: "DELETE" }); await load(); tell("Address deleted."); } catch (e) { tell(e.message, "error"); }
  };
  const makeDefault = async (a) => { try { await api(`/api/address/${a._id}`, { token: await token(), method: "PUT", body: { isDefault: true } }); await load(); } catch (e) { tell(e.message, "error"); } };

  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;

  const workspace = role === "shop_owner" ? ["/workspace", "My shop"] : role === "delivery_partner" ? ["/workspace", "My deliveries"] : ["/partner", "Sell or deliver with us"];
  const links = [["/orders", Package, "Orders"], ["/wishlist", Heart, "Wishlist"], ["/notifications", Bell, "Notifications"], ["/support", LifeBuoy, "Help and support"], [workspace[0], Store, workspace[1]]];

  return <Page narrow>
    <div className="flex items-center gap-4">
      <img src={user?.imageUrl} className="h-14 w-14 rounded-full bg-slate-200" alt=""/>
      <div className="min-w-0 flex-1"><h1 className="truncate font-display text-xl font-bold">{user?.fullName || "Customer"}</h1><p className="truncate text-sm text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p></div>
      <button onClick={() => openUserProfile()} className="btn-secondary shrink-0 px-3 py-2 text-xs"><UserRound size={14}/> Edit profile</button>
    </div>

    <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {links.map(([to, Icon, label]) => <li key={label}><Link to={to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"><Icon size={19} className="text-slate-500" strokeWidth={1.75}/><span className="flex-1 text-sm font-medium">{label}</span><ChevronRight size={16} className="text-slate-400"/></Link></li>)}
      {canInstall && <li><button onClick={install} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50"><Download size={19} className="text-slate-500" strokeWidth={1.75}/><span className="flex-1 text-sm font-medium">Install the app</span><ChevronRight size={16} className="text-slate-400"/></button></li>}
    </ul>

    <section className="mt-10">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Delivery addresses</h2>{!editing && <button onClick={startNew} className="btn-primary px-4 py-2"><Plus size={16}/> Add</button>}</div>
      {!editing && <div className="mt-4 space-y-3">{addresses.length ? addresses.map((a) => <div key={a._id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm"><p className="font-semibold">{a.fullName || "Recipient"} {a.phone && <span className="font-normal text-slate-500">· {a.phone}</span>}</p><div className="mt-1 flex gap-1.5"><Pill tone="gray">{a.type}</Pill>{a.isDefault && <Pill tone="blue">default</Pill>}</div><p className="mt-2 text-slate-600">{a.street}, {a.city}, {a.state} {a.zipCode}, {a.country}</p>{a.location && <p className="text-xs text-slate-500">{a.location}{a.landmark ? ` · near ${a.landmark}` : ""}</p>}</div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">{!a.isDefault && <button onClick={() => makeDefault(a)} className="btn-secondary px-3 py-1.5 text-xs">Make default</button>}<button onClick={() => startEdit(a)} className="btn-secondary px-3 py-1.5 text-xs"><Edit3 size={14}/> Edit</button><a href={mapsLink(a)} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1.5 text-xs"><MapPin size={14}/> Map</a><button onClick={() => remove(a)} className="btn-secondary px-3 py-1.5 text-xs text-red-700"><Trash2 size={14}/> Delete</button></div>
      </div>) : <p className="text-sm text-slate-500">No saved addresses yet.</p>}</div>}
      {editing && <form onSubmit={submit} noValidate className="mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4"><label className="label" htmlFor="a-type">Address type</label><select id="a-type" className="input mt-1 w-full sm:w-48" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Home</option><option>Work</option><option>Other</option></select></div>
        <AddressFields form={form} setForm={setForm} locations={meta.locations} errors={errors}/>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}/> Make this my default address</label>
        <div className="mt-5 flex gap-3"><button disabled={loading} className="btn-primary flex-1 sm:flex-none">{loading ? "Saving..." : "Save address"}</button><button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1 sm:flex-none">Cancel</button></div>
      </form>}
    </section>

    <section className="mt-10 border-t border-slate-200 pt-6">
      <h2 className="text-sm font-semibold text-slate-700">Policies</h2>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">{LEGAL.map((d) => <Link key={d.slug} to={`/legal/${d.slug}`} className="text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline">{d.title}</Link>)}</div>
    </section>
  </Page>;
}

/* -------------------------------------------------------------- Wishlist */
export function Wishlist({ token, signedIn, tell }) {
  usePageTitle("Wishlist");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => { if (!signedIn) { setLoading(false); return; } setFailed(false); try { const r = await api("/api/wishlist", { token: await token() }); setItems(r.data || []); } catch (e) { setFailed(true); tell(e.message, "error"); } finally { setLoading(false); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);
  const remove = async (id) => { try { await api(`/api/wishlist/${id}`, { token: await token(), method: "DELETE" }); await load(); } catch (e) { tell(e.message, "error"); } };
  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;
  return <Page>
    <PageTitle>Wishlist</PageTitle>
    {loading ? <ProductGridSkeleton n={4}/> : failed ? <ErrorState title="Could not load your wishlist" onRetry={() => { setLoading(true); load(); }}/> : items.length
      ? <ProductGrid products={items}>{(p) => <div key={p._id} className="relative"><ProductCard p={p}/><button onClick={() => remove(p._id)} aria-label="Remove from wishlist" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white shadow"><Heart size={16} className="fill-red-600 text-red-600"/></button></div>}</ProductGrid>
      : <Empty title="Nothing saved yet" detail="Tap the heart on a product to save it here." action={<Link to="/shop" className="btn-primary">Browse products</Link>}/>}
  </Page>;
}

/* ----------------------------------------------------------------- Shops */
export function Shops({ tell }) {
  const brand = useBrand();
  usePageTitle("Shops");
  const meta = useMeta();
  const [sp, setSp] = useSearchParams();
  const location = sp.get("location") || "";
  const [search, setSearch] = useState("");
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setLoading(true); setFailed(false);
      api("/api/shops" + qs({ location, search: search.trim(), limit: 50 })).then((r) => live && setShops(r.data || [])).catch((e) => { if (live) { setFailed(true); tell(e.message, "error"); } }).finally(() => live && setLoading(false));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [location, search, tell, retry]);
  return <Page>
    <AdStrip placement="shops" className="mb-8"/>
    <PageTitle sub={`Every product on ${brand.name} comes from one of these shops.`}>Shops</PageTitle>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shops" aria-label="Search shops" className="input w-full pl-10"/></div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <button onClick={() => setSp({}, { replace: true })} className={chip(!location)}>All areas</button>
        {meta.locations.map((l) => <button key={l} onClick={() => setSp({ location: l }, { replace: true })} className={chip(location === l)}>{l}</button>)}
      </div>
    </div>
    <div className="mt-6">
      {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24"/>)}</div>
        : failed ? <ErrorState title="Could not load shops" onRetry={() => setRetry((n) => n + 1)}/>
          : shops.length ? <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{shops.map((s) => <Link key={s._id} to={`/shop?shop=${s._id}`} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">{s.logo ? <img src={sized(s.logo, "sm")} alt="" loading="lazy" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-slate-400"><Store size={24} strokeWidth={1.5}/></div>}</div>
            <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate font-semibold">{s.name}</h3><span className={cx("h-2 w-2 shrink-0 rounded-full", s.isOpen === false ? "bg-red-500" : "bg-emerald-500")} title={s.isOpen === false ? "Closed now" : "Open"}/></div><p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} className="shrink-0"/><span className="truncate">{s.location}{s.addressLine ? `, ${s.addressLine}` : ""}</span></p>{s.openingHours && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Clock size={12} className="shrink-0"/><span className="truncate">{s.openingHours}</span></p>}{s.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{s.description}</p>}{s.isOpen === false && <p className="mt-1.5 text-xs font-semibold text-red-700">Closed now</p>}</div>
          </Link>)}</div> : <Empty title="No shops found" detail="Try another area or search."/>}
    </div>
  </Page>;
}

/* --------------------------------------------------------- Notifications */
export function NotificationsPage({ token, signedIn, tell }) {
  usePageTitle("Notifications");
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => { if (!signedIn) { setLoading(false); return; } setFailed(false); try { const r = await api("/api/notifications?limit=50", { token: await token() }); setItems(r.data || []); setUnread(r.unreadCount || 0); } catch (e) { setFailed(true); tell(e.message, "error"); } finally { setLoading(false); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);
  const open = async (n) => {
    try { if (!n.isRead) await api(`/api/notifications/${n._id}/read`, { token: await token(), method: "PUT" }); } catch { /* ignore */ }
    if (n.data?.orderId || n.data?.orderIds || n.data?.checkoutId) navigate("/orders"); else load();
  };
  const readAll = async () => { try { await api("/api/notifications/read-all", { token: await token(), method: "PUT" }); load(); } catch (e) { tell(e.message, "error"); } };
  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;
  return <Page narrow>
    <PageTitle right={unread > 0 && <button onClick={readAll} className="btn-secondary px-3 py-2 text-xs">Mark all read</button>}>Notifications</PageTitle>
    {loading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16"/>)}</div> : failed ? <ErrorState title="Could not load notifications" onRetry={() => { setLoading(true); load(); }}/> : items.length
      ? <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">{items.map((n) => <li key={n._id}><button onClick={() => open(n)} className={cx("block w-full px-4 py-3.5 text-left hover:bg-slate-50", !n.isRead && "bg-brand-50/60")}><p className="text-sm font-semibold">{n.title}</p>{n.body && <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>}<p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p></button></li>)}</ul>
      : <Empty title="You are all caught up" detail="Order updates will show up here."/>}
  </Page>;
}

export function NotificationBell({ token }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const load = useCallback(async () => {
    try { const r = await api("/api/notifications?limit=10", { token: await token() }); setItems(r.data || []); setUnread(r.unreadCount || 0); } catch { /* non-critical */ }
  }, [token]);
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, [load]);

  const openItem = async (n) => {
    setOpen(false);
    try { if (!n.isRead) { await api(`/api/notifications/${n._id}/read`, { token: await token(), method: "PUT" }); load(); } } catch { /* ignore */ }
    if (n.data?.orderId || n.data?.orderIds || n.data?.checkoutId) navigate("/orders");
  };
  const readAll = async () => { try { await api("/api/notifications/read-all", { token: await token(), method: "PUT" }); load(); } catch { /* ignore */ } };

  return <div className="relative">
    <button onClick={() => { setOpen(!open); if (!open) load(); }} className="relative grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-200/60" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}><Bell size={20}/>{unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}</button>
    {open && <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
      <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-sm font-semibold">Notifications</span>{unread > 0 && <button onClick={readAll} className="text-xs font-semibold text-brand-700">Mark all read</button>}</div>
        <div className="max-h-[60vh] overflow-y-auto">{items.length ? items.map((n) => <button key={n._id} onClick={() => openItem(n)} className={cx("block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50", !n.isRead && "bg-brand-50/60")}><p className="text-sm font-semibold">{n.title}</p>{n.body && <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>}<p className="mt-1 text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p></button>) : <p className="p-6 text-center text-sm text-slate-500">You are all caught up.</p>}</div>
        <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-slate-50">See all</Link>
      </div>
    </>}
  </div>;
}
