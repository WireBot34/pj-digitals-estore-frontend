import test from "node:test";
import assert from "node:assert/strict";
import { mergeBrand, businessFrom, DEFAULT_BRAND } from "../src/brand.core.js";
import { hueSatOf } from "../src/theme.js";

test("mergeBrand fills gaps and survives junk", () => {
  const b = mergeBrand({ name: "Acme", contact: { phone: "123" }, business: { grievanceOfficer: { name: "Ann" } } });
  assert.equal(b.name, "Acme");
  assert.equal(b.contact.phone, "123");
  assert.equal(b.contact.email, DEFAULT_BRAND.contact.email);
  assert.equal(b.business.grievanceOfficer.name, "Ann");
  assert.equal(b.business.grievanceOfficer.hours, DEFAULT_BRAND.business.grievanceOfficer.hours);
  assert.equal(mergeBrand(null).name, DEFAULT_BRAND.name);
  assert.equal(mergeBrand("x").policies.refundDays, 7);
});

test("businessFrom gives the flat legal-page shape, GST from meta", () => {
  const f = businessFrom(mergeBrand({ name: "Acme", domain: "acme.in", policies: { refundDays: 3 } }), { gstRegistered: true, gstin: "G1" });
  assert.equal(f.name, "Acme"); assert.equal(f.domain, "acme.in"); assert.equal(f.refundDays, 3);
  assert.equal(f.gstRegistered, true); assert.equal(f.gstin, "G1");
  assert.equal(businessFrom(mergeBrand(null), {}).gstRegistered, false);
});

test("hueSatOf reads a hex colour", () => {
  assert.equal(hueSatOf("#ff0000").hue, 0);
  assert.equal(hueSatOf("#00ff00").hue, 120);
  assert.equal(hueSatOf("#0000ff").hue, 240);
  assert.equal(hueSatOf("#808080"), null);
  assert.equal(hueSatOf(""), null);
  assert.equal(hueSatOf("red"), null);
});
