import React, { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { Empty, Loading } from "../../ui";
import { Seg, SectionHead, Stat, Table, day } from "./common";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const RANGES = [[7, "7 days"], [30, "30 days"], [90, "90 days"]];
const ymd = (d) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10); // India date

// Share-of-total bar, so a table row shows its weight at a glance.
const Bar = ({ value, max }) => <div className="h-1.5 w-24 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${max > 0 ? Math.max(3, (value / max) * 100) : 0}%` }}/></div>;

function Block({ title, rows, head, cells, empty, valueOf }) {
  const max = Math.max(0, ...rows.map(valueOf));
  return <div><h3 className="mb-2 mt-8 font-display text-base font-bold">{title}</h3>
    {rows.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{empty}</p>
      : <Table head={[...head, ""]} min={520}>{rows.map((r, i) => <tr key={i}>{cells(r).map((c, j) => <td key={j} className={`px-5 py-3 ${j === 0 ? "font-semibold" : ""}`}>{c}</td>)}<td className="px-5 py-3"><Bar value={valueOf(r)} max={max}/></td></tr>)}</Table>}
  </div>;
}

export function InsightsAdmin({ token, tell }) {
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);

  const load = useCallback(async () => {
    setD(null);
    const to = new Date(), from = new Date(to.getTime() - (days - 1) * 86400e3);
    try { setD((await api(`/api/admin/reports/insights?from=${ymd(from)}&to=${ymd(to)}`, { token: await token() })).data); }
    catch (e) { tell(e.message, "error"); setD(false); }
  }, [token, tell, days]);
  useEffect(() => { load(); }, [load]);

  const h = d?.headline;
  return <div>
    <SectionHead title="Insights" detail="How the store is doing. Cancelled orders are left out of sales; refunds are counted on the day they were paid back.">
      <Seg options={RANGES} value={days} onChange={setDays}/>
    </SectionHead>
    {d === null ? <Loading/> : d === false ? <Empty title="Could not load insights" detail="Try again in a moment."/> : <>
      <p className="mb-3 text-xs text-slate-500">{day(d.from)} to {day(d.to)}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sales" value={inr(h.gross)} hint={`${h.orders} orders`}/>
        <Stat label="After refunds" value={inr(h.net)} hint={`${inr(h.refunded)} refunded`}/>
        <Stat label="Average order" value={inr(h.averageOrder)}/>
        <Stat label="Cancelled" value={`${h.cancelRate}%`} tone={h.cancelRate > 15 ? "red" : undefined} hint="of orders placed"/>
        <Stat label="Delivery fees" value={inr(h.delivery)}/>
        <Stat label="Coupon discounts" value={inr(h.discount)} hint={`${h.discountRate}% of goods`}/>
        <Stat label="Customers" value={h.customers} hint={`${h.newCustomers} new`}/>
        <Stat label="Came back" value={`${h.repeatRate}%`} tone={h.repeatRate >= 30 ? "green" : undefined} hint={`${h.repeatCustomers} had ordered before`}/>
      </div>
      <Block title="Top products" rows={d.topProducts} head={["Product", "Sold", "Revenue"]} valueOf={(r) => r.revenue} cells={(r) => [r.name || "—", r.qty, inr(r.revenue)]} empty="No sales in this period."/>
      <Block title="Where orders go" rows={d.areas} head={["Area", "Orders", "Sales"]} valueOf={(r) => r.gross} cells={(r) => [r.area, r.orders, inr(r.gross)]} empty="No orders in this period."/>
      <Block title="Coupons" rows={d.coupons} head={["Code", "Orders", "Discount given", "Sales"]} valueOf={(r) => r.discount} cells={(r) => [r.code, r.orders, inr(r.discount), inr(r.gross)]} empty="No coupons used in this period."/>
      <Block title="How people pay" rows={d.methods} head={["Method", "Orders", "Sales"]} valueOf={(r) => r.gross} cells={(r) => [r.method || "—", r.orders, inr(r.gross)]} empty="No orders in this period."/>
    </>}
  </div>;
}
