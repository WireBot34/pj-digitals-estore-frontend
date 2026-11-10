import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Store, Truck } from "lucide-react";
import { api } from "../api";
import { useMeta } from "../meta";
import { AuthPrompt, Pill, cx } from "../ui";

const VEHICLES = ["bike", "scooter", "bicycle", "car", "van", "other"];
const TONE = { approved: "green", pending: "amber", rejected: "red", suspended: "red" };

const MESSAGES = {
  shop: {
    pending: "Your shop application is being reviewed. We'll notify you once it's decided.",
    approved: "Your shop is approved. Add products and manage orders from your workspace.",
    rejected: "Your shop application was not approved.",
    suspended: "Your shop has been suspended.",
  },
  delivery: {
    pending: "Your delivery-partner application is being reviewed. We'll notify you once it's decided.",
    approved: "You're approved as a delivery partner. Accept and complete jobs from your workspace.",
    rejected: "Your delivery-partner application was not approved.",
    suspended: "Your delivery-partner account has been suspended.",
  },
};

const entries = (me) => [
  me?.shop && { kind: "shop", label: me.shop.name, status: me.shop.status, reason: me.shop.statusReason },
  me?.deliveryPartner && { kind: "delivery", label: me.deliveryPartner.fullName, status: me.deliveryPartner.status, reason: me.deliveryPartner.statusReason },
].filter(Boolean);

// the workspace is available once approved AND the role has been granted
const canOpen = (me, e) =>
  e.status === "approved" &&
  ((e.kind === "shop" && me?.user?.role === "shop_owner") || (e.kind === "delivery" && me?.user?.role === "delivery_partner"));

/** Slim strip under the header showing the state of any application. */
export function PartnerBanner({ me }) {
  const list = entries(me);
  if (!list.length) return null;
  return <div className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl space-y-1 px-5 py-2">
    {list.map((e) => <p key={e.kind} className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <Pill tone={TONE[e.status]}>{e.status}</Pill>
      <span>{MESSAGES[e.kind][e.status]}{e.reason && ["rejected", "suspended"].includes(e.status) ? ` Reason: ${e.reason}` : ""}</span>
      {canOpen(me, e) ? <Link to="/workspace" className="font-bold text-indigo-600 hover:underline">Open workspace</Link> : <Link to="/partner" className="font-bold text-indigo-600 hover:underline">Details</Link>}
    </p>)}
  </div></div>;
}

function StatusCard({ icon: Icon, title, entry, me }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex items-center gap-3"><Icon className="text-indigo-600" size={22}/><h2 className="text-lg font-extrabold">{title}</h2><Pill tone={TONE[entry.status]}>{entry.status}</Pill></div>
    <p className="mt-3 text-sm font-semibold text-slate-800">{entry.label}</p>
    <p className="mt-1 text-sm text-slate-600">{MESSAGES[entry.kind][entry.status]}</p>
    {canOpen(me, entry) && <Link to="/workspace" className="btn-primary mt-4">Open workspace</Link>}
    {entry.reason && ["rejected", "suspended"].includes(entry.status) && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"><b>Reason:</b> {entry.reason}</p>}
    {["rejected", "suspended"].includes(entry.status) && <p className="mt-3 text-xs text-slate-500">To appeal or fix the issue, raise a support request or contact the store team.</p>}
  </section>;
}

function useChecks(initial = []) {
  const [v, setV] = useState(initial);
  const toggle = (x) => setV((cur) => (cur.includes(x) ? cur.filter((i) => i !== x) : [...cur, x]));
  return [v, toggle];
}

function ShopForm({ token, tell, onDone }) {
  const meta = useMeta();
  const [f, setF] = useState({ name: "", phone: "", email: "", location: "", addressLine: "", landmark: "", description: "", openingHours: "" });
  const [cats, toggleCat] = useChecks();
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.location) { tell("Please choose your shop's location.", "error"); return; }
    setBusy(true);
    try {
      const body = new FormData();
      Object.entries(f).forEach(([k, v]) => v && body.append(k, v));
      if (cats.length) body.append("categories", JSON.stringify(cats));
      if (logo) body.append("logo", logo);
      await api("/api/shops/apply", { token: await token(), method: "POST", body });
      tell("Application submitted. We'll review it shortly.");
      await onDone();
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex items-center gap-3"><Store className="text-indigo-600" size={22}/><h2 className="text-lg font-extrabold">Sell on PJ Digitals</h2></div>
    <p className="mt-2 text-sm text-slate-500">Apply to list your shop. An admin reviews every application.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label className="label">Shop name *</label><input required className="input mt-1 w-full" value={f.name} onChange={set("name")}/></div>
      <div><label className="label">Phone *</label><input required className="input mt-1 w-full" value={f.phone} onChange={set("phone")}/></div>
      <div><label className="label">Email</label><input type="email" className="input mt-1 w-full" value={f.email} onChange={set("email")}/></div>
      <div><label className="label">Location *</label><select required className="input mt-1 w-full" value={f.location} onChange={set("location")}><option value="">Choose...</option>{meta.locations.map((l) => <option key={l}>{l}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="label">Address</label><input className="input mt-1 w-full" value={f.addressLine} onChange={set("addressLine")}/></div>
      <div><label className="label">Landmark</label><input className="input mt-1 w-full" value={f.landmark} onChange={set("landmark")}/></div>
      <div><label className="label">Opening hours</label><input className="input mt-1 w-full" placeholder="9 AM - 8 PM" value={f.openingHours} onChange={set("openingHours")}/></div>
      <div className="sm:col-span-2"><label className="label">About the shop</label><textarea rows="3" className="input mt-1 w-full" value={f.description} onChange={set("description")}/></div>
      <div className="sm:col-span-2"><label className="label">What do you sell?</label>
        <div className="mt-2 flex flex-wrap gap-2">{meta.categories.map((c) => <button type="button" key={c} onClick={() => toggleCat(c)} className={cx("rounded-full border px-3 py-1.5 text-xs font-bold", cats.includes(c) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>{c}</button>)}</div></div>
      <div className="sm:col-span-2"><label className="label">Logo (optional)</label><input type="file" accept="image/*" className="mt-1 block text-sm" onChange={(e) => setLogo(e.target.files?.[0] || null)}/></div>
    </div>
    <button disabled={busy} className="btn-primary mt-6">{busy ? "Submitting..." : "Submit application"}</button>
  </form>;
}

function DriverForm({ token, tell, onDone }) {
  const meta = useMeta();
  const vehicles = meta.vehicleTypes || VEHICLES;
  const [f, setF] = useState({ fullName: "", phone: "", vehicleType: "bike", vehicleNumber: "", licenseNumber: "" });
  const [areas, toggleArea] = useChecks();
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = new FormData();
      Object.entries(f).forEach(([k, v]) => v && body.append(k, v));
      if (areas.length) body.append("serviceLocations", JSON.stringify(areas));
      if (photo) body.append("photo", photo);
      await api("/api/delivery/apply", { token: await token(), method: "POST", body });
      tell("Application submitted. We'll review it shortly.");
      await onDone();
    } catch (err) { tell(err.message, "error"); } finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex items-center gap-3"><Truck className="text-indigo-600" size={22}/><h2 className="text-lg font-extrabold">Deliver with PJ Digitals</h2></div>
    <p className="mt-2 text-sm text-slate-500">Apply to become a delivery partner. An admin reviews every application.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label className="label">Full name *</label><input required className="input mt-1 w-full" value={f.fullName} onChange={set("fullName")}/></div>
      <div><label className="label">Phone *</label><input required className="input mt-1 w-full" value={f.phone} onChange={set("phone")}/></div>
      <div><label className="label">Vehicle</label><select className="input mt-1 w-full capitalize" value={f.vehicleType} onChange={set("vehicleType")}>{vehicles.map((v) => <option key={v}>{v}</option>)}</select></div>
      <div><label className="label">Vehicle number</label><input className="input mt-1 w-full" value={f.vehicleNumber} onChange={set("vehicleNumber")}/></div>
      <div className="sm:col-span-2"><label className="label">Licence number</label><input className="input mt-1 w-full" value={f.licenseNumber} onChange={set("licenseNumber")}/></div>
      <div className="sm:col-span-2"><label className="label">Areas you can deliver in</label>
        <div className="mt-2 flex flex-wrap gap-2">{meta.locations.map((l) => <button type="button" key={l} onClick={() => toggleArea(l)} className={cx("rounded-full border px-3 py-1.5 text-xs font-bold", areas.includes(l) ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600")}>{l}</button>)}</div></div>
      <div className="sm:col-span-2"><label className="label">Photo (optional)</label><input type="file" accept="image/*" className="mt-1 block text-sm" onChange={(e) => setPhoto(e.target.files?.[0] || null)}/></div>
    </div>
    <button disabled={busy} className="btn-primary mt-6">{busy ? "Submitting..." : "Submit application"}</button>
  </form>;
}

/** /partner - apply to sell or deliver, and see the state of existing applications. */
export function Partner({ token, signedIn, me, refreshMe, tell }) {
  if (!signedIn) return <main className="mx-auto max-w-3xl px-5 py-16"><AuthPrompt/></main>;
  const shop = entries(me).find((e) => e.kind === "shop");
  const driver = entries(me).find((e) => e.kind === "delivery");
  return <main className="mx-auto max-w-3xl space-y-6 px-5 py-12">
    <div><h1 className="font-display text-4xl font-extrabold">Work with us</h1><p className="mt-2 text-slate-500">Sell your products or deliver orders in Thodupuzha and Muttom.</p></div>
    {shop ? <StatusCard icon={Store} title="Your shop" entry={shop} me={me}/> : <ShopForm token={token} tell={tell} onDone={refreshMe}/>}
    {driver ? <StatusCard icon={Truck} title="Your delivery profile" entry={driver} me={me}/> : <DriverForm token={token} tell={tell} onDone={refreshMe}/>}
  </main>;
}
