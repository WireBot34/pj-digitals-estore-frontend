import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Bell, Edit3, Heart, MapPin, Package, Search, ShoppingBag, ShoppingCart, Store, Trash2, X } from "lucide-react";
import { api, imageOf, money, qs } from "../api";
import { useMeta, statusLabel } from "../meta";
import { payForCheckout, paymentErrorMessage } from "../razorpay";
import { AuthPrompt, Empty, Loading, Pager, Pill, Stars, cx, orderTone, payTone, prettify } from "../ui";

/* ------------------------------------------------------------------ Home */
export function Home() {
  const meta = useMeta();
  const [featured, setFeatured] = useState([]);
  const [ads, setAds] = useState([]);
  useEffect(() => {
    api("/api/products" + qs({ featured: "true", limit: 4 })).then((r) => setFeatured(r.data || [])).catch(() => {});
    api("/api/ads").then((r) => setAds(r.data || [])).catch(() => {});
  }, []);
  return <main>
    <section className="bg-[#101828] text-white"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
      <div><p className="mb-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-indigo-200">Shop local · {meta.locations.join(" · ")}</p><h1 className="font-display text-5xl font-extrabold leading-[1.08] md:text-6xl">Everything you need.<br/><span className="text-indigo-300">From shops near you.</span></h1><p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Electronics, textiles and home appliances from local shops, delivered to your door.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-slate-950 hover:bg-indigo-100">Explore products <ArrowRight size={18}/></Link><Link to="/shops" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-bold hover:bg-white/10"><Store size={18}/> Browse shops</Link></div></div>
      <div className="relative"><div className="absolute inset-8 rounded-full bg-indigo-500/20 blur-3xl"/><div className="relative grid grid-cols-2 gap-4"><div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-700 p-8 pt-12"><ShoppingBag size={38}/><p className="mt-12 text-2xl font-extrabold">Shop smart.</p><p className="mt-2 text-sm text-indigo-100">Everyday essentials</p></div><div className="mt-10 rounded-3xl bg-gradient-to-br from-slate-600 to-slate-800 p-8 pt-12"><Package size={38}/><p className="mt-12 text-2xl font-extrabold">Stay connected.</p><p className="mt-2 text-sm text-slate-300">Tech that works</p></div></div></div>
    </div></section>

    {ads.length > 0 && <section className="mx-auto max-w-7xl px-5 pt-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Offers from local shops</p><div className="mt-4 flex gap-4 overflow-x-auto pb-2">{ads.map((ad) => <Link key={ad._id} to={ad.product ? `/product/${ad.product}` : `/shop?shop=${ad.shop?._id || ""}`} className="min-w-[280px] max-w-[320px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg">{ad.image && <img src={ad.image} alt={ad.title} className="h-40 w-full object-cover"/>}<div className="p-4"><h3 className="font-bold">{ad.title}</h3>{ad.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{ad.description}</p>}{ad.shop && <p className="mt-2 text-xs font-semibold text-indigo-600">{ad.shop.name}{ad.shop.location ? ` · ${ad.shop.location}` : ""}</p>}</div></Link>)}</div></section>}

    <section className="mx-auto max-w-7xl px-5 py-16"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Browse by category</p><h2 className="mt-2 font-display text-3xl font-extrabold">Find what you need</h2></div><Link to="/shop" className="hidden text-sm font-bold text-indigo-600 sm:block">View all <ArrowRight className="inline" size={16}/></Link></div><div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">{meta.categories.map((c, i) => <Link to={`/shop?category=${encodeURIComponent(c)}`} key={c} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"><span className="text-xs font-bold text-indigo-500">{String(i + 1).padStart(2, "0")}</span><h3 className="mt-5 font-display text-lg font-extrabold">{c}</h3><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">Explore <ArrowRight size={13}/></span></Link>)}</div></section>

    {featured.length > 0 && <section className="mx-auto max-w-7xl px-5 pb-10"><h2 className="font-display text-3xl font-extrabold">Featured</h2><div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">{featured.map((p) => <ProductCard key={p._id} p={p}/>)}</div></section>}

    <section className="mx-auto max-w-7xl px-5 pb-10"><div className="rounded-3xl bg-indigo-50 p-8 md:flex md:items-center md:justify-between"><div><h2 className="font-display text-2xl font-extrabold">Shopping for your area?</h2><p className="mt-2 text-slate-600">See the shops delivering in your town.</p></div><div className="mt-5 flex flex-wrap gap-2 md:mt-0">{meta.locations.map((l) => <Link key={l} to={`/shops?location=${encodeURIComponent(l)}`} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-5 py-3 font-bold text-white"><MapPin size={16}/>{l}</Link>)}</div></div></section>
  </main>;
}

/* ------------------------------------------------------------- Catalogue */
export function ProductCard({ p }) {
  const img = imageOf(p.images);
  return <Link to={`/product/${p._id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"><div className="aspect-square bg-slate-100">{img ? <img src={img} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105"/> : <div className="grid h-full place-items-center text-slate-300"><Package size={42}/></div>}</div><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">{p.category}</p><h3 className="mt-2 line-clamp-2 min-h-10 font-bold text-slate-900">{p.name}</h3>{p.shop?.name && <p className="mt-1 truncate text-xs text-slate-500">{p.shop.name}{p.shop.location ? ` · ${p.shop.location}` : ""}</p>}{p.ratings?.count > 0 && <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Stars value={p.ratings.average} size={12}/>({p.ratings.count})</div>}<div className="mt-3 flex items-center justify-between"><span className="font-display text-lg font-extrabold">{money(p.price)}</span><span className={cx("text-xs", p.stock > 0 ? "text-slate-400" : "font-bold text-red-500")}>{p.stock > 0 ? "In stock" : "Out of stock"}</span></div></div></Link>;
}

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

  return <main className="mx-auto max-w-7xl px-5 py-12">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">The catalogue</p><h1 className="mt-2 font-display text-4xl font-extrabold">{shopInfo ? shopInfo.name : "Shop all products"}</h1><p className="mt-2 text-slate-500">{shopInfo ? `${shopInfo.location || ""}${shopInfo.addressLine ? " · " + shopInfo.addressLine : ""}` : "Browse products from local shops."}</p></div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="input pl-10"/></div>
        <select value={category} onChange={(e) => setParam("category", e.target.value)} className="input"><option value="">All categories</option>{meta.categories.map((c) => <option key={c}>{c}</option>)}</select>
        {!shop && <select value={location} onChange={(e) => setParam("location", e.target.value)} className="input"><option value="">All locations</option>{meta.locations.map((l) => <option key={l}>{l}</option>)}</select>}
        <select value={sort} onChange={(e) => setParam("sort", e.target.value)} className="input"><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Top rated</option><option value="name">Name</option></select></div></div>
    {shop && <button onClick={() => setParam("shop", "")} className="mt-4 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">Showing one shop <X size={13}/></button>}
    {loading ? <Loading/> : products.length ? <><div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p._id} p={p}/>)}</div><Pager pagination={pagination} onPage={(n) => setParam("page", String(n))}/></> : <div className="mt-8"><Empty title="No products found" detail="Try another search, category or location."/></div>}
  </main>;
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
    <h2 className="font-display text-2xl font-extrabold">Reviews</h2>
    {signedIn && <form onSubmit={submit} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><label className="label">Your rating</label><div className="mt-2 flex items-center gap-3"><select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}</select><Stars value={rating} size={18}/></div><textarea className="input mt-3 w-full" rows="3" maxLength={1000} placeholder="Share your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)}/><button disabled={busy} className="btn-primary mt-3">{busy ? "Saving..." : "Submit review"}</button><p className="mt-2 text-xs text-slate-400">You can review a product after your order has been delivered.</p></form>}
    <div className="mt-5 space-y-4">{data.reviews.length ? data.reviews.map((r) => <div key={r._id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Stars value={r.rating}/><span className="text-sm font-bold">{r.user?.name || "Customer"}</span></div><span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span></div>{r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}</div>) : <p className="text-sm text-slate-400">No reviews yet.</p>}</div>
  </section>;
}

export function ProductDetail({ token, signedIn, refreshCartCount, tell }) {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("");
  const [wished, setWished] = useState(false);
  const loadProduct = useCallback(() => api(`/api/products/${id}`).then((r) => setP(r.data)).catch((e) => tell(e.message, "error")).finally(() => setLoading(false)), [id, tell]);
  useEffect(() => { setLoading(true); loadProduct(); }, [loadProduct]);
  useEffect(() => {
    if (!signedIn) { setWished(false); return; }
    token().then((t) => api("/api/wishlist", { token: t })).then((r) => setWished((r.data || []).some((x) => x._id === id))).catch(() => {});
  }, [signedIn, token, id]);

  if (loading) return <Loading/>;
  if (!p) return <main className="mx-auto max-w-6xl px-5 py-16"><Empty title="Product unavailable" detail="This product may have been removed."/></main>;

  const add = async () => {
    if (!signedIn) { tell("Sign in before adding items to your cart.", "error"); return; }
    if (p.sizes?.length > 0 && !size) { tell("Please choose a size.", "error"); return; }
    try { await api("/api/cart/add", { token: await token(), method: "POST", body: { productId: p._id, quantity: qty, size: size || undefined } }); await refreshCartCount(); tell("Added to cart."); } catch (e) { tell(e.message, "error"); }
  };
  const toggleWish = async () => {
    if (!signedIn) { tell("Sign in to save items to your wishlist.", "error"); return; }
    try { await api(`/api/wishlist/${p._id}`, { token: await token(), method: wished ? "DELETE" : "POST" }); setWished(!wished); tell(wished ? "Removed from wishlist." : "Saved to wishlist."); } catch (e) { tell(e.message, "error"); }
  };
  return <main className="mx-auto max-w-6xl px-5 py-12"><div className="grid gap-10 md:grid-cols-2">
    <div className="overflow-hidden rounded-3xl bg-white">{imageOf(p.images) ? <img src={imageOf(p.images)} className="aspect-square w-full object-cover" alt={p.name}/> : <div className="grid aspect-square place-items-center text-slate-300"><Package size={60}/></div>}</div>
    <div className="py-4"><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{p.category}</p><h1 className="mt-3 font-display text-4xl font-extrabold">{p.name}</h1>
      {p.ratings?.count > 0 && <div className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Stars value={p.ratings.average} size={16}/>{p.ratings.average} ({p.ratings.count} review{p.ratings.count > 1 ? "s" : ""})</div>}
      {p.shop?.name && <Link to={`/shop?shop=${p.shop._id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600"><Store size={15}/>{p.shop.name}{p.shop.location ? ` · ${p.shop.location}` : ""}</Link>}
      <p className="mt-5 text-3xl font-extrabold">{money(p.price)}{p.comparePrice > p.price && <span className="ml-3 text-lg font-semibold text-slate-400 line-through">{money(p.comparePrice)}</span>}</p><p className="mt-5 leading-7 text-slate-600">{p.description}</p><p className="mt-4 text-sm text-slate-500">{p.stock > 0 ? `${p.stock} available` : "Currently out of stock"}</p>
      {p.sizes?.length > 0 && <div className="mt-6"><label className="label">Choose size</label><div className="mt-2 flex flex-wrap gap-2">{p.sizes.map((s) => <button onClick={() => setSize(s)} className={cx("rounded-lg border px-4 py-2 text-sm font-bold", size === s ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200")} key={s}>{s}</button>)}</div></div>}
      <div className="mt-7 flex items-center gap-3"><div className="flex items-center rounded-full border border-slate-200"><button className="p-3" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span className="w-8 text-center font-bold">{qty}</span><button className="p-3" onClick={() => setQty(Math.min(p.stock || 1, qty + 1))}>+</button></div><button disabled={!p.stock} onClick={add} className="btn-primary flex-1"><ShoppingCart size={18}/> Add to cart</button><button onClick={toggleWish} title="Wishlist" className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50"><Heart size={20} className={wished ? "fill-red-500 text-red-500" : "text-slate-500"}/></button></div></div>
  </div><Reviews productId={p._id} token={token} signedIn={signedIn} tell={tell} onChanged={loadProduct}/></main>;
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
  if (!signedIn) return <main className="mx-auto max-w-3xl px-5 py-16"><AuthPrompt/></main>;
  const items = cart?.items || [];
  return <main className="mx-auto max-w-6xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">Your cart</h1>{!items.length ? <div className="mt-8"><Empty title="Your cart is empty" detail="Add something from the catalogue to get started."/></div> : <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]"><div className="space-y-3">{items.map((it, i) => { const p = it.product || {}; return <div key={`${p._id || i}-${it.size}`} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">{imageOf(p.images) && <img src={imageOf(p.images)} className="h-full w-full object-cover" alt=""/>}</div><div className="min-w-0 flex-1"><h3 className="font-bold">{p.name || "Product"}</h3><p className="mt-1 text-sm text-slate-500">{it.size || "Standard"} · {money(it.price)}</p><div className="mt-3 flex items-center gap-3"><button className="qty" onClick={() => update(it, it.quantity - 1)}>−</button><span className="text-sm font-bold">{it.quantity}</span><button className="qty" onClick={() => update(it, it.quantity + 1)}>+</button></div></div><div className="text-right"><p className="font-extrabold">{money(it.price * it.quantity)}</p><button onClick={() => remove(it)} className="mt-5 text-slate-400 hover:text-red-600"><Trash2 size={17}/></button></div></div>; })}</div>
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Order summary</h2><div className="mt-5 flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{money(cart.totalAmount)}</span></div><div className="mt-3 flex justify-between text-sm text-slate-500"><span>Shipping</span><span>Calculated at checkout</span></div><div className="my-5 border-t border-slate-100"/><div className="flex justify-between font-extrabold"><span>Subtotal</span><span>{money(cart.totalAmount)}</span></div><Link to="/checkout" className="btn-primary mt-6 w-full">Continue to checkout <ArrowRight size={17}/></Link></aside></div>}</main>;
}

/* -------------------------------------------------------------- Checkout */
const blankAddress = { fullName: "", phone: "", street: "", city: "", state: "", zipCode: "", country: "India", location: "", landmark: "" };
const ADDRESS_FIELDS = ["fullName", "phone", "street", "city", "state", "zipCode", "country", "location", "landmark"];

export function AddressFields({ form, setForm, locations }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return <div className="grid gap-4 sm:grid-cols-2">
    <div><label className="label">Recipient name</label><input className="input w-full" required value={form.fullName} onChange={set("fullName")}/></div>
    <div><label className="label">Phone</label><input className="input w-full" required inputMode="tel" value={form.phone} onChange={set("phone")}/></div>
    <div className="sm:col-span-2"><label className="label">Street address</label><input className="input w-full" required value={form.street} onChange={set("street")}/></div>
    <div><label className="label">Delivery area</label><select className="input w-full" required value={form.location} onChange={set("location")}><option value="">Select area</option>{locations.map((l) => <option key={l}>{l}</option>)}</select></div>
    <div><label className="label">Landmark (optional)</label><input className="input w-full" value={form.landmark} onChange={set("landmark")}/></div>
    <div><label className="label">City</label><input className="input w-full" required value={form.city} onChange={set("city")}/></div>
    <div><label className="label">State</label><input className="input w-full" required value={form.state} onChange={set("state")}/></div>
    <div><label className="label">PIN code</label><input className="input w-full" required value={form.zipCode} onChange={set("zipCode")}/></div>
    <div><label className="label">Country</label><input className="input w-full" required value={form.country} onChange={set("country")}/></div>
  </div>;
}

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

  if (!signedIn) return <main className="mx-auto max-w-3xl px-5 py-16"><AuthPrompt/></main>;
  if (loading) return <Loading/>;
  const items = cart?.items || [];
  if (!items.length) return <main className="mx-auto max-w-3xl px-5 py-16"><Empty title="Your cart is empty" detail="Add items before checking out."/></main>;
  const noPayment = !meta.onlinePayments && !meta.cashOnDelivery;

  return <main className="mx-auto max-w-6xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">Checkout</h1><p className="mt-2 text-slate-500">Choose where to deliver and how to pay.</p>
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">Delivery address</h2>
          <div className="mt-4 space-y-3">{addresses.map((a) => <label key={a._id} className={cx("flex cursor-pointer gap-3 rounded-xl border p-4", addressId === a._id ? "border-indigo-600 bg-indigo-50" : "border-slate-200")}><input type="radio" checked={addressId === a._id} onChange={() => setAddressId(a._id)}/><div className="text-sm"><p className="font-bold">{a.fullName || "Recipient"} {a.phone && <span className="font-normal text-slate-500">· {a.phone}</span>} {a.isDefault && <Pill tone="blue">default</Pill>}</p><p className="text-slate-600">{a.street}, {a.city}, {a.state} {a.zipCode}</p>{a.location && <p className="text-xs text-slate-400">{a.location}{a.landmark ? ` · near ${a.landmark}` : ""}</p>}</div></label>)}
            <label className={cx("flex cursor-pointer gap-3 rounded-xl border p-4", addressId === "" ? "border-indigo-600 bg-indigo-50" : "border-slate-200")}><input type="radio" checked={addressId === ""} onChange={() => setAddressId("")}/><span className="text-sm font-bold">Use a new address</span></label></div>
          {addressId === "" && <div className="mt-5"><AddressFields form={form} setForm={setForm} locations={meta.locations}/><label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)}/> Save this address to my account</label></div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold">Payment</h2>
          <div className="mt-4 space-y-3">
            {meta.onlinePayments && <label className={cx("flex cursor-pointer gap-3 rounded-xl border p-4", payment === "online" ? "border-indigo-600 bg-indigo-50" : "border-slate-200")}><input type="radio" checked={payment === "online"} onChange={() => setPayment("online")}/><div className="text-sm"><p className="font-bold">Pay online</p><p className="text-slate-500">UPI, cards, net banking and wallets (secured by Razorpay)</p></div></label>}
            {meta.cashOnDelivery && <label className={cx("flex cursor-pointer gap-3 rounded-xl border p-4", payment === "cod" ? "border-indigo-600 bg-indigo-50" : "border-slate-200")}><input type="radio" checked={payment === "cod"} onChange={() => setPayment("cod")}/><div className="text-sm"><p className="font-bold">Cash on delivery</p><p className="text-slate-500">Pay the delivery partner when your order arrives</p></div></label>}
            {noPayment && <p className="text-sm font-semibold text-red-600">No payment method is available right now. Please try again later.</p>}
          </div>
          <div className="mt-5"><label className="label">Order notes (optional)</label><textarea className="input mt-1 w-full" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)}/></div>
        </section>
      </div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-bold">Order summary</h2>
        <div className="mt-4 space-y-3">{items.map((it, i) => <div key={i} className="flex justify-between gap-3 text-sm"><span className="text-slate-600">{it.product?.name || "Product"} × {it.quantity}</span><span className="font-semibold">{money(it.price * it.quantity)}</span></div>)}</div>
        <div className="my-5 border-t border-slate-100"/><div className="flex justify-between font-extrabold"><span>Subtotal</span><span>{money(cart.totalAmount)}</span></div>
        <p className="mt-3 text-xs leading-5 text-slate-400">Shipping is added when you place the order. Items from different shops are delivered as separate orders.</p>
        <button disabled={busy || noPayment} className="btn-primary mt-6 w-full">{busy ? "Please wait..." : payment === "online" ? "Place order & pay" : "Place order"}</button>
      </aside></form></main>;
}

/* ---------------------------------------------------------------- Orders */
function Tracking({ orderId, token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { token().then((t) => api(`/api/orders/${orderId}/tracking`, { token: t })).then((r) => setData(r.data)).catch((e) => setError(e.message)); }, [orderId, token]);
  if (error) return <p className="mt-3 text-xs text-red-600">{error}</p>;
  if (!data) return <p className="mt-3 text-xs text-slate-400">Loading tracking...</p>;
  const d = data.delivery;
  if (!d) return <p className="mt-3 text-xs text-slate-500">A delivery partner hasn't been assigned yet.</p>;
  return <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-bold capitalize">Delivery: {prettify(d.status)}</p>{d.driver && <p className="mt-1 text-slate-600">{d.driver.fullName}{d.driver.phone ? ` · ${d.driver.phone}` : ""}{d.driver.vehicleNumber ? ` · ${d.driver.vehicleNumber}` : ""}</p>}<ol className="mt-3 space-y-1 border-l-2 border-indigo-200 pl-3">{(d.timeline || []).map((t, i) => <li key={i} className="text-xs text-slate-500"><span className="font-semibold capitalize text-slate-700">{prettify(t.status)}</span> · {new Date(t.at).toLocaleString()}</li>)}</ol></div>;
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

  if (!signedIn) return <main className="mx-auto max-w-4xl px-5 py-16"><AuthPrompt/></main>;
  if (loading) return <Loading/>;
  return <main className="mx-auto max-w-5xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">My orders</h1><div className="mt-8 space-y-4">{orders.length ? orders.map((o) => {
    const awaitingPayment = o.paymentMethod === "razorpay" && o.paymentStatus === "pending" && o.orderStatus !== "cancelled";
    const canCancel = o.orderStatus === "placed" && o.paymentStatus !== "paid";
    return <div key={o._id} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-500">Order number{o.shop?.name ? ` · ${o.shop.name}` : ""}</p><p className="font-extrabold">{o.orderNumber || o._id}</p></div><div className="flex gap-2"><Pill tone={payTone(o.paymentStatus)}>{o.paymentMethod === "cod" ? "COD · " : ""}{o.paymentStatus}</Pill><Pill tone={orderTone(o.orderStatus)}>{statusLabel(meta, o.orderStatus)}</Pill></div></div>
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">{(o.items || []).map((it, i) => <div key={i} className="flex items-center gap-3 text-sm"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">{(it.image || imageOf(it.product?.images)) && <img src={it.image || imageOf(it.product?.images)} className="h-full w-full object-cover" alt=""/>}</div><span className="flex-1 text-slate-700">{it.name || it.product?.name}{it.size ? ` (${it.size})` : ""} × {it.quantity}</span><span className="font-semibold">{money(it.price * it.quantity)}</span></div>)}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">{new Date(o.createdAt).toLocaleDateString()}{o.shippingCost ? ` · incl. ${money(o.shippingCost)} shipping` : ""}</span><strong>{money(o.totalAmount)}</strong></div>
      {awaitingPayment && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Payment pending. Unpaid online orders are cancelled automatically after a short time.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {awaitingPayment && <button disabled={busyId === o._id} onClick={() => payNow(o)} className="btn-primary px-4 py-2">Pay now</button>}
        {canCancel && <button disabled={busyId === o._id} onClick={() => cancel(o)} className="btn-secondary px-4 py-2">Cancel order</button>}
        {o.orderStatus !== "cancelled" && <button onClick={() => setTracking(tracking === o._id ? null : o._id)} className="btn-secondary px-4 py-2">{tracking === o._id ? "Hide tracking" : "Track"}</button>}
      </div>
      {tracking === o._id && <Tracking orderId={o._id} token={token}/>}
    </div>;
  }) : <Empty title="No orders yet" detail="Your orders will appear here after checkout."/>}</div></main>;
}

/* --------------------------------------------------------------- Account */
export function Account({ token, signedIn, user, tell }) {
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

  if (!signedIn) return <main className="mx-auto max-w-4xl px-5 py-16"><AuthPrompt/></main>;
  return <main className="mx-auto max-w-4xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">Your account</h1>
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-4"><img src={user?.imageUrl} className="h-14 w-14 rounded-full bg-slate-100" alt=""/><div><h2 className="font-bold">{user?.fullName || "Customer"}</h2><p className="text-sm text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p></div></div></div>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Delivery addresses</h2>{!editing && <button onClick={startNew} className="btn-primary px-4 py-2">Add address</button>}</div>
      {!editing && <div className="mt-5 space-y-3">{addresses.length ? addresses.map((a) => <div key={a._id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-4"><div className="text-sm"><p className="font-bold">{a.fullName || "Recipient"} {a.phone && <span className="font-normal text-slate-500">· {a.phone}</span>} <Pill tone="gray">{a.type}</Pill> {a.isDefault && <Pill tone="blue">default</Pill>}</p><p className="mt-1 text-slate-600">{a.street}, {a.city}, {a.state} {a.zipCode}, {a.country}</p>{a.location && <p className="text-xs text-slate-400">{a.location}{a.landmark ? ` · near ${a.landmark}` : ""}</p>}</div><div className="flex gap-2">{!a.isDefault && <button onClick={() => makeDefault(a)} className="btn-secondary px-3 py-2 text-xs">Make default</button>}<button onClick={() => startEdit(a)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><Edit3 size={15}/></button><button onClick={() => remove(a)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 size={15}/></button></div></div>) : <p className="text-sm text-slate-500">No saved addresses yet.</p>}</div>}
      {editing && <form onSubmit={submit} className="mt-5"><div className="mb-4"><label className="label">Address type</label><select className="input mt-1 w-full sm:w-48" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Home</option><option>Work</option><option>Other</option></select></div><AddressFields form={form} setForm={setForm} locations={meta.locations}/><label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}/> Make this my default address</label><div className="mt-5 flex gap-3"><button disabled={loading} className="btn-primary">{loading ? "Saving..." : "Save address"}</button><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button></div></form>}
    </section></main>;
}

/* -------------------------------------------------------------- Wishlist */
export function Wishlist({ token, signedIn, tell }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!signedIn) { setLoading(false); return; } try { const r = await api("/api/wishlist", { token: await token() }); setItems(r.data || []); } catch (e) { tell(e.message, "error"); } finally { setLoading(false); } }, [signedIn, token, tell]);
  useEffect(() => { load(); }, [load]);
  const remove = async (id) => { try { await api(`/api/wishlist/${id}`, { token: await token(), method: "DELETE" }); await load(); } catch (e) { tell(e.message, "error"); } };
  if (!signedIn) return <main className="mx-auto max-w-4xl px-5 py-16"><AuthPrompt/></main>;
  if (loading) return <Loading/>;
  return <main className="mx-auto max-w-7xl px-5 py-12"><h1 className="font-display text-4xl font-extrabold">Wishlist</h1>{items.length ? <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <div key={p._id} className="relative"><ProductCard p={p}/><button onClick={() => remove(p._id)} title="Remove" className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow hover:text-red-600"><Heart size={16} className="fill-red-500 text-red-500"/></button></div>)}</div> : <div className="mt-8"><Empty title="Nothing saved yet" detail="Tap the heart on a product to save it here."/></div>}</main>;
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
  return <main className="mx-auto max-w-7xl px-5 py-12">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Local shops</p><h1 className="mt-2 font-display text-4xl font-extrabold">Shop by store</h1></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shops..." className="input pl-10"/></div><select value={location} onChange={(e) => setSp(e.target.value ? { location: e.target.value } : {}, { replace: true })} className="input"><option value="">All locations</option>{meta.locations.map((l) => <option key={l}>{l}</option>)}</select></div></div>
    {loading ? <Loading/> : shops.length ? <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shops.map((s) => <Link key={s._id} to={`/shop?shop=${s._id}`} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">{s.logo ? <img src={s.logo} alt="" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-slate-300"><Store size={26}/></div>}</div><div className="min-w-0"><h3 className="truncate font-extrabold">{s.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12}/>{s.location}{s.addressLine ? ` · ${s.addressLine}` : ""}</p>{s.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{s.description}</p>}{s.isOpen === false && <p className="mt-2 text-xs font-bold text-red-500">Currently closed</p>}</div></Link>)}</div> : <div className="mt-8"><Empty title="No shops found" detail="Try another location or search."/></div>}
  </main>;
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
    <button onClick={() => { setOpen(!open); if (!open) load(); }} className="relative rounded-full p-2 hover:bg-slate-100" title="Notifications"><Bell size={20}/>{unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}</button>
    {open && <><div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/><div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-sm font-extrabold">Notifications</span>{unread > 0 && <button onClick={readAll} className="text-xs font-bold text-indigo-600">Mark all read</button>}</div><div className="max-h-96 overflow-y-auto">{items.length ? items.map((n) => <button key={n._id} onClick={() => openItem(n)} className={cx("block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50", !n.isRead && "bg-indigo-50/50")}><p className="text-sm font-bold">{n.title}</p>{n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}<p className="mt-1 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p></button>) : <p className="p-6 text-center text-sm text-slate-400">You're all caught up.</p>}</div></div></>}
  </div>;
}
