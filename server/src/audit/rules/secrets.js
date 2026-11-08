import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { finding } from "../finding.js";
import { mapLimit } from "../helpers.js";
import { scanText } from "../secretScanner.js";

const MAX_FILES = 150;
const MAX_FILE_BYTES = 200_000;
const MAX_FINDINGS = 50;

const TEST_PATH =
  /(^|\/)(__tests__|tests?|fixtures?|mocks?)\/|\.(test|spec)\.[cm]?[jt]sx?$/i;
const SKIP_PATH = /(^|\/)(node_modules|dist|build|vendor|coverage|\.git)\//;
const SKIP_FILE =
  /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|tar|woff2?|ttf|eot|mp[34]|mov|map|lock)$|\.min\.(js|css)$|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i;

// Files most likely to hold secrets get scanned first
const LIKELY =
  /(^|\/)(\.env.*|[^/]*secret[^/]*|[^/]*credential[^/]*|[^/]*config[^/]*|[^/]*\.pem|[^/]*\.key|id_rsa|[^/]*\.ya?ml|[^/]*\.properties)$/i;

// A purpose-specific key, so we never use the token-encryption key directly for hashing
const hashKey = crypto
  .createHmac("sha256", env.encryptionKey)
  .update("repoguard:secret-fingerprint:v1")
  .digest();

// Stable ID for a secret WITHOUT storing it. Keyed hashing (HMAC) means weak passwords
// can't be recovered by guessing, unlike a plain hash.
const secretId = (value) =>
  crypto.createHmac("sha256", hashKey).update(value).digest("hex").slice(0, 12);

const secretScan = {
  id: "secret-scan",
  category: "security",
  async run(ctx) {
    const candidates = ctx.files
      .filter((p) => !SKIP_PATH.test(p) && !SKIP_FILE.test(p))
      .filter((p) => ctx.sizeOf(p) > 0 && ctx.sizeOf(p) <= MAX_FILE_BYTES)
      .sort(
        (a, b) =>
          Number(LIKELY.test(b)) - Number(LIKELY.test(a)) ||
          ctx.sizeOf(a) - ctx.sizeOf(b),
      );

    const selected = candidates.slice(0, MAX_FILES);
    let failedReads = 0;

    const perFile = await mapLimit(
      selected,
      8,
      async (path) => {
        try {
          const text = await ctx.readFile(path, MAX_FILE_BYTES);
          if (!text || text.includes("\u0000")) return []; // empty or binary

          // The secret value is turned into an ID right here and then dropped
          return scanText(text).map((hit) => ({
            path,
            type: hit.type,
            severity: hit.severity,
            line: hit.line,
            id: secretId(hit.value),
          }));
        } catch (err) {
          failedReads++;
          // The path and reason are safe to log. File contents never are.
          console.error(`[secret-scan] could not read ${path}: ${err.message}`);
          return [];
        }
      },
      ctx.signal,
    );

    // One finding per distinct secret per file
    const unique = new Map();
    for (const hit of perFile.flat()) {
      const key = `${hit.path}:${hit.type}:${hit.id}`;
      if (!unique.has(key)) unique.set(key, hit);
    }
    const hits = [...unique.values()];

    const findings = hits.slice(0, MAX_FINDINGS).map((hit) => {
      const inTests = TEST_PATH.test(hit.path);

      return finding({
        ruleId: "secret-detected",
        category: "security",
        severity: inTests ? "low" : hit.severity,
        title: inTests
          ? `Possible secret in a test file: ${hit.type}`
          : `Possible secret committed: ${hit.type}`,
        message: inTests
          ? `Line ${hit.line} of a test file contains something that looks like a secret (${hit.type}). If it is a made-up test value, no action is needed. If it is real, treat it as exposed. RepoGuard does not store the value itself.`
          : `Line ${hit.line} contains what looks like a secret (${hit.type}). Anything committed to Git stays in the history even after you delete it, so treat it as exposed. RepoGuard does not store the value itself.`,
        fix: "Revoke or rotate this credential first. Then remove it from the code and load it from an environment variable instead. Cleaning Git history only helps after the credential has been rotated.",
        filePath: hit.path,
        key: `${hit.type}:${hit.id}`,
      });
    });
    // Be honest about coverage
    const notes = [];
    if (candidates.length > selected.length) {
      notes.push(
        `scanned ${selected.length} of ${candidates.length} eligible files`,
      );
    }
    // secrets.js, in the notes section
    if (failedReads > 0) {
      notes.push(
        `${failedReads} ${failedReads === 1 ? "file" : "files"} could not be read`,
      );
    }
    if (hits.length > MAX_FINDINGS) {
      notes.push(
        `${hits.length - MAX_FINDINGS} more possible secrets not listed`,
      );
    }

    if (notes.length > 0) {
      findings.push(
        finding({
          ruleId: "secret-scan-partial",
          category: "security",
          severity: "info",
          title: "Secret scan was not complete",
          message: `Coverage was limited: ${notes.join("; ")}. Secrets that were only in files that weren't scanned, or only in older commits, would not appear here.`,
          fix: "For full coverage, enable GitHub's built-in secret scanning on the repository.",
        }),
      );
    }

    return findings;
  },
};

export const secretRules = [secretScan];
