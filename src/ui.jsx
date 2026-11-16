import React from "react";
import { SignInButton } from "@clerk/clerk-react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Package, ShieldCheck, Star, X } from "lucide-react";

export const cx = (...a) => a.filter(Boolean).join(" ");

/** Toast: top on desktop, above the bottom tab bar on phones. */
export function Notice({ notice, clear }) {
  if (!notice) return null;
  const bad = notice.type === "error";
  return <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] z-[100] flex justify-center px-4 md:bottom-auto md:right-5 md:top-5 md:inset-x-auto md:justify-end">
    <div className={cx("pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border px-4 py-3 shadow-lg md:w-auto", bad ? "border-red-200 bg-red-50 text-red-900" : "border-brand-200 bg-brand-50 text-brand-900")}>
      {bad ? <AlertCircle size={18} className="mt-0.5 shrink-0"/> : <CheckCircle2 size={18} className="mt-0.5 shrink-0"/>}
      <p className="flex-1 text-sm font-medium">{notice.text}</p>
      <button onClick={clear} aria-label="Dismiss" className="-m-1 p-1"><X size={16}/></button>
    </div>
  </div>;
}

export function Loading() { return <div className="grid min-h-[50vh] place-items-center"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600"/></div>; }

/** Placeholder block for loading lists. */
export const Skeleton = ({ className = "" }) => <div className={cx("animate-pulse rounded-lg bg-slate-200/70", className)}/>;

export function ProductGridSkeleton({ n = 8 }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: n }, (_, i) => <div key={i}><Skeleton className="aspect-[4/5]"/><Skeleton className="mt-3 h-4 w-4/5"/><Skeleton className="mt-2 h-4 w-1/3"/></div>)}</div>;
}

export function Empty({ title, detail, action }) {
  return <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center sm:py-14">
    <Package className="mx-auto text-slate-400" size={28} strokeWidth={1.5}/>
    <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
    {detail && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{detail}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

export function AuthPrompt() {
  return <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
    <ShieldCheck className="mx-auto text-brand-600" size={30} strokeWidth={1.5}/>
    <h2 className="mt-4 font-display text-xl font-bold">Sign in to continue</h2>
    <p className="mt-2 text-sm text-slate-500">You need an account for this part of the store.</p>
    <SignInButton mode="modal"><button className="btn-primary mt-6 w-full sm:w-auto">Sign in</button></SignInButton>
  </div>;
}

const PILL = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-800 ring-red-600/15",
  blue: "bg-brand-50 text-brand-800 ring-brand-600/15",
  gray: "bg-slate-100 text-slate-700 ring-slate-500/10",
};
export function Pill({ tone = "gray", children }) { return <span className={cx("inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset", PILL[tone])}>{children}</span>; }

export const orderTone = (s) => ({ delivered: "green", cancelled: "red", shipping: "blue", processing: "blue", placed: "amber" })[s] || "gray";
export const payTone = (s) => ({ paid: "green", failed: "red", refunded: "gray", pending: "amber" })[s] || "gray";
export const prettify = (s) => String(s || "").replace(/_/g, " ");

export function Stars({ value = 0, size = 14 }) {
  return <span className="inline-flex" aria-label={`${value} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} className={n <= Math.round(value) ? "fill-amber-500 text-amber-500" : "text-slate-300"}/>)}</span>;
}

export function Pager({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages } = pagination;
  return <div className="mt-10 flex items-center justify-between gap-3 text-sm sm:justify-center">
    <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary px-3 py-2"><ChevronLeft size={16}/> Prev</button>
    <span className="text-slate-500">Page {page} of {pages}</span>
    <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-secondary px-3 py-2">Next <ChevronRight size={16}/></button>
  </div>;
}

/** Page wrapper with consistent gutters. `narrow` for forms and text pages. */
export function Page({ children, narrow = false, className = "" }) {
  return <main className={cx("mx-auto w-full px-4 py-6 sm:px-6 sm:py-10", narrow ? "max-w-3xl" : "max-w-7xl", className)}>{children}</main>;
}

export const PageTitle = ({ children, sub, right }) => <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8"><div><h1 className="font-display text-2xl font-bold sm:text-3xl">{children}</h1>{sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}</div>{right}</div>;
