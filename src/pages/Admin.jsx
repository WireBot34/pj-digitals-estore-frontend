import React, { useEffect, useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { ArrowRight, ClipboardList, CreditCard, Edit3, ImagePlus, LayoutDashboard, LogOut, Megaphone, Menu, Package, Plus, RefreshCw, Search, Store, Trash2, Truck, Users, X } from "lucide-react";
import { api, imageOf, money, qs } from "../api";
import { useMeta, statusLabel } from "../meta";
import { Empty, Loading, Pager, Pill, cx, orderTone, payTone, prettify } from "../ui";
import { useList } from "../useList";

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
  const nav = [["overview", "Overview", LayoutDashboard], ["products", "Products", Package], ["orders", "Orders", ClipboardList], ["shops", "Shops", Store], ["drivers", "Delivery partners", Truck], ["ads", "Advertisements", Megaphone]];
  const [tick, setTick] = useState(0); // bump to reload the open section
  return <div className="min-h-screen bg-[#f5f6fa]">
    <aside className={cx("fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#111827] text-white transition-transform md:translate-x-0", mobile ? "translate-x-0" : "-translate-x-full")}><div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><div><p className="font-display text-lg font-extrabold">PJ DIGIT<span className="text-indigo-400">ALS</span></p><p className="text-[10px] uppercase tracking-[.2em] text-slate-400">Admin workspace</p></div><button className="md:hidden" onClick={() => setMobile(false)}><X/></button></div>
      <div className="px-4 py-6"><p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Workspace</p><nav className="mt-3 space-y-1">{nav.map(([key, label, Icon]) => <button key={key} onClick={() => { setSection(key); setMobile(false); }} className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold", section === key ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/5")}><Icon size={18}/>{label}</button>)}</nav></div>
      <div className="mt-auto border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><img src={user?.imageUrl} className="h-9 w-9 rounded-full bg-slate-700" alt=""/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user?.fullName || "Administrator"}</p><p className="text-xs text-indigo-300">Administrator</p></div><button title="Sign out" onClick={() => signOut()}><LogOut size={16}/></button></div></div></aside>
    {mobile && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobile(false)}/>}
    <div className="min-h-screen md:pl-64"><header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button className="md:hidden" onClick={() => setMobile(true)}><Menu/></button><div><p className="text-xs font-semibold text-slate-400">PJ Digitals / Admin</p><h1 className="font-display text-xl font-extrabold">{section === "overview" ? "Dashboard" : nav.find((n) => n[0] === section)?.[1]}</h1></div></div><div className="flex items-center gap-3"><button onClick={() => setTick(tick + 1)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="Refresh"><RefreshCw size={17}/></button><span className="hidden text-sm font-semibold text-slate-600 sm:block">{user?.firstName || "Admin"}</span><UserButton/></div></header>
      <main className="mx-auto max-w-7xl p-5 md:p-8">
        {section === "overview" && <Overview key={tick} token={token} tell={tell} setSection={setSection}/>}
        {section === "products" && <Products key={tick} token={token} tell={tell}/>}
        {section === "orders" && <Orders key={tick} token={token} tell={tell}/>}
        {section === "shops" && <Approvals key={`s${tick}`} kind="shop" token={token} tell={tell}/>}
        {section === "drivers" && <Approvals key={`d${tick}`} kind="driver" token={token} tell={tell}/>}
        {section === "ads" && <Ads key={tick} token={token} tell={tell}/>}
      </main>
    </div>
  </div>;
}

/* -------------------------------------------------------------- Overview */
function Overview({ token, tell, setSection }) {
  const meta = useMeta();
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => { (async () => { try { const r = await api("/api/admin/stats", { token: await token() }); setStats(r.data); } catch (e) { tell(`Admin data: ${e.message}`, "error"); } finally { setBusy(false); } })(); }, [token, tell]);
  const cards = [["Revenue", money(stats?.totalRevenue), "Paid orders", CreditCard], ["Orders", stats?.totalOrders ?? "—", "All customer orders", ClipboardList], ["Products", stats?.totalProducts ?? "—", "Products in catalogue", Package], ["Customers", stats?.totalUsers ?? "—", "Registered accounts", Users]];
  return <><div className="mb-7"><h2 className="text-2xl font-extrabold">Good to see you.</h2><p className="mt-1 text-sm text-slate-500">Here's what's happening in your store.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title, value, desc, Icon]) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{title}</span><span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Icon size={18}/></span></div><p className="mt-5 font-display text-3xl font-extrabold">{busy ? "…" : value}</p><p className="mt-1 text-xs text-slate-400">{desc}</p></div>)}</div>
    {stats?.ordersByStatus && <div className="mt-6 flex flex-wrap gap-2">{Object.entries(stats.ordersByStatus).map(([s, n]) => <Pill key={s} tone={orderTone(s)}>{statusLabel(meta, s)}: {n}</Pill>)}</div>}
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-extrabold">Recent orders</h3><button onClick={() => setSection("orders")} className="text-xs font-bold text-indigo-600">View all</button></div><div className="mt-5 space-y-4">{(stats?.recentOrders || []).map((o) => <div key={o._id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="text-sm font-bold">{o.orderNumber || o._id}</p><p className="text-xs text-slate-400">{o.user?.name || o.user?.email || "Customer"} · {new Date(o.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="text-sm font-extrabold">{money(o.totalAmount)}</p><p className="text-xs text-slate-400">{statusLabel(meta, o.orderStatus)}</p></div></div>)}{!busy && !stats?.recentOrders?.length && <p className="text-sm text-slate-400">No orders found yet.</p>}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-extrabold">Low stock</h3><div className="mt-4 space-y-3">{(stats?.lowStockProducts || []).map((p) => <div key={p._id} className="flex items-center justify-between text-sm"><span className="truncate pr-3">{p.name}</span><Pill tone={p.stock === 0 ? "red" : "amber"}>{p.stock} left</Pill></div>)}{!busy && !stats?.lowStockProducts?.length && <p className="text-sm text-slate-400">All products are well stocked.</p>}</div>
        <h3 className="mt-8 font-extrabold">Needs your attention</h3>
        {[["shops", "Review shop applications"], ["drivers", "Review delivery partners"], ["ads", "Moderate advertisements"]].map(([k, label]) => <button key={k} onClick={() => setSection(k)} className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50 p-4 text-left text-sm font-bold text-slate-700">{label} <ArrowRight size={17}/></button>)}</div>
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
  const [form, setForm] = useState({ name: product?.name || "", description: product?.description || "", price: product?.price ?? "", comparePrice: product?.comparePrice ?? "", category: product?.category || "Other", stock: product?.stock ?? 0, sizes: product?.sizes?.join(", ") || "", isFeatured: !!product?.isFeatured, isActive: product?.isActive !== false, shop: "" });
  const [existing, setExisting] = useState(product?.images || []);
  const [files, setFiles] = useState([]);
  const [shops, setShops] = useState([]);
  const [saving, setSaving] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  useEffect(() => { // admins may assign a new product to a shop
    if (product || owner) return;
    (async () => { try { const r = await api("/api/admin/shops" + qs({ status: "approved", limit: 100 }), { token: await token() }); setShops(r.data || []); } catch { /* optional */ } })();
  }, [product, token]);

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
    if (!product && !owner && form.shop) fd.append("shop", form.shop);
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
      {!product && !owner && <div><label className="label">Shop</label><select className="input w-full" name="shop" value={form.shop} onChange={change}><option value="">Platform (no shop)</option>{shops.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.location}</option>)}</select></div>}
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
        <td className="px-5 py-4"><Pill tone={payTone(o.paymentStatus)}>{o.paymentStatus}</Pill><p className="mt-1 text-xs uppercase text-slate-400">{o.paymentMethod === "razorpay" ? "online" : "cod"}</p></td>
        <td className="px-5 py-4"><select value={o.orderStatus} disabled={!next.length} onChange={(e) => update(o, e.target.value)} className="input py-2"><option value={o.orderStatus}>{statusLabel(meta, o.orderStatus)}</option>{next.map((s) => <option key={s} value={s}>{statusLabel(meta, s)}</option>)}</select></td>
        <td className="px-5 py-4">{d && !["cancelled", "rejected"].includes(d.status) ? <div className="text-xs"><Pill tone={d.status === "delivered" ? "green" : "blue"}>{prettify(d.status)}</Pill><p className="mt-1 text-slate-500">{d.driver?.fullName}</p></div> : canAssign ? <button onClick={() => setAssigning(o)} className="btn-secondary px-3 py-2 text-xs"><Truck size={14}/> Assign</button> : <span className="text-xs text-slate-400">{ready ? "—" : "Awaiting payment"}</span>}</td></tr>;
    })}</tbody></table></div>{!data.length && <div className="p-10"><Empty title="No orders found" detail="Orders will appear here when customers check out."/></div>}</div>}
    <Pager pagination={pagination} onPage={setPage}/>
    {assigning && <AssignModal order={assigning} token={token} tell={tell} close={() => setAssigning(null)} done={() => { setAssigning(null); reload(); }}/>}</>;
}

function AssignModal({ order, token, tell, close, done }) {
  const [drivers, setDrivers] = useState(null);
  const [driverId, setDriverId] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => { try { const r = await api("/api/admin/delivery-partners" + qs({ status: "approved", limit: 100 }), { token: await token() }); setDrivers(r.data || []); } catch (e) { tell(e.message, "error"); setDrivers([]); } })(); }, [token, tell]);
  const submit = async (e) => { e.preventDefault(); setBusy(true); try { await api("/api/admin/deliveries", { token: await token(), method: "POST", body: { orderId: order._id, driverId } }); tell("Delivery partner assigned."); done(); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); } };
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Assign delivery partner</h2><button type="button" onClick={close}><X/></button></div><p className="mt-1 text-sm text-slate-500">Order {order.orderNumber}{order.shop?.name ? ` · pickup from ${order.shop.name}` : ""}</p>
    {drivers === null ? <Loading/> : drivers.length ? <select required className="input mt-5 w-full" value={driverId} onChange={(e) => setDriverId(e.target.value)}><option value="">Select a driver</option>{drivers.map((d) => <option key={d._id} value={d._id}>{d.fullName} · {d.isAvailable ? "online" : "offline"}{d.serviceLocations?.length ? ` · ${d.serviceLocations.join("/")}` : ""}</option>)}</select> : <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No approved delivery partners yet. Approve an application first.</p>}
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={busy || !driverId} className="btn-primary">{busy ? "Assigning..." : "Assign"}</button></div></form></div>;
}

/* ------------------------------------------------- Shops / drivers (approval) */
function Approvals({ kind, token, tell }) {
  const isShop = kind === "shop";
  const path = isShop ? "/api/admin/shops" : "/api/admin/delivery-partners";
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const { data, pagination, loading, reload } = useList(path, { status, page, limit: 15 }, token, tell);

  const setState = async (item, next) => {
    let reason;
    if (next === "rejected" || next === "suspended") {
      reason = window.prompt(`Reason for ${next === "rejected" ? "rejecting" : "suspending"} (the applicant will see this):`);
      if (reason === null) return;
      if (!reason.trim()) { tell("A reason is required.", "error"); return; }
    }
    try { await api(`${path}/${item._id}/status`, { token: await token(), method: "PUT", body: { status: next, reason } }); tell(`Marked ${next}.`); await reload(); } catch (e) { tell(e.message, "error"); }
  };

  return <><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">{isShop ? "Shops" : "Delivery partners"}</h2><p className="mt-1 text-sm text-slate-500">{isShop ? "Approving a shop gives its owner access to the shop app." : "Approved partners can be assigned deliveries."}</p></div>
    <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">{["pending", "approved", "rejected", "suspended"].map((s) => <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={cx("rounded-lg px-3 py-1.5 text-xs font-bold capitalize", status === s ? "bg-indigo-600 text-white" : "text-slate-500")}>{s}</button>)}</div></div>
    {loading ? <Loading/> : data.length ? <div className="space-y-3">{data.map((it) => <div key={it._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex min-w-0 items-center gap-4"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">{(it.logo || it.photo) ? <img src={it.logo || it.photo} className="h-full w-full object-cover" alt=""/> : <div className="grid h-full place-items-center text-slate-300">{isShop ? <Store size={22}/> : <Truck size={22}/>}</div>}</div>
        <div className="min-w-0"><p className="truncate font-extrabold">{isShop ? it.name : it.fullName} <Pill tone={statusTone(it.status)}>{it.status}</Pill></p><p className="text-sm text-slate-500">{it.phone}{isShop ? ` · ${it.location}${it.addressLine ? ", " + it.addressLine : ""}` : ` · ${prettify(it.vehicleType)}${it.vehicleNumber ? " " + it.vehicleNumber : ""}${it.serviceLocations?.length ? " · " + it.serviceLocations.join("/") : ""}`}</p><p className="text-xs text-slate-400">{isShop ? "Owner" : "User"}: {(isShop ? it.owner : it.user)?.name || "—"} ({(isShop ? it.owner : it.user)?.email || "no email"}){it.statusReason ? ` · ${it.statusReason}` : ""}</p></div></div>
      <div className="flex gap-2">{it.status !== "approved" && <button onClick={() => setState(it, "approved")} className="btn-primary px-4 py-2">Approve</button>}{it.status === "pending" && <button onClick={() => setState(it, "rejected")} className="btn-secondary px-4 py-2 text-red-600">Reject</button>}{it.status === "approved" && <button onClick={() => setState(it, "suspended")} className="btn-secondary px-4 py-2 text-red-600">Suspend</button>}</div>
    </div>)}</div> : <Empty title={`No ${status} ${isShop ? "shops" : "delivery partners"}`} detail="Nothing to review here right now."/>}
    <Pager pagination={pagination} onPage={setPage}/></>;
}

/* ------------------------------------------------------------------- Ads */
function Ads({ token, tell }) {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const { data, pagination, loading, reload } = useList("/api/admin/ads", { status, page, limit: 12 }, token, tell);
  const moderate = async (ad, next) => {
    let reason;
    if (next === "rejected") { reason = window.prompt("Reason for rejecting (the shop will see this):"); if (reason === null) return; if (!reason.trim()) { tell("A reason is required.", "error"); return; } }
    try { await api(`/api/admin/ads/${ad._id}/status`, { token: await token(), method: "PUT", body: { status: next, reason } }); tell(`Ad ${next}.`); await reload(); } catch (e) { tell(e.message, "error"); }
  };
  return <><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Advertisements</h2><p className="mt-1 text-sm text-slate-500">Approved ads appear on the customer home page.</p></div>
    <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">{["pending", "approved", "rejected"].map((s) => <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={cx("rounded-lg px-3 py-1.5 text-xs font-bold capitalize", status === s ? "bg-indigo-600 text-white" : "text-slate-500")}>{s}</button>)}</div></div>
    {loading ? <Loading/> : data.length ? <div className="grid gap-4 md:grid-cols-2">{data.map((ad) => <div key={ad._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{ad.image && <img src={ad.image} alt={ad.title} className="h-44 w-full object-cover"/>}<div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-extrabold">{ad.title}</h3><Pill tone={statusTone(ad.status)}>{ad.status}</Pill></div>{ad.description && <p className="mt-1 text-sm text-slate-500">{ad.description}</p>}<p className="mt-2 text-xs text-slate-400">{ad.shop?.name} · {ad.targetLocations?.length ? ad.targetLocations.join(", ") : "All locations"} · {new Date(ad.startsAt).toLocaleDateString()}{ad.endsAt ? ` → ${new Date(ad.endsAt).toLocaleDateString()}` : ""}</p>{ad.rejectionReason && <p className="mt-2 text-xs text-red-600">Rejected: {ad.rejectionReason}</p>}<div className="mt-4 flex gap-2">{ad.status !== "approved" && <button onClick={() => moderate(ad, "approved")} className="btn-primary px-4 py-2">Approve</button>}{ad.status !== "rejected" && <button onClick={() => moderate(ad, "rejected")} className="btn-secondary px-4 py-2 text-red-600">Reject</button>}</div></div></div>)}</div> : <Empty title={`No ${status} ads`} detail="Nothing to moderate right now."/>}
    <Pager pagination={pagination} onPage={setPage}/></>;
}
