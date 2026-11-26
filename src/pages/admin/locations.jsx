import React, { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { api } from "../../api";
import { Empty, Loading, Pill, cx } from "../../ui";
import { Field, Modal, SectionHead } from "./common";

const reloadMeta = () => window.dispatchEvent(new Event("meta:reload")); // shop, driver and address forms pick up the change

const deliveryText = (c) => {
  if (c.deliveryEnabled === false) return "Deliveries paused";
  const bits = [c.deliveryFee == null ? "default fee" : c.deliveryFee === 0 ? "free delivery" : `₹${c.deliveryFee} delivery`];
  if (c.freeAbove != null) bits.push(c.freeAbove > 0 ? `free above ₹${c.freeAbove}` : "no free-delivery offer");
  if (c.minOrder) bits.push(`min order ₹${c.minOrder}`);
  return bits.join(" · ");
};

export function LocationsAdmin({ token, tell }) {
  const [rows, setRows] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name }
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try { setRows((await api("/api/admin/locations", { token: await token() })).data || []); } catch (e) { tell(e.message, "error"); setRows([]); }
  }, [token, tell]);
  useEffect(() => { load(); }, [load]);

  const call = async (path, method, body, ok) => {
    setBusy(true);
    try { const r = await api(path, { token: await token(), method, body }); if (ok) tell(typeof ok === "function" ? ok(r) : ok); reloadMeta(); await load(); return r; }
    catch (e) { tell(e.message, "error"); return null; }
    finally { setBusy(false); }
  };

  const add = async (e) => { e.preventDefault(); if (!name.trim()) return; if (await call("/api/admin/locations", "POST", { name }, `Added "${name.trim()}".`)) setName(""); };
  const rename = async (e) => {
    e.preventDefault();
    const r = await call(`/api/admin/locations/${editing.id}`, "PUT", { name: editing.name, deliveryEnabled: editing.deliveryEnabled, deliveryFee: editing.deliveryFee, freeAbove: editing.freeAbove, minOrder: editing.minOrder }, (x) => x.renamed ? "Renamed everywhere it is used. Delivery rules saved." : "Saved.");
    if (r) setEditing(null);
  };
  const toggle = (c) => call(`/api/admin/locations/${c._id}`, "PUT", { isActive: !c.isActive }, c.isActive ? `"${c.name}" is now hidden from new shops, partners and addresses.` : `"${c.name}" is visible again.`);
  const move = (i, d) => {
    const ids = rows.map((r) => r._id); const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setRows(ids.map((id) => rows.find((r) => r._id === id))); // show the new order straight away
    call("/api/admin/locations/order", "PUT", { ids });
  };

  if (!rows) return <Loading/>;
  return <>
    <SectionHead title="Locations" detail="The towns and areas you serve. Shops, delivery partners, addresses and ads choose from this list, so a new area needs no code change. Renaming updates everything that uses it. Hiding keeps existing records but stops the location being offered for new ones."/>
    <form onSubmit={add} className="mb-5 flex flex-wrap gap-2">
      <input className="input min-w-0 flex-1 sm:max-w-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="New location name, e.g. Kaduthuruthy" aria-label="New location name"/>
      <button disabled={busy || !name.trim()} className="btn-primary"><Plus size={16}/> Add location</button>
    </form>
    {rows.length === 0 ? <Empty title="No locations yet" detail="Add your first one above."/> :
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><ul className="divide-y divide-slate-100">
        {rows.map((c, i) => <li key={c._id} className={cx("flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5", !c.isActive && "bg-slate-50")}>
          <div className="flex flex-col">
            <button disabled={busy || i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-25" aria-label={`Move ${c.name} up`}><ArrowUp size={15}/></button>
            <button disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-25" aria-label={`Move ${c.name} down`}><ArrowDown size={15}/></button>
          </div>
          <div className="min-w-0 flex-1"><p className={cx("truncate font-bold", !c.isActive && "text-slate-400 line-through")}>{c.name}</p>
            <p className="text-xs text-slate-500">{c.shops} shop{c.shops === 1 ? "" : "s"} · {c.drivers} delivery partner{c.drivers === 1 ? "" : "s"} · {c.addresses} saved address{c.addresses === 1 ? "" : "es"}</p>
            <p className="text-xs text-slate-500">{deliveryText(c)}</p></div>
          {!c.isActive && <Pill tone="gray">Hidden</Pill>}
          <div className="flex items-center gap-1">
            <button disabled={busy} onClick={() => setEditing({ id: c._id, name: c.name, deliveryEnabled: c.deliveryEnabled !== false, deliveryFee: c.deliveryFee ?? "", freeAbove: c.freeAbove ?? "", minOrder: c.minOrder ?? "" })} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Edit"><Edit3 size={15}/></button>
            <button disabled={busy} onClick={() => toggle(c)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title={c.isActive ? "Hide" : "Show"}>{c.isActive ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
            <button disabled={busy} onClick={() => setRemoving(c)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={15}/></button>
          </div>
        </li>)}
      </ul></div>}
    {editing && <Modal title="Edit location" subtitle="Renaming updates shops, partners, addresses, ads and open orders using it. Delivery rules apply to the whole checkout: one fee, however many shops." close={() => setEditing(null)}>
      <form onSubmit={rename} className="space-y-4"><Field label="Name"><input autoFocus className="input w-full" value={editing.name} maxLength={40} onChange={(e) => setEditing({ ...editing, name: e.target.value })}/></Field>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={editing.deliveryEnabled} onChange={(e) => setEditing({ ...editing, deliveryEnabled: e.target.checked })}/> We deliver here (untick to pause deliveries; checkout will refuse)</label>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Delivery fee (₹)"><input className="input w-full" inputMode="decimal" placeholder="default" value={editing.deliveryFee} onChange={(e) => setEditing({ ...editing, deliveryFee: e.target.value })} aria-label="Delivery fee"/></Field>
          <Field label="Free above (₹)"><input className="input w-full" inputMode="decimal" placeholder="default" value={editing.freeAbove} onChange={(e) => setEditing({ ...editing, freeAbove: e.target.value })} aria-label="Free delivery above"/></Field>
          <Field label="Minimum order (₹)"><input className="input w-full" inputMode="decimal" placeholder="none" value={editing.minOrder} onChange={(e) => setEditing({ ...editing, minOrder: e.target.value })} aria-label="Minimum order"/></Field>
        </div>
        <p className="text-xs text-slate-500">Leave a box empty to use the platform default from Settings. Free above 0 turns the free-delivery offer off for this location. Fee 0 means free delivery here.</p>
        <button disabled={busy || !editing.name.trim()} className="btn-primary w-full"><Check size={16}/> Save</button></form></Modal>}
    {removing && <DeleteLocation cat={removing} others={rows.filter((r) => r._id !== removing._id)} busy={busy} close={() => setRemoving(null)}
      onDelete={async (to) => { const r = await call(`/api/admin/locations/${removing._id}${to ? `?moveTo=${encodeURIComponent(to)}` : ""}`, "DELETE", undefined, (x) => x.movedTo ? `Deleted. Everything moved to "${x.movedTo}".` : "Deleted."); if (r) setRemoving(null); }}/>}
  </>;
}

function DeleteLocation({ cat, others, busy, close, onDelete }) {
  const [to, setTo] = useState(others[0]?.name || "");
  const inUse = cat.shops + cat.drivers + cat.addresses > 0;
  return <Modal title={`Delete "${cat.name}"?`} close={close}>
    <p className="text-sm text-slate-600">{inUse ? <>It is used by <b>{cat.shops} shop{cat.shops === 1 ? "" : "s"}</b>, <b>{cat.drivers} delivery partner{cat.drivers === 1 ? "" : "s"}</b> and <b>{cat.addresses} saved address{cat.addresses === 1 ? "" : "es"}</b>. They will be moved so nothing is lost.</> : "Nothing uses it."}</p>
    {inUse && <Field label="Move everything to" className="mt-4"><select className="input w-full" value={to} onChange={(e) => setTo(e.target.value)}>{others.map((o) => <option key={o._id} value={o.name}>{o.name}{!o.isActive ? " (hidden)" : ""}</option>)}</select></Field>}
    <div className="mt-5 flex gap-2"><button onClick={close} className="btn-secondary flex-1">Cancel</button><button disabled={busy || (inUse && !to)} onClick={() => onDelete(inUse ? to : "")} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">Delete location</button></div>
  </Modal>;
}
