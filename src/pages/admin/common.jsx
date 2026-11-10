import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cx } from "../../ui";

export const statusTone = (s) => ({ approved: "green", pending: "amber", rejected: "red", suspended: "red", draft: "gray", paid: "green", void: "gray", open: "amber", fulfilled: "green" })[s] || "gray";
export const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");

export function Modal({ title, subtitle, close, children, wide }) {
  return <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/50 p-4">
    <div className={cx("my-8 w-full rounded-2xl bg-white p-6 shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}>
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">{title}</h2>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div><button type="button" onClick={close}><X/></button></div>
      <div className="mt-5">{children}</div>
    </div></div>;
}

export function Field({ label, hint, children, className = "" }) {
  return <div className={className}><label className="label">{label}</label><div className="mt-1">{children}</div>{hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}</div>;
}

export function Seg({ options, value, onChange }) {
  return <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">{options.map((o) => { const [k, label] = Array.isArray(o) ? o : [o, o]; return <button key={k} onClick={() => onChange(k)} className={cx("rounded-lg px-3 py-1.5 text-xs font-bold capitalize", value === k ? "bg-indigo-600 text-white" : "text-slate-500")}>{label}</button>; })}</div>;
}

export function SectionHead({ title, detail, children }) {
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">{title}</h2>{detail && <p className="mt-1 max-w-2xl text-sm text-slate-500">{detail}</p>}</div><div className="flex flex-wrap items-center gap-2">{children}</div></div>;
}

export function SearchBox({ value, onChange, placeholder = "Search..." }) {
  return <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input pl-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}/></div>;
}

/** Debounced search value: returns [text, setText, debounced]. */
export function useSearch(onSettle) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => { setQ(text.trim()); onSettle?.(); }, 350); return () => clearTimeout(t); }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return [text, setText, q];
}

export const Table = ({ head, children, min = 760 }) => <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm" style={{ minWidth: min }}><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{head.map((h, i) => <th key={i} className={cx("px-5 py-4", h === "Actions" && "text-right")}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table></div></div>;

export const Stat = ({ label, value, tone, hint }) => <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={cx("mt-2 font-display text-2xl font-extrabold", tone === "red" && "text-red-600", tone === "green" && "text-emerald-600", tone === "amber" && "text-amber-600")}>{value}</p>{hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}</div>;

export const PayoutFields = ({ f, set }) => <div className="grid gap-4 sm:grid-cols-2">
  <Field label="Payout method"><select className="input w-full" value={f.method || ""} onChange={set("method")}><option value="">Not set</option><option value="upi">UPI</option><option value="bank">Bank transfer</option></select></Field>
  {f.method === "upi" && <Field label="UPI id"><input className="input w-full" value={f.upiId || ""} onChange={set("upiId")} placeholder="name@okbank"/></Field>}
  {f.method === "bank" && <>
    <Field label="Account holder"><input className="input w-full" value={f.accountHolder || ""} onChange={set("accountHolder")}/></Field>
    <Field label="Account number"><input className="input w-full" value={f.accountNumber || ""} onChange={set("accountNumber")}/></Field>
    <Field label="IFSC"><input className="input w-full uppercase" value={f.ifsc || ""} onChange={set("ifsc")}/></Field>
    <Field label="Bank name"><input className="input w-full" value={f.bankName || ""} onChange={set("bankName")}/></Field></>}
</div>;
