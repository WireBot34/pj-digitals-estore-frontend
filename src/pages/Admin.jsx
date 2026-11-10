import React, { useEffect, useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { ArrowRight, Banknote, ClipboardList, CreditCard, Edit3, History, ImagePlus, LayoutDashboard, LifeBuoy, LogOut, Megaphone, Menu, Package, Plus, RefreshCw, Search, Settings, Store, Trash2, Truck, UserCog, Users, X } from "lucide-react";
import { api, imageOf, money, qs, setActAs } from "../api";
import { useMeta, statusLabel } from "../meta";
import { Empty, Loading, Pager, Pill, cx, orderTone, payTone, prettify } from "../ui";
import { useList } from "../useList";
import { DriversAdmin, ShopsAdmin, Users as UsersAdmin } from "./admin/people";
import { Payouts } from "./admin/money";
import { Activity, AdsAdmin, AssignDriver, DeliveriesAdmin, SettingsAdmin } from "./admin/ops";
import { SupportPanel } from "./SupportPanel";
import { ShopOwnerWorkspace } from "./ShopOwner";
import { DeliveryWorkspace } from "./Delivery";

const statusTone = (s) => ({ approved: "green", pending: "amber", rejected: "red", suspended: "red" })[s] || "gray";

// what the backend allows an admin to do from each order status
const NEXT_STATUS = {
  placed: ["processing", "shipping", "delivered", "cancelled"],
  processing: ["shipping", "delivered", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function AdminShell({ token, user, signOut, tell }) {
  const [section, setSection] = useState("overview");
  const [mobile, setMobile] = useState(false);
  const meta = useMeta();
  const [acting, setActing] = useState(null); // { kind: "shop" | "driver", entity }
  const nav = [["overview", "Overview", LayoutDashboard], ["products", "Products", Package], ["orders", "Orders", ClipboardList], ["deliveries", "Deliveries", Truck], ["shops", "Shops", Store], ["drivers", "Delivery partners", UserCog], ["users", "Users", Users], ["ads", "Advertisements", Megaphone], ["payouts", "Payouts", Banknote], ["support", "Support", LifeBuoy], ["activity", "Activity log", History], ["settings", "Settings", Settings]];
  const [tick, setTick] = useState(0); // bump to reload the open section

  // "Manage as": the admin runs the real shop / driver workspace, with the backend acting as that account
  const manageShop = (shop) => { setActAs({ shop: shop._id }); setActing({ kind: "shop", entity: shop }); };
  const manageDriver = (driver) => { setActAs({ driver: driver._id }); setActing({ kind: "driver", entity: driver }); };
  const exitActing = () => { setActAs({}); setActing(null); setTick((t) => t + 1); };
  useEffect(() => () => setActAs({}), []);
  const refreshActing = async () => {
    if (!acting) return null;
    const isShop = acting.kind === "shop";
    const r = await api(isShop ? `/api/admin/shops/${acting.entity._id}` : `/api/admin/delivery-partners/${acting.entity._id}`, { token: await token() });
    const entity = isShop ? r.data.shop : r.data.partner;
    setActing({ kind: acting.kind, entity });
    return entity;
  };

  if (acting) {
    const e = acting.entity;
    return acting.kind === "shop"
      ? <ShopOwnerWorkspace token={token} me={{ shop: e }} refreshMe={refreshActing} tell={tell} exit={exitActing}/>
      : <DeliveryWorkspace token={token} me={{ deliveryPartner: e }} refreshMe={refreshActing} tell={tell} exit={exitActing}/>;
  }

  return <div className="min-h-screen bg-[#f5f6fa]">
    <aside className={cx("fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#111827] text-white transition-transform md:translate-x-0", mobile ? "translate-x-0" : "-translate-x-full")}><div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><div><p className="font-display text-lg font-extrabold">PJ DIGIT<span className="text-indigo-400">ALS</span></p><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">Admin workspace</p></div><button className="md:hidden" onClick={() => setMobile(false)}><X/></button></div>
      <div className="flex-1 overflow-y-auto px-4 py-6"><p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Workspace</p><nav className="mt-3 space-y-1">{nav.map(([key, label, Icon]) => <button key={key} onClick={() => { setSection(key); setMobile(false); }} className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold", section === key ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/5")}><Icon size={18}/>{label}</button>)}</nav></div>
      <div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><img src={user?.imageUrl} className="h-9 w-9 rounded-full bg-slate-700" alt=""/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user?.fullName || "Administrator"}</p><p className="text-xs text-indigo-300">Administrator</p></div><button title="Sign out" onClick={() => signOut()}><LogOut size={16}/></button></div></div></aside>
    {mobile && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobile(false)}/>}
    <div className="min-h-screen md:pl-64"><header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button className="md:hidden" onClick={() => setMobile(true)}><Menu/></button><div><p className="text-xs font-semibold text-slate-400">PJ Digitals / Admin</p><h1 className="font-display text-xl font-extrabold">{section === "overview" ? "Dashboard" : nav.find((n) => n[0] === section)?.[1]}</h1></div></div><div className="flex items-center gap-3"><a href="/" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:block">View store</a><button onClick={() => setTick(tick + 1)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="Refresh"><RefreshCw size={17}/></button><UserButton/></div></header>
      <main className="mx-auto max-w-7xl p-5 md:p-8">
        {meta.loaded && !meta.apiVersion && <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Your API server looks out of date.</b> Ad placements, payouts, shop driver-assignment and the new admin tools need server v4.1 — deploy it and restart, otherwise those settings are silently ignored.</div>}
        {section === "overview" && <Overview key={tick} token={token} tell={tell} setSection={setSection}/>}
        {section === "products" && <Products key={tick} token={token} tell={tell}/>}
        {section === "orders" && <Orders key={tick} token={token} tell={tell}/>}
        {section === "deliveries" && <DeliveriesAdmin key={tick} token={token} tell={tell} manageDriver={manageDriver}/>}
        {section === "shops" && <ShopsAdmin key={tick} token={token} tell={tell} manage={manageShop}/>}
        {section === "drivers" && <DriversAdmin key={tick} token={token} tell={tell} manage={manageDriver}/>}
        {section === "users" && <UsersAdmin key={tick} token={token} tell={tell} manageShop={manageShop} manageDriver={manageDriver}/>}
        {section === "ads" && <AdsAdmin key={tick} token={token} tell={tell}/>}
        {section === "payouts" && <Payouts key={tick} token={token} tell={tell}/>}
        {section === "support" && <SupportPanel key={tick} token={token} tell={tell} admin/>}
        {section === "activity" && <Activity key={tick} token={token} tell={tell}/>}
        {section === "settings" && <SettingsAdmin key={tick} token={token} tell={tell}/>}
      </main>
    </div>
  </div>;
}

/* -------------------------------------------------------------- Overview */
function Overview({ token, tell, setSection }) {
  const meta = useMeta();
  const [stats, setStats] = useState(null);
  const [extra, setExtra] = useState(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => { (async () => { try { const t = await token(); const [r, o] = await Promise.all([api("/api/admin/stats", { token: t }), api("/api/admin/overview", { token: t }).catch(() => null)]); setStats(r.data); setExtra(o?.data || null); } catch (e) { tell(`Admin data: ${e.message}`, "error"); } finally { setBusy(false); } })(); }, [token, tell]);
  const cards = [["Revenue", money(stats?.totalRevenue), "Paid orders", CreditCard], ["Orders", stats?.totalOrders ?? "—", "All customer orders", ClipboardList], ["Products", stats?.totalProducts ?? "—", "Products in catalogue", Package], ["Customers", stats?.totalUsers ?? "—", "Registered accounts", Users]];
  return <><div className="mb-7"><h2 className="text-2xl font-extrabold">Good to see you.</h2><p className="mt-1 text-sm text-slate-500">Here's what's happening in your store.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title, value, desc, Icon]) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{title}</span><span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Icon size={18}/></span></div><p className="mt-5 font-display text-3xl font-extrabold">{busy ? "…" : value}</p><p className="mt-1 text-xs text-slate-400">{desc}</p></div>)}</div>
    {extra && <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Today's orders", extra.today.orders, money(extra.today.revenue) + " collected", null], ["Owed to shops", money(extra.shopSalesAwaitingSettlement), "Delivered, not yet settled", "payouts"], ["Driver fees owed", money(extra.driverFeesAwaitingSettlement), "Not yet settled", "payouts"], ["COD cash with drivers", money(extra.codHeldByDrivers), "Collect at settlement", "payouts"]].map(([t, v, d, go]) => <button key={t} onClick={() => go && setSection(go)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left"><p className="text-xs font-semibold text-slate-500">{t}</p><p className="mt-2 font-display text-2xl font-extrabold">{v}</p><p className="mt-1 text-[11px] text-slate-400">{d}</p></button>)}</div>}
    {stats?.ordersByStatus && <div className="mt-6 flex flex-wrap gap-2">{Object.entries(stats.ordersByStatus).map(([s, n]) => <Pill key={s} tone={orderTone(s)}>{statusLabel(meta, s)}: {n}</Pill>)}</div>}
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-extrabold">Recent orders</h3><button onClick={() => setSection("orders")} className="text-xs font-bold text-indigo-600">View all</button></div><div className="mt-5 space-y-4">{(stats?.recentOrders || []).map((o) => <div key={o._id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-bold">{o.orderNumber || o._id}</p><p className="text-xs text-slate-400">{o.user?.name || o.user?.email || "Customer"} · {new Date(o.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="text-sm font-extrabold">{money(o.totalAmount)}</p><p className="text-xs text-slate-400">{statusLabel(meta, o.orderStatus)}</p></div></div>)}{!busy && !stats?.recentOrders?.length && <p className="text-sm text-slate-400">No orders found yet.</p>}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-extrabold">Low stock</h3><div className="mt-4 space-y-3">{(stats?.lowStockProducts || []).map((p) => <div key={p._id} className="flex items-center justify-between text-sm"><span className="truncate pr-3">{p.name}</span><Pill tone={p.stock === 0 ? "red" : "amber"}>{p.stock} left</Pill></div>)}{!busy && !stats?.lowStockProducts?.length && <p className="text-sm text-slate-400">All products are well stocked.</p>}</div>
        <h3 className="mt-8 font-extrabold">Needs your attention</h3>
        {[["shops", "Review shop applications"], ["drivers", "Review delivery partners"], ["ads", "Moderate advertisements"], ["support", "Answer support tickets"], ["deliveries", "Dispatch ready orders"]].map(([k, label]) => <button key={k} onClick={() => setSection(k)} className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50 p-4 text-left text-sm font-bold text-slate-700">{label} <ArrowRight size={17}/></button>)}</div>
    </div></>;
}

/* -------------------------------------------------------------- Products */
function Products({ token, tell }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const { data, pagination, loading, reload } = useList("/api/products", { includeInactive: "true", limit: 15, page, search: q }, token, tell);
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(false);

  const save = async (formData, id) => {
    try { await api(id ? `/api/products/${id}` : "/api/products", { token: await token(), method: id ? "PUT" : "POST", body: formData }); tell(id ? "Product updated." : "Product created."); setModal(false); setEditing(null); await reload(); }
    catch (e) { tell(e.message, "error"); }
  };
  const remove = async (id) => { if (!confirm("Delete this product? This cannot be undone.")) return; try { await api(`/api/products/${id}`, { token: await token(), method: "DELETE" }); tell("Product deleted."); await reload(); } catch (e) { tell(e.message, "error"); } };

  return <><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Product catalogue</h2><p className="mt-1 text-sm text-slate-500">Includes inactive products. Shop owners manage their own products from the shop app.</p></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}/></div><button onClick={() => { setEditing(null); setModal(true); }} className="btn-primary"><Plus size={17}/> Add product</button></div></div>
    {loading ? <Loading/> : <ProductTable products={data} onEdit={(p) => { setEditing(p); setModal(true); }} onDelete={remove}/>}
    <Pager pagination={pagination} onPage={setPage}/>
    {modal && <ProductModal product={editing} token={token} close={() => { setModal(false); setEditing(null); }} save={save} tell={tell}/>}</>;
}

function ProductTable({ products, onEdit, onDelete }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Product</th><th className="px-5 py-4">Shop</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((p) => <tr key={p._id}><td className="px-5 py-4"><div className="flex items-center gap-3"><img src={imageOf(p.images)} className="h-11 w-11 rounded-lg bg-slate-100 object-cover" alt=""/><div><p className="font-bold">{p.name}</p><p className="text-xs text-slate-400">{p._id}</p></div></div></td><td className="px-5 py-4 text-slate-500">{p.shop?.name || "Platform"}</td><td className="px-5 py-4 text-slate-500">{p.category}</td><td className="px-5 py-4 font-bold">{money(p.price)}</td><td className="px-5 py-4">{p.stock}</td><td className="px-5 py-4"><Pill tone={p.isActive ? "green" : "gray"}>{p.isActive ? "Active" : "Inactive"}</Pill></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => onEdit(p)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><Edit3 size={15}/></button><button onClick={() => onDelete(p._id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>{!products.length && <div className="p-10"><Empty title="No products found" detail="Add a product to populate the store."/></div>}</div>;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function ProductModal({ product, token, close, save, tell, owner = false }) {
  const meta = useMeta();
  const [form, setForm] = useState({ name: product?.name || "", description: product?.description || "", price: product?.price ?? "", comparePrice: product?.comparePrice ?? "", category: product?.category || "Other", stock: product?.stock ?? 0, sizes: product?.sizes?.join(", ") || "", isFeatured: !!product?.isFeatured, isActive: product?.isActive !== false, shop: product?.shop?._id || product?.shop || "" });
  const [existing, setExisting] = useState(product?.images || []);
  const [files, setFiles] = useState([]);
  const [shops, setShops] = useState([]);
  const [saving, setSaving] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  useEffect(() => { // admins may assign a new product to a shop
    if (owner) return;
    (async () => { try { const r = await api("/api/admin/shops" + qs({ status: "approved", limit: 100 }), { token: await token() }); setShops(r.data || []); } catch { /* optional */ } })();
  }, [owner, token]);

  const pickFiles = (e) => {
    const chosen = Array.from(e.target.files || []).slice(0, Math.max(0, 5 - existing.length));
    const bad = chosen.find((f) => !IMAGE_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES);
    if (bad) { tell(`"${bad.name}" must be a JPG, PNG, WEBP or AVIF image under 5 MB.`, "error"); e.target.value = ""; return; }
    setFiles(chosen);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!existing.length && !files.length) { tell("Add at least one product image.", "error"); return; }
    setSaving(true);
    const fd = new FormData();
    ["name", "description", "price", "stock", "category", ...(owner ? [] : ["isFeatured"]), "isActive"].forEach((k) => fd.append(k, String(form[k])));
    if (form.comparePrice !== "") fd.append("comparePrice", String(form.comparePrice));
    fd.append("sizes", JSON.stringify(form.sizes.split(",").map((s) => s.trim()).filter(Boolean)));
    if (!owner) fd.append("shop", form.shop);
    // always send the kept images (even an empty list) so removals take effect
    if (product) fd.append("existingImages", JSON.stringify(existing));
    files.forEach((f) => fd.append("images", f));
    await save(fd, product?._id);
    setSaving(false);
  };

  return <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/50 p-4"><form onSubmit={submit} className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold">{product ? "Edit product" : "Add product"}</h2><p className="mt-1 text-xs text-slate-500">Product details and image uploads.</p></div><button type="button" onClick={close}><X/></button></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label">Product name</label><input className="input w-full" name="name" required value={form.name} onChange={change}/></div>
      <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input w-full" rows="3" name="description" required value={form.description} onChange={change}/></div>
      <div><label className="label">Price (₹)</label><input className="input w-full" type="number" min="0" step="0.01" name="price" required value={form.price} onChange={change}/></div>
      <div><label className="label">Compare-at price (₹)</label><input className="input w-full" type="number" min="0" step="0.01" name="comparePrice" value={form.comparePrice} onChange={change}/></div>
      <div><label className="label">Stock</label><input className="input w-full" type="number" min="0" name="stock" required value={form.stock} onChange={change}/></div>
      <div><label className="label">Category</label><select className="input w-full" name="category" value={form.category} onChange={change}>{meta.categories.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div><label className="label">Sizes (comma separated)</label><input className="input w-full" name="sizes" value={form.sizes} onChange={change} placeholder="S, M, L"/></div>
      {!owner && <div><label className="label">Shop (owner of this product)</label><select className="input w-full" name="shop" value={form.shop} onChange={change}><option value="">Platform (no shop)</option>{shops.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.location}</option>)}{product?.shop?._id && !shops.some((x) => x._id === product.shop._id) && <option value={product.shop._id}>{product.shop.name}</option>}</select></div>}
      <div className="sm:col-span-2"><label className="label">Product images (up to 5)</label>
        {existing.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{existing.map((img) => <div key={img} className="relative h-16 w-16 overflow-hidden rounded-lg bg-slate-100"><img src={img} className="h-full w-full object-cover" alt=""/><button type="button" title="Remove" onClick={() => setExisting(existing.filter((x) => x !== img))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={12}/></button></div>)}</div>}
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500"><ImagePlus size={18}/>{files.length ? `${files.length} new file(s) selected` : "Choose images (JPG, PNG, WEBP, AVIF · max 5 MB each)"}<input className="hidden" type="file" accept={IMAGE_TYPES.join(",")} multiple onChange={pickFiles}/></label></div>
      {!owner && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={change}/> Featured product</label>}
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isActive" checked={form.isActive} onChange={change}/> Active</label>
    </div>
    <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? "Saving..." : product ? "Save changes" : "Create product"}</button></div></form></div>;
}

/* ---------------------------------------------------------------- Orders */
function Orders({ token, tell }) {
  const meta = useMeta();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [assigning, setAssigning] = useState(null);
  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const { data, pagination, loading, reload } = useList("/api/orders/admin/all", { page, limit: 15, status, paymentStatus, search: q }, token, tell);

  const update = async (order, next) => {
    try { await api(`/api/orders/${order._id}/status`, { token: await token(), method: "PUT", body: { orderStatus: next } }); tell("Order status updated."); await reload(); } catch (e) { tell(e.message, "error"); }
  };

  const overridePayment = async (o) => {
    const next = window.prompt(`Set payment status for ${o.orderNumber} (pending, paid, failed, refunded):`, o.paymentStatus);
    if (!next || next === o.paymentStatus) return;
    const note = window.prompt("Note for the activity log:", "Manual correction") ?? "";
    try { await api(`/api/admin/orders/${o._id}/payment`, { token: await token(), method: "PUT", body: { paymentStatus: next.trim(), note } }); tell("Payment status updated."); await reload(); } catch (e) { tell(e.message, "error"); }
  };

  return <><div className="mb-6"><h2 className="text-2xl font-extrabold">Order management</h2><p className="mt-1 text-sm text-slate-500">Each checkout creates one order per shop. Assign a delivery partner once an order is ready.</p></div>
    <div className="mb-4 flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" placeholder="Order number" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
      <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{meta.orderStatuses.map((s) => <option key={s} value={s}>{statusLabel(meta, s)}</option>)}</select>
      <select className="input" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}><option value="">All payments</option>{["pending", "paid", "failed", "refunded"].map((s) => <option key={s}>{s}</option>)}</select></div>
    {loading ? <Loading/> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Order</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Shop</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Delivery</th></tr></thead><tbody className="divide-y divide-slate-100">{data.map((o) => {
      const next = NEXT_STATUS[o.orderStatus] || [];
      const ready = o.paymentMethod === "cod" || o.paymentStatus === "paid";
      const d = o.delivery;
      const canAssign = ready && ["placed", "processing"].includes(o.orderStatus);
      return <tr key={o._id}><td className="px-5 py-4"><p className="font-bold">{o.orderNumber || o._id}</p><p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p></td><td className="px-5 py-4">{o.user?.name || o.user?.email || "Customer"}</td><td className="px-5 py-4 text-slate-500">{o.shop?.name || "Platform"}</td><td className="px-5 py-4 font-bold">{money(o.totalAmount)}</td>
        <td className="px-5 py-4"><Pill tone={payTone(o.paymentStatus)}>{o.paymentStatus}</Pill><p className="mt-1 text-xs uppercase text-slate-400">{o.paymentMethod === "razorpay" ? "online" : "cod"}</p>{!o.settlement && <button onClick={() => overridePayment(o)} className="mt-1 text-[11px] font-bold text-indigo-600">Change</button>}</td>
        <td className="px-5 py-4"><select value={o.orderStatus} disabled={!next.length} onChange={(e) => update(o, e.target.value)} className="input py-2"><option value={o.orderStatus}>{statusLabel(meta, o.orderStatus)}</option>{next.map((s) => <option key={s} value={s}>{statusLabel(meta, s)}</option>)}</select></td>
        <td className="px-5 py-4">{d && !["cancelled", "rejected"].includes(d.status) ? <div className="text-xs"><Pill tone={d.status === "delivered" ? "green" : "blue"}>{prettify(d.status)}</Pill><p className="mt-1 text-slate-500">{d.driver?.fullName}</p></div> : canAssign ? <button onClick={() => setAssigning(o)} className="btn-secondary px-3 py-2 text-xs"><Truck size={14}/> Assign</button> : <span className="text-xs text-slate-400">{ready ? "—" : "Awaiting payment"}</span>}</td></tr>;
    })}</tbody></table></div>{!data.length && <div className="p-10"><Empty title="No orders found" detail="Orders will appear here when customers check out."/></div>}</div>}
    <Pager pagination={pagination} onPage={setPage}/>
    {assigning && <AssignDriver order={assigning} token={token} tell={tell} close={() => setAssigning(null)} done={() => { setAssigning(null); reload(); }}/>}</>;
}
