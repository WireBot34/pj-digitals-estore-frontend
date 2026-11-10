import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, ExternalLink, Navigation } from "lucide-react";
import { cx } from "./ui";

/*
 * Free map for delivery partners — no API keys, no billing:
 *   tiles      OpenStreetMap          (tile.openstreetmap.org)
 *   addresses  Nominatim geocoding    (nominatim.openstreetmap.org, cached on the device)
 *   route      OSRM public router     (router.project-osrm.org, optional; falls back to a straight line)
 *   navigate   opens Google Maps / OpenStreetMap directions in the phone's map app
 * If an address can't be found, tap the map to drop the pin by hand (remembered for that job).
 */

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

// Nominatim asks for at most 1 request per second
let queue = Promise.resolve();
const geocode = (queries) => {
  const run = async () => {
    for (const q of queries.filter(Boolean)) {
      const key = `pj-geo:${q}`;
      const cached = read(key);
      if (cached) return cached;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
        const rows = res.ok ? await res.json() : [];
        await new Promise((r) => setTimeout(r, 1100));
        if (rows[0]) { const hit = { lat: Number(rows[0].lat), lng: Number(rows[0].lon) }; write(key, hit); return hit; }
      } catch { /* try the next, simpler query */ }
    }
    return null;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
};

const addressQueries = (a = {}) => {
  const place = a.location || a.city;
  return [
    [a.street || a.address, a.landmark, place, a.zipCode, "Kerala, India"].filter(Boolean).join(", "),
    [a.street || a.address, place, "Kerala, India"].filter(Boolean).join(", "),
    [a.landmark, place, "Kerala, India"].filter(Boolean).join(", "),
    a.zipCode ? `${a.zipCode}, Kerala, India` : "",
    place ? `${place}, Kerala, India` : "",
  ];
};

const pinIcon = (label, color) => L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:grid;place-items:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"><span style="transform:rotate(45deg);color:#fff;font:700 13px system-ui">${label}</span></div>`,
  iconSize: [32, 32], iconAnchor: [16, 32],
});
const meIcon = L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.25)"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });

const gmaps = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
const osm = (p) => `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${p.lat}%2C${p.lng}`;
const km = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const mins = (s) => `${Math.max(1, Math.round(s / 60))} min`;

export default function JobMap({ job }) {
  const el = useRef(null);
  const map = useRef(null);
  const layers = useRef({});
  const [pickup, setPickup] = useState(job.pickup?.coordinates?.lat ? job.pickup.coordinates : read(`pj-pin:${job._id}:pickup`));
  const [drop, setDrop] = useState(job.drop?.coordinates?.lat ? job.drop.coordinates : read(`pj-pin:${job._id}:drop`));
  const [me, setMe] = useState(null);
  const [route, setRoute] = useState(null);
  const [status, setStatus] = useState("");
  const [placing, setPlacing] = useState(""); // "pickup" | "drop" while waiting for a map tap
  const past = ["picked_up", "on_the_way"].includes(job.status); // already collected: only the drop matters now

  // find the two addresses
  useEffect(() => {
    let live = true;
    (async () => {
      if (!pickup) { setStatus("Finding pickup…"); const p = await geocode(addressQueries({ street: job.pickup?.address, location: job.pickup?.location })); if (live && p) setPickup(p); }
      if (!drop) { setStatus("Finding delivery address…"); const d = await geocode(addressQueries(job.drop)); if (live && d) setDrop(d); }
      if (live) setStatus("");
    })();
    return () => { live = false; };
  }, [job._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // my position
  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    // rounded to ~100 m so small GPS jitter doesn't redraw the route all the time
    const r = (n) => Math.round(n * 1000) / 1000;
    const id = navigator.geolocation.watchPosition((p) => setMe((prev) => { const next = { lat: r(p.coords.latitude), lng: r(p.coords.longitude) }; return prev && prev.lat === next.lat && prev.lng === next.lng ? prev : next; }), () => {}, { enableHighAccuracy: true, maximumAge: 15000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // map
  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([9.88, 76.72], 12); // Thodupuzha
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map.current);
    layers.current = { group: L.layerGroup().addTo(map.current) };
    return () => { map.current.remove(); map.current = null; };
  }, []);

  // tap to place a pin
  useEffect(() => {
    const m = map.current; if (!m || !placing) return undefined;
    const onClick = (e) => {
      const pt = { lat: e.latlng.lat, lng: e.latlng.lng };
      write(`pj-pin:${job._id}:${placing}`, pt);
      (placing === "pickup" ? setPickup : setDrop)(pt);
      setPlacing("");
    };
    m.on("click", onClick); m.getContainer().style.cursor = "crosshair";
    return () => { m.off("click", onClick); m.getContainer().style.cursor = ""; };
  }, [placing, job._id]);

  // route from me → (pickup) → drop
  const stops = useMemo(() => [me, !past && pickup, drop].filter(Boolean), [me, past, pickup, drop]);
  useEffect(() => {
    setRoute(null);
    if (stops.length < 2) return undefined;
    const ctrl = new AbortController();
    const path = stops.map((p) => `${p.lng},${p.lat}`).join(";");
    fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then((r) => r.json()).then((j) => { const r = j.routes?.[0]; if (r) setRoute({ line: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), distance: r.distance, duration: r.duration }); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [stops]);

  // draw
  useEffect(() => {
    const m = map.current; if (!m) return;
    const g = layers.current.group; g.clearLayers();
    if (pickup && !past) L.marker(pickup, { icon: pinIcon("P", "#f59e0b") }).bindPopup(`<b>Pickup</b><br>${job.pickup?.name || "Shop"}`).addTo(g);
    if (drop) L.marker(drop, { icon: pinIcon("D", "#16a34a") }).bindPopup(`<b>Deliver to</b><br>${job.drop?.fullName || "Customer"}`).addTo(g);
    if (me) L.marker(me, { icon: meIcon }).bindPopup("You are here").addTo(g);
    if (route) L.polyline(route.line, { color: "#4f46e5", weight: 5, opacity: 0.8 }).addTo(g);
    else if (stops.length > 1) L.polyline(stops.map((p) => [p.lat, p.lng]), { color: "#4f46e5", weight: 3, dashArray: "6 8" }).addTo(g);
  }, [pickup, drop, me, route, past, stops, job.pickup?.name, job.drop?.fullName]); // eslint-disable-line react-hooks/exhaustive-deps

  // zoom to the pins when they change (not on every GPS tick, so the driver can pan freely)
  useEffect(() => {
    const m = map.current; if (!m) return;
    const pts = [pickup && !past && pickup, drop, me].filter(Boolean);
    if (pts.length) m.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 16 });
  }, [pickup, drop, past, !!me]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = [!pickup && !past && "pickup", !drop && "delivery"].filter(Boolean);
  return <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
    <div ref={el} className="h-72 w-full sm:h-80" style={{ zIndex: 0 }}/>
    <div className="space-y-3 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {pickup && !past && <><a className="btn-primary px-3 py-2 text-xs" href={gmaps(pickup)} target="_blank" rel="noreferrer"><Navigation size={14}/> Navigate to pickup</a><a className="btn-secondary px-2 py-2 text-xs" title="OpenStreetMap directions" href={osm(pickup)} target="_blank" rel="noreferrer"><ExternalLink size={13}/> OSM</a></>}
        {drop && <><a className={cx("px-3 py-2 text-xs", past ? "btn-primary" : "btn-secondary")} href={gmaps(drop)} target="_blank" rel="noreferrer"><Navigation size={14}/> Navigate to customer</a><a className="btn-secondary px-2 py-2 text-xs" title="OpenStreetMap directions" href={osm(drop)} target="_blank" rel="noreferrer"><ExternalLink size={13}/> OSM</a></>}
        {route && <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{km(route.distance)} · about {mins(route.duration)}</span>}
        {!me && <span className="text-xs text-slate-400">Allow location access to see yourself on the map.</span>}
      </div>
      {status && <p className="text-xs text-slate-400">{status}</p>}
      {missing.length > 0 && !status && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Couldn't find the {missing.join(" and ")} address on the map. Tap a button below, then tap the map to drop the pin yourself.</p>}
      <div className="flex flex-wrap gap-2 text-xs">
        {!past && <button onClick={() => setPlacing(placing === "pickup" ? "" : "pickup")} className={cx("rounded-full border px-3 py-1.5 font-bold", placing === "pickup" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600")}><Crosshair size={12} className="mr-1 inline"/>{placing === "pickup" ? "Tap the map…" : pickup ? "Move pickup pin" : "Place pickup pin"}</button>}
        <button onClick={() => setPlacing(placing === "drop" ? "" : "drop")} className={cx("rounded-full border px-3 py-1.5 font-bold", placing === "drop" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600")}><Crosshair size={12} className="mr-1 inline"/>{placing === "drop" ? "Tap the map…" : drop ? "Move delivery pin" : "Place delivery pin"}</button>
      </div>
    </div></div>;
}
