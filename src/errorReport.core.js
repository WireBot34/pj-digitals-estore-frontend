/** Pure helpers for browser error reporting (no window access) so they can be tested with plain node. */

/** https://<key>@<host>[/path]/<projectId> -> { endpoint, publicKey } or null */
export function parseDsn(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/.test(u.protocol) || !u.username) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const projectId = parts.pop();
    if (!projectId || !/^\d+$/.test(projectId)) return null;
    const prefix = parts.length ? "/" + parts.join("/") : "";
    return { publicKey: decodeURIComponent(u.username), endpoint: `${u.protocol}//${u.host}${prefix}/api/${projectId}/envelope/` };
  } catch {
    return null;
  }
}

/** Chrome ("at fn (url:1:2)") and Firefox/Safari ("fn@url:1:2") stacks -> frames, oldest call first. */
export function parseStack(stack) {
  if (typeof stack !== "string") return [];
  const frames = [];
  for (const line of stack.split("\n")) {
    let m = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line);
    let fn, file, l, c;
    if (m) [, fn, file, l, c] = m;
    else if ((m = /^\s*(.*?)@(.+?):(\d+):(\d+)\s*$/.exec(line))) [, fn, file, l, c] = m;
    else continue;
    frames.push({ function: fn || "?", filename: stripQuery(file), lineno: Number(l), colno: Number(c), in_app: true });
  }
  return frames.reverse();
}

export const stripQuery = (u) => String(u || "").split("#")[0].split("?")[0];

/** /orders/65f2c1a0b1c2d3e4f5a6b7c8 -> /orders/:id, so real ids never leave the browser */
export const safePath = (path) =>
  stripQuery(path)
    .split("/")
    .map((seg) => (/^[0-9a-f]{24}$/i.test(seg) || /^\d{5,}$/.test(seg) || /^(ORD|CHK)-/i.test(seg) ? ":id" : seg))
    .join("/");

const hex32 = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

export function buildEvent(err, ctx = {}) {
  const e = err;
  const event = {
    event_id: hex32(),
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: ctx.level || "error",
    environment: ctx.environment || "production",
    release: ctx.release || undefined,
    tags: Object.fromEntries(Object.entries(ctx.tags || {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])),
    request: ctx.path ? { url: ctx.origin ? ctx.origin + safePath(ctx.path) : safePath(ctx.path) } : undefined,
  };
  event.exception = {
    values: [{
      type: String((e && e.name) || "Error").slice(0, 100),
      value: String((e && e.message) ?? e ?? "Unknown error").slice(0, 500),
      stacktrace: { frames: parseStack(e && e.stack) },
    }],
  };
  return event;
}

export const buildEnvelope = (event, dsnRaw) =>
  [JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString(), dsn: dsnRaw }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");

/** Same problem once a minute; at most `max` events a minute. */
export class Throttle {
  constructor(perKeyMs = 60000, max = 10) { this.perKeyMs = perKeyMs; this.max = max; this.seen = new Map(); this.recent = []; }
  allow(key, now = Date.now()) {
    this.recent = this.recent.filter((t) => now - t < 60000);
    if (this.recent.length >= this.max) return false;
    const last = this.seen.get(key);
    if (last !== undefined && now - last < this.perKeyMs) return false;
    if (this.seen.size >= 100) this.seen.clear();
    this.seen.set(key, now);
    this.recent.push(now);
    return true;
  }
}

/** Browser noise that isn't our bug: extensions, ad blockers, cancelled loads. */
export const isNoise = (err, source = "") => {
  const msg = String((err && err.message) || err || "");
  return /ResizeObserver loop|Script error\.?$|Non-Error promise rejection|chrome-extension:|moz-extension:|safari-extension:|AbortError|Load failed$|Failed to fetch$|NetworkError when attempting/i.test(msg.trim()) || /chrome-extension:|moz-extension:|safari-extension:/i.test(String(source));
};
