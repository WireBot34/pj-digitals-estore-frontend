import React from "react";
import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { NotificationBell } from "./Customer";
import { Pill, cx } from "../ui";

/** Shared page chrome for the shop-owner and delivery-partner workspaces. */
export function WorkspaceFrame({ title, subtitle, tabs, tab, setTab, actions, token, children, exit }) {
  return <div className="min-h-screen bg-[#f5f6fa]">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0"><p className="font-display text-lg font-extrabold">PJ<span className="text-indigo-600">.</span>DIGITALS{exit && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-amber-800">Admin mode</span>}</p><p className="truncate text-xs text-slate-500">{title}{subtitle ? ` · ${subtitle}` : ""}</p></div>
        <div className="flex flex-wrap items-center gap-3">{actions}{exit ? <button onClick={exit} className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white">← Back to admin</button> : <><NotificationBell token={token}/><Link to="/" className="btn-secondary px-3 py-2 text-xs">Open store</Link><UserButton afterSignOutUrl="/"/></>}</div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={cx("whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold", tab === key ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800")}>{label}</button>)}</nav>
    </header>
    <main className="mx-auto max-w-6xl p-5 md:p-8">{children}</main>
  </div>;
}

/** Shown instead of the workspace while the account isn't (or is no longer) approved. */
export function BlockedCard({ noun, entry }) {
  const tone = { pending: "amber", approved: "green", rejected: "red", suspended: "red" }[entry?.status] || "gray";
  return <main className="mx-auto grid min-h-screen max-w-lg place-items-center px-5"><div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
    <h1 className="font-display text-2xl font-extrabold">{noun} workspace</h1>
    {entry ? <><div className="mt-4"><Pill tone={tone}>{entry.status}</Pill></div>
      <p className="mt-4 text-sm text-slate-600">{entry.status === "pending" ? "Your application is still being reviewed. You'll get a notification once it's decided." : entry.status === "rejected" ? "Your application was not approved." : "Your account is suspended, so you can't use the workspace right now."}</p>
      {entry.statusReason && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"><b>Reason:</b> {entry.statusReason}</p>}</>
      : <p className="mt-4 text-sm text-slate-600">No application found for this account.</p>}
    <Link to="/" className="btn-secondary mt-6">Back to the store</Link>
  </div></main>;
}
