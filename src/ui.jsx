import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { SignInButton } from "@clerk/clerk-react";
import { useBrand } from "./brand";
import { AlertCircle, ArrowUp, Check, CheckCircle2, ChevronLeft, ChevronRight, Package, RefreshCw, ShieldCheck, Star, WifiOff, X } from "lucide-react";

export const cx = (...a) => a.filter(Boolean).join(" ");

/** Toast: top on desktop, above the bottom tab bar on phones. May carry one action, e.g. "Undo" or "View cart". */
export function Notice({ notice, clear }) {
  if (!notice) return null;
  const bad = notice.type === "error";
  return <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] z-[100] flex justify-center px-4 md:bottom-auto md:right-5 md:top-5 md:inset-x-auto md:justify-end">
    <div className={cx("pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border px-4 py-3 shadow-lg md:w-auto", bad ? "border-red-200 bg-red-50 text-red-900" : "border-brand-200 bg-brand-50 text-brand-900")}>
      {bad ? <AlertCircle size={18} className="mt-0.5 shrink-0"/> : <CheckCircle2 size={18} className="mt-0.5 shrink-0"/>}
      <p className="flex-1 text-sm font-medium">{notice.text}</p>
      {notice.action && <button onClick={() => { notice.action.onClick(); clear(); }} className="shrink-0 text-sm font-semibold underline underline-offset-2">{notice.action.label}</button>}
      <button onClick={clear} aria-label="Dismiss" className="-m-1 shrink-0 p-1"><X size={16}/></button>
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


/* -------------------------------------------------------------- page title */
/** Sets the browser tab title (also what shows in history and when sharing). */
export function usePageTitle(title) {
  const { name, tagline } = useBrand();
  useEffect(() => {
    document.title = title ? `${title} · ${name}` : tagline ? `${name} · ${tagline}` : name;
  }, [title, name, tagline]);
}

/* ------------------------------------------------------------ confirm sheet */
const ConfirmContext = createContext(() => Promise.resolve(false));
export const useConfirm = () => useContext(ConfirmContext);

/**
 * Replaces the browser's confirm() popup.
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Cancel this order?", message: "...", confirmLabel: "Cancel order", tone: "danger" }))) return;
 */
export function ConfirmProvider({ children }) {
  const [ask, setAsk] = useState(null);
  const confirm = useCallback((opts = {}) => new Promise((resolve) => setAsk({ ...opts, resolve })), []);
  const done = (value) => { ask?.resolve(value); setAsk(null); };
  const okRef = useRef(null);
  useEffect(() => {
    if (!ask) return undefined;
    const previous = document.activeElement;
    okRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") done(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [ask]); // eslint-disable-line react-hooks/exhaustive-deps
  return <ConfirmContext.Provider value={confirm}>
    {children}
    {ask && <div className="fixed inset-0 z-[120] grid place-items-end bg-black/45 sm:place-items-center sm:p-4" onClick={() => done(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-xl" style={{ paddingBottom: "calc(1.25rem + var(--safe-bottom))" }}>
        <h2 id="confirm-title" className="font-display text-lg font-bold">{ask.title || "Are you sure?"}</h2>
        {ask.message && <p className="mt-2 text-sm text-slate-600">{ask.message}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={() => done(false)} className="btn-secondary">{ask.cancelLabel || "Keep it"}</button>
          <button ref={okRef} onClick={() => done(true)} className={cx("inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white", ask.tone === "danger" ? "bg-red-700 hover:bg-red-800" : "bg-brand-600 hover:bg-brand-700")}>{ask.confirmLabel || "Confirm"}</button>
        </div>
      </div>
    </div>}
  </ConfirmContext.Provider>;
}

/* ------------------------------------------------------------- error states */
export function ErrorState({ title = "Could not load this", detail = "Check your connection and try again.", onRetry }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center" role="alert">
    <AlertCircle className="mx-auto text-red-700" size={28} strokeWidth={1.5}/>
    <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{detail}</p>
    {onRetry && <button onClick={onRetry} className="btn-secondary mt-5"><RefreshCw size={16}/> Try again</button>}
  </div>;
}

/** Thin banner shown while the device has no connection. */
export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  if (online) return null;
  return <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:text-sm"><WifiOff size={15}/> You are offline. Some things may not load or save until you reconnect.</div>;
}

/** Floating button that appears after scrolling down a long page. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" className="fixed bottom-[calc(5rem+var(--safe-bottom))] right-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white shadow-lg hover:bg-slate-50 md:bottom-6"><ArrowUp size={18}/></button>;
}

/* ------------------------------------------------------------- step progress */
/** Cart > Checkout > Done indicator. current: 0, 1 or 2. */
export function Steps({ current = 0, labels = ["Cart", "Checkout", "Done"] }) {
  return <ol className="mb-6 flex items-center gap-2 text-xs font-medium sm:text-sm" aria-label="Progress">
    {labels.map((label, i) => <li key={label} className="flex items-center gap-2" aria-current={i === current ? "step" : undefined}>
      <span className={cx("grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold", i < current ? "bg-brand-600 text-white" : i === current ? "bg-ink text-white" : "bg-slate-200 text-slate-500")}>{i < current ? <Check size={13}/> : i + 1}</span>
      <span className={i <= current ? "text-slate-900" : "text-slate-400"}>{label}</span>
      {i < labels.length - 1 && <span className="mx-1 h-px w-5 bg-slate-300 sm:w-8"/>}
    </li>)}
  </ol>;
}

/* ------------------------------------------------------------------- logo */
/** The brand logo from brand.json (a dark-mode variant is used in dark mode when given), else a simple mark + the name. */
export function Logo({ className = "" }) {
  const { name, logoUrl, logoDarkUrl } = useBrand();
  if (logoUrl) {
    return <span className={cx("inline-flex items-center", className)}>
      <img src={logoUrl} alt={name} className={cx("h-8 w-auto max-w-[180px] object-contain sm:h-9", logoDarkUrl && "dark:hidden")}/>
      {logoDarkUrl && <img src={logoDarkUrl} alt={name} className="hidden h-8 w-auto max-w-[180px] object-contain sm:h-9 dark:block"/>}
    </span>;
  }
  return <span className={cx("inline-flex items-center gap-2", className)}>
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="rgb(var(--brand-600))"/><path d="M9 24V8h7a5 5 0 0 1 0 10H9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="23.5" cy="22.5" r="2" fill="#fff"/></svg>
    <span className="font-display text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{name}</span>
  </span>;
}

/**
 * Bottom-sheet that asks WHY before cancelling. reasons = [{ value, label }].
 * required: a reason must be chosen (and a note if "other"). onConfirm({ reason, note }) may be async.
 */
export function ReasonSheet({ title = "Cancel this order?", message, reasons = [], required = false, confirmLabel = "Cancel order", keepLabel = "Keep order", onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  const needNote = required && reason === "other";
  const ok = (!required || reason) && (!needNote || note.trim().length > 0);
  const go = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try { await onConfirm({ reason: reason || undefined, note: note.trim() || undefined }); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[120] grid place-items-end bg-black/45 sm:place-items-center sm:p-4" onClick={() => !busy && onClose()}>
    <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-xl" style={{ paddingBottom: "calc(1.25rem + var(--safe-bottom))" }}>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {message && <p className="mt-1 text-sm text-slate-600">{message}</p>}
      <fieldset className="mt-4 space-y-2"><legend className="sr-only">Reason</legend>
        {reasons.map((r) => <label key={r.value} className={cx("flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm", reason === r.value ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-300")}>
          <input type="radio" name="cancel-reason" checked={reason === r.value} onChange={() => setReason(r.value)}/>{r.label}</label>)}
      </fieldset>
      {(reason === "other" || (reason && !required)) && <div className="mt-3"><label className="label" htmlFor="cancel-note">{needNote ? "Tell us what happened" : "Add a note (optional)"}</label><input id="cancel-note" maxLength={200} className="input mt-1 w-full" value={note} onChange={(e) => setNote(e.target.value)}/></div>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={onClose} className="btn-secondary">{keepLabel}</button>
        <button type="button" disabled={!ok || busy} onClick={go} className="inline-flex items-center justify-center rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">{busy ? "Please wait..." : confirmLabel}</button>
      </div>
    </div></div>;
}
