import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Map as MapIcon, MapPin, Navigation, Phone } from "lucide-react";
import { api, money } from "../api";
import { SupportPanel } from "./SupportPanel";
import { PayoutFields, Stat } from "./admin/common";
import { useMeta } from "../meta";
import { useList } from "../useList";
import { Empty, Loading, Pager, Pill, cx, prettify } from "../ui";
import { BlockedCard, WorkspaceFrame } from "./WorkspaceFrame";

const TABS = [["active", "Active jobs"], ["history", "History"], ["earnings", "Earnings"], ["profile", "My profile"], ["help", "Help"]];
const jobTone = (s) => ({ assigned: "amber", accepted: "blue", picked_up: "blue", on_the_way: "blue", delivered: "green" })[s] || "red";
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const dropLine = (d = {}) => [d.fullName, d.street, d.landmark, d.location || d.city, d.state, d.zipCode].filter(Boolean).join(", ");
const mapLink = (text) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(text)}`;

// what the backend lets a driver do from each state: [next status, button label, needs a reason?]
const ACTIONS = {
  assigned: [["accepted", "Accept job"], ["rejected", "Reject", true]],
  accepted: [["picked_up", "Picked up from shop"], ["failed", "Can't deliver", true]],
  picked_up: [["on_the_way", "On the way"], ["delivered", "Mark delivered"], ["failed", "Can't deliver", true]],
  on_the_way: [["delivered", "Mark delivered"], ["failed", "Can't deliver", true]],
};

export function DeliveryWorkspace({ token, me, refreshMe, tell, exit }) {
  const partner = me?.deliveryPartner;
  const [tab, setTab] = useState("active");
  const [available, setAvailable] = useState(!!partner?.isAvailable);
  const [share, setShare] = useState(false);
  const approved = partner?.status === "approved" || (!!exit && !!partner);

  useEffect(() => setAvailable(!!partner?.isAvailable), [partner?.isAvailable]);

  // Optional live location: sent every 30 s while sharing is on
  useEffect(() => {
    if (!approved || !share) return undefined;
    if (!navigator.geolocation) { tell("This browser can't share location.", "error"); setShare(false); return undefined; }
    const send = () => navigator.geolocation.getCurrentPosition(
      async (pos) => { try { await api("/api/delivery/location", { token: await token(), method: "PUT", body: { lat: pos.coords.latitude, lng: pos.coords.longitude } }); } catch { /* try again next tick */ } },
      () => { tell("Location permission was denied.", "error"); setShare(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    send();
    const id = setInterval(send, 30000);
    return () => clearInterval(id);
  }, [approved, share, token, tell]);

  if (!approved) return <BlockedCard noun="Delivery" entry={partner ? { status: partner.status, statusReason: partner.statusReason } : null}/>;

  const toggleAvailability = async () => {
    const next = !available;
    setAvailable(next);
    try { await api("/api/delivery/availability", { token: await token(), method: "PUT", body: { isAvailable: next } }); await refreshMe(); }
    catch (e) { setAvailable(!next); tell(e.message, "error"); }
  };

  const actions = <>{!exit && <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)}/> Share location</label>}
    <button onClick={toggleAvailability} className={cx("rounded-full px-3 py-2 text-xs font-bold", available ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600")}>{available ? "Online" : "Offline"}</button></>;

  return <WorkspaceFrame exit={exit} title={partner.fullName} subtitle={exit ? "Delivery partner · managing as admin" : "Delivery partner"} tabs={TABS} tab={tab} setTab={setTab} actions={actions} token={token}>
    {tab === "active" && <ActiveJobs token={token} tell={tell} refreshMe={refreshMe} available={available}/>}
    {tab === "history" && <History token={token} tell={tell} completed={partner.completedDeliveries}/>}
    {tab === "earnings" && <Earnings token={token} tell={tell}/>}
    {tab === "profile" && <Profile token={token} tell={tell} partner={partner} refreshMe={refreshMe}/>}
    {tab === "help" && <SupportPanel token={token} tell={tell}/>}
  </WorkspaceFrame>;
}

const JobMap = lazy(() => import("../JobMap")); // Leaflet only loads when a driver opens a map

function JobCard({ job, onAction, busy }) {
  const [showMap, setShowMap] = useState(false);
  const o = job.order || {};
  const pickup = [job.pickup?.address, job.pickup?.location].filter(Boolean).join(", ");
  const drop = dropLine(job.drop);
  const actions = ACTIONS[job.status] || [];
  return <article className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold">{o.orderNumber || "Order"}</p><p className="text-xs text-slate-500">Assigned {when(job.assignedAt)}</p></div><Pill tone={jobTone(job.status)}>{prettify(job.status)}</Pill></div>
    <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
      <div className="rounded-xl bg-slate-50 p-4"><p className="label">1 · Pick up from</p><p className="mt-1 font-bold">{job.pickup?.name || "Shop"}</p><p className="text-slate-600">{pickup || "Address not provided"}</p>
        <div className="mt-3 flex flex-wrap gap-2">{job.pickup?.phone && <a className="btn-secondary px-3 py-2 text-xs" href={`tel:${job.pickup.phone}`}><Phone size={14}/> {job.pickup.phone}</a>}{pickup && <a className="btn-secondary px-3 py-2 text-xs" target="_blank" rel="noreferrer" href={mapLink(pickup)}><Navigation size={14}/> Directions</a>}</div></div>
      <div className="rounded-xl bg-slate-50 p-4"><p className="label">2 · Deliver to</p><p className="mt-1 font-bold">{job.drop?.fullName || "Customer"}</p><p className="text-slate-600">{drop || "Address not provided"}</p>
        <div className="mt-3 flex flex-wrap gap-2">{job.drop?.phone && <a className="btn-secondary px-3 py-2 text-xs" href={`tel:${job.drop.phone}`}><Phone size={14}/> {job.drop.phone}</a>}{drop && <a className="btn-secondary px-3 py-2 text-xs" target="_blank" rel="noreferrer" href={mapLink(drop)}><MapPin size={14}/> Directions</a>}</div></div>
    </div>
    {["assigned", "accepted", "picked_up", "on_the_way"].includes(job.status) && <>
      <button onClick={() => setShowMap((v) => !v)} className="btn-secondary mt-4 px-3 py-2 text-xs"><MapIcon size={14}/> {showMap ? "Hide map" : "Show map & route"}</button>
      {showMap && <Suspense fallback={<p className="mt-3 text-xs text-slate-400">Loading map…</p>}><JobMap job={job}/></Suspense>}</>}
    {Array.isArray(o.items) && o.items.length > 0 && <p className="mt-4 text-sm text-slate-600"><b className="text-slate-800">Items:</b> {o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} × ${i.quantity}`).join(", ")}</p>}
    {job.codAmount > 0 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">Collect {money(job.codAmount)} in cash from the customer</p>}
    {o.notes && <p className="mt-3 text-xs text-slate-500">Customer note: {o.notes}</p>}
    {job.failureReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">Reason: {job.failureReason}</p>}
    {job.timeline?.length > 0 && <ol className="mt-4 space-y-1 border-l-2 border-slate-200 pl-3 text-xs text-slate-500">{job.timeline.map((t, i) => <li key={i}><b className="capitalize text-slate-700">{prettify(t.status)}</b> · {when(t.at)}{t.note ? ` · ${t.note}` : ""}</li>)}</ol>}
    {onAction && actions.length > 0 && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{actions.map(([status, label, needsReason], i) => <button key={status} disabled={busy} onClick={() => onAction(job, status, needsReason)} className={cx(i === 0 ? "btn-primary" : "btn-secondary", needsReason && "text-red-600")}>{label}</button>)}</div>}
  </article>;
}

function ActiveJobs({ token, tell, refreshMe, available }) {
  const [jobs, setJobs] = useState(null);
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => {
    try { setJobs((await api("/api/delivery/jobs", { token: await token() })).data || []); }
    catch (e) { tell(e.message, "error"); setJobs((j) => j || []); }
  }, [token, tell]);
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]); // new assignments show up on their own

  const act = async (job, status, needsReason) => {
    let note;
    if (needsReason) {
      note = window.prompt(status === "rejected" ? "Why are you rejecting this job?" : "What went wrong with the delivery?");
      if (!note || !note.trim()) return;
    }
    setBusyId(job._id);
    try { await api(`/api/delivery/jobs/${job._id}/status`, { token: await token(), method: "PUT", body: { status, note } }); tell(status === "delivered" ? "Delivery completed. Great work!" : "Job updated."); await load(); if (status === "delivered") await refreshMe(); }
    catch (e) { tell(e.message, "error"); } finally { setBusyId(""); }
  };

  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">Active jobs</h2><p className="mt-1 text-sm text-slate-500">This list refreshes every 30 seconds.</p></div><button onClick={load} className="btn-secondary">Refresh</button></div>
    {!available && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">You're offline. Switch to Online (top right) so the store team can assign you jobs.</p>}
    {jobs === null ? <Loading/> : !jobs.length ? <Empty title="No active jobs" detail="New assignments will appear here and in your notifications."/> :
      <div className="space-y-4">{jobs.map((j) => <JobCard key={j._id} job={j} onAction={act} busy={busyId === j._id}/>)}</div>}
  </>;
}

function History({ token, tell, completed }) {
  const [page, setPage] = useState(1);
  const { data, pagination, loading } = useList("/api/delivery/history", { page, limit: 10 }, token, tell);
  return <>
    <div className="mb-6"><h2 className="text-2xl font-extrabold">History</h2><p className="mt-1 text-sm text-slate-500">{completed ?? 0} deliveries completed in total.</p></div>
    {loading ? <Loading/> : !data.length ? <Empty title="Nothing here yet" detail="Finished, rejected and failed jobs appear here."/> : <div className="space-y-4">{data.map((j) => <JobCard key={j._id} job={j}/>)}</div>}
    <Pager pagination={pagination} onPage={setPage}/>
  </>;
}

function Profile({ token, tell, partner, refreshMe }) {
  const meta = useMeta();
  const vehicles = meta.vehicleTypes || ["bike", "scooter", "bicycle", "car", "van", "other"];
  const [f, setF] = useState({ fullName: partner.fullName || "", phone: partner.phone || "", vehicleType: partner.vehicleType || "bike", vehicleNumber: partner.vehicleNumber || "", licenseNumber: partner.licenseNumber || "" });
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = new FormData();
      Object.entries(f).forEach(([k, v]) => body.append(k, v));
      if (photo) body.append("photo", photo);
      await api("/api/delivery/me", { token: await token(), method: "PUT", body });
      tell("Profile saved."); await refreshMe();
    } catch (err) { tell(err.message, "error"); } finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
    <h2 className="text-2xl font-extrabold">My profile</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label className="label">Full name</label><input required className="input mt-1 w-full" value={f.fullName} onChange={set("fullName")}/></div>
      <div><label className="label">Phone</label><input required className="input mt-1 w-full" value={f.phone} onChange={set("phone")}/></div>
      <div><label className="label">Vehicle</label><select className="input mt-1 w-full capitalize" value={f.vehicleType} onChange={set("vehicleType")}>{vehicles.map((v) => <option key={v}>{v}</option>)}</select></div>
      <div><label className="label">Vehicle number</label><input className="input mt-1 w-full" value={f.vehicleNumber} onChange={set("vehicleNumber")}/></div>
      <div className="sm:col-span-2"><label className="label">Licence number</label><input className="input mt-1 w-full" value={f.licenseNumber} onChange={set("licenseNumber")}/></div>
      <div className="sm:col-span-2"><label className="label">Photo</label>{partner.photo && !photo && <img src={partner.photo} className="mt-2 h-16 w-16 rounded-full object-cover" alt=""/>}<input type="file" accept="image/*" className="mt-2 block text-sm" onChange={(e) => setPhoto(e.target.files?.[0] || null)}/></div>
    </div>
    <button disabled={saving} className="btn-primary mt-6">{saving ? "Saving..." : "Save profile"}</button>
  </form>;
}

/* -------------------------------------------------------------- Earnings */
function Earnings({ token, tell }) {
  const [d, setD] = useState(null);
  const [edit, setEdit] = useState(false);
  const [acct, setAcct] = useState({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setD((await api("/api/delivery/earnings", { token: await token() })).data); } catch (e) { tell(e.message, "error"); } }, [token, tell]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Loading/>;
  const u = d.unsettled;
  const setA = (k) => (e) => setAcct((a) => ({ ...a, [k]: e.target.value }));
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api("/api/delivery/payout-account", { token: await token(), method: "PUT", body: acct }); tell("Payout account saved."); setEdit(false); await load(); } catch (err) { tell(err.message, "error"); } finally { setBusy(false); } };
  return <>
    <div className="mb-6"><h2 className="text-2xl font-extrabold">Earnings</h2><p className="mt-1 text-sm text-slate-500">You earn {money(d.feePerDelivery)} for every completed delivery. Cash you collect from customers is settled against your earnings.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Today" value={money(d.today.earnings)} hint={`${d.today.deliveries} deliveries`}/><Stat label="Last 7 days" value={money(d.last7Days.earnings)} hint={`${d.last7Days.deliveries} deliveries`}/><Stat label="All time" value={money(d.total.earnings)} hint={`${d.total.deliveries} deliveries`}/></div>
    <div className={cx("mt-6 rounded-2xl p-6", u.net >= 0 ? "bg-emerald-50" : "bg-red-50")}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Next settlement</p>
      <p className={cx("mt-1 font-display text-3xl font-extrabold", u.net >= 0 ? "text-emerald-700" : "text-red-700")}>{u.net >= 0 ? `We pay you ${money(u.net)}` : `You hand over ${money(-u.net)}`}</p>
      <p className="mt-2 text-sm text-slate-600">{u.deliveries} unsettled deliveries · earnings {money(u.earnings)} − cash you collected {money(u.codCollected)}</p></div>
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-extrabold">Where we pay you</h3>{!edit && <button onClick={() => { setAcct({}); setEdit(true); }} className="btn-secondary px-3 py-2 text-xs">{d.payoutAccount ? "Change" : "Add account"}</button>}</div>
      {!edit ? (d.payoutAccount ? <p className="mt-3 text-sm text-slate-600">{d.payoutAccount.method === "upi" ? `UPI: ${d.payoutAccount.upiId}` : `${d.payoutAccount.accountHolder} · ${d.payoutAccount.accountNumber} · ${d.payoutAccount.ifsc}`}</p> : <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Add a UPI id or bank account so we can pay you.</p>)
        : <form onSubmit={save} className="mt-4 space-y-4"><PayoutFields f={acct} set={setA}/><div className="flex gap-2"><button disabled={busy || !acct.method} className="btn-primary px-4 py-2">Save</button><button type="button" onClick={() => setEdit(false)} className="btn-secondary px-4 py-2">Cancel</button></div></form>}</div>
    <h3 className="mb-3 mt-8 font-extrabold">Past settlements</h3>
    {!d.settlements.length ? <Empty title="No settlements yet" detail="The store team settles your earnings and cash periodically."/> : <div className="space-y-2">{d.settlements.map((s) => <div key={s._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm"><span>{when(s.createdAt)} · {s.deliveriesCount} deliveries{s.reference ? ` · ref ${s.reference}` : ""}</span><b className={s.net >= 0 ? "text-emerald-700" : "text-red-700"}>{s.net >= 0 ? `Paid ${money(s.net)}` : `Handed over ${money(-s.net)}`}</b></div>)}</div>}
  </>;
}
