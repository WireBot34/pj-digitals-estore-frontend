import React, { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Edit3, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { api } from "../../api";
import { Empty, Loading, Pill, cx } from "../../ui";
import { Field, Modal, SectionHead } from "./common";

const reloadMeta = () => window.dispatchEvent(new Event("meta:reload")); // product forms and the storefront pick up the change

export function CategoriesAdmin({ token, tell }) {
  const [rows, setRows] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name }
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try { setRows((await api("/api/admin/categories", { token: await token() })).data || []); } catch (e) { tell(e.message, "error"); setRows([]); }
  }, [token, tell]);
  useEffect(() => { load(); }, [load]);

  const call = async (path, method, body, ok) => {
    setBusy(true);
    try { const r = await api(path, { token: await token(), method, body }); if (ok) tell(typeof ok === "function" ? ok(r) : ok); reloadMeta(); await load(); return r; }
    catch (e) { tell(e.message, "error"); return null; }
    finally { setBusy(false); }
  };

  const add = async (e) => { e.preventDefault(); if (!name.trim()) return; if (await call("/api/admin/categories", "POST", { name }, `Added "${name.trim()}".`)) setName(""); };
  const rename = async (e) => {
    e.preventDefault();
    const r = await call(`/api/admin/categories/${editing.id}`, "PUT", { name: editing.name }, (x) => x.renamed ? `Renamed. ${x.productsUpdated} product${x.productsUpdated === 1 ? "" : "s"} updated.` : "No change.");
    if (r) setEditing(null);
  };
  const toggle = (c) => call(`/api/admin/categories/${c._id}`, "PUT", { isActive: !c.isActive }, c.isActive ? `"${c.name}" is now hidden from customers and shop forms.` : `"${c.name}" is visible again.`);
  const move = (i, d) => {
    const ids = rows.map((r) => r._id); const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setRows(ids.map((id) => rows.find((r) => r._id === id))); // show the new order straight away
    call("/api/admin/categories/order", "PUT", { ids });
  };

  if (!rows) return <Loading/>;
  return <>
    <SectionHead title="Categories" detail="The list customers browse and shops choose from. The order here is the order on the storefront. Renaming updates every product and shop that uses it. Hiding keeps existing products but stops new ones being added to it."/>
    <form onSubmit={add} className="mb-5 flex flex-wrap gap-2">
      <input className="input min-w-0 flex-1 sm:max-w-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="New category name, e.g. Toys" aria-label="New category name"/>
      <button disabled={busy || !name.trim()} className="btn-primary"><Plus size={16}/> Add category</button>
    </form>
    {rows.length === 0 ? <Empty title="No categories yet" detail="Add your first one above."/> :
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><ul className="divide-y divide-slate-100">
        {rows.map((c, i) => <li key={c._id} className={cx("flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5", !c.isActive && "bg-slate-50")}>
          <div className="flex flex-col">
            <button disabled={busy || i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-25" aria-label={`Move ${c.name} up`}><ArrowUp size={15}/></button>
            <button disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-25" aria-label={`Move ${c.name} down`}><ArrowDown size={15}/></button>
          </div>
          <div className="min-w-0 flex-1"><p className={cx("truncate font-bold", !c.isActive && "text-slate-400 line-through")}>{c.name}</p>
            <p className="text-xs text-slate-500">{c.products} product{c.products === 1 ? "" : "s"} · {c.shops} shop{c.shops === 1 ? "" : "s"}</p></div>
          {!c.isActive && <Pill tone="gray">Hidden</Pill>}
          {c.locked ? <span className="text-[11px] font-semibold text-slate-400">Always available</span> : <div className="flex items-center gap-1">
            <button disabled={busy} onClick={() => setEditing({ id: c._id, name: c.name })} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Rename"><Edit3 size={15}/></button>
            <button disabled={busy} onClick={() => toggle(c)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title={c.isActive ? "Hide" : "Show"}>{c.isActive ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
            <button disabled={busy} onClick={() => setRemoving(c)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={15}/></button>
          </div>}
        </li>)}
      </ul></div>}
    {editing && <Modal title="Rename category" subtitle="Every product, catalogue item and shop using it is updated too." close={() => setEditing(null)}>
      <form onSubmit={rename} className="space-y-4"><Field label="Name"><input autoFocus className="input w-full" value={editing.name} maxLength={40} onChange={(e) => setEditing({ ...editing, name: e.target.value })}/></Field>
        <button disabled={busy || !editing.name.trim()} className="btn-primary w-full"><Check size={16}/> Save</button></form></Modal>}
    {removing && <DeleteCategory cat={removing} others={rows.filter((r) => r._id !== removing._id)} busy={busy} close={() => setRemoving(null)}
      onDelete={async (to) => { const r = await call(`/api/admin/categories/${removing._id}?moveTo=${encodeURIComponent(to)}`, "DELETE", undefined, (x) => `Deleted. ${x.moved} product${x.moved === 1 ? "" : "s"} moved to "${x.movedTo}".`); if (r) setRemoving(null); }}/>}
  </>;
}

function DeleteCategory({ cat, others, busy, close, onDelete }) {
  const [to, setTo] = useState(others.find((o) => o.locked)?.name || others[0]?.name || "");
  return <Modal title={`Delete "${cat.name}"?`} close={close}>
    <p className="text-sm text-slate-600">{cat.products ? <>This category has <b>{cat.products} product{cat.products === 1 ? "" : "s"}</b>. They will be moved so nothing disappears.</> : "No products use it."}{cat.shops ? ` ${cat.shops} shop${cat.shops === 1 ? "" : "s"} list it; they'll list the new category instead.` : ""}</p>
    <Field label="Move products to" className="mt-4"><select className="input w-full" value={to} onChange={(e) => setTo(e.target.value)}>{others.map((o) => <option key={o._id} value={o.name}>{o.name}{!o.isActive ? " (hidden)" : ""}</option>)}</select></Field>
    <div className="mt-5 flex gap-2"><button onClick={close} className="btn-secondary flex-1">Cancel</button><button disabled={busy || !to} onClick={() => onDelete(to)} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">Delete category</button></div>
  </Modal>;
}
