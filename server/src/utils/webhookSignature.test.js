import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifySignature } from "./webhookSignature.js";

const secret = "test-secret";
const body = Buffer.from('{"hello":"world"}');
const sign = (key, data) =>
  "sha256=" + crypto.createHmac("sha256", key).update(data).digest("hex");

test("accepts a correct signature", () => {
  assert.equal(verifySignature(secret, body, sign(secret, body)), true);
});

test("rejects a tampered body", () => {
  const tampered = Buffer.from('{"hello":"evil"}');
  assert.equal(verifySignature(secret, tampered, sign(secret, body)), false);
});

test("rejects a signature made with the wrong secret", () => {
  assert.equal(verifySignature(secret, body, sign("other-secret", body)), false);
});

test("rejects missing or malformed headers", () => {
  assert.equal(verifySignature(secret, body, undefined), false);
  assert.equal(verifySignature(secret, body, "sha256=nothex"), false);
  assert.equal(verifySignature(secret, body, "md5=abc"), false);
});