import test from "node:test";
import assert from "node:assert/strict";
import { Throttle, buildEnvelope, buildEvent, isNoise, parseDsn, parseStack, safePath } from "../src/errorReport.core.js";

test("DSN parsing", () => {
  assert.deepEqual(parseDsn("https://pk@o1.ingest.sentry.io/99"), { publicKey: "pk", endpoint: "https://o1.ingest.sentry.io/api/99/envelope/" });
  for (const bad of ["", "x", "https://host/1", undefined]) assert.equal(parseDsn(bad), null);
});

test("Chrome and Firefox stacks both parse, oldest first", () => {
  const chrome = parseStack("TypeError: x\n    at render (https://nbyme.com/assets/index-abc.js:1:100)\n    at https://nbyme.com/assets/index-abc.js?v=2:5:6");
  assert.equal(chrome.length, 2);
  assert.equal(chrome[0].filename, "https://nbyme.com/assets/index-abc.js"); // query stripped
  assert.equal(chrome[1].function, "render");
  const ff = parseStack("render@https://nbyme.com/assets/index-abc.js:1:100\nrun@https://nbyme.com/assets/index-abc.js:9:9");
  assert.equal(ff.length, 2);
  assert.equal(ff[1].function, "render");
});

test("ids never leave the browser in page addresses", () => {
  assert.equal(safePath("/orders/65f2c1a0b1c2d3e4f5a6b7c8/track?x=1"), "/orders/:id/track");
  assert.equal(safePath("/product/ORD-ABC-1234"), "/product/:id");
  assert.equal(safePath("/shop"), "/shop");
});

test("events have no cookies/user data and carry the cleaned page address", () => {
  const ev = buildEvent(new RangeError("oops"), { path: "/orders/65f2c1a0b1c2d3e4f5a6b7c8", origin: "https://nbyme.com", tags: { lang: "ml", empty: "" } });
  assert.equal(ev.request.url, "https://nbyme.com/orders/:id");
  assert.deepEqual(ev.tags, { lang: "ml" });
  assert.equal(ev.user, undefined);
  assert.equal(ev.exception.values[0].type, "RangeError");
  assert.equal(buildEnvelope(ev, "https://k@h/1").split("\n").length, 3);
});

test("throttle and noise filter", () => {
  const t = new Throttle(60000, 2);
  assert.equal(t.allow("a", 0), true);
  assert.equal(t.allow("a", 5), false);
  assert.equal(t.allow("b", 5), true);
  assert.equal(t.allow("c", 5), false);
  assert.equal(isNoise(new Error("ResizeObserver loop limit exceeded")), true);
  assert.equal(isNoise(new Error("Failed to fetch")), true);
  assert.equal(isNoise(new Error("Cannot read properties of undefined")), false);
});
