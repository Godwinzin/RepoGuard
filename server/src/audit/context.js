import { getBlobText } from "../services/github.js";

const MAX_READ_BYTES = 1_000_000; // skip files bigger than ~1 MB

export function buildContext({ token, fullName, defaultBranch, snapshot, signal }) {
  const byPath = new Map(snapshot.files.map((f) => [f.path, f]));
  const cache = new Map();

  async function readFile(path, maxBytes = MAX_READ_BYTES) {
    const file = byPath.get(path);
    if (!file || file.size > maxBytes) return null;

    if (!cache.has(path)) {
      cache.set(path, getBlobText(token, fullName, file.sha, signal));
    }
    return cache.get(path);
  }

  async function readJson(path, maxBytes) {
    try {
      const text = await readFile(path, maxBytes);
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  return {
    repo: { fullName, defaultBranch },
    commitSha: snapshot.commitSha,
    signal, // rules pass this to anything slow they start
    files: snapshot.files.map((f) => f.path),
    hasFile: (path) => byPath.has(path),
    sizeOf: (path) => byPath.get(path)?.size ?? 0,
    readFile,
    readJson,
  };
}