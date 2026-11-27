import test from "node:test";
import assert from "node:assert/strict";
import { cleanCode, quotePath } from "../src/coupon.core.js";

test("codes are tidied", () => { assert.equal(cleanCode(" save 10 "), "SAVE10"); assert.equal(cleanCode(null), ""); });
test("quote path carries address and coupon", () => {
  assert.equal(quotePath(), "/api/orders/quote");
  assert.equal(quotePath({ addressId: "a1" }), "/api/orders/quote?addressId=a1");
  assert.equal(quotePath({ coupon: "save10" }), "/api/orders/quote?coupon=SAVE10");
  assert.equal(quotePath({ addressId: "a1", coupon: "x y" }), "/api/orders/quote?addressId=a1&coupon=XY");
});

test("the points flag is added to the quote URL only when on", async () => {
  const { quotePath } = await import("../src/coupon.core.js");
  assert.equal(quotePath({ points: true }), "/api/orders/quote?points=1");
  assert.equal(quotePath({ addressId: "a1", coupon: "x", points: true }), "/api/orders/quote?points=1&addressId=a1&coupon=X");
  assert.equal(quotePath({ points: false }), "/api/orders/quote");
});
