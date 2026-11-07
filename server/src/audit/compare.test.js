import { test } from "node:test";
import assert from "node:assert/strict";
import { compareFindings } from "./compare.js";

const finding = (fingerprint) => ({ fingerprint });
const ids = (list) => list.map((f) => f.fingerprint);

test("splits findings into new, unchanged and fixed", () => {
  const previous = [finding("a"), finding("b")];
  const current = [finding("b"), finding("c")];

  const result = compareFindings(previous, current);

  assert.deepEqual(ids(result.added), ["c"]);
  assert.deepEqual(ids(result.unchanged), ["b"]);
  assert.deepEqual(ids(result.fixed), ["a"]);
});

test("identical audits have nothing new or fixed", () => {
  const list = [finding("a"), finding("b")];
  const result = compareFindings(list, list);

  assert.equal(result.added.length, 0);
  assert.equal(result.fixed.length, 0);
  assert.equal(result.unchanged.length, 2);
});

test("everything is new when there is no previous audit", () => {
  const result = compareFindings([], [finding("a"), finding("b")]);

  assert.deepEqual(ids(result.added), ["a", "b"]);
  assert.equal(result.fixed.length, 0);
});