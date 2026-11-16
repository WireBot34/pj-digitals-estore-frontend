import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Bell, ChevronRight, Edit3, Heart, LifeBuoy, MapPin, Minus, Package, Plus, Search, ShoppingBag, Store, Trash2, Truck, X } from "lucide-react";
import { api, imageOf, money, qs } from "../api";
import { useMeta, statusLabel } from "../meta";
import { payForCheckout, paymentErrorMessage } from "../razorpay";
import { AdHero, AdStrip } from "../ads";
import { AuthPrompt, Empty, Loading, Page, PageTitle, Pager, Pill, ProductGridSkeleton, Skeleton, Stars, cx, orderTone, payTone, prettify } from "../ui";

const imagesOf = (images) => (Array.isArray(images) ? images.map((i) => (typeof i === "string" ? i : i?.url || i?.secure_url || "")).filter(Boolean) : []);
const discountOf = (p) => (p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0);

/* ------------------------------------------------------------------ Home */
export function Home() {
  const meta = useMeta();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    api("/api/products" + qs({ featured: "true", limit: 8 })).then((r) => setFeatured(r.data || [])).catch(() => {});
  }, []);
  const search = (e) => { e.preventDefault(); navigate("/shop" + qs({ search: q.trim() })); };

  return <main>
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pb-14 sm:pt-14">
        <h1 className="max-w-2xl font-display text-[2rem] font-bold leading-[1.1] sm:text-5xl">
          Buy from the shops in your town.
        </h1>
        <p className="mt-3 max-w-xl text-base text-slate-600 sm:mt-4 sm:text-lg">
          Phones, textiles and home appliances from local stores in {meta.locations.join(" and ")}, delivered to your door.
        </p>
        <form onSubmit={search} className="mt-6 flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a product" aria-label="Search products" className="input h-12 pl-10"/>
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

    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
        {[
          [Store, "Local shops", "Every product comes from a shop you can actually visit."],
          [Truck, "Delivered by partners nearby", "Track your order from the shop to your door."],
          [ShoppingBag, "Pay online or on delivery", "UPI, cards and cash on delivery where the shop allows it."],
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
  return <Link to={`/product/${p._id}`} className="group block">
    <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-slate-200/60">
      {img
        ? <img src={img} alt={p.name} loading="lazy" decoding="async" className={cx("h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]", out && "opacity-60")}/>
        : <div className="grid h-full place-items-center text-slate-400"><Package size={32} strokeWidth={1.25}/></div>}
      {off > 0 && !out && <span className="absolute left-2 top-2 rounded bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-white">{off}% off</span>}
      {out && <span className="absolute left-2 top-2 rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">Sold out</span>}
    </div>
    <div className="mt-2.5">
      <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-900 sm:text-[15px]">{p.name}</h3>
      <p className="price mt-1 text-sm font-semibold sm:text-base">
        {money(p.price)}
        {p.comparePrice > p.price && <span className="ml-2 text-xs font-normal text-slate-400 line-through">{money(p.comparePrice)}</span>}
      </p>
      {p.shop?.name && <p className="mt-0.5 truncate text-xs text-slate-500">{p.shop.name}{p.shop.location ? `, ${p.shop.location}` : ""}</p>}
      {p.ratings?.count > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Stars value={p.ratings.average} size={12}/>{p.ratings.count}</p>}
    </div>
  </Link>;
}

export const ProductGrid = ({ products, children }) => <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => children ? children(p) : <ProductCard key={p._id} p={p}/>)}</div>;

export function Shop({ tell }) {
  const meta = useMeta();
  const [sp, setSp] = useSearchParams();
  const category = sp.get("category") || "";
  const sort = sp.get("sort") || "newest";
  const location = sp.get("location") || "";
  const shop = sp.get("shop") || "";
  const page = Number(sp.get("page")) || 1;
  const [search, setSearch] = useState(sp.get("search") || "");
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shopInfo, setShopInfo] = useState(null);

  const setParam = useCallback((key, value) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    }, { replace: true });
  }, [setSp]);

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
    setLoading(true);
    api("/api/products" + qs({ page, limit: 12, search: sp.get("search"), category, sort, location, shop }))
      .then((r) => { if (live) { setProducts(r.data || []); setPagination(r.pagination); } })
      .catch((e) => tell(e.message, "error"))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const chip = (active) => cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", active ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-900");

  return <Page>
    <AdStrip placement="catalogue" shop={shop}/>
    <PageTitle sub={shopInfo ? `${shopInfo.location || ""}${shopInfo.addressLine ? ", " + shopInfo.addressLine : ""}` : undefined}>
      {shopInfo ? shopInfo.name : "Products"}
    </PageTitle>

    <div className="sticky top-14 z-30 -mx-4 border-b border-slate-200 bg-paper px-4 py-3 sm:top-16 sm:-mx-6 sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" aria-label="Search products" className="input w-full pl-10"/>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-1 lg:px-0">
          <button onClick={() => setParam("category", "")} className={chip(!category)}>All</button>
          {meta.categories.map((c) => <button key={c} onClick={() => setParam("category", c)} className={chip(category === c)}>{c}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex">
          {!shop && <select aria-label="Location" value={location} onChange={(e) => setParam("location", e.target.value)} className="input"><option value="">All areas</option>{meta.locations.map((l) => <option key={l}>{l}</option>)}</select>}
          <select aria-label="Sort" value={sort} onChange={(e) => setParam("sort", e.target.value)} className={cx("input", shop && "col-span-2")}>
            <option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option><option value="name">Name</option>
          </select>
        </div>
      </div>
    </div>

    {shop && <button onClick={() => setParam("shop", "")} className="mt-4 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold">Showing one shop <X size={13}/></button>}

    <div className="mt-6">
      {loading ? <ProductGridSkeleton/> : products.length
        ? <><ProductGrid products={products}/><Pager pagination={pagination} onPage={(n) => setParam("page", String(n))}/></>
        : <Empty title="No products found" detail="Try another search, category or area."/>}
    </div>
  </Page>;
}

/* --------------------------------------------------------------- Product */
function Reviews({ productId, token, signedIn, tell, onChanged }) {
  const [data, setData] = useState({ reviews: [], pagination: null });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api(`/api/products/${productId}/reviews?limit=20`).then((r) => setData({ reviews: r.data || [], pagination: r.pagination })).catch(() => {}), [productId]);
  useEffect(() => { load(); }, [load]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api(`/api/products/${productId}/reviews`, { token: await token(), method: "POST", body: { rating, comment } });
      tell("Thanks for your review."); setComment(""); await load(); onChanged?.();
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };
  return <section className="mt-12 border-t border-slate-200 pt-8">
    <h2 className="font-display text-xl font-bold">Reviews</h2>
    {signedIn && <form onSubmit={submit} className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <label className="label">Your rating</label>
      <div className="mt-2 flex items-center gap-3"><select className="input w-auto" value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</select><Stars value={rating} size={18}/></div>
      <textarea className="input mt-3 w-full" rows="3" maxLength={1000} placeholder="Share your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)}/>
      <button disabled={busy} className="btn-primary mt-3 w-full sm:w-auto">{busy ? "Saving..." : "Submit review"}</button>
      <p className="mt-2 text-xs text-slate-500">You can review a product after your order has been delivered.</p>
    </form>}
    <div className="mt-5 divide-y divide-slate-200">
      {data.reviews.length ? data.reviews.map((r) => <div key={r._id} className="py-4">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Stars value={r.rating}/><span className="text-sm font-semibold">{r.user?.name || "Customer"}</span></div><span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span></div>
        {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
      </div>) : <p className="py-2 text-sm text-slate-500">No reviews yet.</p>}
    </div>
  </section>;
}

export function ProductDetail({ token, signedIn, refreshCartCount, tell }) {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("");
  const [wished, setWished] = useState(false);
  const [shot, setShot] = useState(0);
  const loadProduct = useCallback(() => api(`/api/products/${id}`).then((r) => setP(r.data)).catch((e) => tell(e.message, "error")).finally(() => setLoading(false)), [id, tell]);
  useEffect(() => { setLoading(true); setShot(0); loadProduct(); }, [loadProduct]);
  useEffect(() => {
    if (!signedIn) { setWished(false); return; }
    token().then((t) => api("/api/wishlist", { token: t })).then((r) => setWished((r.data || []).some((x) => x._id === id))).catch(() => {});
  }, [signedIn, token, id]);

  if (loading) return <Page><div className="grid gap-8 md:grid-cols-2"><Skeleton className="aspect-square"/><div><Skeleton className="h-8 w-3/4"/><Skeleton className="mt-4 h-6 w-1/4"/><Skeleton className="mt-6 h-24"/></div></div></Page>;
  if (!p) return <Page narrow><Empty title="Product unavailable" detail="This product may have been removed." action={<Link to="/shop" className="btn-secondary">Browse products</Link>}/></Page>;

  const add = async () => {
    if (!signedIn) { tell("Sign in before adding items to your cart.", "error"); return; }
    if (p.sizes?.length > 0 && !size) { tell("Please choose a size.", "error"); return; }
    try { await api("/api/cart/add", { token: await token(), method: "POST", body: { productId: p._id, quantity: qty, size: size || undefined } }); await refreshCartCount(); tell("Added to cart."); } catch (e) { tell(e.message, "error"); }
  };
  const toggleWish = async () => {
    if (!signedIn) { tell("Sign in to save items to your wishlist.", "error"); return; }
    try { await api(`/api/wishlist/${p._id}`, { token: await token(), method: wished ? "DELETE" : "POST" }); setWished(!wished); tell(wished ? "Removed from wishlist." : "Saved to wishlist."); } catch (e) { tell(e.message, "error"); }
  };
  const imgs = imagesOf(p.images);
  const off = discountOf(p);

  return <Page className="pb-28 md:pb-10">
    <AdStrip placement="product" title="Sponsored" className="mb-6"/>
    <nav className="mb-4 flex items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
      <Link to="/shop" className="hover:text-slate-900">Products</Link><ChevronRight size={12}/>
      <Link to={`/shop?category=${encodeURIComponent(p.category)}`} className="hover:text-slate-900">{p.category}</Link>
    </nav>
    <div className="grid gap-6 md:grid-cols-2 md:gap-12">
      <div>
        <div className="aspect-square overflow-hidden rounded-xl bg-slate-200/60">
          {imgs[shot] ? <img src={imgs[shot]} className="h-full w-full object-cover" alt={p.name}/> : <div className="grid h-full place-items-center text-slate-400"><Package size={48} strokeWidth={1.25}/></div>}
        </div>
        {imgs.length > 1 && <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">{imgs.map((src, i) => <button key={src} onClick={() => setShot(i)} aria-label={`Photo ${i + 1}`} className={cx("h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2", i === shot ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}><img src={src} alt="" className="h-full w-full object-cover"/></button>)}</div>}
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{p.name}</h1>
        {p.ratings?.count > 0 && <div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Stars value={p.ratings.average} size={16}/>{p.ratings.average} <span className="text-slate-400">({p.ratings.count})</span></div>}
        <p className="price mt-4 flex flex-wrap items-baseline gap-x-3 text-3xl font-bold">
          {money(p.price)}
          {p.comparePrice > p.price && <><span className="text-base font-normal text-slate-400 line-through">{money(p.comparePrice)}</span><span className="text-sm font-semibold text-brand-700">{off}% off</span></>}
        </p>
        <p className={cx("mt-2 text-sm font-medium", p.stock > 0 ? (p.stock <= 5 ? "text-amber-700" : "text-brand-700") : "text-red-700")}>{p.stock > 0 ? (p.stock <= 5 ? `Only ${p.stock} left` : "In stock") : "Currently out of stock"}</p>

        {p.shop?.name && <Link to={`/shop?shop=${p.shop._id}`} className="mt-5 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-400">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><Store size={18}/></span>
          <span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">Sold by</span><span className="block truncate text-sm font-semibold">{p.shop.name}{p.shop.location ? `, ${p.shop.location}` : ""}</span></span>
          <ChevronRight size={16} className="text-slate-400"/>
        </Link>}

        {p.sizes?.length > 0 && <div className="mt-6"><span className="label">Size</span><div className="mt-2 flex flex-wrap gap-2">{p.sizes.map((s) => <button type="button" onClick={() => setSize(s)} className={cx("min-w-[44px] rounded-lg border px-3.5 py-2 text-sm font-semibold", size === s ? "border-ink bg-ink text-white" : "border-slate-300 bg-white hover:border-slate-900")} key={s}>{s}</button>)}</div></div>}

        {/* On phones this bar sits above the tab bar so the main action is always within reach */}
        <div className="fixed inset-x-0 bottom-[calc(4rem+var(--safe-bottom))] z-30 flex items-center gap-2 border-t border-slate-200 bg-paper px-4 py-3 md:static md:mt-7 md:border-0 md:bg-transparent md:p-0">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white">
            <button type="button" aria-label="Decrease" className="grid h-11 w-10 place-items-center" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16}/></button>
            <span className="w-7 text-center text-sm font-semibold">{qty}</span>
            <button type="button" aria-label="Increase" className="grid h-11 w-10 place-items-center" onClick={() => setQty(Math.min(p.stock || 1, qty + 1))}><Plus size={16}/></button>
          </div>
          <button disabled={!p.stock} onClick={add} className="btn-primary h-11 flex-1"><ShoppingBag size={18}/> Add to cart</button>
          <button onClick={toggleWish} aria-label={wished ? "Remove from wishlist" : "Save to wishlist"} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50"><Heart size={19} className={wished ? "fill-red-600 text-red-600" : "text-slate-600"}/></button>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-sm font-semibold">About this product</h2><p className="mt-2 whitespace-pre-line leading-7 text-slate-700">{p.description}</p></div>
      </div>
    </div>
    <Reviews productId={p._id} token={token} signedIn={signedIn} tell={tell} onChanged={loadProduct}/>
  </Page>;
}

/* ------------------------------------------------------------------ Cart */
export function Cart({ token, signedIn, refreshCartCount, tell }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!signedIn) { setLoading(false); return; } try { const r = await api("/api/cart", { token: await token() }); setCart(r.cart || r.data); } catch (e) { tell(e.message, "error"); } finally { setLoading(false); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);
  const idOf = (item) => item.product?._id || item.product;
  const update = async (item, quantity) => { try { await api(`/api/cart/item/${idOf(item)}`, { token: await token(), method: "PUT", body: { quantity, size: item.size } }); await load(); await refreshCartCount(); } catch (e) { tell(e.message, "error"); } };
  const remove = async (item) => { try { await api(`/api/cart/item/${idOf(item)}` + qs({ size: item.size }), { token: await token(), method: "DELETE" }); await load(); await refreshCartCount(); } catch (e) { tell(e.message, "error"); } };
  if (loading) return <Loading/>;
  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;
  const items = cart?.items || [];
  return <Page narrow={false} className="max-w-5xl">
    <PageTitle>Cart</PageTitle>
    {!items.length
      ? <Empty title="Your cart is empty" detail="Add something from the shop to get started." action={<Link to="/shop" className="btn-primary">Browse products</Link>}/>
      : <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-10">
        <ul className="divide-y divide-slate-200 border-y border-slate-200">
          {items.map((it, i) => {
            const p = it.product || {};
            return <li key={`${p._id || i}-${it.size}`} className="flex gap-3 py-4 sm:gap-4">
              <Link to={p._id ? `/product/${p._id}` : "#"} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200/60 sm:h-24 sm:w-24">{imageOf(p.images) && <img src={imageOf(p.images)} className="h-full w-full object-cover" alt=""/>}</Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="line-clamp-2 text-sm font-medium sm:text-base">{p.name || "Product"}</h3><p className="mt-0.5 text-xs text-slate-500">{it.size ? `Size ${it.size} · ` : ""}{money(it.price)} each</p></div>
                  <p className="price shrink-0 text-sm font-semibold sm:text-base">{money(it.price * it.quantity)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2"><button className="qty" aria-label="Decrease" onClick={() => update(it, it.quantity - 1)}><Minus size={15}/></button><span className="w-6 text-center text-sm font-semibold">{it.quantity}</span><button className="qty" aria-label="Increase" onClick={() => update(it, it.quantity + 1)}><Plus size={15}/></button></div>
                  <button onClick={() => remove(it)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-700"><Trash2 size={15}/> Remove</button>
                </div>
              </div>
            </li>;
          })}
        </ul>
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-600">Subtotal</dt><dd className="price font-medium">{money(cart.totalAmount)}</dd></div><div className="flex justify-between"><dt className="text-slate-600">Delivery</dt><dd className="text-slate-500">Added at checkout</dd></div></dl>
          <div className="my-4 border-t border-slate-200"/>
          <div className="flex justify-between font-semibold"><span>Total so far</span><span className="price">{money(cart.totalAmount)}</span></div>
          <Link to="/checkout" className="btn-primary mt-5 w-full">Checkout <ArrowRight size={17}/></Link>
        </aside>
      </div>}
  </Page>;
}

/* -------------------------------------------------------------- Checkout */
const blankAddress = { fullName: "", phone: "", street: "", city: "", state: "", zipCode: "", country: "India", location: "", landmark: "" };
const ADDRESS_FIELDS = ["fullName", "phone", "street", "city", "state", "zipCode", "country", "location", "landmark"];

export function AddressFields({ form, setForm, locations }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return <div className="grid gap-4 sm:grid-cols-2">
    <div><label className="label">Recipient name</label><input className="input mt-1 w-full" required autoComplete="name" value={form.fullName} onChange={set("fullName")}/></div>
    <div><label className="label">Phone</label><input className="input mt-1 w-full" required inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")}/></div>
    <div className="sm:col-span-2"><label className="label">Street address</label><input className="input mt-1 w-full" required autoComplete="street-address" value={form.street} onChange={set("street")}/></div>
    <div><label className="label">Delivery area</label><select className="input mt-1 w-full" required value={form.location} onChange={set("location")}><option value="">Select area</option>{locations.map((l) => <option key={l}>{l}</option>)}</select></div>
    <div><label className="label">Landmark (optional)</label><input className="input mt-1 w-full" value={form.landmark} onChange={set("landmark")}/></div>
    <div><label className="label">City</label><input className="input mt-1 w-full" required value={form.city} onChange={set("city")}/></div>
    <div><label className="label">State</label><input className="input mt-1 w-full" required value={form.state} onChange={set("state")}/></div>
    <div><label className="label">PIN code</label><input className="input mt-1 w-full" required inputMode="numeric" autoComplete="postal-code" value={form.zipCode} onChange={set("zipCode")}/></div>
    <div><label className="label">Country</label><input className="input mt-1 w-full" required value={form.country} onChange={set("country")}/></div>
  </div>;
}

const choice = (on) => cx("flex cursor-pointer gap-3 rounded-lg border p-4 transition", on ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-300 bg-white hover:border-slate-500");

export function Checkout({ token, signedIn, refreshCartCount, tell }) {
  const meta = useMeta();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressId, setAddressId] = useState(""); // "" = enter a new address
  const [form, setForm] = useState(blankAddress);
  const [saveAddress, setSaveAddress] = useState(true);
  const [payment, setPayment] = useState("online");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!signedIn) { setLoading(false); return; }
    (async () => {
      try {
        const t = await token();
        const [c, a] = await Promise.all([api("/api/cart", { token: t }), api("/api/address", { token: t })]);
        setCart(c.cart || c.data);
        const list = Array.isArray(a.data) ? a.data : [];
        setAddresses(list);
        setAddressId((list.find((x) => x.isDefault) || list[0])?._id || "");
      } catch (e) { tell(e.message, "error"); } finally { setLoading(false); }
    })();
  }, [signedIn, token, tell]);

  // only offer payment options the server says are enabled
  useEffect(() => {
    if (payment === "online" && !meta.onlinePayments && meta.cashOnDelivery) setPayment("cod");
    if (payment === "cod" && !meta.cashOnDelivery && meta.onlinePayments) setPayment("online");
  }, [meta.onlinePayments, meta.cashOnDelivery, payment]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const t = await token();
      const body = { paymentMethod: payment, notes: notes || undefined };
      if (addressId) {
        body.addressId = addressId;
      } else {
        const address = Object.fromEntries(ADDRESS_FIELDS.map((k) => [k, form[k]]));
        if (saveAddress) {
          const saved = await api("/api/address", { token: t, method: "POST", body: { ...address, isDefault: !addresses.length } });
          body.addressId = saved.data._id;
        } else {
          body.shippingAddress = address;
        }
      }

      const placed = await api("/api/orders", { token: t, method: "POST", body });
      await refreshCartCount();

      if (placed.payment) {
        try {
          await payForCheckout(placed.payment, token);
          tell("Payment successful. Your order is confirmed.");
        } catch (err) {
          tell(paymentErrorMessage(err), "error");
        }
      } else {
        tell("Order placed successfully.");
      }
      navigate("/orders");
    } catch (err) {
      tell(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;
  if (loading) return <Loading/>;
  const items = cart?.items || [];
  if (!items.length) return <Page narrow><Empty title="Your cart is empty" detail="Add items before checking out." action={<Link to="/shop" className="btn-primary">Browse products</Link>}/></Page>;
  const noPayment = !meta.onlinePayments && !meta.cashOnDelivery;

  return <Page className="max-w-5xl">
    <PageTitle sub="Choose where to deliver and how to pay.">Checkout</PageTitle>
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-10">
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
          {addressId === "" && <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><AddressFields form={form} setForm={setForm} locations={meta.locations}/><label className="mt-4 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)}/> Save this address to my account</label></div>}
        </section>

        <section>
          <h2 className="font-semibold">2. Payment</h2>
          <div className="mt-3 space-y-2">
            {meta.onlinePayments && <label className={choice(payment === "online")}><input type="radio" name="pay" checked={payment === "online"} onChange={() => setPayment("online")} className="mt-1"/><div className="text-sm"><p className="font-semibold">Pay online</p><p className="text-slate-600">UPI, cards, net banking and wallets, secured by Razorpay.</p></div></label>}
            {meta.cashOnDelivery && <label className={choice(payment === "cod")}><input type="radio" name="pay" checked={payment === "cod"} onChange={() => setPayment("cod")} className="mt-1"/><div className="text-sm"><p className="font-semibold">Cash on delivery</p><p className="text-slate-600">Pay the delivery partner when your order arrives.</p></div></label>}
            {noPayment && <p className="text-sm font-semibold text-red-700">No payment method is available right now. Please try again later.</p>}
          </div>
          <div className="mt-4"><label className="label">Order notes (optional)</label><textarea className="input mt-1 w-full" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)}/></div>
        </section>
      </div>

      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="mt-4 space-y-2.5">{items.map((it, i) => <li key={i} className="flex justify-between gap-3 text-sm"><span className="text-slate-600">{it.product?.name || "Product"} <span className="text-slate-400">× {it.quantity}</span></span><span className="price shrink-0 font-medium">{money(it.price * it.quantity)}</span></li>)}</ul>
        <div className="my-4 border-t border-slate-200"/>
        <div className="flex justify-between font-semibold"><span>Subtotal</span><span className="price">{money(cart.totalAmount)}</span></div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Delivery is added when you place the order. Items from different shops are delivered as separate orders.</p>
        <button disabled={busy || noPayment} className="btn-primary mt-5 w-full">{busy ? "Please wait..." : payment === "online" ? "Place order and pay" : "Place order"}</button>
      </aside>
    </form>
  </Page>;
}

/* ---------------------------------------------------------------- Orders */
function Tracking({ orderId, token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { token().then((t) => api(`/api/orders/${orderId}/tracking`, { token: t })).then((r) => setData(r.data)).catch((e) => setError(e.message)); }, [orderId, token]);
  if (error) return <p className="mt-3 text-xs text-red-700">{error}</p>;
  if (!data) return <p className="mt-3 text-xs text-slate-500">Loading tracking...</p>;
  const d = data.delivery;
  if (!d) return <p className="mt-3 text-xs text-slate-500">A delivery partner hasn't been assigned yet.</p>;
  return <div className="mt-4 rounded-lg bg-slate-100 p-4 text-sm">
    <p className="font-semibold capitalize">Delivery: {prettify(d.status)}</p>
    {d.driver && <p className="mt-1 break-words text-slate-600">{d.driver.fullName}{d.driver.phone ? ` · ${d.driver.phone}` : ""}{d.driver.vehicleNumber ? ` · ${d.driver.vehicleNumber}` : ""}</p>}
    <ol className="mt-3 space-y-2 border-l-2 border-slate-300 pl-3">{(d.timeline || []).map((t, i) => <li key={i} className="text-xs text-slate-600"><span className="font-semibold capitalize text-slate-900">{prettify(t.status)}</span> · {new Date(t.at).toLocaleString()}</li>)}</ol>
  </div>;
}

export function Orders({ token, signedIn, tell }) {
  const meta = useMeta();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => { if (!signedIn) { setLoading(false); return; } try { const r = await api("/api/orders", { token: await token() }); setOrders(r.data || []); } catch (e) { tell(e.message, "error"); } finally { setLoading(false); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);

  const cancel = async (o) => {
    if (!confirm("Cancel this order?")) return;
    setBusyId(o._id);
    try { await api(`/api/orders/${o._id}/cancel`, { token: await token(), method: "PUT" }); tell("Order cancelled."); await load(); } catch (e) { tell(e.message, "error"); } finally { setBusyId(""); }
  };
  const payNow = async (o) => {
    setBusyId(o._id);
    try {
      const r = await api("/api/payments/create", { token: await token(), method: "POST", body: { checkoutId: o.checkoutId } });
      await payForCheckout(r.payment, token);
      tell("Payment successful. Your order is confirmed.");
    } catch (e) { tell(paymentErrorMessage(e), "error"); } finally { setBusyId(""); await load(); }
  };

  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;
  if (loading) return <Loading/>;
  return <Page narrow>
    <PageTitle>Orders</PageTitle>
    <div className="space-y-4">{orders.length ? orders.map((o) => {
      const awaitingPayment = o.paymentMethod === "razorpay" && o.paymentStatus === "pending" && o.orderStatus !== "cancelled";
      const canCancel = o.orderStatus === "placed" && o.paymentStatus !== "paid";
      return <article key={o._id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{o.orderNumber || o._id}</p><p className="mt-0.5 text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString()}{o.shop?.name ? ` · ${o.shop.name}` : ""}</p></div>
          <div className="flex flex-wrap gap-1.5"><Pill tone={payTone(o.paymentStatus)}>{o.paymentMethod === "cod" ? "COD · " : ""}{o.paymentStatus}</Pill><Pill tone={orderTone(o.orderStatus)}>{statusLabel(meta, o.orderStatus)}</Pill></div>
        </div>
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">{(o.items || []).map((it, i) => <li key={i} className="flex items-center gap-3 text-sm">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-200/60">{(it.image || imageOf(it.product?.images)) && <img src={it.image || imageOf(it.product?.images)} className="h-full w-full object-cover" alt=""/>}</div>
          <span className="min-w-0 flex-1 text-slate-700">{it.name || it.product?.name}{it.size ? ` (${it.size})` : ""} <span className="text-slate-400">× {it.quantity}</span></span>
          <span className="price shrink-0 font-medium">{money(it.price * it.quantity)}</span>
        </li>)}</ul>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">{o.shippingCost ? `Includes ${money(o.shippingCost)} delivery` : "Total"}</span><strong className="price text-base">{money(o.totalAmount)}</strong></div>
        {awaitingPayment && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Payment pending. Unpaid online orders are cancelled automatically after a short time.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {awaitingPayment && <button disabled={busyId === o._id} onClick={() => payNow(o)} className="btn-primary px-4 py-2">Pay now</button>}
          {canCancel && <button disabled={busyId === o._id} onClick={() => cancel(o)} className="btn-secondary px-4 py-2">Cancel order</button>}
          {o.orderStatus !== "cancelled" && <button onClick={() => setTracking(tracking === o._id ? null : o._id)} className="btn-secondary px-4 py-2">{tracking === o._id ? "Hide tracking" : "Track order"}</button>}
        </div>
        {tracking === o._id && <Tracking orderId={o._id} token={token}/>}
      </article>;
    }) : <Empty title="No orders yet" detail="Your orders will appear here after checkout." action={<Link to="/shop" className="btn-primary">Browse products</Link>}/>}</div>
  </Page>;
}

/* --------------------------------------------------------------- Account */
export function Account({ token, signedIn, user, role, tell }) {
  const meta = useMeta();
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | address
  const [form, setForm] = useState({ ...blankAddress, type: "Home", isDefault: false });
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => { if (!signedIn) return; try { const r = await api("/api/address", { token: await token() }); setAddresses(Array.isArray(r.data) ? r.data : []); } catch (e) { tell(e.message, "error"); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm({ ...blankAddress, type: "Home", isDefault: !addresses.length }); setEditing("new"); };
  const startEdit = (a) => { setForm({ ...blankAddress, ...Object.fromEntries(Object.entries(a).filter(([, v]) => typeof v === "string" || typeof v === "boolean")), type: a.type || "Home" }); setEditing(a); };
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const t = await token();
      const body = { ...Object.fromEntries(ADDRESS_FIELDS.map((k) => [k, form[k]])), type: form.type, isDefault: !!form.isDefault };
      if (editing === "new") await api("/api/address", { token: t, method: "POST", body });
      else await api(`/api/address/${editing._id}`, { token: t, method: "PUT", body });
      setEditing(null); await load(); tell("Address saved.");
    } catch (err) { tell(err.message, "error"); } finally { setLoading(false); }
  };
  const remove = async (a) => { if (!confirm("Delete this address?")) return; try { await api(`/api/address/${a._id}`, { token: await token(), method: "DELETE" }); await load(); tell("Address deleted."); } catch (e) { tell(e.message, "error"); } };
  const makeDefault = async (a) => { try { await api(`/api/address/${a._id}`, { token: await token(), method: "PUT", body: { isDefault: true } }); await load(); } catch (e) { tell(e.message, "error"); } };

  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;

  const workspace = role === "shop_owner" ? ["/workspace", "My shop"] : role === "delivery_partner" ? ["/workspace", "My deliveries"] : ["/partner", "Sell or deliver with us"];
  const links = [["/orders", Package, "Orders"], ["/wishlist", Heart, "Wishlist"], ["/support", LifeBuoy, "Help and support"], [workspace[0], Store, workspace[1]]];

  return <Page narrow>
    <div className="flex items-center gap-4">
      <img src={user?.imageUrl} className="h-14 w-14 rounded-full bg-slate-200" alt=""/>
      <div className="min-w-0"><h1 className="truncate font-display text-xl font-bold">{user?.fullName || "Customer"}</h1><p className="truncate text-sm text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p></div>
    </div>

    <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {links.map(([to, Icon, label]) => <li key={label}><Link to={to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"><Icon size={19} className="text-slate-500" strokeWidth={1.75}/><span className="flex-1 text-sm font-medium">{label}</span><ChevronRight size={16} className="text-slate-400"/></Link></li>)}
    </ul>

    <section className="mt-10">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Delivery addresses</h2>{!editing && <button onClick={startNew} className="btn-primary px-4 py-2"><Plus size={16}/> Add</button>}</div>
      {!editing && <div className="mt-4 space-y-3">{addresses.length ? addresses.map((a) => <div key={a._id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm"><p className="font-semibold">{a.fullName || "Recipient"} {a.phone && <span className="font-normal text-slate-500">· {a.phone}</span>}</p><div className="mt-1 flex gap-1.5"><Pill tone="gray">{a.type}</Pill>{a.isDefault && <Pill tone="blue">default</Pill>}</div><p className="mt-2 text-slate-600">{a.street}, {a.city}, {a.state} {a.zipCode}, {a.country}</p>{a.location && <p className="text-xs text-slate-500">{a.location}{a.landmark ? ` · near ${a.landmark}` : ""}</p>}</div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">{!a.isDefault && <button onClick={() => makeDefault(a)} className="btn-secondary px-3 py-1.5 text-xs">Make default</button>}<button onClick={() => startEdit(a)} className="btn-secondary px-3 py-1.5 text-xs"><Edit3 size={14}/> Edit</button><button onClick={() => remove(a)} className="btn-secondary px-3 py-1.5 text-xs text-red-700"><Trash2 size={14}/> Delete</button></div>
      </div>) : <p className="text-sm text-slate-500">No saved addresses yet.</p>}</div>}
      {editing && <form onSubmit={submit} className="mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4"><label className="label">Address type</label><select className="input mt-1 w-full sm:w-48" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Home</option><option>Work</option><option>Other</option></select></div>
        <AddressFields form={form} setForm={setForm} locations={meta.locations}/>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}/> Make this my default address</label>
        <div className="mt-5 flex gap-3"><button disabled={loading} className="btn-primary flex-1 sm:flex-none">{loading ? "Saving..." : "Save address"}</button><button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1 sm:flex-none">Cancel</button></div>
      </form>}
    </section>
  </Page>;
}

/* -------------------------------------------------------------- Wishlist */
export function Wishlist({ token, signedIn, tell }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!signedIn) { setLoading(false); return; } try { const r = await api("/api/wishlist", { token: await token() }); setItems(r.data || []); } catch (e) { tell(e.message, "error"); } finally { setLoading(false); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);
  const remove = async (id) => { try { await api(`/api/wishlist/${id}`, { token: await token(), method: "DELETE" }); await load(); } catch (e) { tell(e.message, "error"); } };
  if (!signedIn) return <Page narrow><AuthPrompt/></Page>;
  if (loading) return <Loading/>;
  return <Page>
    <PageTitle>Wishlist</PageTitle>
    {items.length
      ? <ProductGrid products={items}>{(p) => <div key={p._id} className="relative"><ProductCard p={p}/><button onClick={() => remove(p._id)} aria-label="Remove from wishlist" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white shadow"><Heart size={16} className="fill-red-600 text-red-600"/></button></div>}</ProductGrid>
      : <Empty title="Nothing saved yet" detail="Tap the heart on a product to save it here." action={<Link to="/shop" className="btn-primary">Browse products</Link>}/>}
  </Page>;
}

/* ----------------------------------------------------------------- Shops */
export function Shops({ tell }) {
  const meta = useMeta();
  const [sp, setSp] = useSearchParams();
  const location = sp.get("location") || "";
  const [search, setSearch] = useState("");
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setLoading(true);
      api("/api/shops" + qs({ location, search: search.trim(), limit: 50 })).then((r) => live && setShops(r.data || [])).catch((e) => tell(e.message, "error")).finally(() => live && setLoading(false));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [location, search, tell]);
  const chip = (active) => cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", active ? "border-ink bg-ink text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-900");
  return <Page>
    <AdStrip placement="shops" className="mb-8"/>
    <PageTitle sub="Every product on PJ Digitals comes from one of these shops.">Shops</PageTitle>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shops" aria-label="Search shops" className="input w-full pl-10"/></div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <button onClick={() => setSp({}, { replace: true })} className={chip(!location)}>All areas</button>
        {meta.locations.map((l) => <button key={l} onClick={() => setSp({ location: l }, { replace: true })} className={chip(location === l)}>{l}</button>)}
      </div>
    </div>
    <div className="mt-6">
      {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24"/>)}</div>
        : shops.length ? <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">{shops.map((s) => <Link key={s._id} to={`/shop?shop=${s._id}`} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">{s.logo ? <img src={s.logo} alt="" loading="lazy" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-slate-400"><Store size={24} strokeWidth={1.5}/></div>}</div>
          <div className="min-w-0"><h3 className="truncate font-semibold">{s.name}</h3><p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} className="shrink-0"/><span className="truncate">{s.location}{s.addressLine ? `, ${s.addressLine}` : ""}</span></p>{s.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{s.description}</p>}{s.isOpen === false && <p className="mt-1.5 text-xs font-semibold text-red-700">Currently closed</p>}</div>
        </Link>)}</div> : <Empty title="No shops found" detail="Try another area or search."/>}
    </div>
  </Page>;
}

/* --------------------------------------------------------- Notifications */
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
    <button onClick={() => { setOpen(!open); if (!open) load(); }} className="relative grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-200/60" aria-label="Notifications"><Bell size={20}/>{unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}</button>
    {open && <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
      <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-sm font-semibold">Notifications</span>{unread > 0 && <button onClick={readAll} className="text-xs font-semibold text-brand-700">Mark all read</button>}</div>
        <div className="max-h-[60vh] overflow-y-auto">{items.length ? items.map((n) => <button key={n._id} onClick={() => openItem(n)} className={cx("block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50", !n.isRead && "bg-brand-50/60")}><p className="text-sm font-semibold">{n.title}</p>{n.body && <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>}<p className="mt-1 text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p></button>) : <p className="p-6 text-center text-sm text-slate-500">You're all caught up.</p>}</div>
      </div>
    </>}
  </div>;
}
