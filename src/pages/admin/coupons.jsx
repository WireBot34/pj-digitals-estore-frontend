import React, { useCallback, useEffect, useState } from "react";
import { Check, Edit3, Plus, Trash2 } from "lucide-react";
import { api } from "../../api";
import { Empty, Loading, Pill } from "../../ui";
import { Field, Modal, SectionHead, Table, day } from "./common";

const blank = { code: "", description: "", type: "percent", value: "", maxDiscount: "", minOrder: "", startsAt: "", expiresAt: "", usageLimit: "", perUserLimit: 1, firstOrderOnly: false, isActive: true };
const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const describe = (c) => (c.type === "percent" ? `${c.value}% off${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ""}` : `₹${c.value} off`);
const state = (c) => {
  const now = Date.now();
  if (!c.isActive) return ["gray", "Off"];
  if (c.expiresAt && new Date(c.expiresAt) < now) return ["gray", "Expired"];
  if (c.startsAt && new Date(c.startsAt) > now) return ["amber", "Scheduled"];
  if (c.usageLimit && c.usedCount >= c.usageLimit) return ["gray", "Used up"];
  return ["green", "Live"];
};

export function CouponsAdmin({ token, tell }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null); // { id?, ...fields }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { try { setRows((await api("/api/admin/coupons", { token: await token() })).data || []); } catch (e) { tell(e.message, "error"); setRows([]); } }, [token, tell]);
  useEffect(() => { load(); }, [load]);

  const call = async (path, method, body, ok) => {
    setBusy(true);
    try { await api(path, { token: await token(), method, body }); if (ok) tell(ok); await load(); return true; }
    catch (e) { tell(e.message, "error"); return false; }
    finally { setBusy(false); }
  };
  const save = async (e) => {
    e.preventDefault();
    const { id, ...f } = form;
    const body = { ...f, value: f.value, startsAt: f.startsAt || null, expiresAt: f.expiresAt ? `${f.expiresAt}T23:59:59+05:30` : null };
    if (id) delete body.code; // the code can't change once made
    if (await call(id ? `/api/admin/coupons/${id}` : "/api/admin/coupons", id ? "PUT" : "POST", body, id ? "Coupon saved." : "Coupon created.")) setForm(null);
  };
  const edit = (c) => setForm({ id: c._id, code: c.code, description: c.description || "", type: c.type, value: c.value, maxDiscount: c.maxDiscount ?? "", minOrder: c.minOrder || "", startsAt: dateInput(c.startsAt), expiresAt: dateInput(c.expiresAt), usageLimit: c.usageLimit ?? "", perUserLimit: c.perUserLimit ?? 1, firstOrderOnly: !!c.firstOrderOnly, isActive: c.isActive !== false });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  if (!rows) return <Loading/>;
  return <>
    <SectionHead title="Coupons" detail="Discount codes customers type in the cart. You pay for the discount: the shop is still paid the full price of its goods. The server works out every discount, so a code can't be faked.">
      <button onClick={() => setForm({ ...blank })} className="btn-primary"><Plus size={16}/> New coupon</button>
    </SectionHead>
    {rows.length === 0 ? <Empty title="No coupons yet" detail="Create one, for example WELCOME50 for ₹50 off a first order."/> :
      <Table head={["Code", "Discount", "Rules", "Used", "Status", "Actions"]} min={760}>
        {rows.map((c) => { const [tone, label] = state(c); return <tr key={c._id}>
          <td className="px-5 py-3"><b className="font-mono">{c.code}</b>{c.description ? <span className="block text-xs text-slate-500">{c.description}</span> : null}</td>
          <td className="px-5 py-3">{describe(c)}</td>
          <td className="px-5 py-3 text-xs text-slate-600">{[c.minOrder ? `min ₹${c.minOrder}` : "", c.firstOrderOnly ? "first order only" : "", `${c.perUserLimit}× per customer`, c.expiresAt ? `until ${day(c.expiresAt)}` : ""].filter(Boolean).join(" · ")}</td>
          <td className="px-5 py-3">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
          <td className="px-5 py-3"><Pill tone={tone}>{label}</Pill></td>
          <td className="px-5 py-3 text-right"><span className="inline-flex gap-1">
            <button disabled={busy} onClick={() => edit(c)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Edit"><Edit3 size={15}/></button>
            <button disabled={busy || c.usedCount > 0} onClick={() => window.confirm(`Delete ${c.code}?`) && call(`/api/admin/coupons/${c._id}`, "DELETE", undefined, "Coupon deleted.")} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 disabled:opacity-30" title={c.usedCount > 0 ? "Used coupons are kept; switch it off instead" : "Delete"}><Trash2 size={15}/></button>
          </span></td></tr>; })}
      </Table>}
    {form && <Modal title={form.id ? `Edit ${form.code}` : "New coupon"} close={() => setForm(null)} wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Code"><input className="input w-full font-mono uppercase" value={form.code} disabled={!!form.id} maxLength={20} onChange={set("code")} placeholder="WELCOME50" aria-label="Coupon code"/></Field>
        <Field label="Shown to customer (optional)"><input className="input w-full" value={form.description} maxLength={120} onChange={set("description")} placeholder="₹50 off your first order"/></Field>
        <Field label="Type"><select className="input w-full" value={form.type} onChange={set("type")}><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select></Field>
        <Field label={form.type === "percent" ? "Percent (1-100)" : "Amount (₹)"}><input className="input w-full" inputMode="decimal" value={form.value} onChange={set("value")} aria-label="Discount value"/></Field>
        {form.type === "percent" && <Field label="Maximum discount (₹, optional)"><input className="input w-full" inputMode="decimal" value={form.maxDiscount} onChange={set("maxDiscount")}/></Field>}
        <Field label="Minimum cart (₹, optional)"><input className="input w-full" inputMode="decimal" value={form.minOrder} onChange={set("minOrder")}/></Field>
        <Field label="Starts (optional)"><input type="date" className="input w-full" value={form.startsAt} onChange={set("startsAt")}/></Field>
        <Field label="Last day (optional)"><input type="date" className="input w-full" value={form.expiresAt} onChange={set("expiresAt")}/></Field>
        <Field label="Total uses (empty = unlimited)"><input className="input w-full" inputMode="numeric" value={form.usageLimit} onChange={set("usageLimit")}/></Field>
        <Field label="Uses per customer"><input className="input w-full" inputMode="numeric" value={form.perUserLimit} onChange={set("perUserLimit")}/></Field>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.firstOrderOnly} onChange={set("firstOrderOnly")}/> First order only</label>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.isActive} onChange={set("isActive")}/> Active</label>
        <button disabled={busy || !form.code.trim() || !String(form.value).trim()} className="btn-primary sm:col-span-2"><Check size={16}/> Save coupon</button>
      </form></Modal>}
  </>;
}
