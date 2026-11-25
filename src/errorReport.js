import { Throttle, buildEnvelope, buildEvent, isNoise, parseDsn } from "./errorReport.core.js";

/**
 * Sends crashes and unhandled errors from the browser to the error tracker (Sentry/GlitchTip) when the server
 * says one is configured (it comes through /api/meta, so no rebuild is needed). With none configured this does nothing.
 * No cookies, no request bodies, no user details; page addresses have ids replaced by :id.
 */
let dsnRaw = "";
let dsn = null;
const throttle = new Throttle();
const pending = []; // errors that happen before /api/meta has answered (kept briefly, max 5)

const send = (err, ctx = {}) => {
  if (!dsn) return;
  try {
    const key = `${(err && err.message) || err}|${location.pathname}`;
    if (!throttle.allow(key)) return;
    const event = buildEvent(err, {
      path: location.pathname,
      origin: location.origin,
      environment: import.meta.env?.MODE === "production" ? "production" : "development",
      release: import.meta.env?.VITE_RELEASE,
      tags: { lang: document.documentElement.lang || undefined, ...ctx.tags },
      level: ctx.level,
    });
    fetch(`${dsn.endpoint}?sentry_version=7&sentry_key=${encodeURIComponent(dsn.publicKey)}&sentry_client=estore-lite%2F1`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" }, // a "simple" request: no CORS preflight
      body: buildEnvelope(event, dsnRaw),
      keepalive: true,
    }).catch(() => {});
  } catch { /* reporting must never break the page */ }
};

/** For code that catches an error but still wants it seen (e.g. the crash screen). */
export function reportError(err, ctx) {
  if (isNoise(err)) return;
  if (!dsn) { if (pending.length < 5) pending.push([err, ctx]); return; }
  send(err, ctx);
}

/** Called once the server's meta arrives. Safe to call again; an empty value switches reporting off. */
export function configureErrorReporting(dsnFromServer) {
  const next = parseDsn(dsnFromServer);
  dsnRaw = next ? dsnFromServer : "";
  dsn = next;
  if (dsn) while (pending.length) { const [e, c] = pending.shift(); send(e, c); }
  else pending.length = 0;
}

let installed = false;
export function installErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (ev) => reportError(ev.error || new Error(ev.message), { tags: { where: "window.onerror" } }));
  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev.reason;
    reportError(r instanceof Error ? r : new Error(String(r)), { tags: { where: "unhandledrejection" } });
  });
}
