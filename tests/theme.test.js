import test from "node:test";
import assert from "node:assert/strict";
import { SEASONS, currentSeason, scaleFor } from "../src/theme.js";

const day = (s) => new Date(`${s}T12:00:00`);

test("a date inside a built-in festival window picks that festival", () => {
  assert.equal(currentSeason(day("2026-12-25"))?.id, "christmas");
  assert.equal(currentSeason(day("2026-04-10"))?.id, "vishu");
});

test("an ordinary day has no festival theme", () => {
  assert.equal(currentSeason(day("2026-06-15")), null);
});

test("the admin can switch themes off or force one on, whatever the date", () => {
  assert.equal(currentSeason(day("2026-12-25"), null, { override: "off" }), null);
  assert.equal(currentSeason(day("2026-06-15"), null, { override: "onam" })?.id, "onam");
});

test("?theme= in the address bar beats the admin's choice", () => {
  assert.equal(currentSeason(day("2026-06-15"), "diwali", { override: "off" })?.id, "diwali");
  assert.equal(currentSeason(day("2026-12-25"), "off", { override: "christmas" }), null);
});

test("admin festival dates replace the built-in ones (this year only with YYYY-MM-DD)", () => {
  const server = { override: "auto", dates: { onam: ["2026-09-20", "2026-09-30"] } };
  assert.equal(currentSeason(day("2026-09-25"), null, server)?.id, "onam");
  assert.equal(currentSeason(day("2026-08-25"), null, server), null); // built-in Onam window no longer applies
  assert.equal(currentSeason(day("2027-09-25"), null, server), null); // a one-year date does not repeat
});

test("every season's button colour keeps readable white text (contrast >= 4.5)", () => {
  const lum = ([r, g, b]) => 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  const c = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  for (const s of SEASONS) {
    const rgb = scaleFor(s.hue, s.sat)[600].split(" ").map(Number);
    assert.ok(1.05 / (lum(rgb) + 0.05) >= 4.5, `${s.id} 600 shade is too light for white text`);
  }
});
