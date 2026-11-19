import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";

/* ---------------------------------------------------------------- install state */
let deferred = null; // the browser's install prompt, once it offers one
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

const standalone = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
const isIOS = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener("appinstalled", () => { deferred = null; emit(); });
}

/** { canInstall, install(), ios, installed } for buttons and the install banner. */
export function useInstall() {
  const canInstall = useSyncExternalStore(subscribe, () => Boolean(deferred), () => false);
  const installed = standalone();
  const ios = isIOS() && !installed;
  const install = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    deferred = null; emit();
    return choice?.outcome === "accepted";
  };
  return { canInstall: canInstall && !installed, install, ios, installed };
}

/* -------------------------------------------------------------- service worker */
/** Registers the service worker (production only). onUpdate(apply) is called when a new version is waiting. */
export function registerServiceWorker(onUpdate) {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const waiting = (worker) => onUpdate?.(() => worker.postMessage("SKIP_WAITING"));
      if (reg.waiting && navigator.serviceWorker.controller) waiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) waiting(worker);
        });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; window.location.reload(); } });
      // look for a new version whenever the app is reopened
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
    } catch { /* the site works fine without it */ }
  });
}

/* ------------------------------------------------------------- install banner */
const KEY = "pj_install_dismissed";
const recentlyDismissed = () => { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < 14 * 86400000; } catch { return false; } };

/** Small card offering to install the app. Shown a few seconds after the browser says it can. */
export function InstallBanner() {
  const { canInstall, install, ios, installed } = useInstall();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (installed || recentlyDismissed() || !(canInstall || ios)) { setOpen(false); return undefined; }
    const t = setTimeout(() => setOpen(true), 8000);
    return () => clearTimeout(t);
  }, [canInstall, ios, installed]);
  if (!open) return null;
  const close = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } setOpen(false); };
  return <div role="dialog" aria-label="Install the app" className="no-print fixed inset-x-3 bottom-[calc(4.75rem+var(--safe-bottom))] z-40 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl md:bottom-6 md:left-auto md:right-6 md:mx-0">
    <img src="/icons/icon-192.png" alt="" width="40" height="40" className="h-10 w-10 shrink-0 rounded-lg"/>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold">Add PJ Digitals to your home screen</p>
      {ios && !canInstall
        ? <p className="mt-0.5 text-xs text-slate-600">Tap <Share size={12} className="mx-0.5 inline"/> Share, then "Add to Home Screen".</p>
        : <p className="mt-0.5 text-xs text-slate-600">Opens faster and works like an app.</p>}
      {canInstall && <button onClick={async () => { await install(); close(); }} className="btn-primary mt-3 px-4 py-2 text-xs"><Download size={14}/> Install</button>}
    </div>
    <button onClick={close} aria-label="Not now" className="-m-1 p-1 text-slate-500"><X size={18}/></button>
  </div>;
}
