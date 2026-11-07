import { test } from "node:test";
import assert from "node:assert/strict";
import { scanText, shannonEntropy } from "./secretScanner.js";

// Fake secrets assembled at runtime so this file contains no real-looking secret
const awsKey = "AKIA" + "QWERTYUIOPASDFGH";
const randomValue = ["q8Zr2LmX", "9vKt4WnB", "7yPc3HdJ", "5sFg"].join("");

test("detects a known key format and reports the right line", () => {
  const hits = scanText(`const a = 1;\nconst key = "${awsKey}";`);

  assert.equal(hits.length, 1);
  assert.equal(hits[0].type, "AWS access key ID");
  assert.equal(hits[0].line, 2);
});

test("detects a random-looking hardcoded secret", () => {
  const v = randomValue;
  const hits = scanText(`apiKey = "${v}"`);

  assert.equal(hits.length, 1);
  assert.equal(hits[0].type, "hardcoded secret-like value");
});

test("ignores placeholders and low-entropy values", () => {
  assert.equal(scanText(`API_KEY="your_api_key_here_please"`).length, 0);
  assert.equal(scanText(`password = "aaaaaaaaaaaaaaaaaaaa"`).length, 0);
});

test("ignores local database URLs and normal code", () => {
  assert.equal(scanText("postgres://postgres:secret123@localhost:5432/app").length, 0);
  assert.equal(scanText("const total = items.reduce((a, b) => a + b, 0);").length, 0);
});

test("flags a password in a remote connection string", () => {
  const hits = scanText("postgresql://admin:Sup3rS3cretPw@db.myhost.com:5432/app");

  assert.equal(hits.length, 1);
  assert.equal(hits[0].type, "password in a connection string");
});

test("entropy is higher for random strings than repeated ones", () => {
  assert.ok(shannonEntropy(randomValue) > shannonEntropy("aaaaaaaaaaaaaaaa"));
});