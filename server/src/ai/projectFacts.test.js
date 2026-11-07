import { test } from "node:test";
import assert from "node:assert/strict";
import { extractEnvNames, extractEnvKeys, redactCommand } from "./projectFacts.js";

test("finds environment variable names used in code", () => {
  const code =
    'const a = process.env.DATABASE_URL; const b = process.env["JWT_SECRET"]; const c = import.meta.env.VITE_API_URL;';

  assert.deepEqual([...extractEnvNames(code)].sort(), [
    "DATABASE_URL",
    "JWT_SECRET",
    "VITE_API_URL",
  ]);
});

test("reads only the keys from an env file, never the values", () => {
  const value = ["not", "a", "real", "value", "1234"].join("-");
  const keys = extractEnvKeys(`DB_PASSWORD=${value}\nexport API_URL=http://x\n# comment`);

  assert.deepEqual([...keys].sort(), ["API_URL", "DB_PASSWORD"]);
  assert.equal(JSON.stringify([...keys]).includes(value), false);
});

test("removes values from inline variables in commands", () => {
  assert.equal(
    redactCommand("cross-env NODE_ENV=production API_KEY=abc123 node app.js"),
    "cross-env NODE_ENV=<value removed> API_KEY=<value removed> node app.js"
  );
});