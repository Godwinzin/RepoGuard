import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmationMatches } from "./confirmation.js";

test("matches the username exactly", () => {
  assert.equal(confirmationMatches("octocat", "octocat"), true);
});

test("ignores case and surrounding spaces", () => {
  assert.equal(confirmationMatches("Octocat", "  octocat "), true);
});

test("rejects anything else", () => {
  assert.equal(confirmationMatches("octocat", "octocat2"), false);
  assert.equal(confirmationMatches("octocat", ""), false);
  assert.equal(confirmationMatches("octocat", "delete"), false);
});

test("rejects non-text input and an empty username", () => {
  assert.equal(confirmationMatches("octocat", 123), false);
  assert.equal(confirmationMatches("octocat", null), false);
  assert.equal(confirmationMatches("", ""), false);
});