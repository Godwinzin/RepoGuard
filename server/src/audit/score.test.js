import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateScore } from "./score.js";

test("starts at 100 and subtracts by severity", () => {
  assert.equal(calculateScore([{ severity: "critical" }, { severity: "low" }]), 72);
});

test("accepted findings do not count", () => {
  const findings = [{ severity: "critical", accepted: true }, { severity: "medium" }];
  assert.equal(calculateScore(findings), 92);
});

test("never goes below zero", () => {
  const many = Array.from({ length: 10 }, () => ({ severity: "critical" }));
  assert.equal(calculateScore(many), 0);
});

test("info findings cost nothing", () => {
  assert.equal(calculateScore([{ severity: "info" }]), 100);
});