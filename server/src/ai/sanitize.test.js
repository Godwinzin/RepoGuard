import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeEnvExample } from "./sanitize.js";

test("keeps only known variables and comments, and adds missing ones", () => {
  const text = [
    "```",
    "# Database",
    "DATABASE_URL=your_value_here",
    "EVIL=1",
    "Sure! Here is your file:",
    "```",
  ].join("\n");

  assert.equal(
    sanitizeEnvExample(text, ["DATABASE_URL", "PORT"]),
    "# Database\nDATABASE_URL=your_value_here\nPORT=\n"
  );
});

test("drops duplicate variables", () => {
  assert.equal(sanitizeEnvExample("A=1\nA=2", ["A"]), "A=1\n");
});