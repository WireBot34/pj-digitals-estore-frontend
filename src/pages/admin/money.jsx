import React, { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api, download, money, qs } from "../../api";
import { useList } from "../../useList";
import { Empty, Loading, Pager, Pill, cx } from "../../ui";
import { Field, Modal, SectionHead, Seg, Stat, Table, day, statusTone, when } from "./common";

const rupees = (n) => money(n);
const pct = (r) => `${+(Number(r) * 100).toFixed(2)}%`;

export function Payouts({ token, tell }) {
  const [tab, setTab] = useState("owed");
  const [bump, setBump] = useState(0);
  const refresh = () => setBump((b) => b + 1);
  return <>
    <SectionHead title="Payouts" detail="Money owed to shops and delivery partners. Settle in a couple of clicks, correct amounts, record references, void mistakes and export for your accountant.">
      <Seg options={[["owed", "Owed to shops"], ["settlements", "Shop settlements"], ["requests", "Requests"], ["drivers", "Drivers & COD"], ["ledger", "Reports & export"]]} value={tab} onChange={setTab}/></SectionHead>
    {tab === "owed" && <Owed key={bump} token={token} tell={tell} refresh={refresh} goto={setTab}/>}
    {tab === "settlements" && <Settlements key={bump} token={token} tell={tell}/>}
    {tab === "requests" && <Requests key={bump} token={token} tell={tell} refresh={refresh}/>}
    {tab === "drivers" && <DriverPayouts key={bump} token={token} tell={tell}/>}
    {tab === "ledger" && <Ledger token={token} tell={tell}/>}
  </>;
}

/* ----------------------------------------------------------- Owed to shops */
function Owed({ token, tell, refresh }) {
  const [data, setData] = useState(null);
  const [settling, setSettling] = useState(null);
  const load = useCallback(async () => { try { setData((await api("/api/admin/payouts/summary", { token: await token() })).data); } catch (e) { tell(e.message, "error"); setData({ owed: [], totals: {} }); } }, [token, tell]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Loading/>;
  const t = data.totals;
  const settleAll = async () => {
    if (!data.owed.length || !confirm(`Create settlements for all ${data.owed.length} shops (${rupees(t.unsettledNet)})?`)) return;
    try { const r = await api("/api/admin/settlements/bulk", { token: await token(), method: "POST", body: {} }); tell(`${r.created.length} settlements created (${rupees(r.total)}).${r.failed.length ? ` ${r.failed.length} failed.` : ""}`); refresh(); } catch (e) { tell(e.message, "error"); }
  };
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Owed to shops (not yet settled)" value={rupees(t.unsettledNet)} tone="amber"/><Stat label="Our commission on that" value={rupees(t.unsettledCommission)}/><Stat label="Settled, awaiting payment" value={rupees(t.pendingToPay)} hint={`${t.pendingCount || 0} settlements`} tone="amber"/><Stat label="Paid out so far" value={rupees(t.paidOut)} hint={`Commission earned ${rupees(t.commissionEarned)}`} tone="green"/></div>
    <div className="mb-4 mt-6 flex items-center justify-between"><h3 className="font-extrabold">Shops with delivered, paid, unsettled orders</h3>{data.owed.length > 1 && <button onClick={settleAll} className="btn-primary px-4 py-2 text-xs">Settle all shops</button>}</div>
    {data.owed.length ? <Table head={["Shop", "Orders", "Sales", "Commission", "Net to pay", "Oldest", "Actions"]}>{data.owed.map((r) => <tr key={r.shopId}>
      <td className="px-5 py-4"><p className="font-bold">{r.name}</p><p className="text-xs text-slate-400">{r.location}{r.hasPayoutAccount ? "" : " · ⚠ no payout account"}</p></td><td className="px-5 py-4">{r.orders}</td><td className="px-5 py-4">{rupees(r.gross)}</td><td className="px-5 py-4">{rupees(r.commission)} <span className="text-xs text-slate-400">({pct(r.rate)})</span></td><td className="px-5 py-4 font-extrabold">{rupees(r.net)}</td><td className="px-5 py-4 text-slate-500">{day(r.oldest)}</td>
      <td className="px-5 py-4"><div className="flex justify-end"><button onClick={() => setSettling(r.shopId)} className="btn-secondary px-3 py-2 text-xs">Review & settle</button></div></td></tr>)}</Table> : <Empty title="Nothing owed" detail="Delivered and paid orders will appear here until they are settled."/>}
    {settling && <SettleModal shopId={settling} token={token} tell={tell} close={() => setSettling(null)} done={() => { setSettling(null); refresh(); }}/>}
  </>;
}

export function SettleModal({ shopId, token, tell, close, done }) {
  const [p, setP] = useState(null);
  const [f, setF] = useState({ commissionPct: "", adjustment: "", adjustmentNote: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const rate = f.commissionPct === "" ? undefined : Number(f.commissionPct) / 100;
  useEffect(() => { let live = true; setP(null); (async () => { try { const r = await api("/api/admin/payouts/preview" + qs({ shopId, commissionRate: rate }), { token: await token() }); if (live) setP(r.data); } catch (e) { tell(e.message, "error"); close(); } })(); return () => { live = false; }; }, [shopId, rate]); // eslint-disable-line react-hooks/exhaustive-deps
  const adj = Number(f.adjustment) || 0;
  const submit = async () => {
    setBusy(true);
    try { await api("/api/admin/settlements", { token: await token(), method: "POST", body: { shopId, commissionRate: rate, adjustment: adj, adjustmentNote: f.adjustmentNote, notes: f.notes } }); tell("Settlement created."); done(); } catch (e) { tell(e.message, "error"); } finally { setBusy(false); }
  };
  return <Modal wide title="Review settlement" subtitle="Creates a pending payout for every delivered + paid order not yet settled." close={close}>
    {!p ? <Loading/> : !p.ordersCount ? <p className="text-sm text-slate-500">No unsettled orders.</p> : <>
      <div className="grid gap-3 sm:grid-cols-4 text-sm"><Stat label="Orders" value={p.ordersCount}/><Stat label="Sales" value={rupees(p.grossSales)} hint={`COD ${rupees(p.codAmount)} · online ${rupees(p.onlineAmount)}`}/><Stat label={`Commission (${pct(p.rate)})`} value={`− ${rupees(p.commission)}`}/><Stat label="Net payable" value={rupees(p.net + adj)} tone="green"/></div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Send money to</p><p className="mt-1 font-semibold">{p.payoutLabel || "⚠ The shop hasn't added a payout account yet."}</p></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Commission override (%)" hint="Empty = shop / platform rate"><input type="number" min="0" max="99" step="0.1" className="input w-full" value={f.commissionPct} onChange={(e) => setF({ ...f, commissionPct: e.target.value })}/></Field>
        <Field label="Adjustment (₹)" hint="+ bonus, − refund / penalty"><input type="number" step="0.01" className="input w-full" value={f.adjustment} onChange={(e) => setF({ ...f, adjustment: e.target.value })}/></Field>
        <Field label="Adjustment reason"><input className="input w-full" value={f.adjustmentNote} onChange={(e) => setF({ ...f, adjustmentNote: e.target.value })}/></Field></div>
      <Field className="mt-4" label="Notes"><input className="input w-full" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}/></Field>
      <details className="mt-4 text-sm"><summary className="cursor-pointer font-bold text-indigo-600">Show the {p.orders.length} orders</summary><div className="mt-2 max-h-48 space-y-1 overflow-y-auto">{p.orders.map((o) => <div key={o._id} className="flex justify-between text-xs"><span>{o.orderNumber} · {day(o.deliveredAt)}</span><span>{rupees(o.subtotal)} {o.paymentMethod === "cod" ? "· COD" : ""}</span></div>)}</div></details>
      <div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-secondary">Cancel</button><button disabled={busy || p.net + adj < 0} onClick={submit} className="btn-primary">{busy ? "Creating..." : "Create settlement"}</button></div></>}
  </Modal>;
}

/* ------------------------------------------------------------- Settlements */
function Settlements({ token, tell }) {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const { data, pagination, loading, reload } = useList("/api/admin/settlements", { status, page, limit: 15 }, token, tell);
  const [paying, setPaying] = useState(null);
  const [detail, setDetail] = useState(null);
  const view = async (s) => { try { setDetail((await api(`/api/admin/settlements/${s._id}`, { token: await token() })).data); } catch (e) { tell(e.message, "error"); } };
  const voidIt = async (s) => { const reason = window.prompt("Why void this settlement? Its orders go back to 'owed'."); if (reason === null) return; try { await api(`/api/admin/settlements/${s._id}`, { token: await token(), method: "PUT", body: { status: "void", reason } }); tell("Settlement voided."); await reload(); } catch (e) { tell(e.message, "error"); } };
  const exp = async () => { try { await download("/api/admin/settlements/export.csv" + qs({ status }), await token(), "settlements.csv"); } catch (e) { tell(e.message, "error"); } };
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Seg options={[["", "All"], "pending", "paid", "void"]} value={status} onChange={(s) => { setStatus(s); setPage(1); }}/><button onClick={exp} className="btn-secondary px-3 py-2 text-xs"><Download size={14}/> Export CSV</button></div>
    {loading ? <Loading/> : data.length ? <Table min={900} head={["Shop", "Orders", "Sales", "Commission", "Adjust", "Net", "Status", "Actions"]}>{data.map((s) => <tr key={s._id}>
      <td className="px-5 py-4"><button onClick={() => view(s)} className="text-left font-bold hover:text-indigo-600">{s.shop?.name || "Shop"}</button><p className="text-xs text-slate-400">{day(s.periodFrom)} – {day(s.periodTo)}</p></td><td className="px-5 py-4">{s.ordersCount}</td><td className="px-5 py-4">{rupees(s.grossSales)}</td><td className="px-5 py-4">{rupees(s.commission)}</td><td className="px-5 py-4">{s.adjustment ? rupees(s.adjustment) : "—"}</td><td className="px-5 py-4 font-extrabold">{rupees(s.netPayable)}</td>
      <td className="px-5 py-4"><Pill tone={statusTone(s.status)}>{s.status}</Pill>{s.status === "paid" && <p className="mt-1 text-xs text-slate-400">{day(s.paidAt)}{s.reference ? ` · ${s.reference}` : ""}</p>}</td>
      <td className="px-5 py-4"><div className="flex justify-end gap-2">{s.status === "pending" && <><button onClick={() => setPaying(s)} className="btn-primary px-3 py-2 text-xs">Mark paid</button><button onClick={() => voidIt(s)} className="btn-secondary px-3 py-2 text-xs text-red-600">Void</button></>}</div></td></tr>)}</Table> : <Empty title="No settlements" detail="Create one from the “Owed to shops” tab."/>}
    <Pager pagination={pagination} onPage={setPage}/>
    {paying && <PayModal s={paying} token={token} tell={tell} close={() => setPaying(null)} done={() => { setPaying(null); reload(); }}/>}
    {detail && <Modal wide title={`${detail.shop?.name} settlement`} subtitle={`${detail.ordersCount} orders · ${pct(detail.commissionRate)} commission`} close={() => setDetail(null)}>
      <div className="grid gap-3 sm:grid-cols-4"><Stat label="Sales" value={rupees(detail.grossSales)}/><Stat label="Commission" value={rupees(detail.commission)}/><Stat label="Adjustment" value={rupees(detail.adjustment)} hint={detail.adjustmentNote}/><Stat label="Net" value={rupees(detail.netPayable)} tone="green"/></div>
      {detail.payoutSnapshot && <p className="mt-3 text-sm text-slate-600"><b>Send to:</b> {detail.payoutSnapshot}</p>}{detail.notes && <p className="mt-1 text-sm text-slate-500">{detail.notes}</p>}
      <div className="mt-4 max-h-64 space-y-1 overflow-y-auto text-sm">{(detail.orders || []).map((o) => <div key={o._id} className="flex justify-between"><span>{o.orderNumber} · {day(o.deliveredAt)}</span><span>{rupees(o.subtotal)}{o.paymentMethod === "cod" ? " · COD" : ""}</span></div>)}</div></Modal>}
  </>;
}

function PayModal({ s, token, tell, close, done }) {
  const [f, setF] = useState({ reference: "", adjustment: String(s.adjustment || ""), adjustmentNote: s.adjustmentNote || "" });
  const [busy, setBusy] = useState(false);
  const net = s.grossSales - s.commission + (Number(f.adjustment) || 0);
  const submit = async (e) => { e.preventDefault(); setBusy(true); try { await api(`/api/admin/settlements/${s._id}`, { token: await token(), method: "PUT", body: { status: "paid", reference: f.reference, adjustment: Number(f.adjustment) || 0, adjustmentNote: f.adjustmentNote } }); tell("Marked as paid. The shop has been notified."); done(); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); } };
  return <Modal title={`Pay ${s.shop?.name || "shop"}`} subtitle={s.payoutSnapshot ? `Send to: ${s.payoutSnapshot}` : "No payout account on file"} close={close}><form onSubmit={submit} className="space-y-4">
    <div className="rounded-xl bg-emerald-50 p-4 text-center"><p className="text-xs font-semibold text-emerald-700">Amount to send</p><p className="font-display text-3xl font-extrabold text-emerald-700">{rupees(net)}</p></div>
    <Field label="Transaction reference (UTR / UPI ref)"><input className="input w-full" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })}/></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Last-minute adjustment (₹)"><input type="number" step="0.01" className="input w-full" value={f.adjustment} onChange={(e) => setF({ ...f, adjustment: e.target.value })}/></Field><Field label="Reason"><input className="input w-full" value={f.adjustmentNote} onChange={(e) => setF({ ...f, adjustmentNote: e.target.value })}/></Field></div>
    <div className="flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={busy || net < 0} className="btn-primary">{busy ? "Saving..." : "Confirm payment sent"}</button></div></form></Modal>;
}

/* ---------------------------------------------------------------- Requests */
function Requests({ token, tell, refresh }) {
  const [status, setStatus] = useState("open");
  const { data, loading, reload } = useList("/api/admin/payout-requests", { status, limit: 50 }, token, tell);
  const [settling, setSettling] = useState(null);
  const reject = async (r) => { const note = window.prompt("Reason for declining (the shop will see this):"); if (note === null) return; if (!note.trim()) { tell("A reason is required.", "error"); return; } try { await api(`/api/admin/payout-requests/${r._id}`, { token: await token(), method: "PUT", body: { status: "rejected", note } }); tell("Request declined."); await reload(); } catch (e) { tell(e.message, "error"); } };
  return <>
    <div className="mb-4"><Seg options={[["open", "Open"], ["fulfilled", "Fulfilled"], ["rejected", "Declined"]]} value={status} onChange={setStatus}/></div>
    {loading ? <Loading/> : data.length ? <div className="space-y-3">{data.map((r) => <div key={r._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><p className="font-extrabold">{r.shop?.name} <Pill tone={statusTone(r.status)}>{r.status}</Pill></p><p className="text-sm text-slate-500">{r.ordersCount} orders · sales {rupees(r.grossSales)} · about <b>{rupees(r.estimatedNet)}</b> net · requested {when(r.createdAt)}</p>{r.note && <p className="mt-1 text-sm text-slate-600">“{r.note}”</p>}{r.resolutionNote && <p className="mt-1 text-xs text-slate-400">{r.resolutionNote}</p>}</div>
      {r.status === "open" && <div className="flex gap-2"><button onClick={() => setSettling(r.shop?._id)} className="btn-primary px-4 py-2 text-xs">Review & settle</button><button onClick={() => reject(r)} className="btn-secondary px-4 py-2 text-xs text-red-600">Decline</button></div>}</div>)}</div> : <Empty title={`No ${status} requests`} detail="Shop owners can request a payout from their Payouts tab."/>}
    {settling && <SettleModal shopId={settling} token={token} tell={tell} close={() => setSettling(null)} done={() => { setSettling(null); refresh(); }}/>}
  </>;
}

/* -------------------------------------------------------- Drivers & COD */
function DriverPayouts({ token, tell }) {
  const [sum, setSum] = useState(null);
  const [settling, setSettling] = useState(null);
  const hist = useList("/api/admin/driver-payouts", { limit: 20 }, token, tell);
  const load = useCallback(async () => { try { const r = await api("/api/admin/driver-payouts/summary", { token: await token() }); setSum(r); } catch (e) { tell(e.message, "error"); setSum({ data: [], totals: {} }); } }, [token, tell]);
  useEffect(() => { load(); }, [load]);
  const exp = async () => { try { await download("/api/admin/driver-payouts/export.csv", await token(), "driver-settlements.csv"); } catch (e) { tell(e.message, "error"); } };
  if (!sum) return <Loading/>;
  return <>
    <div className="grid gap-4 sm:grid-cols-2"><Stat label="We owe drivers" value={rupees(sum.totals.owedToDrivers)} tone="amber" hint="Delivery fees minus cash they hold, where positive"/><Stat label="Cash to collect from drivers" value={rupees(sum.totals.cashToCollect)} tone="red" hint="Cash-on-delivery money drivers still hold"/></div>
    <h3 className="mb-3 mt-6 font-extrabold">Unsettled deliveries</h3>
    {sum.data.length ? <Table head={["Driver", "Deliveries", "Fees earned", "COD cash held", "Net", "Oldest", "Actions"]}>{sum.data.map((d) => <tr key={d.driverId}>
      <td className="px-5 py-4"><p className="font-bold">{d.name}</p><p className="text-xs text-slate-400">{d.phone}{d.hasPayoutAccount ? "" : " · ⚠ no payout account"}</p></td><td className="px-5 py-4">{d.deliveries}</td><td className="px-5 py-4">{rupees(d.earnings)}</td><td className="px-5 py-4">{rupees(d.codHeld)}</td>
      <td className="px-5 py-4"><span className={cx("font-extrabold", d.net < 0 ? "text-red-600" : "text-emerald-600")}>{d.net >= 0 ? `Pay ${rupees(d.net)}` : `Collect ${rupees(-d.net)}`}</span></td><td className="px-5 py-4 text-slate-500">{day(d.oldest)}</td>
      <td className="px-5 py-4"><div className="flex justify-end"><button onClick={() => setSettling(d.driverId)} className="btn-secondary px-3 py-2 text-xs">Settle</button></div></td></tr>)}</Table> : <Empty title="All square" detail="Delivered jobs show up here until they are settled."/>}
    <div className="mb-3 mt-8 flex items-center justify-between"><h3 className="font-extrabold">Settlement history</h3><button onClick={exp} className="btn-secondary px-3 py-2 text-xs"><Download size={14}/> Export CSV</button></div>
    {hist.loading ? <Loading/> : hist.data.length ? <Table head={["Date", "Driver", "Deliveries", "Fees", "COD", "Adjust", "Net", "Ref"]}>{hist.data.map((s) => <tr key={s._id}><td className="px-5 py-3">{when(s.createdAt)}</td><td className="px-5 py-3 font-bold">{s.driver?.fullName}</td><td className="px-5 py-3">{s.deliveriesCount}</td><td className="px-5 py-3">{rupees(s.earnings)}</td><td className="px-5 py-3">{rupees(s.codCollected)}</td><td className="px-5 py-3">{s.adjustment ? rupees(s.adjustment) : "—"}</td><td className="px-5 py-3 font-bold">{rupees(s.net)}</td><td className="px-5 py-3 text-slate-500">{s.reference || "—"}</td></tr>)}</Table> : <p className="text-sm text-slate-400">No settlements yet.</p>}
    {settling && <DriverSettleModal driverId={settling} token={token} tell={tell} close={() => setSettling(null)} done={() => { setSettling(null); load(); hist.reload(); }}/>}
  </>;
}

function DriverSettleModal({ driverId, token, tell, close, done }) {
  const [p, setP] = useState(null);
  const [f, setF] = useState({ adjustment: "", adjustmentNote: "", reference: "", notes: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => { try { setP((await api("/api/admin/driver-payouts/preview" + qs({ driverId }), { token: await token() })).data); } catch (e) { tell(e.message, "error"); close(); } })(); }, [driverId]); // eslint-disable-line react-hooks/exhaustive-deps
  const adj = Number(f.adjustment) || 0;
  const submit = async () => { setBusy(true); try { await api("/api/admin/driver-payouts", { token: await token(), method: "POST", body: { driverId, ...f, adjustment: adj } }); tell("Driver settled."); done(); } catch (e) { tell(e.message, "error"); } finally { setBusy(false); } };
  const net = p ? p.net + adj : 0;
  return <Modal title={`Settle ${p?.driver?.fullName || "driver"}`} subtitle="Delivery fees owed, minus the cash-on-delivery money they collected." close={close}>
    {!p ? <Loading/> : <>
      <div className="grid grid-cols-3 gap-3"><Stat label="Deliveries" value={p.deliveries}/><Stat label="Fees" value={rupees(p.earnings)}/><Stat label="COD held" value={rupees(p.codCollected)}/></div>
      <div className={cx("mt-4 rounded-xl p-4 text-center", net >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}><p className="text-xs font-semibold">{net >= 0 ? "Pay the driver" : "Driver hands over cash"}</p><p className="font-display text-3xl font-extrabold">{rupees(Math.abs(net))}</p></div>
      {p.driver.payout && <p className="mt-3 text-sm text-slate-600"><b>Pay to:</b> {p.driver.payout.method === "upi" ? `UPI ${p.driver.payout.upiId}` : `${p.driver.payout.accountHolder} · ${p.driver.payout.accountNumber} · ${p.driver.payout.ifsc}`}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Bonus / deduction (₹)"><input type="number" step="0.01" className="input w-full" value={f.adjustment} onChange={(e) => setF({ ...f, adjustment: e.target.value })}/></Field><Field label="Reason"><input className="input w-full" value={f.adjustmentNote} onChange={(e) => setF({ ...f, adjustmentNote: e.target.value })}/></Field><Field label="Reference"><input className="input w-full" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })}/></Field><Field label="Notes"><input className="input w-full" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}/></Field></div>
      <div className="mt-6 flex justify-end gap-3"><button onClick={close} className="btn-secondary">Cancel</button><button disabled={busy} onClick={submit} className="btn-primary">{busy ? "Saving..." : "Record settlement"}</button></div></>}
  </Modal>;
}

/* ---------------------------------------------------------- Reports / export */
const iso = (d) => d.toISOString().slice(0, 10);
function Ledger({ token, tell }) {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const [groupBy, setGroupBy] = useState("day");
  const [sales, setSales] = useState(null);
  const [shops, setShops] = useState(null);
  useEffect(() => { let live = true; setSales(null); setShops(null); (async () => { try { const t = await token(); const [a, b] = await Promise.all([api("/api/admin/reports/sales" + qs({ from, to, groupBy }), { token: t }), api("/api/admin/reports/shops" + qs({ from, to }), { token: t })]); if (live) { setSales(a.data); setShops(b.data); } } catch (e) { tell(e.message, "error"); } })(); return () => { live = false; }; }, [from, to, groupBy, token, tell]);
  const exp = async () => { try { await download("/api/admin/payments/export.csv" + qs({ from, to }), await token(), "orders.csv"); } catch (e) { tell(e.message, "error"); } };
  return <>
    <div className="mb-5 flex flex-wrap items-end gap-3"><Field label="From"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)}/></Field><Field label="To"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)}/></Field><Seg options={[["day", "Daily"], ["month", "Monthly"]]} value={groupBy} onChange={setGroupBy}/><button onClick={exp} className="btn-secondary px-3 py-2 text-xs"><Download size={14}/> Orders CSV</button></div>
    {!sales ? <Loading/> : <>
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Orders" value={sales.totals.orders}/><Stat label="Order value" value={rupees(sales.totals.gross)}/><Stat label="Money collected" value={rupees(sales.totals.collected)} tone="green"/></div>
      <h3 className="mb-3 mt-6 font-extrabold">Sales</h3>
      {sales.rows.length ? <Table min={600} head={["Period", "Orders", "Order value", "Collected", "COD", "Online"]}>{sales.rows.map((r) => <tr key={r.period}><td className="px-5 py-3 font-bold">{r.period}</td><td className="px-5 py-3">{r.orders}</td><td className="px-5 py-3">{rupees(r.gross)}</td><td className="px-5 py-3">{rupees(r.collected)}</td><td className="px-5 py-3">{r.codOrders}</td><td className="px-5 py-3">{r.onlineOrders}</td></tr>)}</Table> : <Empty title="No orders" detail="Nothing in this date range."/>}
      <h3 className="mb-3 mt-6 font-extrabold">By shop</h3>
      {shops?.rows.length ? <Table min={600} head={["Shop", "Orders", "Delivered", "Cancelled", "Sales"]}>{shops.rows.map((r) => <tr key={r.shopId}><td className="px-5 py-3 font-bold">{r.shopName || "—"}<span className="ml-2 text-xs text-slate-400">{r.location}</span></td><td className="px-5 py-3">{r.orders}</td><td className="px-5 py-3">{r.delivered}</td><td className="px-5 py-3">{r.cancelled}</td><td className="px-5 py-3 font-bold">{rupees(r.sales)}</td></tr>)}</Table> : <p className="text-sm text-slate-400">No shop orders in this range.</p>}</>}
  </>;
}
