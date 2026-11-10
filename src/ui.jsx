import React from "react";
import { SignInButton } from "@clerk/clerk-react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Package, ShieldCheck, Star, X } from "lucide-react";

export const cx = (...a) => a.filter(Boolean).join(" ");

export function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={cx("fixed right-5 top-5 z-[100] flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-xl", notice.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
    {notice.type === "error" ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}<p className="text-sm font-semibold">{notice.text}</p><button onClick={clear}><X size={16}/></button>
  </div>;
}

export function Loading() { return <div className="grid min-h-[55vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"/></div>; }

export function Empty({ title, detail }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Package className="mx-auto text-slate-300" size={34}/><h3 className="mt-3 font-bold text-slate-800">{title}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></div>; }

export function AuthPrompt() { return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><ShieldCheck className="mx-auto text-indigo-600" size={36}/><h2 className="mt-4 text-xl font-extrabold">Sign in to continue</h2><p className="mt-2 text-sm text-slate-500">Your account is required for this feature.</p><SignInButton mode="modal"><button className="btn-primary mt-6">Sign in</button></SignInButton></div>; }

const PILL = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-indigo-50 text-indigo-700",
  gray: "bg-slate-100 text-slate-600",
};
export function Pill({ tone = "gray", children }) { return <span className={cx("rounded-full px-3 py-1 text-xs font-bold capitalize", PILL[tone])}>{children}</span>; }

export const orderTone = (s) => ({ delivered: "green", cancelled: "red", shipping: "blue", processing: "blue", placed: "amber" })[s] || "gray";
export const payTone = (s) => ({ paid: "green", failed: "red", refunded: "gray", pending: "amber" })[s] || "gray";
export const prettify = (s) => String(s || "").replace(/_/g, " ");

export function Stars({ value = 0, size = 14 }) {
  return <span className="inline-flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}/>)}</span>;
}

export function Pager({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages } = pagination;
  return <div className="mt-8 flex items-center justify-center gap-3 text-sm font-semibold">
    <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary px-3 py-2"><ChevronLeft size={16}/> Prev</button>
    <span className="text-slate-500">Page {page} of {pages}</span>
    <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-secondary px-3 py-2">Next <ChevronRight size={16}/></button>
  </div>;
}
