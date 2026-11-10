import React, { useCallback, useEffect, useState } from "react";
import { Edit3, ImagePlus, Plus, Trash2, Truck } from "lucide-react";
import { api, money, qs } from "../../api";
import { useMeta } from "../../meta";
import { AD_PLACEMENT_LABELS } from "../../ads";
import { useList } from "../../useList";
import { Empty, Loading, Pager, Pill, cx, prettify } from "../../ui";
import { Field, Modal, SectionHead, Seg, Stat, Table, day, statusTone, when } from "./common";

/* ------------------------------------------------------------------- Ads */
export function AdsAdmin({ token, tell }) {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const { data, pagination, loading, reload } = useList("/api/admin/ads", { status, page, limit: 12 }, token, tell);
  const [editing, setEditing] = useState(null);
  const moderate = async (ad, next) => {
    let reason;
    if (next === "rejected") { reason = window.prompt("Reason for rejecting (the shop will see this):"); if (reason === null) return; if (!reason.trim()) { tell("A reason is required.", "error"); return; } }
    try { await api(`/api/admin/ads/${ad._id}/status`, { token: await token(), method: "PUT", body: { status: next, reason } }); tell(`Ad ${next}.`); await reload(); } catch (e) { tell(e.message, "error"); }
  };
  const remove = async (ad) => { if (!confirm(`Delete "${ad.title}"?`)) return; try { await api(`/api/admin/ads/${ad._id}`, { token: await token(), method: "DELETE" }); tell("Ad deleted."); await reload(); } catch (e) { tell(e.message, "error"); } };
  return <>
    <SectionHead title="Advertisements" detail="Create ads for any shop, choose where they appear, boost with priority and watch impressions and clicks. Shop-submitted ads wait here for approval."><button onClick={() => setEditing("new")} className="btn-primary"><Plus size={16}/> New ad</button></SectionHead>
    <div className="mb-4"><Seg options={[["", "All"], "pending", "approved", "rejected", "draft"]} value={status} onChange={(s) => { setStatus(s); setPage(1); }}/></div>
    {loading ? <Loading/> : data.length ? <div className="grid gap-4 md:grid-cols-2">{data.map((ad) => {
      const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
      return <div key={ad._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{ad.image && <img src={ad.image} alt={ad.title} className="h-40 w-full object-cover"/>}
        <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-extrabold">{ad.title}</h3><Pill tone={statusTone(ad.status)}>{ad.status}</Pill></div>{ad.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{ad.description}</p>}
          <p className="mt-2 text-xs text-slate-400">{ad.shop?.name} · {ad.targetLocations?.length ? ad.targetLocations.join(", ") : "All locations"} · {day(ad.startsAt)}{ad.endsAt ? ` → ${day(ad.endsAt)}` : ""}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{(ad.placements?.length ? ad.placements : ["home"]).map((p) => <span key={p} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{AD_PLACEMENT_LABELS[p] || p}</span>)}{ad.priority ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Priority {ad.priority}</span> : null}</div>
          <p className="mt-3 text-xs text-slate-500">👁 {ad.impressions || 0} views · 👆 {ad.clicks || 0} clicks · CTR {ctr}%</p>
          {ad.rejectionReason && <p className="mt-2 text-xs text-red-600">Rejected: {ad.rejectionReason}</p>}
          <div className="mt-4 flex flex-wrap gap-2">{ad.status !== "approved" && <button onClick={() => moderate(ad, "approved")} className="btn-primary px-3 py-2 text-xs">Approve</button>}{ad.status !== "rejected" && <button onClick={() => moderate(ad, "rejected")} className="btn-secondary px-3 py-2 text-xs text-red-600">Reject</button>}<button onClick={() => setEditing(ad)} className="btn-secondary px-3 py-2 text-xs"><Edit3 size={13}/> Edit</button><button onClick={() => remove(ad)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 size={14}/></button></div></div></div>;
    })}</div> : <Empty title={`No ${status || ""} ads`} detail="Create one with “New ad”."/>}
    <Pager pagination={pagination} onPage={setPage}/>
    {editing && <AdForm ad={editing === "new" ? null : editing} token={token} tell={tell} close={() => setEditing(null)} done={() => { setEditing(null); reload(); }}/>}
  </>;
}

export const PLACEMENTS = ["home", "catalogue", "shops", "product"];

/** Placement checkboxes shared by the admin and shop-owner ad forms. */
export function PlacementPicker({ value, onChange }) {
  return <div className="flex flex-wrap gap-2">{PLACEMENTS.map((p) => <button type="button" key={p} onClick={() => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p])} className={cx("rounded-full border px-3 py-1.5 text-xs font-bold", value.includes(p) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>{AD_PLACEMENT_LABELS[p]}</button>)}</div>;
}

function AdForm({ ad, token, tell, close, done }) {
  const meta = useMeta();
  const [shops, setShops] = useState([]);
  const [f, setF] = useState({ shop: ad?.shop?._id || "", title: ad?.title || "", description: ad?.description || "", startsAt: ad?.startsAt?.slice(0, 10) || "", endsAt: ad?.endsAt?.slice(0, 10) || "", priority: ad?.priority ?? 0, status: ad?.status || "approved", product: ad?.product || "" });
  const [placements, setPlacements] = useState(ad?.placements?.length ? ad.placements : ["home"]);
  const [locs, setLocs] = useState(ad?.targetLocations || []);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  useEffect(() => { (async () => { try { setShops((await api("/api/admin/shops" + qs({ status: "approved", limit: 100 }), { token: await token() })).data || []); } catch { /* optional */ } })(); }, [token]);
  const submit = async (e) => {
    e.preventDefault();
    if (!ad && !file) { tell("Add an image for the ad.", "error"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      ["shop", "title", "description", "priority", "status"].forEach((k) => fd.append(k, f[k]));
      if (f.startsAt) fd.append("startsAt", f.startsAt);
      fd.append("endsAt", f.endsAt || "");
      fd.append("product", f.product.trim());
      fd.append("placements", JSON.stringify(placements));
      fd.append("targetLocations", JSON.stringify(locs));
      if (f.status === "rejected") fd.append("reason", "Rejected by admin");
      if (file) fd.append("image", file);
      await api(ad ? `/api/admin/ads/${ad._id}` : "/api/admin/ads", { token: await token(), method: ad ? "PUT" : "POST", body: fd });
      tell(ad ? "Ad updated." : "Ad created."); done();
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };
  return <Modal wide title={ad ? "Edit advertisement" : "New advertisement"} close={close}><form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Shop *"><select required className="input w-full" value={f.shop} onChange={set("shop")}><option value="">Choose a shop</option>{shops.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.location}</option>)}{ad?.shop && !shops.some((s) => s._id === ad.shop._id) && <option value={ad.shop._id}>{ad.shop.name}</option>}</select></Field>
      <Field label="Status"><select className="input w-full" value={f.status} onChange={set("status")}>{["approved", "pending", "draft", "rejected"].map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Title *" className="sm:col-span-2"><input required className="input w-full" value={f.title} onChange={set("title")}/></Field>
      <Field label="Description" className="sm:col-span-2"><textarea rows="2" className="input w-full" value={f.description} onChange={set("description")}/></Field>
      <Field label="Starts"><input type="date" className="input w-full" value={f.startsAt} onChange={set("startsAt")}/></Field><Field label="Ends"><input type="date" className="input w-full" value={f.endsAt} onChange={set("endsAt")}/></Field>
      <Field label="Priority" hint="Higher shows first (0 = normal)"><input type="number" className="input w-full" value={f.priority} onChange={set("priority")}/></Field>
      <Field label="Links to product id (optional)" hint="Empty = links to the shop"><input className="input w-full" value={f.product} onChange={set("product")}/></Field>
    </div>
    <Field label="Where should it appear?"><PlacementPicker value={placements} onChange={setPlacements}/></Field>
    <Field label="Locations (none = everywhere)"><div className="flex flex-wrap gap-2">{meta.locations.map((l) => <button type="button" key={l} onClick={() => setLocs((c) => c.includes(l) ? c.filter((x) => x !== l) : [...c, l])} className={cx("rounded-full border px-3 py-1.5 text-xs font-bold", locs.includes(l) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>{l}</button>)}</div></Field>
    <Field label="Image">{ad?.image && !file && <img src={ad.image} className="mb-2 h-24 rounded-lg object-cover" alt=""/>}<label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500"><ImagePlus size={18}/>{file ? file.name : "Choose an image"}<input className="hidden" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}/></label></Field>
    <div className="flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={busy} className="btn-primary">{busy ? "Saving..." : ad ? "Save changes" : "Create ad"}</button></div></form></Modal>;
}

/* ------------------------------------------------------------ Deliveries */
const jobTone = (s) => ({ assigned: "amber", accepted: "blue", picked_up: "blue", on_the_way: "blue", delivered: "green" })[s] || "red";

export function DeliveriesAdmin({ token, tell, manageDriver }) {
  const [tab, setTab] = useState("unassigned");
  const [page, setPage] = useState(1);
  const params = tab === "unassigned" ? { unassigned: "true", page, limit: 15 } : { status: tab === "all" ? "" : tab, page, limit: 15 };
  const { data, pagination, loading, reload } = useList("/api/admin/deliveries", params, token, tell);
  const [assigning, setAssigning] = useState(null);

  const override = async (job) => {
    const status = window.prompt("Set status to: picked_up, on_the_way, delivered or failed", "delivered");
    if (!status) return;
    const note = window.prompt("Note (why are you overriding the driver?)", "Updated by admin");
    if (note === null) return;
    try { await api(`/api/admin/deliveries/${job._id}/status`, { token: await token(), method: "PUT", body: { status: status.trim(), note } }); tell("Delivery updated."); await reload(); } catch (e) { tell(e.message, "error"); }
  };
  const cancel = async (job) => { const reason = window.prompt("Reason for cancelling this delivery?"); if (reason === null) return; try { await api(`/api/admin/deliveries/${job._id}/cancel`, { token: await token(), method: "PUT", body: { reason } }); tell("Delivery cancelled."); await reload(); } catch (e) { tell(e.message, "error"); } };

  return <>
    <SectionHead title="Deliveries" detail="Dispatch orders that are ready, follow every active job, and step in when a driver can't update the status himself."/>
    <div className="mb-4"><Seg options={[["unassigned", "Needs a driver"], ["assigned", "Waiting for driver"], ["accepted", "Accepted"], ["picked_up", "Picked up"], ["on_the_way", "On the way"], ["delivered", "Delivered"], ["failed", "Failed"], ["all", "All"]]} value={tab} onChange={(t) => { setTab(t); setPage(1); }}/></div>
    {loading ? <Loading/> : !data.length ? <Empty title="Nothing here" detail={tab === "unassigned" ? "Every ready order has a driver." : "No deliveries in this state."}/> : tab === "unassigned" ?
      <Table head={["Order", "Shop", "Total", "Payment", "Placed", "Actions"]}>{data.map((o) => <tr key={o._id}><td className="px-5 py-4 font-bold">{o.orderNumber}</td><td className="px-5 py-4 text-slate-500">{o.shop?.name || "Platform"}</td><td className="px-5 py-4 font-bold">{money(o.totalAmount)}</td><td className="px-5 py-4"><Pill tone={o.paymentStatus === "paid" ? "green" : "amber"}>{o.paymentMethod === "cod" ? "COD" : o.paymentStatus}</Pill></td><td className="px-5 py-4 text-slate-500">{when(o.createdAt)}</td><td className="px-5 py-4"><div className="flex justify-end"><button onClick={() => setAssigning(o)} className="btn-primary px-3 py-2 text-xs"><Truck size={14}/> Assign driver</button></div></td></tr>)}</Table> :
      <Table min={900} head={["Order", "Route", "Driver", "COD", "Status", "Updated", "Actions"]}>{data.map((j) => <tr key={j._id}>
        <td className="px-5 py-4"><p className="font-bold">{j.order?.orderNumber}</p><p className="text-xs text-slate-400">{money(j.order?.totalAmount)}</p></td><td className="px-5 py-4 text-xs text-slate-500"><p>{j.shop?.name || j.pickup?.name}</p><p>→ {j.drop?.fullName}, {j.drop?.location || j.drop?.city}</p></td>
        <td className="px-5 py-4">{j.driver ? <button onClick={() => manageDriver?.(j.driver)} className="text-left hover:text-indigo-600"><p className="font-bold">{j.driver.fullName}</p><p className="text-xs text-slate-400">{j.driver.phone}</p></button> : "—"}</td><td className="px-5 py-4">{j.codAmount ? money(j.codAmount) : "—"}</td><td className="px-5 py-4"><Pill tone={jobTone(j.status)}>{prettify(j.status)}</Pill>{j.failureReason && <p className="mt-1 text-xs text-red-600">{j.failureReason}</p>}</td><td className="px-5 py-4 text-slate-500">{when(j.updatedAt)}</td>
        <td className="px-5 py-4"><div className="flex justify-end gap-2">{["assigned", "accepted", "picked_up", "on_the_way"].includes(j.status) && <><button onClick={() => override(j)} className="btn-secondary px-3 py-2 text-xs">Override</button><button onClick={() => cancel(j)} className="btn-secondary px-3 py-2 text-xs text-red-600">Cancel</button></>}{["failed", "rejected", "cancelled"].includes(j.status) && j.order && <button onClick={() => setAssigning({ _id: j.order._id, orderNumber: j.order.orderNumber, shop: j.shop })} className="btn-secondary px-3 py-2 text-xs">Re-assign</button>}</div></td></tr>)}</Table>}
    <Pager pagination={pagination} onPage={setPage}/>
    {assigning && <AssignDriver order={assigning} token={token} tell={tell} close={() => setAssigning(null)} done={() => { setAssigning(null); reload(); }}/>}
  </>;
}

export function AssignDriver({ order, token, tell, close, done }) {
  const [drivers, setDrivers] = useState(null);
  const [driverId, setDriverId] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => { try { setDrivers((await api("/api/admin/delivery-partners" + qs({ status: "approved", limit: 100 }), { token: await token() })).data || []); } catch (e) { tell(e.message, "error"); setDrivers([]); } })(); }, [token, tell]);
  const submit = async (e) => { e.preventDefault(); setBusy(true); try { await api("/api/admin/deliveries", { token: await token(), method: "POST", body: { orderId: order._id, driverId } }); tell("Delivery partner assigned."); done(); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); } };
  return <Modal title="Assign delivery partner" subtitle={`Order ${order.orderNumber}${order.shop?.name ? ` · pickup from ${order.shop.name}` : ""}`} close={close}><form onSubmit={submit}>
    {drivers === null ? <Loading/> : drivers.length ? <select required className="input w-full" value={driverId} onChange={(e) => setDriverId(e.target.value)}><option value="">Select a driver</option>{[...drivers].sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable)).map((d) => <option key={d._id} value={d._id}>{d.fullName} · {d.isAvailable ? "online" : "offline"}{d.serviceLocations?.length ? ` · ${d.serviceLocations.join("/")}` : ""}</option>)}</select> : <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No approved delivery partners yet.</p>}
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={busy || !driverId} className="btn-primary">{busy ? "Assigning..." : "Assign"}</button></div></form></Modal>;
}

/* -------------------------------------------------------------- Activity */
export function Activity({ token, tell }) {
  const [page, setPage] = useState(1);
  const [prefix, setPrefix] = useState("");
  const { data, pagination, loading } = useList("/api/admin/activity-logs", { page, limit: 40, action: prefix }, token, tell);
  return <>
    <SectionHead title="Activity log" detail="Every admin action (and every action taken while acting as a shop or driver) is recorded here."><Seg options={[["", "All"], ["shop", "Shops"], ["driver", "Drivers"], ["settlement", "Payouts"], ["ad", "Ads"], ["order", "Orders"], ["settings", "Settings"], ["user", "Users"]]} value={prefix} onChange={(p) => { setPrefix(p); setPage(1); }}/></SectionHead>
    {loading ? <Loading/> : data.length ? <Table head={["When", "Who", "Action", "Target", "Details"]}>{data.map((l) => <tr key={l._id}><td className="whitespace-nowrap px-5 py-3 text-slate-500">{when(l.createdAt)}</td><td className="px-5 py-3 font-bold">{l.actorName || "—"}</td><td className="px-5 py-3"><Pill tone="blue">{l.action}</Pill></td><td className="px-5 py-3 text-xs text-slate-500">{l.targetType}{l.targetId ? ` ${String(l.targetId).slice(-6)}` : ""}</td><td className="max-w-xs truncate px-5 py-3 text-xs text-slate-400">{l.meta ? JSON.stringify(l.meta) : ""}</td></tr>)}</Table> : <Empty title="No activity" detail="Nothing recorded yet."/>}
    <Pager pagination={pagination} onPage={setPage}/></>;
}

/* -------------------------------------------------------------- Settings */
const SETTING_FIELDS = [
  ["commissionPct", "Platform commission (%)", "Default cut of shop sales. Shops can have their own rate.", "number", { min: 0, max: 99, step: 0.1 }],
  ["driverFee", "Driver fee per delivery (₹)", "Paid to the driver for every completed delivery.", "number", { min: 0, step: 1 }],
  ["shippingCost", "Delivery charge (₹)", "Charged to customers per order.", "number", { min: 0, step: 1 }],
  ["freeShippingThreshold", "Free delivery above (₹)", "0 turns free delivery off.", "number", { min: 0, step: 1 }],
  ["taxPct", "Tax / GST (%)", "Added to the order subtotal.", "number", { min: 0, max: 100, step: 0.1 }],
  ["lowStockLevel", "Low-stock alert level", "Products at or below this are flagged.", "number", { min: 0, step: 1 }],
];

export function SettingsAdmin({ token, tell }) {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const d = (await api("/api/admin/settings", { token: await token() })).data; setS({ ...d, commissionPct: +(d.commissionRate * 100).toFixed(2), taxPct: +(d.taxRate * 100).toFixed(2) }); } catch (e) { tell(e.message, "error"); } }, [token, tell]);
  useEffect(() => { load(); }, [load]);
  if (!s) return <Loading/>;
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { commissionRate: Number(s.commissionPct) / 100, taxRate: Number(s.taxPct) / 100, driverFee: Number(s.driverFee), shippingCost: Number(s.shippingCost), freeShippingThreshold: Number(s.freeShippingThreshold), lowStockLevel: Number(s.lowStockLevel), allowCod: !!s.allowCod, announcement: s.announcement || "", supportPhone: s.supportPhone || "", supportEmail: s.supportEmail || "" };
      await api("/api/admin/settings", { token: await token(), method: "PUT", body }); tell("Settings saved. Customers see changes within a minute."); await load();
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };
  return <>
    <SectionHead title="Platform settings" detail="Change money rules and storefront messages without redeploying. Past orders and settlements keep the values they were created with."/>
    <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="grid gap-5 sm:grid-cols-2">
      {SETTING_FIELDS.map(([k, label, hint, type, attrs]) => <Field key={k} label={label} hint={hint}><input type={type} className="input w-full" value={s[k] ?? ""} onChange={set(k)} {...attrs}/></Field>)}
      <label className="flex items-center gap-3 self-end rounded-xl bg-slate-50 p-4 text-sm font-semibold"><input type="checkbox" checked={!!s.allowCod} onChange={set("allowCod")}/> Accept cash on delivery</label>
      <Field label="Storefront announcement" hint="Shown as a banner on every customer page. Leave empty to hide." className="sm:col-span-2"><input className="input w-full" value={s.announcement || ""} onChange={set("announcement")} placeholder="Festive offer: free delivery this weekend!"/></Field>
      <Field label="Support phone"><input className="input w-full" value={s.supportPhone || ""} onChange={set("supportPhone")}/></Field><Field label="Support email"><input className="input w-full" value={s.supportEmail || ""} onChange={set("supportEmail")}/></Field></div>
      <div className="mt-6 flex justify-end"><button disabled={busy} className="btn-primary">{busy ? "Saving..." : "Save settings"}</button></div></form>
    <Broadcast token={token} tell={tell}/>
  </>;
}

function Broadcast({ token, tell }) {
  const [f, setF] = useState({ audience: "all", title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const send = async (e) => {
    e.preventDefault(); if (!confirm(`Send this to ${f.audience === "all" ? "everyone" : f.audience}?`)) return; setBusy(true);
    try { const r = await api("/api/admin/broadcast", { token: await token(), method: "POST", body: f }); tell(`Sent to ${r.recipients} people.`); setF({ ...f, title: "", body: "" }); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };
  return <form onSubmit={send} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6"><h3 className="text-lg font-extrabold">Send a notification</h3><p className="mt-1 text-sm text-slate-500">Appears in the notification bell (and as a push on the phone apps).</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Audience"><select className="input w-full" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="all">Everyone</option><option value="customers">Customers</option><option value="shops">Shop owners</option><option value="drivers">Delivery partners</option></select></Field><Field label="Title *" className="sm:col-span-2"><input required className="input w-full" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })}/></Field></div>
    <Field className="mt-4" label="Message"><textarea rows="2" className="input w-full" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })}/></Field>
    <div className="mt-4 flex justify-end"><button disabled={busy} className="btn-primary">{busy ? "Sending..." : "Send"}</button></div></form>;
}
