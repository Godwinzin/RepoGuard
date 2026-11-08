import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReason } from "./acceptReason.js";

test("a reason is optional for medium problems", () => {
  assert.deepEqual(validateReason("medium", ""), { ok: true, reason: null });
});

test("the reason is trimmed", () => {
  assert.deepEqual(validateReason("low", "  just a test value  "), {
    ok: true,
    reason: "just a test value",
  });
});

test("critical and high problems need a real reason", () => {
  assert.equal(validateReason("critical", "").ok, false);
  assert.equal(validateReason("high", "short").ok, false);
  assert.equal(validateReason("critical", "made-up value in a test").ok, true);
});

test("overlong reasons are rejected", () => {
  assert.equal(validateReason("low", "x".repeat(301)).ok, false);
});

test("anything that isn't text counts as empty", () => {
  assert.equal(validateReason("critical", 12345).ok, false);
  assert.deepEqual(validateReason("low", { evil: true }), { ok: true, reason: null });
});