import React, { useEffect, useState } from "react";
import { Edit3, ImagePlus, Plus, Search, Trash2 } from "lucide-react";
import { api, imageOf, money } from "../api";
import { useMeta, statusLabel } from "../meta";
import { useList } from "../useList";
import { Empty, Loading, Pager, Pill, cx, orderTone, payTone, prettify } from "../ui";
import { ProductModal } from "./Admin";
import { BlockedCard, WorkspaceFrame } from "./WorkspaceFrame";

const adTone = (s) => ({ approved: "green", pending: "amber", rejected: "red", draft: "gray" })[s] || "gray";
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const addressLine = (a = {}) => [a.fullName, a.street, a.landmark, a.location || a.city, a.state, a.zipCode].filter(Boolean).join(", ");

const TABS = [["overview", "Overview"], ["products", "Products"], ["orders", "Orders"], ["ads", "Advertisements"], ["settlements", "Payouts"], ["profile", "Shop profile"]];

export function ShopOwnerWorkspace({ token, me, refreshMe, tell }) {
  const shop = me?.shop;
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  if (!shop || shop.status !== "approved") return <BlockedCard noun="Shop" entry={shop}/>;

  const toggleOpen = async () => {
    setBusy(true);
    try { await api("/api/shop/me", { token: await token(), method: "PUT", body: { isOpen: !(shop.isOpen !== false) } }); await refreshMe(); }
    catch (e) { tell(e.message, "error"); } finally { setBusy(false); }
  };
  const open = shop.isOpen !== false;
  const actions = <button disabled={busy} onClick={toggleOpen} className={cx("rounded-full px-3 py-2 text-xs font-bold", open ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600")}>{open ? "Shop is open" : "Shop is closed"}</button>;

  return <WorkspaceFrame title={shop.name} subtitle={shop.location} tabs={TABS} tab={tab} setTab={setTab} actions={actions} token={token}>
    {tab === "overview" && <Overview token={token} tell={tell} setTab={setTab}/>}
    {tab === "products" && <Products token={token} tell={tell}/>}
    {tab === "orders" && <ShopOrders token={token} tell={tell}/>}
    {tab === "ads" && <Ads token={token} tell={tell}/>}
    {tab === "settlements" && <Settlements token={token} tell={tell}/>}
    {tab === "profile" && <Profile token={token} tell={tell} shop={shop} refreshMe={refreshMe}/>}
  </WorkspaceFrame>;
}

/* -------------------------------------------------------------- Overview */
function Overview({ token, tell, setTab }) {
  const meta = useMeta();
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  useEffect(() => { setStats(null); (async () => { try { setStats((await api(`/api/shop/stats?days=${days}`, { token: await token() })).data); } catch (e) { tell(e.message, "error"); } })(); }, [days, token, tell]);
  if (!stats) return <Loading/>;
  const max = Math.max(1, ...stats.dailySales.map((d) => d.sales));
  const cards = [["Orders", stats.orders], ["Sales", money(stats.sales)], ["Paid sales", money(stats.paidSales)], ["Products", stats.productCount]];
  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-extrabold">Your shop at a glance</h2>
      <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}</select></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([t, v]) => <div key={t} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">{t}</p><p className="mt-2 text-2xl font-extrabold">{v}</p></div>)}</div>
    <div className="mt-6 flex flex-wrap gap-2">{Object.entries(stats.ordersByStatus).map(([s, n]) => <Pill key={s} tone={orderTone(s)}>{statusLabel(meta, s)}: {n}</Pill>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-extrabold">Daily sales</h3>
        {stats.dailySales.length ? <div className="mt-5 flex h-40 items-end gap-1">{stats.dailySales.map((d) => <div key={d.date} title={`${d.date}: ${money(d.sales)} (${d.orders} orders)`} className="flex-1 rounded-t bg-indigo-500" style={{ height: `${Math.max(4, (d.sales / max) * 100)}%` }}/>)}</div> : <p className="mt-4 text-sm text-slate-500">No sales in this period yet.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-extrabold">Top products</h3>
        <div className="mt-4 space-y-3">{stats.topProducts.map((p) => <div key={p._id} className="flex justify-between gap-3 text-sm"><span className="truncate">{p.name}</span><span className="font-semibold">{p.unitsSold} sold · {money(p.revenue)}</span></div>)}{!stats.topProducts.length && <p className="text-sm text-slate-500">Nothing sold yet.</p>}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2"><div className="flex items-center justify-between"><h3 className="font-extrabold">Low stock</h3><button onClick={() => setTab("products")} className="text-xs font-bold text-indigo-600">Manage stock</button></div>
        <div className="mt-4 space-y-3">{stats.lowStockProducts.map((p) => <div key={p._id} className="flex items-center justify-between text-sm"><span className="truncate pr-3">{p.name}</span><Pill tone={p.stock === 0 ? "red" : "amber"}>{p.stock} left</Pill></div>)}{!stats.lowStockProducts.length && <p className="text-sm text-slate-500">All products are well stocked.</p>}</div></section>
    </div></>;
}

/* -------------------------------------------------------------- Products */
function StockCell({ product, token, tell, onChanged }) {
  const [val, setVal] = useState(String(product.stock));
  useEffect(() => setVal(String(product.stock)), [product.stock]);
  const send = async (body) => {
    try { await api(`/api/shop/products/${product._id}/stock`, { token: await token(), method: "PUT", body }); await onChanged(); }
    catch (e) { tell(e.message, "error"); setVal(String(product.stock)); }
  };
  const commit = () => { if (val.trim() === "" || Number(val) === product.stock) { setVal(String(product.stock)); return; } send({ stock: Number(val) }); };
  return <div className="flex items-center gap-1"><button type="button" className="qty" disabled={product.stock <= 0} onClick={() => send({ adjust: -1 })}>−</button>
    <input className="input w-16 px-2 py-1 text-center" inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}/>
    <button type="button" className="qty" onClick={() => send({ adjust: 1 })}>+</button></div>;
}

function Products({ token, tell }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [lowStock, setLowStock] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const { data, pagination, loading, reload } = useList("/api/shop/products", { page, limit: 12, search: q, lowStock: lowStock ? "true" : "" }, token, tell);
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(false);

  const save = async (formData, id) => {
    try { await api(id ? `/api/products/${id}` : "/api/products", { token: await token(), method: id ? "PUT" : "POST", body: formData }); tell(id ? "Product updated." : "Product added."); setModal(false); setEditing(null); await reload(); }
    catch (e) { tell(e.message, "error"); }
  };
  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await api(`/api/products/${p._id}`, { token: await token(), method: "DELETE" }); tell("Product deleted."); await reload(); } catch (e) { tell(e.message, "error"); }
  };

  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Your products</h2><p className="mt-1 text-sm text-slate-500">Add products, edit details and keep stock up to date.</p></div>
      <div className="flex flex-wrap items-center gap-2"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}/> Low stock</label>
        <button onClick={() => { setEditing(null); setModal(true); }} className="btn-primary"><Plus size={16}/> Add product</button></div></div>
    {loading ? <Loading/> : !data.length ? <Empty title="No products yet" detail="Add your first product to start selling."/> :
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Product</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{data.map((p) => <tr key={p._id}>
          <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-11 w-11 overflow-hidden rounded-lg bg-slate-100">{imageOf(p.images) && <img src={imageOf(p.images)} className="h-full w-full object-cover" alt=""/>}</div><span className="font-bold">{p.name}</span></div></td>
          <td className="px-5 py-4 text-slate-600">{p.category}</td><td className="px-5 py-4 font-semibold">{money(p.price)}</td>
          <td className="px-5 py-4"><StockCell product={p} token={token} tell={tell} onChanged={reload}/></td>
          <td className="px-5 py-4"><Pill tone={p.isActive ? "green" : "gray"}>{p.isActive ? "Active" : "Hidden"}</Pill></td>
          <td className="px-5 py-4"><div className="flex justify-end gap-2"><button title="Edit" onClick={() => { setEditing(p); setModal(true); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Edit3 size={16}/></button><button title="Delete" onClick={() => remove(p)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div></div>}
    <Pager pagination={pagination} onPage={setPage}/>
    {modal && <ProductModal owner product={editing} token={token} tell={tell} save={save} close={() => { setModal(false); setEditing(null); }}/>}
  </>;
}

/* ---------------------------------------------------------------- Orders */
function ShopOrders({ token, tell }) {
  const meta = useMeta();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, pagination, loading, reload } = useList("/api/shop/orders", { page, limit: 10, status }, token, tell);
  const [busyId, setBusyId] = useState("");

  const setOrder = async (o, orderStatus) => {
    if (orderStatus === "cancelled" && !confirm(`Cancel order ${o.orderNumber}? The customer will be notified.`)) return;
    setBusyId(o._id);
    try { await api(`/api/shop/orders/${o._id}/status`, { token: await token(), method: "PUT", body: { orderStatus } }); tell(orderStatus === "processing" ? "Order accepted." : "Order cancelled."); await reload(); }
    catch (e) { tell(e.message, "error"); } finally { setBusyId(""); }
  };

  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Orders</h2><p className="mt-1 text-sm text-slate-500">Accept new orders and follow their delivery. Online orders appear once they're paid.</p></div>
      <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{meta.orderStatuses.map((s) => <option key={s} value={s}>{statusLabel(meta, s)}</option>)}</select></div>
    {loading ? <Loading/> : !data.length ? <Empty title="No orders" detail="New orders will show up here."/> :
      <div className="space-y-4">{data.map((o) => {
        const d = o.delivery;
        return <article key={o._id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold">{o.orderNumber}</p><p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString("en-IN")} · {o.user?.name || "Customer"}</p></div>
            <div className="flex flex-wrap gap-2"><Pill tone={orderTone(o.orderStatus)}>{statusLabel(meta, o.orderStatus)}</Pill><Pill tone={payTone(o.paymentStatus)}>{o.paymentMethod === "cod" ? "Cash on delivery" : "Online"} · {o.paymentStatus}</Pill></div></div>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">{o.items.map((it, i) => <div key={i} className="flex justify-between gap-3 text-sm"><span>{it.name}{it.size ? ` (${it.size})` : ""} × {it.quantity}</span><span className="font-semibold">{money(it.price * it.quantity)}</span></div>)}
            <div className="flex justify-between border-t border-slate-100 pt-2 font-extrabold"><span>Order value</span><span>{money(o.subtotal)}</span></div></div>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><p className="label">Deliver to</p><p className="mt-1 text-slate-700">{addressLine(o.shippingAddress)}</p>{o.shippingAddress?.phone && <p className="mt-1 text-slate-500">Phone: {o.shippingAddress.phone}</p>}{o.notes && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Note: {o.notes}</p>}</div>
            <div><p className="label">Delivery</p>{d ? <><p className="mt-1 font-semibold capitalize">{prettify(d.status)}</p><p className="text-slate-600">{d.driver ? `${d.driver.fullName}${d.driver.phone ? ` · ${d.driver.phone}` : ""}` : "Driver not assigned"}</p></> : <p className="mt-1 text-slate-500">A delivery partner will be assigned soon.</p>}</div></div>
          {["placed", "processing"].includes(o.orderStatus) && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {o.orderStatus === "placed" && <button disabled={busyId === o._id} onClick={() => setOrder(o, "processing")} className="btn-primary">Accept order</button>}
            {o.orderStatus === "processing" && <p className="self-center text-sm text-slate-500">Pack the order — the delivery partner will pick it up.</p>}
            <button disabled={busyId === o._id} onClick={() => setOrder(o, "cancelled")} className="btn-secondary text-red-600">Cancel order</button></div>}
        </article>;
      })}</div>}
    <Pager pagination={pagination} onPage={setPage}/>
  </>;
}

/* ------------------------------------------------------------------- Ads */
function Ads({ token, tell }) {
  const { data, loading, reload } = useList("/api/shop/ads", {}, token, tell);
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(false);
  const remove = async (ad) => {
    if (!confirm(`Delete "${ad.title}"?`)) return;
    try { await api(`/api/shop/ads/${ad._id}`, { token: await token(), method: "DELETE" }); tell("Advertisement deleted."); await reload(); } catch (e) { tell(e.message, "error"); }
  };
  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Advertisements</h2><p className="mt-1 text-sm text-slate-500">Ads are shown to customers after an admin approves them. Editing an ad sends it for review again.</p></div>
      <button onClick={() => { setEditing(null); setModal(true); }} className="btn-primary"><Plus size={16}/> New ad</button></div>
    {loading ? <Loading/> : !data.length ? <Empty title="No advertisements" detail="Create an ad to promote your shop."/> :
      <div className="grid gap-4 md:grid-cols-2">{data.map((ad) => <article key={ad._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {ad.image && <img src={ad.image} className="h-40 w-full object-cover" alt=""/>}
        <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-extrabold">{ad.title}</h3><Pill tone={adTone(ad.status)}>{ad.status}</Pill></div>
          {ad.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{ad.description}</p>}
          <p className="mt-2 text-xs text-slate-500">{day(ad.startsAt)} – {ad.endsAt ? day(ad.endsAt) : "no end date"}{ad.targetLocations?.length ? ` · ${ad.targetLocations.join(", ")}` : " · all locations"}</p>
          {ad.status === "rejected" && ad.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700"><b>Rejected:</b> {ad.rejectionReason}</p>}
          <div className="mt-4 flex gap-2"><button onClick={() => { setEditing(ad); setModal(true); }} className="btn-secondary px-3 py-2 text-xs">{ad.status === "draft" ? "Edit / submit" : "Edit"}</button><button onClick={() => remove(ad)} className="btn-secondary px-3 py-2 text-xs text-red-600">Delete</button></div></div></article>)}</div>}
    {modal && <AdModal ad={editing} token={token} tell={tell} close={() => { setModal(false); setEditing(null); }} done={reload}/>}
  </>;
}

function AdModal({ ad, token, tell, close, done }) {
  const meta = useMeta();
  const [f, setF] = useState({ title: ad?.title || "", description: ad?.description || "", startsAt: ad?.startsAt?.slice(0, 10) || "", endsAt: ad?.endsAt?.slice(0, 10) || "" });
  const [locs, setLocs] = useState(ad?.targetLocations || []);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (draft) => {
    if (!f.title.trim()) { tell("Please give the ad a title.", "error"); return; }
    if (!ad?.image && !file && !draft) { tell("Add an image before submitting for review.", "error"); return; }
    setSaving(true);
    try {
      const body = new FormData();
      body.append("title", f.title); body.append("description", f.description);
      if (f.startsAt) body.append("startsAt", f.startsAt);
      body.append("endsAt", f.endsAt || "");
      body.append("targetLocations", JSON.stringify(locs));
      body.append("draft", String(draft));
      if (file) body.append("image", file);
      await api(ad ? `/api/shop/ads/${ad._id}` : "/api/shop/ads", { token: await token(), method: ad ? "PUT" : "POST", body });
      tell(draft ? "Draft saved." : "Submitted for review.");
      close(); await done();
    } catch (e) { tell(e.message, "error"); } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/50 p-4"><div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
    <h2 className="text-xl font-extrabold">{ad ? "Edit advertisement" : "New advertisement"}</h2>
    <div className="mt-5 space-y-4">
      <div><label className="label">Title *</label><input className="input mt-1 w-full" value={f.title} onChange={set("title")}/></div>
      <div><label className="label">Description</label><textarea rows="3" className="input mt-1 w-full" value={f.description} onChange={set("description")}/></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Starts</label><input type="date" className="input mt-1 w-full" value={f.startsAt} onChange={set("startsAt")}/></div><div><label className="label">Ends</label><input type="date" className="input mt-1 w-full" value={f.endsAt} onChange={set("endsAt")}/></div></div>
      <div><label className="label">Show in (none = everywhere)</label><div className="mt-2 flex flex-wrap gap-2">{meta.locations.map((l) => <button type="button" key={l} onClick={() => setLocs((c) => c.includes(l) ? c.filter((x) => x !== l) : [...c, l])} className={cx("rounded-full border px-3 py-1.5 text-xs font-bold", locs.includes(l) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>{l}</button>)}</div></div>
      <div><label className="label">Image</label>{ad?.image && !file && <img src={ad.image} className="mt-2 h-24 rounded-lg object-cover" alt=""/>}
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500"><ImagePlus size={18}/>{file ? file.name : "Choose an image"}<input className="hidden" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}/></label></div>
    </div>
    <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={saving} onClick={() => submit(true)} className="btn-secondary">Save draft</button><button disabled={saving} onClick={() => submit(false)} className="btn-primary">{saving ? "Saving..." : "Submit for review"}</button></div>
  </div></div>;
}

/* ----------------------------------------------------------- Settlements */
function Settlements({ token, tell }) {
  const { data, loading } = useList("/api/shop/settlements", {}, token, tell);
  return <>
    <div className="mb-6"><h2 className="text-2xl font-extrabold">Payouts</h2><p className="mt-1 text-sm text-slate-500">Settlements created by the store team for your delivered orders.</p></div>
    {loading ? <Loading/> : !data.length ? <Empty title="No payouts yet" detail="Settlements appear here after your orders are delivered and reconciled."/> :
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Period</th><th className="px-5 py-4">Orders</th><th className="px-5 py-4">Sales</th><th className="px-5 py-4">Commission</th><th className="px-5 py-4">Net payable</th><th className="px-5 py-4">Status</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{data.map((s) => <tr key={s._id}><td className="px-5 py-4">{day(s.periodFrom)} – {day(s.periodTo)}</td><td className="px-5 py-4">{s.ordersCount}</td><td className="px-5 py-4">{money(s.grossSales)}</td><td className="px-5 py-4">{money(s.commission)}</td><td className="px-5 py-4 font-bold">{money(s.netPayable)}</td>
          <td className="px-5 py-4"><Pill tone={s.status === "paid" ? "green" : "amber"}>{s.status}</Pill>{s.status === "paid" && <p className="mt-1 text-xs text-slate-500">{day(s.paidAt)}{s.reference ? ` · ${s.reference}` : ""}</p>}</td></tr>)}</tbody></table></div></div>}
  </>;
}

/* --------------------------------------------------------------- Profile */
function Profile({ token, tell, shop, refreshMe }) {
  const meta = useMeta();
  const [f, setF] = useState({ name: shop.name || "", phone: shop.phone || "", email: shop.email || "", location: shop.location || "", addressLine: shop.addressLine || "", landmark: shop.landmark || "", openingHours: shop.openingHours || "", description: shop.description || "" });
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = new FormData();
      Object.entries(f).forEach(([k, v]) => body.append(k, v));
      if (logo) body.append("logo", logo);
      await api("/api/shop/me", { token: await token(), method: "PUT", body });
      tell("Shop profile saved."); await refreshMe();
    } catch (err) { tell(err.message, "error"); } finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-2xl font-extrabold">Shop profile</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label className="label">Shop name</label><input required className="input mt-1 w-full" value={f.name} onChange={set("name")}/></div>
      <div><label className="label">Phone</label><input required className="input mt-1 w-full" value={f.phone} onChange={set("phone")}/></div>
      <div><label className="label">Email</label><input type="email" className="input mt-1 w-full" value={f.email} onChange={set("email")}/></div>
      <div><label className="label">Location</label><select className="input mt-1 w-full" value={f.location} onChange={set("location")}>{meta.locations.map((l) => <option key={l}>{l}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="label">Address</label><input className="input mt-1 w-full" value={f.addressLine} onChange={set("addressLine")}/></div>
      <div><label className="label">Landmark</label><input className="input mt-1 w-full" value={f.landmark} onChange={set("landmark")}/></div>
      <div><label className="label">Opening hours</label><input className="input mt-1 w-full" value={f.openingHours} onChange={set("openingHours")}/></div>
      <div className="sm:col-span-2"><label className="label">About</label><textarea rows="3" className="input mt-1 w-full" value={f.description} onChange={set("description")}/></div>
      <div className="sm:col-span-2"><label className="label">Logo</label>{shop.logo && !logo && <img src={shop.logo} className="mt-2 h-16 w-16 rounded-lg object-cover" alt=""/>}<input type="file" accept="image/*" className="mt-2 block text-sm" onChange={(e) => setLogo(e.target.files?.[0] || null)}/></div>
    </div>
    <button disabled={saving} className="btn-primary mt-6">{saving ? "Saving..." : "Save profile"}</button>
  </form>;
}
