import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Send } from "lucide-react";
import { api } from "../api";
import { useList } from "../useList";
import { Empty, Loading, Pager, Pill, cx, prettify } from "../ui";

const CATEGORIES = ["order", "payment", "delivery", "account", "shop", "other"];
const STATUSES = ["open", "in_progress", "resolved", "closed"];
const tone = (s) => ({ open: "amber", in_progress: "blue", resolved: "green", closed: "gray" })[s] || "gray";
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

/**
 * Support tickets for everyone.  admin=false: "my tickets" + raise a new one.
 * admin=true: every ticket, filter by status, change status, reply.
 */
export function SupportPanel({ token, tell, admin = false }) {
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState(admin ? "open" : "");
  const [page, setPage] = useState(1);
  const path = admin ? "/api/admin/tickets" : "/api/support";
  const { data, pagination, loading, reload } = useList(path, admin ? { status, page, limit: 15 } : {}, token, tell);

  if (openId) return <Thread id={openId} token={token} tell={tell} admin={admin} back={() => { setOpenId(null); reload(); }}/>;
  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">{admin ? "Support tickets" : "Help & support"}</h2><p className="mt-1 text-sm text-slate-500">{admin ? "Customers, shops and drivers can raise tickets. Reply here and update the status." : "Having trouble with an order, payment or payout? Raise a ticket and the store team will reply here."}</p></div>
      {admin ? <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">{["", ...STATUSES].map((s) => <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={cx("rounded-lg px-3 py-1.5 text-xs font-bold capitalize", status === s ? "bg-indigo-600 text-white" : "text-slate-500")}>{s ? prettify(s) : "All"}</button>)}</div>
        : <button onClick={() => setCreating(true)} className="btn-primary"><Plus size={16}/> New ticket</button>}</div>
    {loading ? <Loading/> : !data.length ? <Empty title="No tickets" detail={admin ? "Nothing in this view." : "You haven't raised any tickets."}/> :
      <div className="space-y-3">{data.map((t) => <button key={t._id} onClick={() => setOpenId(t._id)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left hover:shadow">
        <div className="min-w-0"><p className="truncate font-extrabold">{t.subject}</p><p className="text-xs text-slate-500">{prettify(t.category)} · {admin && t.user ? `${t.user.name || t.user.email} (${prettify(t.user.role)}) · ` : ""}updated {when(t.updatedAt)}</p></div><Pill tone={tone(t.status)}>{prettify(t.status)}</Pill></button>)}</div>}
    <Pager pagination={pagination} onPage={setPage}/>
    {creating && <NewTicket token={token} tell={tell} close={() => setCreating(false)} done={() => { setCreating(false); reload(); }}/>}
  </>;
}

function NewTicket({ token, tell, close, done }) {
  const [f, setF] = useState({ subject: "", category: "order", message: "", orderId: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api("/api/support", { token: await token(), method: "POST", body: { ...f, orderId: f.orderId || undefined } }); tell("Ticket raised. We'll reply soon."); done(); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
    <h2 className="text-lg font-extrabold">New support ticket</h2>
    <div className="mt-4 space-y-4"><div><label className="label">Topic</label><select className="input mt-1 w-full" value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c} value={c}>{prettify(c)}</option>)}</select></div>
      <div><label className="label">Subject *</label><input required className="input mt-1 w-full" value={f.subject} onChange={set("subject")}/></div>
      <div><label className="label">What happened? *</label><textarea required rows="4" className="input mt-1 w-full" value={f.message} onChange={set("message")}/></div>
      <div><label className="label">Order id (optional)</label><input className="input mt-1 w-full" value={f.orderId} onChange={set("orderId")} placeholder="Paste the order id if this is about an order"/></div></div>
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button disabled={busy} className="btn-primary">{busy ? "Sending..." : "Send"}</button></div></form></div>;
}

function Thread({ id, token, tell, admin, back }) {
  const [t, setT] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setT((await api(`/api/support/${id}`, { token: await token() })).data); } catch (e) { tell(e.message, "error"); } }, [id, token, tell]);
  useEffect(() => { load(); }, [load]);
  const send = async (e) => {
    e.preventDefault(); if (!msg.trim()) return; setBusy(true);
    try { await api(`/api/support/${id}/messages`, { token: await token(), method: "POST", body: { message: msg } }); setMsg(""); await load(); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };
  const setStatus = async (status) => { try { await api(`/api/admin/tickets/${id}`, { token: await token(), method: "PUT", body: { status } }); tell("Ticket updated."); await load(); } catch (e) { tell(e.message, "error"); } };
  if (!t) return <Loading/>;
  return <>
    <button onClick={back} className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600"><ArrowLeft size={15}/> All tickets</button>
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">{t.subject}</h2><p className="text-xs text-slate-500">{prettify(t.category)} · {t.user?.name || t.user?.email} · opened {when(t.createdAt)}</p></div>
        <div className="flex items-center gap-2"><Pill tone={tone(t.status)}>{prettify(t.status)}</Pill>{admin && <select className="input py-1.5 text-xs" value={t.status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{prettify(s)}</option>)}</select>}</div></div>
      <div className="mt-6 space-y-3">{(t.messages || []).map((m, i) => { const staff = m.senderRole === "admin"; return <div key={m._id || i} className={cx("max-w-[85%] rounded-2xl px-4 py-3 text-sm", staff ? "bg-indigo-50" : "ml-auto bg-slate-100")}><p className="text-[11px] font-bold text-slate-500">{staff ? "Store team" : m.sender?.name || "You"} · {when(m.createdAt)}</p><p className="mt-1 whitespace-pre-wrap">{m.body}</p></div>; })}</div>
      {t.status !== "closed" ? <form onSubmit={send} className="mt-6 flex gap-2"><input className="input flex-1" placeholder="Write a reply…" value={msg} onChange={(e) => setMsg(e.target.value)}/><button disabled={busy} className="btn-primary"><Send size={16}/> Send</button></form> : <p className="mt-6 text-sm text-slate-400">This ticket is closed.</p>}
    </div></>;
}
