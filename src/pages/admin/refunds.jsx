import React, { useCallback, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { api } from "../../api";
import { Empty, Loading, Pill } from "../../ui";
import { Field, Modal, SectionHead, Seg, Table, when } from "./common";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function RefundsAdmin({ token, tell }) {
  const [tab, setTab] = useState("pay");
  const [data, setData] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null); // new refund { orderNumber, order?, amount, reason, note }
  const [paying, setPaying] = useState(null); // refund being marked paid { id, reference }

  const load = useCallback(async () => {
    try {
      const t = await token();
      setData((await api("/api/admin/refunds", { token: t })).data);
      setLedger((await api("/api/admin/ledger", { token: t })).data);
    } catch (e) { tell(e.message, "error"); setData({ refunds: [], due: [], reasons: [] }); }
  }, [token, tell]);
  useEffect(() => { load(); }, [load]);

  const call = async (path, method, body, ok) => {
    setBusy(true);
    try { await api(path, { token: await token(), method, body }); if (ok) tell(ok); await load(); return true; }
    catch (e) { tell(e.message, "error"); return false; }
    finally { setBusy(false); }
  };

  if (!data || !ledger) return <Loading/>;
  const pending = data.refunds.filter((r) => r.status === "pending");
  const history = data.refunds.filter((r) => r.status !== "pending");
  const reasonOf = (c) => data.reasons.find(([k]) => k === c)?.[1] || c;
  const start = (o) => setForm({ order: o._id, orderNumber: o.orderNumber, amount: "", reason: "cancelled", note: "", total: o.totalAmount });
  const create = async (e) => {
    e.preventDefault();
    if (await call("/api/admin/refunds", "POST", { order: form.order, orderNumber: form.order ? undefined : form.orderNumber, amount: form.amount, reason: form.reason, note: form.note, chargeShop: !!form.chargeShop }, "Refund added. Pay it back, then mark it paid.")) setForm(null);
  };
  const markPaid = async (e) => {
    e.preventDefault();
    if (await call(`/api/admin/refunds/${paying.id}/complete`, "PUT", { reference: paying.reference }, "Refund recorded. The customer has been told.")) setPaying(null);
  };

  return <>
    <SectionHead title="Refunds and money book" detail="Refunds are paid back by you (UPI, bank or the payment dashboard); here you record them. Marking a refund paid writes it to the money book and tells the customer.">
      <button onClick={() => setForm({ orderNumber: "", amount: "", reason: "other", note: "" })} className="btn-primary"><Plus size={16}/> Refund an order</button>
    </SectionHead>
    <div className="mb-4"><Seg value={tab} onChange={setTab} options={[["pay", `To pay back${pending.length + data.due.length ? ` (${pending.length + data.due.length})` : ""}`], ["history", "Done"], ["book", "Money book"]]}/></div>

    {tab === "pay" && <>
      {pending.length === 0 && data.due.length === 0 && <Empty title="Nothing to refund" detail="Paid orders that get cancelled will show up here."/>}
      {data.due.length > 0 && <div className="mb-6"><h3 className="mb-2 text-sm font-bold text-slate-700">Paid, then cancelled: refund due</h3>
        <Table head={["Order", "Customer", "Paid", "Cancelled", "Actions"]} min={640}>
          {data.due.map((o) => <tr key={o._id}><td className="px-5 py-3 font-bold">{o.orderNumber}</td><td className="px-5 py-3">{o.user?.name || o.user?.email || "—"}</td><td className="px-5 py-3">{inr(o.totalAmount)}</td><td className="px-5 py-3">{when(o.cancelledAt)}</td>
            <td className="px-5 py-3 text-right"><button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => start(o)}>Start refund</button></td></tr>)}
        </Table></div>}
      {pending.length > 0 && <div><h3 className="mb-2 text-sm font-bold text-slate-700">Waiting to be paid back</h3>
        <Table head={["Order", "Amount", "Reason", "Added", "Actions"]} min={640}>
          {pending.map((r) => <tr key={r._id}><td className="px-5 py-3 font-bold">{r.orderNumber}</td><td className="px-5 py-3 font-bold">{inr(r.amount)}</td><td className="px-5 py-3">{reasonOf(r.reason)}{r.chargeShop ? <span className="ml-1 text-xs font-semibold text-amber-700">· shop pays</span> : null}{r.note ? <span className="block text-xs text-slate-500">{r.note}</span> : null}</td><td className="px-5 py-3">{when(r.createdAt)}</td>
            <td className="px-5 py-3 text-right"><span className="inline-flex gap-2"><button disabled={busy} className="btn-primary px-3 py-1.5 text-xs" onClick={() => setPaying({ id: r._id, reference: "", amount: r.amount, order: r.orderNumber })}>Mark paid</button><button disabled={busy} className="btn-secondary px-3 py-1.5 text-xs" onClick={() => call(`/api/admin/refunds/${r._id}/cancel`, "PUT", undefined, "Refund cancelled.")}>Cancel</button></span></td></tr>)}
        </Table></div>}
    </>}

    {tab === "history" && (history.length === 0 ? <Empty title="No finished refunds yet"/> :
      <Table head={["Order", "Amount", "Status", "Reference", "When"]} min={640}>
        {history.map((r) => <tr key={r._id}><td className="px-5 py-3 font-bold">{r.orderNumber}</td><td className="px-5 py-3">{inr(r.amount)}</td><td className="px-5 py-3"><Pill tone={r.status === "completed" ? "green" : "gray"}>{r.status}</Pill></td><td className="px-5 py-3">{r.reference || "—"}</td><td className="px-5 py-3">{when(r.completedAt || r.updatedAt)}</td></tr>)}
      </Table>)}

    {tab === "book" && <>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Money in</p><p className="text-lg font-black text-green-700" data-testid="book-in">{inr(ledger.totals.in)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Refunded</p><p className="text-lg font-black text-red-700">{inr(ledger.totals.out)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Net</p><p className="text-lg font-black">{inr(ledger.totals.net)}</p></div>
      </div>
      {ledger.totals.payments === 0 && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">The money book only has entries from now on. <button className="font-bold underline" disabled={busy} onClick={() => call("/api/admin/ledger/backfill", "POST", undefined, "Past paid orders added to the money book.")}>Add past paid orders</button></p>}
      {ledger.entries.length === 0 ? <Empty title="The money book is empty" detail="Payments and refunds are written here as they happen."/> :
        <Table head={["When", "Order", "Type", "Amount", "Reference"]} min={640}>
          {ledger.entries.map((x) => <tr key={x._id}><td className="px-5 py-3">{when(x.createdAt)}</td><td className="px-5 py-3 font-bold">{x.order?.orderNumber || "—"}</td><td className="px-5 py-3"><Pill tone={x.kind === "payment" ? "green" : "amber"}>{x.kind === "payment" ? `in · ${x.method}` : "refund out"}</Pill></td><td className="px-5 py-3 font-bold">{x.kind === "refund" ? "−" : "+"}{inr(x.amount)}</td><td className="px-5 py-3">{x.reference || "—"}</td></tr>)}
        </Table>}
    </>}

    {form && <Modal title="Refund an order" subtitle="Leave the amount empty to refund everything that is left." close={() => setForm(null)}>
      <form onSubmit={create} className="space-y-4">
        <Field label="Order number"><input className="input w-full" value={form.orderNumber} disabled={!!form.order} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} placeholder="ORD-…" aria-label="Order number"/></Field>
        <Field label="Amount (₹)"><input className="input w-full" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={form.total ? `up to ${form.total}` : "whole amount"} aria-label="Refund amount"/></Field>
        <Field label="Reason"><select className="input w-full" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>{data.reasons.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Note (optional)"><input className="input w-full" maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}/></Field>
        <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm"><input type="checkbox" className="mt-1" checked={!!form.chargeShop} onChange={(e) => setForm({ ...form, chargeShop: e.target.checked })}/><span>The shop was at fault: take its share from its next payout<span className="block text-xs text-slate-500">Only for delivered orders of a shop. The shop gives back the goods part (after our commission), not delivery or tax.</span></span></label>
        <button disabled={busy || !form.orderNumber.trim()} className="btn-primary w-full"><Check size={16}/> Add refund</button>
      </form></Modal>}
    {paying && <Modal title={`Mark ${inr(paying.amount)} refund as paid`} subtitle={`Order ${paying.order}. Pay the customer first, then enter the UPI / bank reference.`} close={() => setPaying(null)}>
      <form onSubmit={markPaid} className="space-y-4">
        <Field label="UPI / bank reference"><input autoFocus className="input w-full" value={paying.reference} maxLength={120} onChange={(e) => setPaying({ ...paying, reference: e.target.value })} aria-label="Refund reference"/></Field>
        <button disabled={busy || !paying.reference.trim()} className="btn-primary w-full"><Check size={16}/> Record as paid</button>
      </form></Modal>}
  </>;
}
