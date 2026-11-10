import React, { useState } from "react";
import { Edit3, ImagePlus, Plus, ShieldOff, ShieldCheck, Store, Trash2, Truck } from "lucide-react";
import { api, money } from "../../api";
import { useMeta } from "../../meta";
import { useList } from "../../useList";
import { Empty, Loading, Pager, Pill, cx, prettify } from "../../ui";
import { Field, Modal, PayoutFields, SearchBox, SectionHead, Seg, Table, day, statusTone, useSearch } from "./common";

const ROLES = ["user", "shop_owner", "delivery_partner", "admin"];

/* ----------------------------------------------------------------- Users */
export function Users({ token, tell, manageShop, manageDriver }) {
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [text, setText, q] = useSearch(() => setPage(1));
  const { data, pagination, loading, reload } = useList("/api/admin/users", { role, page, limit: 20, search: q }, token, tell);
  const [detail, setDetail] = useState(null);

  const act = async (fn, ok) => { try { await fn(); tell(ok); await reload(); } catch (e) { tell(e.message, "error"); } };
  const setRoleOf = (u, r) => { if (r === u.role) return; if (!confirm(`Change ${u.name || u.email} to ${prettify(r)}?`)) return; act(async () => api(`/api/admin/users/${u._id}/role`, { token: await token(), method: "PUT", body: { role: r } }), "Role updated."); };
  const toggle = (u) => act(async () => api(`/api/admin/users/${u._id}/active`, { token: await token(), method: "PUT", body: { isActive: u.isActive === false } }), u.isActive === false ? "Account unblocked." : "Account blocked.");
  const open = async (u) => { try { setDetail((await api(`/api/admin/users/${u._id}`, { token: await token() })).data); } catch (e) { tell(e.message, "error"); } };

  return <>
    <SectionHead title="Users" detail="Every account. Change roles, block abusive accounts, or open a profile to see their orders and shop / driver profile."><SearchBox value={text} onChange={setText} placeholder="Name or email"/><Seg options={[["", "All"], ...ROLES.map((r) => [r, prettify(r)])]} value={role} onChange={(r) => { setRole(r); setPage(1); }}/></SectionHead>
    {loading ? <Loading/> : <Table head={["User", "Role", "Joined", "Status", "Actions"]}>{data.map((u) => <tr key={u._id}>
      <td className="px-5 py-4"><button onClick={() => open(u)} className="text-left"><p className="font-bold hover:text-indigo-600">{u.name || "—"}</p><p className="text-xs text-slate-400">{u.email || "no email"}</p></button></td>
      <td className="px-5 py-4"><select className="input py-1.5 text-xs" value={u.role} onChange={(e) => setRoleOf(u, e.target.value)}>{[...new Set([...ROLES, u.role])].map((r) => <option key={r} value={r}>{prettify(r)}</option>)}</select></td>
      <td className="px-5 py-4 text-slate-500">{day(u.createdAt)}</td>
      <td className="px-5 py-4"><Pill tone={u.isActive === false ? "red" : "green"}>{u.isActive === false ? "Blocked" : "Active"}</Pill></td>
      <td className="px-5 py-4"><div className="flex justify-end"><button onClick={() => toggle(u)} className={cx("rounded-lg border p-2", u.isActive === false ? "border-emerald-100 text-emerald-700 hover:bg-emerald-50" : "border-red-100 text-red-600 hover:bg-red-50")} title={u.isActive === false ? "Unblock" : "Block"}>{u.isActive === false ? <ShieldCheck size={15}/> : <ShieldOff size={15}/>}</button></div></td></tr>)}</Table>}
    {!loading && !data.length && <Empty title="No users found" detail="Try another search."/>}
    <Pager pagination={pagination} onPage={setPage}/>
    {detail && <Modal title={detail.user.name || detail.user.email} subtitle={`${detail.user.email || ""} · ${prettify(detail.user.role)}`} close={() => setDetail(null)}>
      <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Orders</p><p className="text-xl font-extrabold">{detail.orderCount}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Total spent</p><p className="text-xl font-extrabold">{money(detail.totalSpent)}</p></div></div>
      {detail.shop && <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm"><span><b>Shop:</b> {detail.shop.name} <Pill tone={statusTone(detail.shop.status)}>{detail.shop.status}</Pill></span>{manageShop && <button onClick={() => { setDetail(null); manageShop(detail.shop); }} className="btn-secondary px-3 py-2 text-xs">Manage</button>}</div>}
      {detail.deliveryPartner && <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm"><span><b>Driver:</b> {detail.deliveryPartner.fullName} <Pill tone={statusTone(detail.deliveryPartner.status)}>{detail.deliveryPartner.status}</Pill></span>{manageDriver && <button onClick={() => { setDetail(null); manageDriver(detail.deliveryPartner); }} className="btn-secondary px-3 py-2 text-xs">Manage</button>}</div>}
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Recent orders</p>
      <div className="mt-2 space-y-2">{detail.recentOrders.map((o) => <div key={o._id} className="flex justify-between text-sm"><span>{o.orderNumber}</span><span className="text-slate-500">{money(o.totalAmount)} · {o.orderStatus}</span></div>)}{!detail.recentOrders.length && <p className="text-sm text-slate-400">No orders yet.</p>}</div>
    </Modal>}
  </>;
}

/* ----------------------------------------------------------------- Shops */
export function ShopsAdmin({ token, tell, manage }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [text, setText, q] = useSearch(() => setPage(1));
  const { data, pagination, loading, reload } = useList("/api/admin/shops", { status, page, limit: 15, search: q }, token, tell);
  const [editing, setEditing] = useState(null); // shop | "new"

  const setState = async (shop, next) => {
    let reason;
    if (next === "rejected" || next === "suspended") { reason = window.prompt(`Reason for ${next === "rejected" ? "rejecting" : "suspending"} (the owner will see this):`); if (reason === null) return; if (!reason.trim()) { tell("A reason is required.", "error"); return; } }
    try { await api(`/api/admin/shops/${shop._id}/status`, { token: await token(), method: "PUT", body: { status: next, reason } }); tell(`Shop ${next}.`); await reload(); } catch (e) { tell(e.message, "error"); }
  };
  const remove = async (shop) => { if (!confirm(`Delete "${shop.name}"? Only possible if it never had orders.`)) return; try { await api(`/api/admin/shops/${shop._id}`, { token: await token(), method: "DELETE" }); tell("Shop deleted."); await reload(); } catch (e) { tell(e.message, "error"); } };

  return <>
    <SectionHead title="Shops" detail="Create shops for any user, edit every detail, set a custom commission, hand a shop to a new owner, or step into its workspace and manage it yourself."><SearchBox value={text} onChange={setText} placeholder="Shop name"/><button onClick={() => setEditing("new")} className="btn-primary"><Plus size={16}/> Add shop</button></SectionHead>
    <div className="mb-4"><Seg options={[["", "All"], "pending", "approved", "rejected", "suspended"]} value={status} onChange={(s) => { setStatus(s); setPage(1); }}/></div>
    {loading ? <Loading/> : data.length ? <div className="space-y-3">{data.map((s) => <div key={s._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex min-w-0 items-center gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-300">{s.logo ? <img src={s.logo} className="h-full w-full object-cover" alt=""/> : <Store size={22}/>}</div>
        <div className="min-w-0"><p className="truncate font-extrabold">{s.name} <Pill tone={statusTone(s.status)}>{s.status}</Pill></p><p className="text-sm text-slate-500">{s.phone} · {s.location}{s.addressLine ? `, ${s.addressLine}` : ""}</p><p className="text-xs text-slate-400">Owner: {s.owner?.name || "—"} ({s.owner?.email || "no email"}) · commission {s.commissionRate != null ? `${(s.commissionRate * 100).toFixed(1)}% (custom)` : "platform default"}{s.payout?.method ? "" : " · no payout account"}{s.statusReason ? ` · ${s.statusReason}` : ""}</p></div></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => manage(s)} className="btn-primary px-3 py-2 text-xs">Manage shop</button><button onClick={() => setEditing(s)} className="btn-secondary px-3 py-2 text-xs"><Edit3 size={14}/> Edit</button>
        {s.status !== "approved" && <button onClick={() => setState(s, "approved")} className="btn-secondary px-3 py-2 text-xs text-emerald-700">Approve</button>}
        {s.status === "pending" && <button onClick={() => setState(s, "rejected")} className="btn-secondary px-3 py-2 text-xs text-red-600">Reject</button>}
        {s.status === "approved" && <button onClick={() => setState(s, "suspended")} className="btn-secondary px-3 py-2 text-xs text-red-600">Suspend</button>}
        <button onClick={() => remove(s)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={15}/></button></div>
    </div>)}</div> : <Empty title="No shops" detail="Add a shop, or wait for applications."/>}
    <Pager pagination={pagination} onPage={setPage}/>
    {editing && <ShopModal shop={editing === "new" ? null : editing} token={token} tell={tell} close={() => setEditing(null)} done={() => { setEditing(null); reload(); }}/>}
  </>;
}

function ShopModal({ shop, token, tell, close, done }) {
  const meta = useMeta();
  const [f, setF] = useState({ ownerEmail: "", name: shop?.name || "", phone: shop?.phone || "", email: shop?.email || "", location: shop?.location || meta.locations[0], addressLine: shop?.addressLine || "", landmark: shop?.landmark || "", openingHours: shop?.openingHours || "", description: shop?.description || "", categories: (shop?.categories || []).join(", "), commissionPct: shop?.commissionRate != null ? String(+(shop.commissionRate * 100).toFixed(2)) : "", canAssign: shop?.canAssignDrivers === true ? "true" : shop?.canAssignDrivers === false ? "false" : "", adminNotes: shop?.adminNotes || "" });
  const [pay, setPay] = useState(shop?.payout || {});
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setP = (k) => (e) => setPay((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const fd = new FormData();
      ["name", "phone", "email", "location", "addressLine", "landmark", "openingHours", "description", "categories", "adminNotes"].forEach((k) => fd.append(k, f[k]));
      fd.append("canAssignDrivers", f.canAssign);
      fd.append("commissionRate", f.commissionPct === "" ? "" : String(Number(f.commissionPct) / 100));
      if (f.ownerEmail.trim()) fd.append("ownerEmail", f.ownerEmail.trim());
      if (pay.method) fd.append("payout", JSON.stringify(pay));
      else if (shop?.payout?.method) fd.append("payout", "");
      if (logo) fd.append("logo", logo);
      await api(shop ? `/api/admin/shops/${shop._id}` : "/api/admin/shops", { token: await token(), method: shop ? "PUT" : "POST", body: fd });
      tell(shop ? "Shop updated." : "Shop created and approved."); done();
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };
  return <Modal wide title={shop ? `Edit ${shop.name}` : "Add shop"} subtitle={shop ? undefined : "The owner must have signed up once. They become a shop owner immediately."} close={close}>
    <form onSubmit={submit} className="space-y-4">
      <Field label={shop ? "Transfer to another owner (email)" : "Owner's email *"} hint={shop ? `Current owner: ${shop.owner?.email || shop.owner?.name || "—"}. Leave empty to keep.` : undefined}><input className="input w-full" type="email" required={!shop} value={f.ownerEmail} onChange={set("ownerEmail")}/></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shop name *"><input required className="input w-full" value={f.name} onChange={set("name")}/></Field>
        <Field label="Phone *"><input required className="input w-full" value={f.phone} onChange={set("phone")}/></Field>
        <Field label="Shop contact email"><input className="input w-full" value={f.email} onChange={set("email")}/></Field>
        <Field label="Location *"><select className="input w-full" value={f.location} onChange={set("location")}>{meta.locations.map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Address"><input className="input w-full" value={f.addressLine} onChange={set("addressLine")}/></Field>
        <Field label="Landmark"><input className="input w-full" value={f.landmark} onChange={set("landmark")}/></Field>
        <Field label="Opening hours"><input className="input w-full" value={f.openingHours} onChange={set("openingHours")} placeholder="9 AM – 9 PM"/></Field>
        <Field label="Categories" hint="Comma separated"><input className="input w-full" value={f.categories} onChange={set("categories")}/></Field>
      </div>
      <Field label="Description"><textarea rows="2" className="input w-full" value={f.description} onChange={set("description")}/></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Custom commission (%)" hint="Leave empty to use the platform default."><input type="number" min="0" max="99" step="0.1" className="input w-full" value={f.commissionPct} onChange={set("commissionPct")}/></Field>
        <Field label="Logo"><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500"><ImagePlus size={18}/>{logo ? logo.name : "Choose image"}<input className="hidden" type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)}/></label></Field></div>
      <Field label="Can this shop assign its own delivery partners?"><select className="input w-full" value={f.canAssign} onChange={set("canAssign")}><option value="">Follow the platform setting</option><option value="true">Yes, always allow</option><option value="false">No, admin dispatches for this shop</option></select></Field>
      <div><p className="label mb-2">Payout account</p><PayoutFields f={pay} set={setP}/></div>
      <Field label="Internal notes (never shown to the shop)"><textarea rows="2" className="input w-full" value={f.adminNotes} onChange={set("adminNotes")}/></Field>
      <div className="flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={busy} className="btn-primary">{busy ? "Saving..." : shop ? "Save changes" : "Create shop"}</button></div>
    </form></Modal>;
}

/* --------------------------------------------------------------- Drivers */
export function DriversAdmin({ token, tell, manage }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [text, setText, q] = useSearch(() => setPage(1));
  const { data, pagination, loading, reload } = useList("/api/admin/delivery-partners", { status, page, limit: 15, search: q }, token, tell);
  const [editing, setEditing] = useState(null);

  const setState = async (d, next) => {
    let reason;
    if (next === "rejected" || next === "suspended") { reason = window.prompt(`Reason for ${next === "rejected" ? "rejecting" : "suspending"}:`); if (reason === null) return; if (!reason.trim()) { tell("A reason is required.", "error"); return; } }
    try { await api(`/api/admin/delivery-partners/${d._id}/status`, { token: await token(), method: "PUT", body: { status: next, reason } }); tell(`Driver ${next}.`); await reload(); } catch (e) { tell(e.message, "error"); }
  };
  return <>
    <SectionHead title="Delivery partners" detail="Add drivers directly, edit their details and payout account, or open their workspace to accept and run jobs on their behalf."><SearchBox value={text} onChange={setText} placeholder="Name or phone"/><button onClick={() => setEditing("new")} className="btn-primary"><Plus size={16}/> Add driver</button></SectionHead>
    <div className="mb-4"><Seg options={[["", "All"], "pending", "approved", "rejected", "suspended"]} value={status} onChange={(s) => { setStatus(s); setPage(1); }}/></div>
    {loading ? <Loading/> : data.length ? <div className="space-y-3">{data.map((d) => <div key={d._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex min-w-0 items-center gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-300">{d.photo ? <img src={d.photo} className="h-full w-full object-cover" alt=""/> : <Truck size={22}/>}</div>
        <div className="min-w-0"><p className="truncate font-extrabold">{d.fullName} <Pill tone={statusTone(d.status)}>{d.status}</Pill> {d.status === "approved" && <Pill tone={d.isAvailable ? "green" : "gray"}>{d.isAvailable ? "online" : "offline"}</Pill>}</p>
          <p className="text-sm text-slate-500">{d.phone} · {prettify(d.vehicleType)}{d.vehicleNumber ? ` ${d.vehicleNumber}` : ""}{d.serviceLocations?.length ? ` · ${d.serviceLocations.join("/")}` : ""}</p><p className="text-xs text-slate-400">{d.user?.name || "—"} ({d.user?.email || "no email"}) · {d.completedDeliveries || 0} deliveries{d.payout?.method ? "" : " · no payout account"}{d.statusReason ? ` · ${d.statusReason}` : ""}</p></div></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => manage(d)} className="btn-primary px-3 py-2 text-xs">Manage jobs</button><button onClick={() => setEditing(d)} className="btn-secondary px-3 py-2 text-xs"><Edit3 size={14}/> Edit</button>
        {d.status !== "approved" && <button onClick={() => setState(d, "approved")} className="btn-secondary px-3 py-2 text-xs text-emerald-700">Approve</button>}
        {d.status === "pending" && <button onClick={() => setState(d, "rejected")} className="btn-secondary px-3 py-2 text-xs text-red-600">Reject</button>}
        {d.status === "approved" && <button onClick={() => setState(d, "suspended")} className="btn-secondary px-3 py-2 text-xs text-red-600">Suspend</button>}</div>
    </div>)}</div> : <Empty title="No delivery partners" detail="Add one, or wait for applications."/>}
    <Pager pagination={pagination} onPage={setPage}/>
    {editing && <DriverModal driver={editing === "new" ? null : editing} token={token} tell={tell} close={() => setEditing(null)} done={() => { setEditing(null); reload(); }}/>}
  </>;
}

function DriverModal({ driver, token, tell, close, done }) {
  const meta = useMeta();
  const [f, setF] = useState({ email: "", fullName: driver?.fullName || "", phone: driver?.phone || "", vehicleType: driver?.vehicleType || "bike", vehicleNumber: driver?.vehicleNumber || "", licenseNumber: driver?.licenseNumber || "", adminNotes: driver?.adminNotes || "" });
  const [locs, setLocs] = useState(driver?.serviceLocations || []);
  const [pay, setPay] = useState(driver?.payout || {});
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setP = (k) => (e) => setPay((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const fd = new FormData();
      ["fullName", "phone", "vehicleType", "vehicleNumber", "licenseNumber", "adminNotes"].forEach((k) => fd.append(k, f[k]));
      fd.append("serviceLocations", JSON.stringify(locs));
      if (!driver) fd.append("email", f.email);
      if (pay.method) fd.append("payout", JSON.stringify(pay));
      if (photo) fd.append("photo", photo);
      await api(driver ? `/api/admin/delivery-partners/${driver._id}` : "/api/admin/delivery-partners", { token: await token(), method: driver ? "PUT" : "POST", body: fd });
      tell(driver ? "Driver updated." : "Driver added and approved."); done();
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };
  return <Modal wide title={driver ? `Edit ${driver.fullName}` : "Add delivery partner"} subtitle={driver ? undefined : "The person must have signed up once. They become a delivery partner immediately."} close={close}>
    <form onSubmit={submit} className="space-y-4">
      {!driver && <Field label="User's email *"><input required type="email" className="input w-full" value={f.email} onChange={set("email")}/></Field>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *"><input required className="input w-full" value={f.fullName} onChange={set("fullName")}/></Field>
        <Field label="Phone *"><input required className="input w-full" value={f.phone} onChange={set("phone")}/></Field>
        <Field label="Vehicle"><select className="input w-full" value={f.vehicleType} onChange={set("vehicleType")}>{["bike", "scooter", "bicycle", "car", "van", "other"].map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Vehicle number"><input className="input w-full" value={f.vehicleNumber} onChange={set("vehicleNumber")}/></Field>
        <Field label="Licence number"><input className="input w-full" value={f.licenseNumber} onChange={set("licenseNumber")}/></Field>
        <Field label="Photo"><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500"><ImagePlus size={18}/>{photo ? photo.name : "Choose image"}<input className="hidden" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)}/></label></Field>
      </div>
      <Field label="Service areas"><div className="flex flex-wrap gap-2">{meta.locations.map((l) => <button type="button" key={l} onClick={() => setLocs((c) => c.includes(l) ? c.filter((x) => x !== l) : [...c, l])} className={cx("rounded-full border px-3 py-1.5 text-xs font-bold", locs.includes(l) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>{l}</button>)}</div></Field>
      <div><p className="label mb-2">Payout account</p><PayoutFields f={{ ...pay }} set={setP}/></div>
      <Field label="Internal notes"><textarea rows="2" className="input w-full" value={f.adminNotes} onChange={set("adminNotes")}/></Field>
      <div className="flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={busy} className="btn-primary">{busy ? "Saving..." : driver ? "Save changes" : "Add driver"}</button></div>
    </form></Modal>;
}
